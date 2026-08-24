import { useEffect, useState } from 'react';

const label = { down: 'went down', recovered: 'recovered', slow: 'responded slowly' };

export default function ActivityFeed() {
  const [events, setEvents] = useState(null);
  useEffect(() => { fetch('/api/activity').then(result => result.json()).then(payload => setEvents(payload.events || [])).catch(() => setEvents([])); }, []);
  return <section className="activity-feed" aria-label="Recent activity"><h2>Recent activity</h2><div>{events === null ? 'Loading activity…' : events.length ? events.map((event, index) => <p key={index}><b>{event.siteName}</b> {label[event.type] || event.type} <time>{new Date(event.at).toLocaleString()}</time></p>) : 'No recent status changes.'}</div></section>;
}
