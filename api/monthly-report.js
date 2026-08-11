import { jsPDF } from 'jspdf';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getChecks, getSites } from './storage.js';
import { saveReportStatus } from './storage.js';

export async function sendMonthlyReport() {
  if (!process.env.RESEND_API_KEY) { const result = { failed: true, reason: 'RESEND_API_KEY is not configured.' }; await saveReportStatus('failed', new Date().toISOString(), result.reason); return result; }
  const now = new Date(); const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(); const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)).toISOString();
  const sites = await getSites(); const checks = await getChecks(from, to); const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  try { const logo = await readFile(fileURLToPath(new URL('../public/strata-logo.png', import.meta.url))); doc.addImage(`data:image/png;base64,${logo.toString('base64')}`, 'PNG', 42, 14, 88, 26); } catch { /* logo is optional in server bundles */ }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('STRATA SYSTEMS - MONTHLY REPORT', 142, 34); doc.setFont('courier', 'normal'); doc.setFontSize(8); doc.text(`${now.toISOString().slice(0, 7)} / generated ${now.toISOString()}`, 142, 51); let y = 96;
  sites.forEach(site => { const rows = checks.filter(check => check.site_id === site.id); const uptime = rows.length ? ((rows.filter(check => check.status === 'online').length / rows.length) * 100).toFixed(2) : 'N/A'; const incidents = rows.filter((check, index) => check.status === 'offline' && (index === 0 || rows[index - 1].status !== 'offline')).length; const times = rows.map(check => check.response_time_ms).filter(Number.isFinite); const average = times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : 'N/A'; doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(site.name.slice(0, 45), 42, y); doc.setFont('courier', 'normal'); doc.setFontSize(8); doc.text(`${site.group} | uptime ${uptime}% | incidents ${incidents} | avg ${average} ms`, 42, y + 13); y += 30; if (y > 770) { doc.addPage(); y = 48; } });
  const pdf = Buffer.from(doc.output('arraybuffer')).toString('base64'); const filename = `strata-systems-report-${now.toISOString().slice(0, 7)}.pdf`; const email = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM || 'Strata Systems <onboarding@resend.dev>', to: ['ian@stratastaff.com'], subject: `Strata Systems report - ${now.toISOString().slice(0, 7)}`, text: 'Attached is the monthly Strata Systems availability report.', attachments: [{ filename, content: pdf }] }) });
  if (!email.ok) { const reason = `Resend failed: ${email.status}`; await saveReportStatus('failed', now.toISOString(), reason); throw new Error(reason); } await saveReportStatus('sent', now.toISOString()); return { sent: true, sentAt: now.toISOString(), filename };
}
