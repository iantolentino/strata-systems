import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import PasswordGate from './PasswordGate';
import { toast } from './Toasts';

const emptyForm = { id: '', name: '', url: '', group: 'Public Internal' };

export default function ManagePanel({ onClose, onChanged }) {
  const [sites, setSites] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [gate, setGate] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => fetch('/api/check-status').then(result => result.json()).then(payload => setSites(payload.results || [])), []);
  useEffect(() => { load().catch(() => setSites([])); }, [load]);
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape' && !busy && !gate) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, gate, onClose]);

  const submit = async password => {
    const action = form.id ? 'edit' : 'add';
    const body = { action, id: form.id || undefined, name: form.name, url: form.url, group: form.group, password };
    setBusy(true);
    try {
      const response = await fetch('/api/check-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) return toast((await response.json().catch(() => ({}))).error || 'Unable to save site.');
      setForm(emptyForm); await load(); onChanged(); toast(form.id ? `${form.name} updated.` : `${form.name} added.`);
    } finally { setBusy(false); setGate(null); }
  };

  const remove = site => setGate({
    title: 'Delete site',
    description: `${site.name} will stop being monitored. This can't be undone.`,
    onSubmit: async password => {
      setBusy(true);
      try {
        const response = await fetch('/api/check-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: site.id, password }) });
        if (!response.ok) return toast('Incorrect password or delete failed.');
        if (form.id === site.id) setForm(emptyForm);
        await load(); onChanged(); toast(`${site.name} deleted.`);
      } finally { setBusy(false); setGate(null); }
    }
  });

  return <div className="feature-overlay manage-panel" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="feature-dialog feature-wide">
      <header><div><p className="eyebrow">ENDPOINT REGISTRY</p><h2>Manage Systems</h2></div><button type="button" onClick={onClose} aria-label="Close"><X size={16}/></button></header>
      <form data-site-form onSubmit={event => { event.preventDefault(); setGate({ title: `${form.id ? 'Update' : 'Add'} site`, onSubmit: submit }); }}>
        <label>Name<input required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label>
        <label>URL<input type="url" value={form.url} onChange={event => setForm({ ...form, url: event.target.value })}/></label>
        <label>Group<select value={form.group} onChange={event => setForm({ ...form, group: event.target.value })}><option>Public</option><option>Public Internal</option><option>Private On-Premise</option></select></label>
        <div className="feature-actions"><button type="button" onClick={() => setForm(emptyForm)}>Clear</button><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save site'}</button></div>
      </form>
      <div data-site-list>{sites.map(site => <div className="managed-site" key={site.id}>
        <span><b>{site.name}</b><small>{site.group}</small></span>
        <span><button type="button" onClick={() => setForm({ id: site.id, name: site.name, url: site.url, group: site.group })}>Edit</button><button type="button" onClick={() => remove(site)}>Delete</button></span>
      </div>)}</div>
    </section>
    {gate && <PasswordGate title={gate.title} description={gate.description} busy={busy} onCancel={() => !busy && setGate(null)} onSubmit={gate.onSubmit}/>}
  </div>;
}
