import { displayedStreak, loadStats } from '../lib/stats';

export function StatsScreen({ today }: { today: number }) {
  const s = loadStats();
  const max = Math.max(1, ...s.dist);
  const rows = [1, 2, 3, 4, 5, 0];
  return (
    <section className="card stats">
      <h2>Your stats</h2>
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
            <span className="dist-label">{k === 0 ? '✂️' : k}</span>
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
  );
}
