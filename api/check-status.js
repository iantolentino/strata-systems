import { addSite, deleteSite, getChecks, getSites, pruneMonth, saveChecks, setMaintenance, updateSite } from './storage.js';
import { sendMonthlyReport } from './monthly-report.js';

let latestCache = null;
let lastReport = null;

async function check(site) {
  if (site.group === 'Private On-Premise') return { ...site, status: 'online', responseTime: null, httpStatus: null };
  const started = Date.now();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await fetch(site.url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(10000) });
      if (result.status < 500) return { ...site, status: 'online', responseTime: Date.now() - started, httpStatus: result.status };
    } catch { /* retry once before declaring an outage */ }
  }
  return { ...site, status: 'offline', responseTime: Date.now() - started, httpStatus: null };
}

export default async function handler(request, response) {
  try {
    if (request.method === 'POST') {
      const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {};
      if (body.password !== '123456') return response.status(403).json({ error: 'Invalid password.' });
      if (body.action === 'add') {
        if (!body.name?.trim() || (body.group !== 'Private On-Premise' && !body.url?.trim())) return response.status(400).json({ error: 'Name and URL are required.' });
        let url = body.url?.trim() || ''; try { if (url) url = new URL(url).toString(); } catch { return response.status(400).json({ error: 'Enter a valid URL.' }); }
        const current = await getSites();
        if (url && current.some(site => site.url === url)) return response.status(409).json({ error: 'That URL is already monitored.' });
        await addSite({ id: `custom-${Date.now()}`, name: body.name.trim(), url, group: body.group || 'Public Internal', slaTarget: Number(body.slaTarget) || 99 });
        latestCache = null;
        return response.status(200).json({ added: true });
      }
      if (body.action === 'edit') {
        if (!body.id || !body.name?.trim() || (body.group !== 'Private On-Premise' && !body.url?.trim())) return response.status(400).json({ error: 'Name and URL are required.' });
        const current = await getSites(); let url = body.url?.trim() || ''; try { if (url) url = new URL(url).toString(); } catch { return response.status(400).json({ error: 'Enter a valid URL.' }); }
        if (url && current.some(site => site.id !== body.id && site.url === url)) return response.status(409).json({ error: 'That URL is already monitored.' });
        await updateSite(body.id, { name: body.name.trim(), url, group: body.group, slaTarget: Number(body.slaTarget) || 99 }); latestCache = null; return response.status(200).json({ updated: true });
      }
      if (body.action === 'delete') { if (!body.id) return response.status(400).json({ error: 'Site is required.' }); await deleteSite(body.id); latestCache = null; return response.status(200).json({ deleted: true }); }
      await setMaintenance(body.id, Boolean(body.maintenance));
      latestCache = null;
      return response.status(200).json({ maintenance: Object.fromEntries((await getSites()).map(site => [site.id, Boolean(site.maintenance)])) });
    }
    const manual = request.query?.manual === '1' || request.query?.manual === 'true';
    if (latestCache && Date.now() - latestCache.checkedAt < 90000 && !request.headers['x-vercel-cron'] && !manual) return response.status(200).json(latestCache.payload);
    const currentSites = await getSites();
    const checkedAt = new Date().toISOString();
    const results = await Promise.all(currentSites.map(check));
    await saveChecks(results.map(site => ({ id: site.id, checkedAt, status: site.status, responseTime: site.responseTime })));
    const historyFrom = new Date(Date.now() - 32 * 86400000).toISOString(); const history = await getChecks(historyFrom, checkedAt); const payload = { checkedAt: Date.parse(checkedAt), maintenance: Object.fromEntries(results.map(site => [site.id, Boolean(site.maintenance)])), results: results.map(site => { const rows = history.filter(check => check.site_id === site.id); let downSince = null; for (let index = rows.length - 1; index >= 0 && rows[index].status === 'offline'; index -= 1) downSince = rows[index].checked_at || rows[index].checkedAt; return { ...site, downSince }; }) };
    if (request.headers['x-vercel-cron']) {
      const tomorrow = new Date(Date.now() + 86400000);
      if (tomorrow.getUTCMonth() !== new Date().getUTCMonth()) { try { lastReport = await sendMonthlyReport(); if (lastReport.sent) await pruneMonth(new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), 1)).toISOString(), tomorrow.toISOString(), tomorrow.toISOString().slice(0, 7) + '-01'); } catch (error) { lastReport = { failed: true, error: error.message }; } }
    }
    payload.lastReport = lastReport;
    latestCache = { checkedAt: Date.now(), payload };
    return response.status(200).json(payload);
  } catch (error) { return response.status(500).json({ error: error.message }); }
}
