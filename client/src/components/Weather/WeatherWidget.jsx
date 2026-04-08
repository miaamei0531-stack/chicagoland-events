import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_API_BASE_URL;

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Small weather widget shown at the top of the events list.
 * Shows today's weather; clicking expands to show weekend forecast.
 */
export default function WeatherWidget() {
  const [today, setToday] = useState(null);
  const [weekend, setWeekend] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const dateStr = getTodayStr();
    fetch(`${BASE}/weather?date=${dateStr}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setToday(data))
      .catch(() => null);

    fetch(`${BASE}/weather`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setWeekend(data))
      .catch(() => null);
  }, []);

  if (!today) return null;

  return (
    <div className="mx-3 mt-2 mb-1">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl theme-surface2 border border-[var(--border-subtle)] text-sm hover:border-[var(--accent)] transition-colors"
      >
        <span className="theme-text font-medium">
          {today.emoji} {today.tempHighF}°F · {today.summary}
        </span>
        <span className="theme-faint text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && weekend && (
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <div className="px-3 py-2.5 rounded-xl theme-surface2 border border-[var(--border-subtle)] text-center">
            <p className="text-xs font-semibold theme-muted uppercase tracking-wider mb-1">Saturday</p>
            <p className="text-lg">{weekend.saturday?.emoji}</p>
            <p className="text-sm font-semibold theme-text">{weekend.saturday?.tempHighF}°F</p>
            <p className="text-xs theme-faint leading-tight mt-0.5">{weekend.saturday?.summary}</p>
          </div>
          <div className="px-3 py-2.5 rounded-xl theme-surface2 border border-[var(--border-subtle)] text-center">
            <p className="text-xs font-semibold theme-muted uppercase tracking-wider mb-1">Sunday</p>
            <p className="text-lg">{weekend.sunday?.emoji}</p>
            <p className="text-sm font-semibold theme-text">{weekend.sunday?.tempHighF}°F</p>
            <p className="text-xs theme-faint leading-tight mt-0.5">{weekend.sunday?.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}
