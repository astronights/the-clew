import { useCallback, useEffect, useState } from 'react';
import { validateChain, WEEKDAY_DIFFICULTY, type ChainPuzzle, type StoredPuzzle } from '../lib/chain';
import { dateOfPuzzle, libraryPuzzleFor, puzzleNumber } from '../lib/daily';

const TOKEN_KEY = 'clew:admin-token';
const DAYS = 8; // today + the next 7

function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}
function writeToken(t: string) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* session storage unavailable: token lives in memory only */
  }
}

async function call<T>(token: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const fmtDate = (no: number) =>
  dateOfPuzzle(no).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export function Admin() {
  const [token, setToken] = useState(readToken);
  const [draftToken, setDraftToken] = useState('');
  const [puzzles, setPuzzles] = useState<Record<number, StoredPuzzle>>({});
  const [busy, setBusy] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState('');
  const today = puzzleNumber();
  const days = Array.from({ length: DAYS }, (_, i) => today + i);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const r = await call<{ puzzles: StoredPuzzle[] }>(token, `/api/admin/puzzles?from=${today}&days=${DAYS}`);
      setPuzzles(Object.fromEntries(r.puzzles.map((p) => [p.puzzleNo, p])));
      setMsg('');
    } catch (e) {
      setMsg((e as Error).message);
      if (/token/i.test((e as Error).message)) {
        writeToken('');
        setToken('');
      }
    }
  }, [token, today]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (no: number, label: string, fn: () => Promise<unknown>) => {
    setBusy((b) => ({ ...b, [no]: label }));
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMsg(`No. ${no}: ${(e as Error).message}`);
    } finally {
      setBusy((b) => {
        const { [no]: _, ...rest } = b;
        return rest;
      });
    }
  };

  const generate = (no: number, extra = '') => act(no, 'Writing…', () => call(token, '/api/admin/generate', { puzzleNo: no, extra }));

  const generateMissing = async () => {
    const todo = days.filter((no) => !puzzles[no] || puzzles[no].status === 'rejected');
    if (!todo.length) return setMsg('Every day already has a puzzle.');
    for (const no of todo) {
      setMsg(`Writing No. ${no} (${todo.indexOf(no) + 1} of ${todo.length})…`);
      await generate(no);
    }
    setMsg('Done. Review each day below.');
  };

  if (!token)
    return (
      <section className="admin">
        <h2>Puzzle desk</h2>
        <p className="note admin-left">Enter the ADMIN_TOKEN set on the server.</p>
        <form
          className="field-row"
          onSubmit={(e) => {
            e.preventDefault();
            writeToken(draftToken.trim());
            setToken(draftToken.trim());
          }}
        >
          <input className="input" type="password" autoComplete="current-password" aria-label="Admin token" value={draftToken} onChange={(e) => setDraftToken(e.target.value)} />
          <button className="btn btn-primary" type="submit">
            Unlock
          </button>
        </form>
        {msg && <p className="form-error">{msg}</p>}
      </section>
    );

  const approved = days.filter((no) => puzzles[no]?.status === 'approved').length;

  return (
    <section className="admin">
      <div className="admin-head">
        <h2>Puzzle desk</h2>
        <button
          className="btn btn-link"
          onClick={() => {
            writeToken('');
            setToken('');
          }}
        >
          Lock
        </button>
      </div>
      <p className="note admin-left">
        {approved} of {DAYS} days approved. Approved puzzles replace that day's built-in puzzle; other days play a built-in one.
      </p>
      <button className="btn btn-primary btn-block" onClick={generateMissing} disabled={Object.keys(busy).length > 0}>
        Write puzzles for empty days
      </button>
      {msg && (
        <p className="note admin-left" role="status">
          {msg}
        </p>
      )}
      {days.map((no) => (
        <DayCard key={no} no={no} isToday={no === today} stored={puzzles[no]} busy={busy[no]} onGenerate={(extra) => generate(no, extra)} onAct={act} token={token} />
      ))}
    </section>
  );
}

interface CardProps {
  no: number;
  isToday: boolean;
  stored?: StoredPuzzle;
  busy?: string;
  token: string;
  onGenerate: (extra: string) => void;
  onAct: (no: number, label: string, fn: () => Promise<unknown>) => Promise<void>;
}

