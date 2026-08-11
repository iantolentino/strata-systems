import { sites as configuredSites } from '../src/sites.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const dbEnabled = Boolean(supabaseUrl && serviceKey);
let customSites = [];
let memoryChecks = [];
let memoryMaintenance = {};

const headers = { apikey: serviceKey || '', Authorization: `Bearer ${serviceKey || ''}`, 'Content-Type': 'application/json' };
async function db(path, options = {}) {
  const result = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  if (!result.ok) throw new Error(`Supabase request failed: ${result.status}`);
  return result.status === 204 ? null : result.json();
}

export async function getSites() {
  if (!dbEnabled) return [...configuredSites, ...customSites].map(site => ({ ...site, maintenance: memoryMaintenance[site.id] || false }));
  return db('sites?select=id,name,url,group,maintenance&order=name.asc');
}
export async function addSite(site) {
  if (!dbEnabled) { customSites = [...customSites, site]; return site; }
  return (await db('sites', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...site, group: 'custom', maintenance: false }) }))[0];
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
