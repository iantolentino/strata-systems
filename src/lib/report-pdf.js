const pdfLogo = async () => { try { const blob = await (await fetch('/strata-logo.png')).blob(); return await new Promise(resolve => { const image = new Image(); image.onload = () => resolve({ data: image.src, width: image.naturalWidth, height: image.naturalHeight }); image.onerror = () => resolve(null); image.src = URL.createObjectURL(blob); }); } catch { return null; } };
const eventCount = rows => rows.filter((row, index) => row.status === 'offline' && (!index || rows[index - 1].status !== 'offline')).length;

export async function downloadMonthlyReport({ month, notes = {} }) {
  const { jsPDF } = await import('jspdf');
  const [year, value] = month.split('-').map(Number);
  const from = new Date(Date.UTC(year, value - 1, 1)).toISOString();
  const to = new Date(Date.UTC(year, value, 0, 23, 59, 59, 999)).toISOString();
  const report = await (await fetch(`/api/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)).json();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight(); const margin = 42; let y = 42;
  const logo = await pdfLogo();
  if (logo) { const width = 105; const height = width * logo.height / logo.width; doc.addImage(logo.data, 'PNG', margin, y, width, height); }
  doc.setTextColor(22, 55, 45); doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.text('Strata Systems - Monthly Status Report', 170, y + 18); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(75, 88, 82); doc.text(`Reporting period: ${month}`, 170, y + 38); doc.text(`Generated on: ${new Date().toLocaleString()}`, 170, y + 54);
  y = 118; doc.setDrawColor(32, 91, 176); doc.setLineWidth(1.5); doc.line(margin, y, W - margin, y); y += 28;
  const sites = report.sites || []; const checks = report.checks || [];
  const online = checks.filter(row => row.status === 'online').length;
  const uptime = checks.length ? online / checks.length * 100 : 100;
  const incidents = sites.reduce((sum, site) => sum + eventCount(checks.filter(row => row.site_id === site.id || row.id === site.id)), 0);
  const times = checks.map(row => row.response_time_ms).filter(Number.isFinite);
  const average = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  doc.setFillColor(239, 246, 243); doc.roundedRect(margin, y, W - margin * 2, 58, 4, 4, 'F'); doc.setTextColor(22, 55, 45); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Executive summary', margin + 12, y + 18); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  const summary = incidents ? `${sites.length} systems monitored; ${incidents} downtime events recorded this period.` : `All monitored systems remained operational during ${month}.`;
  doc.text(summary, margin + 12, y + 38); y += 82;
  const stats = [['SYSTEMS', sites.length], ['UPTIME', `${uptime.toFixed(2)}%`], ['INCIDENTS', incidents], ['AVG RESPONSE', `${average || 'N/A'} ms`]];
  stats.forEach((stat, index) => { const x = margin + index * ((W - margin * 2) / 4); doc.setDrawColor(210, 222, 216); doc.rect(x, y, (W - margin * 2) / 4 - 6, 48); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(89, 105, 98); doc.text(stat[0], x + 9, y + 15); doc.setFontSize(14); doc.setTextColor(22, 55, 45); doc.text(String(stat[1]), x + 9, y + 35); });
  y += 72;
  const pageFooter = () => { doc.setDrawColor(210, 222, 216); doc.line(margin, H - 35, W - margin, H - 35); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 110, 105); doc.text('Strata Staff Global - Confidential', margin, H - 20); doc.text(`Page ${doc.getNumberOfPages()}`, W - margin - 35, H - 20); };
  const tableHeader = () => { doc.setFillColor(31, 78, 64); doc.rect(margin, y, W - margin * 2, 24, 'F'); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); ['SYSTEM', 'GROUP / STATUS', 'UPTIME / SLA', 'INCIDENTS', 'AVG RESPONSE'].forEach((label, index) => doc.text(label, [margin + 8, 170, 300, 395, 460][index], y + 16)); y += 34; };
  tableHeader();
  sites.forEach((site, index) => {
    const rows = checks.filter(row => row.site_id === site.id || row.id === site.id);
    const siteUptime = rows.length ? rows.filter(row => row.status === 'online').length / rows.length * 100 : 100;
    const siteIncidents = eventCount(rows);
    const siteTimes = rows.map(row => row.response_time_ms).filter(Number.isFinite);
    if (y > H - 70) { pageFooter(); doc.addPage(); y = 48; tableHeader(); }
    if (index % 2 === 0) { doc.setFillColor(248, 251, 249); doc.rect(margin, y - 14, W - margin * 2, 30, 'F'); }
    doc.setTextColor(siteUptime < (site.slaTarget ?? site.sla_target ?? 99) ? 155 : 35, 55, 45); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(site.name.slice(0, 24), margin + 8, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(`${site.group} / ${site.maintenance ? 'Maintenance' : site.status || 'Online'}`, 170, y);
    doc.setFont('courier', 'normal'); doc.text(`${siteUptime.toFixed(2)}% / ${site.slaTarget ?? site.sla_target ?? 99}%`, 300, y); doc.text(String(siteIncidents), 395, y); doc.text(siteTimes.length ? `${Math.round(siteTimes.reduce((a, b) => a + b, 0) / siteTimes.length)} ms` : 'N/A', 460, y);
    y += 30;
  });
  const incidentNotes = Object.entries(notes).filter(([, note]) => note.trim());
  if (incidentNotes.length) {
    if (y > H - 120) { pageFooter(); doc.addPage(); y = 48; }
    y += 20; doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(22, 55, 45); doc.text('Incident notes', margin, y); y += 16;
    doc.setFont('courier', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 70, 65);
    incidentNotes.forEach(([id, note]) => { const site = sites.find(item => item.id === id); doc.text(`${site?.name || id}: ${note.slice(0, 90)}`, margin, y); y += 13; });
  }
  pageFooter();
  doc.save(`strata-systems-report-${month}.pdf`);
}
