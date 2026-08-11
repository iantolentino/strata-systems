import { getLastReport } from './storage.js';
import { sendMonthlyReport } from './monthly-report.js';
export default async function handler(request, response) { try { if (request.method === 'POST') return response.status(200).json(await sendMonthlyReport()); return response.status(200).json(await getLastReport() || { status: 'unknown' }); } catch (error) { return response.status(500).json({ error: error.message }); } }
