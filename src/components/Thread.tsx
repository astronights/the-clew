import { useRef, type CSSProperties, type ReactNode } from 'react';
import type { Domain, Rule } from '../rules/types';
import { CLUE_COUNT, type Entry } from '../lib/game';
import { ItemView, VerdictBadge } from './ItemView';

function Tag({ children, variant = '', label }: { children: ReactNode; variant?: string; label?: string }) {
  return (
    <div className={`tag ${variant}`}>
      {label && <span className="tag-label">{label}</span>}
      {children}
    </div>
  );
}

interface Props {
  entries: Entry[];
  domain: Domain;
  rule: Rule;
  revealed: number;
  over: boolean;
}

/** Clues and the player's own 5ths, hung like tags on one thread. */
export function Thread({ entries, domain, rule, revealed, over }: Props) {
  const initial = useRef(entries.length);
  const pending = Array.from({ length: CLUE_COUNT - revealed }, (_, i) => revealed + i);
  return (
    <ol className="thread" aria-label="Clues and your guesses">
      {entries.map((e, i) => {
        const style = { '--d': i < initial.current ? `${Math.min(i, 8) * 60}ms` : e.kind === 'clue' && i > 0 ? '350ms' : '0ms' } as CSSProperties;
        if (e.kind === 'clue')
          return (
            <li key={i} className="knot-row" style={style}>
              <Tag variant={e.pass ? 'is-pass' : 'is-fail'} label={`Clue ${e.index + 1}`}>
                <ItemView domain={domain} item={e.item} />
                <VerdictBadge pass={e.pass} />
              </Tag>
            </li>
          );
        return (
          <li key={i} className="knot-row is-mine" style={style}>
            <Tag variant={`is-mine ${e.pass ? 'is-pass' : 'is-fail'}`} label="Your 5th">
              <ItemView domain={domain} item={e.item} />
              <VerdictBadge pass={e.pass} />
            </Tag>
            <p className={`said ${e.correct ? 'is-right' : ''}`}>
              You said <q>{e.rule}</q> · {e.correct ? <strong>that's it!</strong> : 'not it.'}
            </p>
          </li>
        );
      })}
      {pending.map((idx) =>
        over ? (
          <li key={`p${idx}`} className="knot-row is-unused">
            <Tag variant={`is-unused ${rule.clues[idx].pass ? 'is-pass' : 'is-fail'}`} label={`Clue ${idx + 1} · unused`}>
              <ItemView domain={domain} item={rule.clues[idx].item} size="sm" />
              <VerdictBadge pass={rule.clues[idx].pass} />
            </Tag>
          </li>
        ) : (
          <li key={`p${idx}`} className="knot-row is-locked" aria-label={`Clue ${idx + 1}, not revealed yet`}>
            <Tag variant="is-locked">
              <span className="locked-text">Clue {idx + 1}</span>
            </Tag>
          </li>
        ),
      )}
    </ol>
  );
}
