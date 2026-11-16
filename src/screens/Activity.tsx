import { useCallback, useEffect, useState } from 'react';
import { call } from '../lib/adminCall';
import { dateOfPuzzle } from '../lib/daily';

type Verdict = 'correct' | 'close' | 'wrong';

interface Guess {
  id: number;
  at: string;
  row: number | null;
  guess: string;
  verdict: Verdict;
  model: string | null;
  reason: string | null;
  pCorrect: number | null;
  ms: number | null;
}

interface Data {
  today: number;
  puzzleNo: number;
  puzzle: { connection: string; clues: string[] } | null;
  /** [gave up / missed, solved on row 1..5] */
  counts: number[];
  guesses: Guess[];
  top: { guess: string; n: number; correct: number; close: number }[];
  days: { puzzleNo: number; plays: number; solved: number; guesses: number }[];
}

const VERDICT_TEXT: Record<Verdict, string> = { correct: 'correct', close: 'close', wrong: 'wrong' };
const fmtDay = (no: number) => dateOfPuzzle(no).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');

/** Desk tab: who played, how they did, and every rule guess with the judge's verdict and reasoning. */
export function Activity({ token, onLock }: { token: string; onLock: () => void }) {
  const [no, setNo] = useState<number | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Verdict | 'all'>('all');

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setData(await call<Data>(token, `/api/admin/activity${no ? `?no=${no}` : ''}`));
    } catch (e) {
      const m = (e as Error).message;
      setError(/guess_log/.test(m) ? 'The guess log table is missing: run npm run db:migrate.' : m);
      if (/token/i.test(m)) onLock();
    } finally {
      setBusy(false);
    }
  }, [token, no, onLock]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) {
    return (
      <section className="admin">
        <h2>Activity</h2>
        <p className="admin-small">{error ?? 'Loading…'}</p>
      </section>
    );
  }

  const current = data.puzzleNo;
  const plays = data.counts.reduce((a, b) => a + b, 0);
  const solved = plays - data.counts[0];
  const avgRow = solved ? data.counts.slice(1).reduce((a, c, i) => a + c * (i + 1), 0) / solved : 0;
  const maxCount = Math.max(1, ...data.counts);
  const shown = filter === 'all' ? data.guesses : data.guesses.filter((g) => g.verdict === filter);
  const byVerdict = (v: Verdict) => data.guesses.filter((g) => g.verdict === v).length;

  return (
    <section className="admin">
      <div className="admin-head">
        <h2>Activity</h2>
        <button className="btn btn-link" onClick={() => void load()} disabled={busy}>
          {busy ? 'Loading…' : 'Refresh'}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="act-daynav">
        <button className="btn btn-link" onClick={() => setNo(current - 1)} disabled={current <= 1 || busy} aria-label="Previous day">
          ‹
        </button>
        <div>
          <strong>No. {current}</strong> <span className="admin-small">{fmtDay(current)}{current === data.today ? ' · today' : ''}</span>
        </div>
        <button className="btn btn-link" onClick={() => setNo(current + 1)} disabled={current >= data.today || busy} aria-label="Next day">
          ›
        </button>
      </div>

      {data.puzzle ? (
        <div className="act-puzzle">
          <div className="act-rule">{data.puzzle.connection}</div>
          <div className="admin-small act-items">{data.puzzle.clues.join(' → ')}</div>
        </div>
      ) : (
        <p className="admin-small">No approved puzzle for this day.</p>
      )}

      <div className="act-stats">
        <Stat label="Finished" value={String(plays)} />
        <Stat label="Solved" value={pct(solved, plays)} />
        <Stat label="Avg row" value={solved ? avgRow.toFixed(1) : '–'} />
        <Stat label="Rule guesses" value={String(data.guesses.length)} />
      </div>

      <div className="admin-section">
        <div className="admin-section-head">
          <h3>Solved on</h3>
          <span className="admin-small">finished games</span>
        </div>
        <div className="act-bars">
          {[1, 2, 3, 4, 5, 0].map((r) => (
            <div key={r} className="act-bar-row">
              <span className="act-bar-label">{r ? r : '✗'}</span>
              <span className="act-bar-track">
                <span className={`act-bar${r ? '' : ' miss'}`} style={{ width: `${(data.counts[r] / maxCount) * 100}%` }} />
              </span>
              <span className="act-bar-n">{data.counts[r]}</span>
            </div>
          ))}
        </div>
      </div>

      {data.top.length > 0 && (
        <div className="admin-section">
          <div className="admin-section-head">
            <h3>Most common guesses</h3>
          </div>
          <ul className="act-top">
            {data.top.map((t) => (
              <li key={t.guess}>
                <span className="act-top-guess">{t.guess}</span>
                <span className="admin-small">
                  ×{t.n}
                  {t.correct ? ` · ${t.correct} correct` : ''}
                  {t.close ? ` · ${t.close} close` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="admin-section">
        <div className="admin-section-head">
          <h3>Rule guesses</h3>
          <span className="admin-small">newest first{data.guesses.length >= 200 ? ' · last 200' : ''}</span>
        </div>
        <div className="act-filter" role="group" aria-label="Filter by verdict">
          {(['all', 'correct', 'close', 'wrong'] as const).map((f) => (
            <button key={f} className={`act-filter-btn${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `All ${data.guesses.length}` : `${VERDICT_TEXT[f]} ${byVerdict(f)}`}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="admin-small">No guesses yet.</p>
        ) : (
          <ul className="act-guesses">
            {shown.map((g) => (
              <li key={g.id}>
                <div className="act-guess-head">
                  <span className="act-guess-text">{g.guess}</span>
                  <span className={`chip verdict-${g.verdict}`}>{VERDICT_TEXT[g.verdict]}</span>
                </div>
                {(g.reason || g.pCorrect != null) && (
                  <p className="act-reason">
                    {g.reason}
                    {g.pCorrect != null && <span className="admin-small">{g.reason ? ' · ' : ''}P(correct) {g.pCorrect.toFixed(2)}</span>}
                  </p>
                )}
                <p className="admin-small act-meta">
                  {fmtTime(g.at)}
                  {g.row ? ` · clue ${g.row} of 5` : ''}
                  {g.model ? ` · ${g.model}` : ''}
                  {g.ms != null ? ` · ${(g.ms / 1000).toFixed(1)}s` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-section">
        <div className="admin-section-head">
          <h3>Last 14 days</h3>
        </div>
        <table className="act-days">
          <thead>
            <tr>
              <th>Day</th>
              <th>Finished</th>
              <th>Solved</th>
              <th>Guesses</th>
            </tr>
          </thead>
          <tbody>
            {data.days.map((d) => (
              <tr key={d.puzzleNo} className={d.puzzleNo === current ? 'on' : ''} onClick={() => setNo(d.puzzleNo)}>
                <td>
                  No. {d.puzzleNo} <span className="admin-small">{fmtDay(d.puzzleNo)}</span>
                </td>
                <td>{d.plays}</td>
                <td>{pct(d.solved, d.plays)}</td>
                <td>{d.guesses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="act-stat">
      <div className="act-stat-value">{value}</div>
      <div className="act-stat-label">{label}</div>
    </div>
  );
}
