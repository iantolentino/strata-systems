import { addSite, getSites, pruneMonth, saveChecks, setMaintenance } from './storage.js';
import { sendMonthlyReport } from './monthly-report.js';

let latestCache = null;
let lastReport = null;

async function check(site) {
  if (site.group === 'Private On-Premise') return { ...site, status: 'online', responseTime: null, httpStatus: null };
  const started = Date.now();
  try {
    const result = await fetch(site.url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
    return { ...site, status: result.status >= 500 ? 'offline' : 'online', responseTime: Date.now() - started, httpStatus: result.status };
  } catch { return { ...site, status: 'offline', responseTime: Date.now() - started, httpStatus: null }; }
}

export default async function handler(request, response) {
  try {
    if (request.method === 'POST') {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {};
      if (body.password !== '123456') return response.status(403).json({ error: 'Invalid password.' });
      if (body.action === 'add') {
        if (!body.name?.trim() || !body.url?.trim()) return response.status(400).json({ error: 'Name and URL are required.' });
        let url; try { url = new URL(body.url).toString(); } catch { return response.status(400).json({ error: 'Enter a valid URL.' }); }
        const current = await getSites();
        if (current.some(site => site.url === url)) return response.status(409).json({ error: 'That URL is already monitored.' });
        await addSite({ id: `custom-${Date.now()}`, name: body.name.trim(), url, group: body.group || 'Public Internal', slaTarget: Number(body.slaTarget) || 99 });
        latestCache = null;
        return response.status(200).json({ added: true });
      }
      await setMaintenance(body.id, Boolean(body.maintenance));
      latestCache = null;
      return response.status(200).json({ maintenance: Object.fromEntries((await getSites()).map(site => [site.id, Boolean(site.maintenance)])) });
    }
    if (latestCache && Date.now() - latestCache.checkedAt < 90000 && !request.headers['x-vercel-cron']) return response.status(200).json(latestCache.payload);
    const currentSites = await getSites();
    const checkedAt = new Date().toISOString();
    const results = await Promise.all(currentSites.map(check));
    await saveChecks(results.map(site => ({ id: site.id, checkedAt, status: site.status, responseTime: site.responseTime })));
    const payload = { checkedAt: Date.parse(checkedAt), maintenance: Object.fromEntries(results.map(site => [site.id, Boolean(site.maintenance)])), results };
    if (request.headers['x-vercel-cron']) {
      const tomorrow = new Date(Date.now() + 86400000);
      if (tomorrow.getUTCMonth() !== new Date().getUTCMonth()) { try { lastReport = await sendMonthlyReport(); if (lastReport.sent) await pruneMonth(new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), 1)).toISOString(), tomorrow.toISOString(), tomorrow.toISOString().slice(0, 7) + '-01'); } catch (error) { lastReport = { failed: true, error: error.message }; } }
    }
    payload.lastReport = lastReport;
    latestCache = { checkedAt: Date.now(), payload };
    return response.status(200).json(payload);
  } catch (error) { return response.status(500).json({ error: error.message }); }
}
