import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CHAIN_CLUES, validateChain, WEEKDAY_DIFFICULTY, type ChainPuzzle, type StoredPuzzle } from '../lib/chain';
import { dateOfPuzzle, libraryPuzzleFor, puzzleNumber } from '../lib/daily';

const TOKEN_KEY = 'clew:admin-token';
const REVIEW_DAYS = 8; // today + the next 7

/* ---------- small helpers ---------- */

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

const fmtDate = (no: number, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  dateOfPuzzle(no).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });

const noForDate = (y: number, m: number, d: number) => puzzleNumber(Date.UTC(y, m, d, 12));

/** The built-in puzzle a day falls back to, without its library id. */
function builtIn(no: number): ChainPuzzle {
  const { id: _id, ...p } = libraryPuzzleFor(no);
  return p;
}

const splitList = (s: string) =>
  s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

type StatusKey = 'approved' | 'draft' | 'rejected' | 'builtin';
const statusOf = (stored?: StoredPuzzle): StatusKey => (stored ? stored.status : 'builtin');
const STATUS_TEXT: Record<StatusKey, string> = { approved: 'approved', draft: 'needs review', rejected: 'rejected', builtin: 'built-in' };

/* ---------- entry: login or desk ---------- */

export function Admin() {
  const [token, setToken] = useState(readToken);
  const lock = () => {
    writeToken('');
    setToken('');
  };
  if (!token)
    return (
      <Login
        onUnlock={(t) => {
          writeToken(t);
          setToken(t);
        }}
      />
    );
  return <Desk token={token} onLock={lock} />;
}

function Login({ onUnlock }: { onUnlock: (token: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <section className="login">
      <h2>Puzzle desk</h2>
      <p className="admin-small">Enter the admin password (ADMIN_TOKEN).</p>
      <form
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onUnlock(value.trim());
        }}
      >
        <label className="field-label" htmlFor="admin-token">
          Password
        </label>
        <input id="admin-token" className="input" type="password" autoComplete="current-password" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn btn-primary btn-block" type="submit" disabled={!value.trim()}>
          Unlock
        </button>
      </form>
    </section>
  );
}

/* ---------- desk ---------- */

