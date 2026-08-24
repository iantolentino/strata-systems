import { describe, it, expect } from 'vitest';
import { monthBounds, previousMonth, eventCount, metrics, favicon, directFavicon } from './format';

describe('monthBounds', () => {
  it('returns UTC start and end of the month', () => {
    const { from, to } = monthBounds('2026-08');
    expect(from).toBe('2026-08-01T00:00:00.000Z');
    expect(to).toBe('2026-08-31T23:59:59.999Z');
  });
  it('handles short months', () => {
    const { to } = monthBounds('2026-02');
    expect(to).toBe('2026-02-28T23:59:59.999Z');
  });
});

describe('previousMonth', () => {
  it('steps back within the year', () => {
    expect(previousMonth('2026-08')).toBe('2026-07');
  });
  it('crosses the year boundary', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
  });
});

describe('eventCount', () => {
  it('counts distinct downtime events, not every offline check', () => {
    const checks = [
      { status: 'online' },
      { status: 'offline' },
      { status: 'offline' },
      { status: 'offline' },
      { status: 'online' },
      { status: 'offline' }
    ];
    expect(eventCount(checks)).toBe(2);
  });
  it('returns zero when everything is online or empty', () => {
    expect(eventCount([])).toBe(0);
    expect(eventCount([{ status: 'online' }, { status: 'online' }])).toBe(0);
  });
});

describe('favicon', () => {
  it('builds the google favicon url from a valid site url', () => {
    expect(favicon('https://example.com/path')).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=64');
    expect(directFavicon('https://example.com/path')).toBe('https://example.com/favicon.ico');
  });
  it('returns an empty string for missing or invalid urls instead of throwing', () => {
    expect(favicon('')).toBe('');
    expect(favicon('not-a-url')).toBe('');
    expect(directFavicon('')).toBe('');
  });
});

describe('metrics', () => {
  const site = { group: 'Public Internal', slaTarget: 99 };
  it('computes uptime, incidents and average response', () => {
    const checks = [
      { status: 'online', response_time_ms: 100 },
      { status: 'offline', response_time_ms: null },
      { status: 'online', response_time_ms: 300 }
    ];
    const stats = metrics(checks, site);
    expect(stats.uptime).toBeCloseTo(66.666, 2);
    expect(stats.incidents).toBe(1);
    expect(stats.average).toBe(200);
    expect(stats.slow).toBe(false);
  });
  it('flags slow only above a 2000 ms average', () => {
    expect(metrics([{ status: 'online', response_time_ms: 2100 }, { status: 'online', response_time_ms: 2500 }], site).slow).toBe(true);
    expect(metrics([{ status: 'online', response_time_ms: 1500 }, { status: 'online', response_time_ms: 1600 }], site).slow).toBe(false);
  });
  it('marks below-SLA for public sites under target', () => {
    const checks = [{ status: 'online' }, { status: 'offline' }, { status: 'offline' }];
    expect(metrics(checks, site).belowSla).toBe(true);
    expect(metrics(checks, { ...site, slaTarget: 30 }).belowSla).toBe(false);
  });
  it('excludes private on-premise sites from SLA math', () => {
    const checks = [{ status: 'online' }, { status: 'offline' }];
    expect(metrics(checks, { group: 'Private On-Premise', slaTarget: 99 }).belowSla).toBe(false);
  });
  it('treats an empty history as perfect uptime with no average', () => {
    const stats = metrics([], site);
    expect(stats.uptime).toBe(100);
    expect(stats.incidents).toBe(0);
    expect(stats.average).toBeNull();
  });
});
