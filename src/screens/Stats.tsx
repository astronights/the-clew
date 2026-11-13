import { ROWS as CLUE_COUNT } from '../lib/puzzle';
import { useEffect } from 'react';
import { displayedStreak, loadStats } from '../lib/stats';

export function StatsScreen({ today, onClose }: { today: number; onClose: () => void }) {
  const s = loadStats();
  const max = Math.max(1, ...s.dist);
  const rows = [...Array.from({ length: CLUE_COUNT }, (_, i) => i + 1), 0];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal stats" role="dialog" aria-modal="true" aria-labelledby="stats-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id="stats-title">Your stats</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" autoFocus>
            ✕
          </button>
        </div>
      <dl className="stat-grid">
        <div>
          <dt>Played</dt>
          <dd>{s.played}</dd>
        </div>
        <div>
          <dt>Solved</dt>
          <dd>{s.played ? Math.round((s.solved / s.played) * 100) : 0}%</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>{displayedStreak(s, today)}</dd>
        </div>
        <div>
          <dt>Best</dt>
          <dd>{s.maxStreak}</dd>
        </div>
      </dl>
      <h3>Solved on clue</h3>
      <ul className="dist" aria-label="Distribution of results">
        {rows.map((k) => (
          <li key={k} className="dist-row">
            <span className="dist-label">{k === 0 ? '✗' : k}</span>
            <span className="dist-track">
              <span className={`dist-bar ${k === 0 ? 'is-fail' : ''}`} style={{ width: `${(s.dist[k] / max) * 100}%` }}>
                {s.dist[k]}
              </span>
            </span>
            <span className="sr-only">{k === 0 ? 'Unsolved' : `Clue ${k}`}: {s.dist[k]}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">Stats live only on this device. No accounts, no tracking.</p>
      </section>
    </div>
  );
}