function Desk({ token, onLock }: { token: string; onLock: () => void }) {
  const today = puzzleNumber();
  const todayDate = dateOfPuzzle(today);
  const [month, setMonth] = useState({ y: todayDate.getUTCFullYear(), m: todayDate.getUTCMonth() });
  const [stored, setStored] = useState<Record<number, StoredPuzzle>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [writing, setWriting] = useState<string | null>(null);

  const load = useCallback(
    async (from: number, days: number) => {
      try {
        const r = await call<{ puzzles: StoredPuzzle[] }>(token, `/api/admin/puzzles?from=${Math.max(1, from)}&days=${days}`);
        setStored((s) => {
          const next = { ...s };
          for (let n = from; n < from + days; n++) delete next[n];
          for (const p of r.puzzles) next[p.puzzleNo] = p;
          return next;
        });
      } catch (e) {
        setMsg((e as Error).message);
        if (/token/i.test((e as Error).message)) onLock();
      }
    },
    [token, onLock],
  );

  const monthFirst = noForDate(month.y, month.m, 1);
  const monthDays = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  useEffect(() => {
    void load(today, REVIEW_DAYS);
  }, [load, today]);
  useEffect(() => {
    void load(monthFirst, monthDays);
  }, [load, monthFirst, monthDays]);

  const refreshDay = (no: number) => load(no, 1);

  const reviewDays = Array.from({ length: REVIEW_DAYS }, (_, i) => today + i);
  const waiting = reviewDays.filter((no) => stored[no]?.status === 'draft').length;

  const writeEmpty = async () => {
    const todo = reviewDays.filter((no) => !stored[no] || stored[no].status === 'rejected');
    if (!todo.length) return setMsg('Every day this week already has an AI puzzle.');
    for (const [i, no] of todo.entries()) {
      setWriting(`Writing No. ${no} (${i + 1} of ${todo.length})…`);
      try {
        await call(token, '/api/admin/generate', { puzzleNo: no });
      } catch (e) {
        setMsg(`No. ${no}: ${(e as Error).message}`);
      }
      await refreshDay(no);
    }
    setWriting(null);
    setMsg('Done. Open each day to review it.');
  };

  return (
    <section className="admin">
      <div className="admin-head">
        <h2>Puzzle desk</h2>
        <button className="btn btn-link" onClick={onLock}>
          Lock
        </button>
      </div>

      <div className="admin-section">
        <div className="admin-section-head">
          <h3>This week</h3>
          <span className="admin-small">{waiting ? `${waiting} waiting for review` : 'nothing waiting'}</span>
        </div>
        <ul className="review-list">
          {reviewDays.map((no) => {
            const st = statusOf(stored[no]);
            const p = stored[no]?.data ?? builtIn(no);
            return (
              <li key={no}>
                <button className="review-row" onClick={() => setSelected(no)}>
                  <span className="review-date">
                    {fmtDate(no)}
                    {no === today && <span className="chip">today</span>}
                  </span>
                  <span className="review-title">{p.connection}</span>
                  <span className={`chip status-${st}`}>{STATUS_TEXT[st]}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button className="btn btn-primary btn-block" onClick={writeEmpty} disabled={!!writing}>
          {writing ?? 'Write AI puzzles for empty days'}
        </button>
        {msg && (
          <p className="admin-small" role="status">
            {msg}
          </p>
        )}
      </div>

      <div className="admin-section">
        <Calendar
          month={month}
          today={today}
          stored={stored}
          onMonth={(delta) => setMonth(({ y, m }) => ({ y: m + delta < 0 ? y - 1 : m + delta > 11 ? y + 1 : y, m: (m + delta + 12) % 12 }))}
          onPick={setSelected}
        />
      </div>

      {selected !== null && (
        <DayEditor
          key={selected}
          no={selected}
          today={today}
          stored={stored[selected]}
          token={token}
          onClose={() => setSelected(null)}
          onChanged={() => refreshDay(selected)}
        />
      )}
    </section>
  );
}

/* ---------- calendar ---------- */

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function Calendar({
  month,
  today,
  stored,
  onMonth,
  onPick,
}: {
  month: { y: number; m: number };
  today: number;
  stored: Record<number, StoredPuzzle>;
  onMonth: (delta: number) => void;
  onPick: (no: number) => void;
}) {
  const first = new Date(Date.UTC(month.y, month.m, 1));
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const cells = useMemo(() => [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)], [lead, daysInMonth]);
  const label = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="calendar">
      <div className="calendar-head">
        <button className="icon-btn" onClick={() => onMonth(-1)} aria-label="Previous month">
          ‹
        </button>
        <h3>{label}</h3>
        <button className="icon-btn" onClick={() => onMonth(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="calendar-grid" role="grid" aria-label={label}>
        {WEEKDAYS.map((w, i) => (
          <span key={`w${i}`} className="calendar-wd" aria-hidden="true">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`e${i}`} />;
          const no = noForDate(month.y, month.m, d);
          if (no < 1) return <span key={d} className="calendar-day is-before">{d}</span>;
          const st = statusOf(stored[no]);
          const when = no < today ? 'is-past' : no === today ? 'is-today' : 'is-future';
          return (
            <button
              key={d}
              className={`calendar-day ${when} status-${st}`}
              onClick={() => onPick(no)}
              aria-label={`${fmtDate(no, { weekday: 'long', day: 'numeric', month: 'long' })}, No. ${no}, ${STATUS_TEXT[st]}`}
            >
              <span className="calendar-num">{d}</span>
              <span className="calendar-dot" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <p className="calendar-key admin-small">
        <span className="calendar-dot status-approved" /> approved AI
        <span className="calendar-dot status-draft" /> needs review
        <span className="calendar-dot status-builtin" /> built-in
      </p>
    </div>
  );
}

/* ---------- day editor ---------- */

interface EditorProps {
  no: number;
  today: number;
  stored?: StoredPuzzle;
  token: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

function DayEditor({ no, today, stored, token, onClose, onChanged }: EditorProps) {
  const past = no < today;
  // past days show what actually played: the approved AI puzzle, otherwise the built-in one
  const playedAi = stored?.status === 'approved';
  const base: ChainPuzzle = past ? (playedAi ? stored!.data : builtIn(no)) : (stored?.data ?? builtIn(no));
  const [draft, setDraft] = useState<ChainPuzzle>(base);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState('');
  const st = statusOf(stored);
  const problems = validateChain(draft);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // when the stored puzzle changes (after save / AI), show it again
  useEffect(() => {
    setDraft(past ? (stored?.status === 'approved' ? stored.data : builtIn(no)) : (stored?.data ?? builtIn(no)));
    setDirty(false);
  }, [stored, no, past]);

  const set = (patch: Partial<ChainPuzzle>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  };
  const setClue = (i: number, value: string) => set({ clues: draft.clues.map((c, j) => (j === i ? value : c)) });
  const setClueAnswers = (i: number, value: string) => {
    const all = Array.from({ length: CHAIN_CLUES }, (_, j) => draft.clueAnswers?.[j] ?? [draft.clues[j]]);
    all[i] = splitList(value);
    set({ clueAnswers: all });
  };

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const post = (body: object) => call(token, '/api/admin/puzzles', { puzzleNo: no, ...body });

  const rows = [...draft.clues, draft.answer];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal editor" role="dialog" aria-modal="true" aria-labelledby="editor-title" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2 id="editor-title">
              No. {no} · {fmtDate(no, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </h2>
            <span className={`chip status-${st}`}>{STATUS_TEXT[st]}</span>
            {!past && <span className="admin-small"> target difficulty {WEEKDAY_DIFFICULTY[dateOfPuzzle(no).getUTCDay()]}/5</span>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <ol className="editor-rows">
          {rows.map((r, i) => (
            <li key={i} className={i === rows.length - 1 ? 'is-answer' : ''}>
              {r || <em>empty</em>}
            </li>
          ))}
        </ol>

        {past ? (
          <div className="editor-view">
            <p>
              <strong>{draft.connection}</strong>
            </p>
            <p className="admin-small">{draft.explanation}</p>
            <p className="admin-small">
              {playedAi ? 'Played this approved AI puzzle.' : 'Played the built-in puzzle.'} Past days can't be changed.
            </p>
          </div>
        ) : (
          <>
            {!stored && <p className="admin-small">This day plays a built-in puzzle. Edit it below and save to make it this day's own draft.</p>}

            <div className="ai-box">
              <label className="field-label" htmlFor="ask">
                Ask AI to change it
              </label>
              <textarea
                id="ask"
                className="input admin-textarea"
                rows={2}
                placeholder="e.g. make clue 1 harder"
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
              />
              <div className="btn-row">
                <button className="btn" disabled={!!busy} onClick={() => run('Writing a new one…', () => call(token, '/api/admin/generate', { puzzleNo: no, extra: ask, replace: true }))}>
                  Start over
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!!busy || ask.trim().length < 3}
                  onClick={() =>
                    run('Updating with AI…', async () => {
                      await call(token, '/api/admin/revise', { puzzleNo: no, instruction: ask, data: draft });
                      setAsk('');
                    })
                  }
                >
                  Update with AI
                </button>
              </div>
            </div>

            <div className="editor-form">
              <Field label="The rule (shown after the game)">
                <input className="input" value={draft.connection} onChange={(e) => set({ connection: e.target.value })} />
              </Field>
              {draft.clues.map((c, i) => (
                <div key={i} className="clue-edit">
                  <Field label={`Clue ${i + 1}`}>
                    <input className="input" value={c} onChange={(e) => setClue(i, e.target.value)} />
                  </Field>
                  <Field label="also accepts">
                    <input
                      className="input"
                      value={(draft.clueAnswers?.[i] ?? []).filter((x) => x !== c).join(', ')}
                      placeholder="comma separated"
                      onChange={(e) => setClueAnswers(i, `${c}, ${e.target.value}`)}
                    />
                  </Field>
                </div>
              ))}
              <div className="clue-edit">
                <Field label="Answer (clue 5)">
                  <input className="input" value={draft.answer} onChange={(e) => set({ answer: e.target.value })} />
                </Field>
                <Field label="also accepts">
                  <input
                    className="input"
                    value={draft.acceptedAnswers.filter((a) => a !== draft.answer).join(', ')}
                    placeholder="comma separated"
                    onChange={(e) => set({ acceptedAnswers: [draft.answer, ...splitList(e.target.value)] })}
                  />
                </Field>
              </div>
              <Field label="Explanation (shown after the game)">
                <textarea className="input admin-textarea" rows={2} value={draft.explanation} onChange={(e) => set({ explanation: e.target.value })} />
              </Field>
              <Field label="Ways players might name the rule (one per line)">
                <textarea
                  className="input admin-textarea"
                  rows={5}
                  value={draft.acceptedPhrasings.join('\n')}
                  onChange={(e) => set({ acceptedPhrasings: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })}
                />
              </Field>
              <div className="clue-edit">
                <Field label="Category">
                  <input className="input" value={draft.category} onChange={(e) => set({ category: e.target.value })} />
                </Field>
                <Field label="Difficulty">
                  <select className="input" value={draft.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {draft.topical?.used && <p className="admin-small">Topical: {draft.topical.note}</p>}
              {draft.sources?.length ? <p className="admin-small">Sources: {draft.sources.join(' · ')}</p> : null}
            </div>

            {problems.length > 0 && (
              <ul className="form-error editor-problems">
                {problems.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            )}
            {error && <p className="form-error">{error}</p>}

            <div className="editor-actions">
              {busy ? (
                <p className="admin-small">{busy}</p>
              ) : (
                <>
                  {(dirty || !stored) && (
                    <button className="btn" onClick={() => run('Saving…', () => post({ action: 'save', data: draft }))}>
                      Save as draft
                    </button>
                  )}
                  {stored && !dirty && st !== 'approved' && (
                    <button className="btn btn-primary" disabled={problems.length > 0} onClick={() => run('Approving…', () => post({ action: 'approve' }))}>
                      Approve
                    </button>
                  )}
                  {stored && !dirty && st === 'approved' && (
                    <button className="btn" onClick={() => run('Updating…', () => post({ action: 'unapprove' }))}>
                      Unapprove
                    </button>
                  )}
                  {stored && st !== 'rejected' && (
                    <button className="btn btn-link" onClick={() => run('Rejecting…', () => post({ action: 'reject' }))}>
                      Reject (use built-in)
                    </button>
                  )}
                  {dirty && (
                    <button
                      className="btn btn-link"
                      onClick={() => {
                        setDraft(base);
                        setDirty(false);
                      }}
                    >
                      Discard changes
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

