import { useEffect, useState } from 'react';

let listeners = [];
export const toast = message => listeners.forEach(fn => fn(message));

export default function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const push = message => {
      const id = Date.now() + Math.random();
      setItems(current => [...current, { id, message }]);
      setTimeout(() => setItems(current => current.filter(item => item.id !== id)), 4000);
    };
    listeners.push(push);
    return () => { listeners = listeners.filter(fn => fn !== push); };
  }, []);
  return <div className="toast-stack" role="status" aria-live="polite">{items.map(item => <div className="toast" key={item.id}>{item.message}</div>)}</div>;
}
