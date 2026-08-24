import { useEffect, useState } from 'react';

export default function ReportStatus() {
  const [report, setReport] = useState(null);
  useEffect(() => { fetch('/api/report-status').then(result => result.json()).then(setReport).catch(() => setReport({ error: true })); }, []);
  if (!report) return <span>Checking report status…</span>;
  if (report.error) return <span>Report status unavailable</span>;
  if (report.status === 'sent') return <span>Last report sent: {new Date(report.sent_at).toLocaleString()} ✓</span>;
  if (report.status === 'failed') return <span>Last report failed — {report.reason || 'unknown error'}</span>;
  return <span>No automated report sent yet</span>;
}
