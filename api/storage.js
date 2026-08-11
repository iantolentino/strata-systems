import { sites as configuredSites } from '../src/sites.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const dbEnabled = Boolean(supabaseUrl && serviceKey);
let customSites = [];
let memoryChecks = [];
let memoryMaintenance = {};
let memoryReport = null;

const headers = { apikey: serviceKey || '', Authorization: `Bearer ${serviceKey || ''}`, 'Content-Type': 'application/json' };
async function db(path, options = {}) {
  const result = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!result.ok) throw new Error(`Supabase request failed: ${result.status}`);
  return result.status === 204 ? null : result.json();
}

export async function getSites() {
  if (!dbEnabled) return [...configuredSites, ...customSites].map(site => ({ ...site, maintenance: memoryMaintenance[site.id] || false }));
  return (await db('sites?select=id,name,url,group,maintenance,sla_target&order=name.asc')).map(site => ({ ...site, slaTarget: site.sla_target ?? 99 }));
}
export async function addSite(site) {
  if (!dbEnabled) { customSites = [...customSites, site]; return site; }
  return (await db('sites', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...site, sla_target: site.slaTarget ?? 99, maintenance: false }) }))[0];
}
export async function updateSite(id, site) {
  if (!dbEnabled) { customSites = customSites.map(item => item.id === id ? { ...item, ...site } : item); return site; }
  return (await db(`sites?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name: site.name, url: site.url, group: site.group, sla_target: site.slaTarget ?? 99 }) }))[0];
}
export async function deleteSite(id) {
  if (!dbEnabled) { customSites = customSites.filter(item => item.id !== id); delete memoryMaintenance[id]; return; }
  await db(`sites?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
}
export async function setMaintenance(id, maintenance) {
  if (!dbEnabled) { memoryMaintenance[id] = maintenance; return; }
  await db(`sites?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ maintenance }) });
}
export async function saveChecks(checks) {
  if (!dbEnabled) { memoryChecks = [...memoryChecks, ...checks].slice(-10000); return; }
  await db('checks', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(checks.map(check => ({ site_id: check.id, checked_at: check.checkedAt, status: check.status, response_time_ms: check.responseTime }))) });
}
export async function getChecks(from, to) {
  if (!dbEnabled) return memoryChecks.filter(check => check.checkedAt >= from && check.checkedAt <= to);
  return db(`checks?select=site_id,checked_at,status,response_time_ms&checked_at=gte.${encodeURIComponent(from)}&checked_at=lte.${encodeURIComponent(to)}&order=checked_at.asc`);
}
export async function getLastReport() {
  if (!dbEnabled) return memoryReport;
  const rows = await db('report_status?select=status,sent_at,reason&order=sent_at.desc&limit=1'); return rows[0] || null;
}
export async function saveReportStatus(status, sentAt, reason = null) {
  memoryReport = { status, sent_at: sentAt, reason };
  if (dbEnabled) await db('report_status', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status, sent_at: sentAt, reason }) });
}

export async function pruneMonth(from, to, month) {
  const checks = await getChecks(from, to);
  const sites = await getSites();
  const summaries = sites.map(site => {
    const rows = checks.filter(check => (check.site_id || check.id) === site.id);
    const online = rows.filter(check => check.status === 'online').length;
    const times = rows.map(check => check.response_time_ms ?? check.responseTime).filter(Number.isFinite);
    const incidents = rows.filter((check, index) => check.status === 'offline' && (index === 0 || rows[index - 1].status !== 'offline')).length;
    return { site_id: site.id, month, uptime_percent: rows.length ? Number((online / rows.length * 100).toFixed(2)) : 100, incident_count: incidents, avg_response_time_ms: times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : null };
  });
  if (!dbEnabled) { memoryChecks = memoryChecks.filter(check => check.checkedAt < from || check.checkedAt > to); return summaries; }
  await db('monthly_summaries', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(summaries) });
  await db(`checks?checked_at=gte.${encodeURIComponent(from)}&checked_at=lt.${encodeURIComponent(to)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  return summaries;
}
