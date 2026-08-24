import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowUpRight, Check, Clipboard, Moon, Plus, RefreshCw, Search, Sun, TriangleAlert, Wrench, X } from 'lucide-react';
import { sites } from './sites';
import { displayUrl, favicon, directFavicon, monthBounds, metrics, relativeTime } from './lib/format';
import { downloadMonthlyReport } from './lib/report-pdf';
import Sparkline from './components/Sparkline';
import SystemHealthCard from './components/SystemHealthCard';
import ActivityFeed from './components/ActivityFeed';
import ManagePanel from './components/ManagePanel';
import PasswordGate from './components/PasswordGate';
import ReportStatus from './components/ReportStatus';
import Toasts, { toast } from './components/Toasts';
import './styles.css';
import './modal.css';
import './dashboard.css';

const fallback = sites.map(site => ({ ...site, status: site.group === 'Private On-Premise' ? 'unmonitored' : 'online', responseTime: null, httpStatus: null }));
const themePreference = () => { try { return localStorage.getItem('strata-theme') === 'dark'; } catch { return false; } };

function App() {
  const [data, setData] = useState({ results: fallback, checkedAt: 0, maintenance: {} });
  const [report, setReport] = useState({ sites: fallback, checks: [] });
  const [stale, setStale] = useState(false);
  const [checking, setChecking] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All');
  const [dark, setDark] = useState(themePreference);
  const [copied, setCopied] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState({});
  const [maintenanceGate, setMaintenanceGate] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => { try { localStorage.setItem('strata-theme', dark ? 'dark' : 'light'); } catch { /* storage unavailable */ } }, [dark]);
  useEffect(() => { const ticker = setInterval(() => setTick(value => value + 1), 15000); return () => clearInterval(ticker); }, []);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const refresh = () => fetch('/api/check-status').then(result => result.json()).then(payload => { setData(payload); setStale(false); }).catch(() => setStale(true));
  const loadReport = month => { const { from, to } = monthBounds(month); return fetch(`/api/report?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`).then(result => result.json()); };

  useEffect(() => { refresh(); const timer = setInterval(refresh, 120000); return () => clearInterval(timer); }, []);
  useEffect(() => { loadReport(reportMonth).then(setReport).catch(() => {}); }, [reportMonth]);

  const reportBySite = useMemo(() => Object.fromEntries((report.sites || []).map(site => [site.id, metrics((report.checks || []).filter(check => check.site_id === site.id || check.id === site.id), site)])), [report]);
  const filtered = useMemo(() => data.results.filter(site => (group === 'All' || site.group === group) && site.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => (a.status === 'offline' ? -1 : 1) - (b.status === 'offline' ? -1 : 1)), [data.results, query, group]);

  const publicSites = data.results.filter(site => site.group !== 'Private On-Premise');
  const currentMetrics = publicSites.map(site => reportBySite[site.id]).filter(Boolean);
  const down = data.results.filter(site => site.status === 'offline' && !data.maintenance[site.id] && site.group !== 'Private On-Premise').length;
  const overallUptime = currentMetrics.length ? currentMetrics.reduce((sum, item) => sum + item.uptime, 0) / currentMetrics.length : 100;
  const incidentTotal = currentMetrics.reduce((sum, item) => sum + item.incidents, 0);
  const averages = currentMetrics.map(item => item.average).filter(Number.isFinite);
  const overallAverage = averages.length ? Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length) : null;
  const slowest = data.results.map(site => ({ site, stats: reportBySite[site.id] })).filter(item => item.stats?.slow).sort((a, b) => b.stats.average - a.stats.average)[0];
  const checkedAgo = data.checkedAt ? Math.max(0, Math.round((Date.now() - data.checkedAt) / 1000)) : null;

  const toggleMaintenance = site => setMaintenanceGate({ site, maintenance: !data.maintenance[site.id] });
  const confirmMaintenance = async password => {
    const { site, maintenance } = maintenanceGate;
    try {
      const result = await fetch('/api/check-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: site.id, maintenance, password }) });
      if (result.ok) { setData({ ...data, maintenance: (await result.json()).maintenance }); toast(`Maintenance ${maintenance ? 'enabled' : 'disabled'} for ${site.name}.`); }
      else toast('Incorrect password.');
    } finally { setMaintenanceGate(null); }
  };
  const checkAllNow = async () => { setChecking(true); try { await fetch('/api/check-status?manual=1'); await refresh(); } catch { setStale(true); } finally { setChecking(false); } };
  const exportReport = async () => { setExporting(true); try { await downloadMonthlyReport({ month: reportMonth, notes }); toast(`Report for ${reportMonth} downloaded.`); } catch (error) { toast(error.message); } finally { setExporting(false); } };
  const share = () => { navigator.clipboard?.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const groupCounts = groupName => data.results.filter(site => groupName === 'All' || site.group === groupName).length;

  return <div className={dark ? 'app dark' : 'app'}>
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><Activity size={17}/></span><span>STRATA <b>SYSTEMS</b></span></div>
      <div className="actions">
        <span className="env-label">PRODUCTION / LIVE</span>
        <button className="add-site" onClick={() => setManageOpen(true)}><Plus size={14}/> Manage Systems</button>
        <button className="icon-btn" onClick={() => setDark(!dark)} aria-label="Toggle dark mode">{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>
        <button className="share" onClick={share}>{copied ? <Check size={14}/> : <Clipboard size={14}/>} {copied ? 'Copied' : 'Copy link'}</button>
      </div>
    </header>
    <main>
      <section className="masthead">
        <div>
          <p className="eyebrow">OPERATIONS / ENDPOINT MONITOR</p>
          <h1>System status</h1>
          <p className="subhead">Strata Staff Global infrastructure — scheduled daily checks, on-demand rechecks anytime.</p>
        </div>
        <div className={`system-pill ${down ? 'danger' : 'healthy'}`}>
          <span className="pulse"/>
          <div><strong>{down ? `${down} system${down > 1 ? 's' : ''} down` : 'All systems operational'}</strong><small>{checkedAgo === null ? 'Checking now…' : `Last checked ${relativeTime(checkedAgo)} ago`}</small></div>
        </div>
      </section>
      {stale && <section className="stale-banner">Live status unavailable right now — showing the last known data.</section>}
      <section className="summary-grid">
        <div><span>Systems monitored</span><strong>{data.results.length}</strong><small>Public {groupCounts('Public')} · Internal {groupCounts('Public Internal')} · Private {groupCounts('Private On-Premise')}</small></div>
        <div><span>Average uptime</span><strong>{overallUptime.toFixed(2)}%</strong><small>Non-private systems · {reportMonth}</small></div>
        <div><span>Incidents this month</span><strong>{incidentTotal}</strong><small>Distinct downtime events</small></div>
        <div><span>Average response</span><strong>{overallAverage ? `${overallAverage} ms` : 'N/A'}</strong><small>{slowest ? <b className="slow-callout"><TriangleAlert size={12}/> Slow: {slowest.site.name}</b> : 'Within normal range'}</small></div>
        <SystemHealthCard/>
      </section>
      <section className="toolbar">
        <label className="search"><Search size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter endpoints…" aria-label="Search systems"/>{query && <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search"><X size={13}/></button>}</label>
        <div className="report-tools">
          <button className="export-report" onClick={checkAllNow} disabled={checking}><RefreshCw size={13}/> {checking ? 'Checking…' : 'Check All Now'}</button>
          <label className="month-picker">REPORT MONTH<input type="month" value={reportMonth} onChange={event => setReportMonth(event.target.value)}/></label>
          <button className="export-report" onClick={exportReport} disabled={exporting}>{exporting ? 'Building…' : 'Export report'}</button>
        </div>
      </section>
      <nav className="group-tabs" aria-label="Filter by group">{['All', 'Public', 'Public Internal', 'Private On-Premise'].map(tab => <button className={group === tab ? 'active' : ''} onClick={() => setGroup(tab)} key={tab}>{tab}<b>{groupCounts(tab)}</b></button>)}</nav>
      <section className="status-table" aria-label="Monitored systems">
        <div className="table-head"><span>SYSTEM / TYPE</span><span>STATUS</span><span>RESPONSE</span><span>UPTIME / SLA</span><span>INCIDENTS</span><span>ACTION</span></div>
        {filtered.map(site => {
          const maintenance = data.maintenance[site.id];
          const status = maintenance ? 'maintenance' : site.status;
          const stats = reportBySite[site.id] || metrics([], site);
          const siteChecks = (report.checks || []).filter(check => check.site_id === site.id || check.id === site.id);
          const unmonitored = site.group === 'Private On-Premise';
          return <article className={`status-row ${status}`} key={site.id}>
            <button className="site-main" onClick={() => setSelected(site)}>
              <span className="site-heading">
                <img src={favicon(site.url)} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = directFavicon(site.url); }} alt=""/>
                <span><strong>{site.name}</strong><em>{displayUrl(site.url)}</em><small>{site.group}</small></span>
                <a className="external" href={site.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${site.name}`} onClick={event => event.stopPropagation()}><ArrowUpRight size={16}/></a>
              </span>
            </button>
            <span className={`status ${status}`}><i/>{status}{status === 'offline' && site.downSince && <small className="down-since" title={new Date(site.downSince).toLocaleString()}>Down {relativeTime(Math.max(0, (Date.now() - Date.parse(site.downSince)) / 1000))} ago</small>}</span>
            <span className="response-cell"><strong className="response-value">{unmonitored ? 'N/A' : site.responseTime ? `${site.responseTime} ms` : '—'}</strong>{stats.slow && <small className="slow-label" title="Average response above 2000 ms this month">SLOW</small>}</span>
            <span className={`uptime ${stats.belowSla ? 'below-sla' : ''}`}>{unmonitored ? 'Excluded' : `${stats.uptime.toFixed(2)}%`} {stats.belowSla && <TriangleAlert size={12} title="Uptime is below the SLA target this month"/>}<small>{unmonitored ? 'on-premise' : `SLA ${site.slaTarget ?? 99}%`}</small></span>
            <span className="incident">{stats.incidents}</span>
            <button className={`maintenance ${maintenance ? 'active' : ''}`} onClick={() => toggleMaintenance(site)} title={`${maintenance ? 'Disable' : 'Enable'} maintenance mode for ${site.name}`}><Wrench size={13}/>{maintenance ? 'Maintenance' : 'Set maintenance'}</button>
            {notes[site.id] === undefined && stats.incidents > 0 && <button className="note-trigger" onClick={() => setNotes({ ...notes, [site.id]: '' })}>Add note</button>}
            {notes[site.id] !== undefined && <input className="inline-note" value={notes[site.id]} onChange={event => setNotes({ ...notes, [site.id]: event.target.value })} placeholder="Incident note for PDF"/>}
            <span className="row-spark"><Sparkline checks={siteChecks}/></span>
          </article>;
        })}
        {filtered.length === 0 && <div className="empty-state">No systems match{query ? ` "${query}"` : ''} in {group === 'All' ? 'any group' : group}. <button type="button" onClick={() => { setQuery(''); setGroup('All'); }}>Reset filters</button></div>}
      </section>
      <ActivityFeed/>
    </main>
    <footer>
      <span><span className="footer-dot"/> Monitoring {data.results.length} endpoints</span>
      <ReportStatus/>
      <span>Auto-refreshes daily on Hobby plan</span>
    </footer>
    {selected && (() => {
      const selectedChecks = (report.checks || []).filter(check => check.site_id === selected.id || check.id === selected.id);
      const selectedStats = metrics(selectedChecks, selected);
      const times = selectedChecks.map(check => check.response_time_ms).filter(Number.isFinite);
      return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && setSelected(null)}>
        <div className="detail-modal">
          <div className="modal-head"><div><p className="eyebrow">RESPONSE HISTORY</p><h2>{selected.name}</h2><p className="modal-note">{reportMonth} · {selected.group}</p></div><button className="icon-btn" onClick={() => setSelected(null)} aria-label="Close"><X size={16}/></button></div>
          <div className="modal-stats">
            <span><small>Uptime</small><strong>{selectedStats.uptime.toFixed(2)}%</strong></span>
            <span><small>Incidents</small><strong>{selectedStats.incidents}</strong></span>
            <span><small>Avg response</small><strong>{times.length ? `${Math.round(selectedStats.average)} ms` : 'N/A'}</strong></span>
            <span><small>Fastest</small><strong>{times.length ? `${Math.min(...times)} ms` : 'N/A'}</strong></span>
          </div>
          <Sparkline checks={selectedChecks}/>
          <p className="chart-caption">Response time samples for the selected period. Private on-premise systems are not checked from Vercel.</p>
        </div>
      </div>;
    })()}
    {manageOpen && <ManagePanel onClose={() => setManageOpen(false)} onChanged={refresh}/>}
    {maintenanceGate && <PasswordGate title={`${maintenanceGate.maintenance ? 'Enable' : 'Disable'} maintenance`} description={`${maintenanceGate.site.name} will be marked as under maintenance.`} onCancel={() => setMaintenanceGate(null)} onSubmit={confirmMaintenance}/>}
    <Toasts/>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
