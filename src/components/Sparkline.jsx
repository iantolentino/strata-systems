export default function Sparkline({ checks }) {
  const points = checks.slice(-40).map((check, index, values) => { const time = check.response_time_ms ?? check.responseTime ?? 0; const max = Math.max(...values.map(item => item.response_time_ms ?? item.responseTime ?? 0), 1); return `${(index / Math.max(values.length - 1, 1)) * 220},${42 - (time / max) * 34}`; }).join(' ');
  return <svg className="sparkline" viewBox="0 0 220 44" role="img" aria-label="Response time history"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2"/></svg>;
}
