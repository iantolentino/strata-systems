import { getChecks, getSites } from './storage.js';

export default async function handler(request, response) {
  const now = new Date();
  const from = request.query?.from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = request.query?.to || now.toISOString();
  try { return response.status(200).json({ from, to, generatedAt: now.toISOString(), sites: await getSites(), checks: await getChecks(from, to) }); }
  catch (error) { return response.status(500).json({ error: error.message }); }
}
