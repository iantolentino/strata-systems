import { useEffect, useState } from 'react';

export default function SystemHealthCard() {
  const [health, setHealth] = useState(null);
  useEffect(() => { fetch('/api/report').then(result => result.json()).then(report => {
    const rows = report.checks || [];
    const uptime = rows.length ? rows.filter(row => row.status === 'online').length / rows.length * 100 : 100;
    const times = rows.map(row => row.response_time_ms).filter(Number.isFinite);
    const performance = times.length ? Math.max(0, 100 - times.reduce((a, b) => a + b, 0) / times.length / 20) : null;
    setHealth(performance === null ? Math.round(uptime) : Math.max(0, Math.min(100, Math.round(uptime * 0.7 + performance * 0.3))));
  }).catch(() => setHealth('N/A')); }, []);
  return <div><span>System health</span><strong>{health === null ? 'Calculating…' : typeof health === 'number' ? `System Health: ${health}%` : `System Health: ${health}`}</strong><small>Uptime + response performance</small></div>;
}
