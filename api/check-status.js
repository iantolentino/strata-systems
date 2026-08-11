import { addSite, getSites, saveChecks, setMaintenance } from './storage.js';

let latestCache = null;

async function check(site) {
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
        await addSite({ id: `custom-${Date.now()}`, name: body.name.trim(), url });
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
    latestCache = { checkedAt: Date.now(), payload };
    return response.status(200).json(payload);
  } catch (error) { return response.status(500).json({ error: error.message }); }
}
