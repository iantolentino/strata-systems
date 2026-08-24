import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function PasswordGate({ title, description, busy, onCancel, onSubmit }) {
  const [password, setPassword] = useState('');
  useEffect(() => {
    const onKey = event => { if (event.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return <div className="feature-overlay" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <form className="feature-dialog" onSubmit={event => { event.preventDefault(); onSubmit(password); }}>
      <header><h2>{title}</h2><button type="button" onClick={onCancel} disabled={busy} aria-label="Close"><X size={15}/></button></header>
      {description && <p className="gate-description">{description}</p>}
      <label>Password<input autoFocus value={password} onChange={event => setPassword(event.target.value)} type="password" inputMode="numeric" autoComplete="off" required/></label>
      <div className="feature-actions"><button type="button" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" disabled={busy}>{busy ? 'Working…' : 'Confirm'}</button></div>
    </form>
  </div>;
}
