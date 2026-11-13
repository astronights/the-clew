import { useRef, type CSSProperties } from 'react';
import type { Domain } from '../rules/types';
import type { Entry } from '../lib/game';
import { ItemView, VerdictBadge } from './ItemView';

const VERDICT_TEXT = { correct: 'On the right thread!', close: 'Close!', wrong: 'Not it' } as const;
const VERDICT_ICON = { correct: '✓', close: '≈', wrong: '✗' } as const;

function EntryBody({ entry, domain }: { entry: Entry; domain: Domain }) {
  switch (entry.kind) {
    case 'clue':
      return (
        <>
          <div className="entry-head">
            <span className="entry-label">Clue {entry.index + 1}</span>
            <VerdictBadge pass={entry.pass} />
          </div>
          <div className="entry-main">
            <ItemView domain={domain} item={entry.item} />
          </div>
        </>
      );
    case 'guess':
      return (
        <>
          <div className="entry-head">
            <span className="entry-label">Tested</span>
            <VerdictBadge pass={entry.pass} />
          </div>
          <div className="entry-main">
            <ItemView domain={domain} item={entry.item} size="sm" />
          </div>
        </>
      );
    case 'rule':
      return (
        <>
          <div className="entry-label">You named the rule</div>
          <p className="entry-quote">“{entry.text}”</p>
          <div className={`rule-verdict is-${entry.verdict} in`}>
            <span aria-hidden="true">{VERDICT_ICON[entry.verdict]}</span> {VERDICT_TEXT[entry.verdict]}
            {entry.hint && <span className="hint"> · {entry.hint}</span>}
          </div>
        </>
      );
    case 'exam':
      return (
        <>
          <div className="entry-label">Proof</div>
          <div className={`rule-verdict is-${entry.passed ? 'correct' : 'wrong'} in`}>
            <span aria-hidden="true">{entry.passed ? '✓' : '✗'}</span> {entry.score}/3 right
            {!entry.passed && <span className="hint"> · the answers are added below</span>}
          </div>
        </>
      );
  }
}

/** Clues and guesses unspool along a thread. */
export function Thread({ entries, domain }: { entries: Entry[]; domain: Domain }) {
  const initial = useRef(entries.length);
  return (
    <ol className="thread" aria-label="Clues and guesses">
      {entries.map((e, i) => (
        <li
          key={i}
          className={`entry entry-${e.kind} ${e.kind === 'clue' || e.kind === 'guess' ? (e.pass ? 'is-pass' : 'is-fail') : ''}`}
          style={{ '--d': i < initial.current ? `${Math.min(i, 8) * 70}ms` : i > 0 && entries[i - 1].kind !== 'clue' && e.kind === 'clue' ? '700ms' : '0ms' } as CSSProperties}
        >
          <span className="knot" aria-hidden="true" />
          <div className="entry-card">
            <EntryBody entry={e} domain={domain} />
          </div>
        </li>
      ))}
    </ol>
  );
}