function DayCard({ no, isToday, stored, busy, token, onGenerate, onAct }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [extra, setExtra] = useState('');
  const p = stored?.data;
  const status = stored?.status ?? 'empty';
  const fallback = libraryPuzzleFor(no);
  const parsed = (() => {
    try {
      return JSON.parse(text) as ChainPuzzle;
    } catch {
      return null;
    }
  })();
  const editErrors = editing ? (parsed ? validateChain(parsed) : ['not valid JSON']) : [];
  const post = (body: object) => call(token, '/api/admin/puzzles', { puzzleNo: no, ...body });

  return (
    <article className={`day is-${status}`}>
      <header className="day-head">
        <div>
          <strong>
            No. {no} · {fmtDate(no)}
          </strong>
          {isToday && <span className="chip">live today</span>}
          <div className="note admin-left">target difficulty {WEEKDAY_DIFFICULTY[dateOfPuzzle(no).getUTCDay()]}/5</div>
        </div>
        <span className={`chip status-${status}`}>{status}</span>
      </header>

      {!p && <p className="note admin-left">No AI puzzle yet. If none is approved, this day plays the built-in puzzle: “{fallback.connection}” ({fallback.clues.join(', ')} → {fallback.answer})</p>}

      {p && !editing && (
        <div className="day-body">
          <ol className="day-clues">
            {p.clues.map((c, i) => {
              const alt = (p.clueAnswers?.[i] ?? []).filter((x) => x !== c);
              return (
                <li key={i}>
                  {c}
                  {alt.length > 0 && <span className="note"> · guess: {alt.join(', ')}</span>}
                </li>
              );
            })}
            <li className="is-answer">
              {p.answer}
              {p.acceptedAnswers.length > 1 && <span className="note"> · also {p.acceptedAnswers.filter((a) => a !== p.answer).join(', ')}</span>}
            </li>
          </ol>
          <p>
            <strong>{p.connection}</strong>
          </p>
          <p className="admin-small">{p.explanation}</p>
          <p className="admin-small">
            {p.category} · difficulty {p.difficulty}/5{p.topical?.used ? ` · topical: ${p.topical.note}` : ''}
          </p>
          <details>
            <summary className="admin-small">Accepted phrasings ({p.acceptedPhrasings.length}){p.sources?.length ? ` · sources (${p.sources.length})` : ''}</summary>
            <ul className="admin-small">
              {p.acceptedPhrasings.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            {p.sources?.length ? <p className="admin-small">Sources: {p.sources.join(' · ')}</p> : null}
          </details>
          {stored!.errors.length > 0 && (
            <ul className="form-error">
              {stored!.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <div className="day-body">
          <textarea className="input admin-json" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} aria-label={`Puzzle ${no} JSON`} />
          {editErrors.length > 0 && <p className="form-error">{editErrors.join('; ')}</p>}
          <div className="btn-row">
            <button className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!parsed}
              onClick={() =>
                onAct(no, 'Saving…', async () => {
                  await post({ action: 'save', data: parsed });
                  setEditing(false);
                })
              }
            >
              Save as draft
            </button>
          </div>
        </div>
      )}

      {busy ? (
        <p className="note admin-left">{busy}</p>
      ) : (
        !editing && (
          <div className="day-actions">
            {status === 'draft' && (
              <button className="btn btn-primary" disabled={!!stored?.errors.length} onClick={() => onAct(no, 'Approving…', () => post({ action: 'approve' }))}>
                Approve
              </button>
            )}
            {status === 'approved' && (
              <button className="btn" onClick={() => onAct(no, 'Updating…', () => post({ action: 'unapprove' }))}>
                Unapprove
              </button>
            )}
            {(status === 'draft' || status === 'approved') && (
              <button className="btn" onClick={() => onAct(no, 'Rejecting…', () => post({ action: 'reject' }))}>
                Reject
              </button>
            )}
            {p && status !== 'approved' && (
              <button
                className="btn"
                onClick={() => {
                  setText(JSON.stringify(p, null, 2));
                  setEditing(true);
                }}
              >
                Edit
              </button>
            )}
            {status !== 'approved' && (
              <div className="field-row day-regen">
                <input className="input" placeholder="note for the writer (optional)" value={extra} onChange={(e) => setExtra(e.target.value)} aria-label="Note for the writer" />
                <button className="btn" onClick={() => onGenerate(extra)}>
                  {p ? 'Rewrite' : 'Write'}
                </button>
              </div>
            )}
          </div>
        )
      )}
    </article>
  );
}
