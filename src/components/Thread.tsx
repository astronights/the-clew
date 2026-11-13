import { useRef, type CSSProperties, type ReactNode } from 'react';
import type { Domain, Item, Rule } from '../rules/types';
import { CLUE_COUNT } from '../lib/game';
import { ItemView, VerdictBadge } from './ItemView';

const ORDINAL = ['1st', '2nd', '3rd', '4th'];

function Tag({ children, variant = '', label }: { children: ReactNode; variant?: string; label?: string }) {
  return (
    <div className={`tag ${variant}`}>
      {label && <span className="tag-label">{label}</span>}
      {children}
    </div>
  );
}

interface Props {
  domain: Domain;
  rule: Rule;
  revealed: number;
  over: boolean;
  /** What to show in the 5th row: the latest test, or (after the game) the answer. */
  fifth: { item: Item; pass: boolean; label: string; key: number } | null;
}

/** Always five rows: clues 1–4 (revealed or locked) and the 5th. */
export function Thread({ domain, rule, revealed, over, fifth }: Props) {
  const initial = useRef(revealed);
  const chain = domain === 'chain';
  return (
    <ol className="thread" aria-label="Clues">
      {Array.from({ length: CLUE_COUNT }, (_, i) => {
        const clue = rule.clues[i];
        const shown = i < revealed;
        const style = { '--d': i < initial.current ? `${i * 60}ms` : '0ms' } as CSSProperties;
        if (shown || over)
          return (
            <li key={i} className={`knot-row ${shown ? '' : 'is-unused'}`} style={style}>
              <Tag
                variant={`${shown ? '' : 'is-unused'} ${chain || clue.pass ? 'is-pass' : 'is-fail'}`}
                label={shown ? `Clue ${i + 1}` : `Clue ${i + 1} · unused`}
              >
                <ItemView domain={domain} item={clue.item} size={shown ? 'md' : 'sm'} />
                {chain ? <span className="verdict">{ORDINAL[i]}</span> : <VerdictBadge pass={clue.pass} />}
              </Tag>
            </li>
          );
        return (
          <li key={i} className="knot-row is-locked" aria-label={`Clue ${i + 1}, not revealed yet`}>
            <Tag variant="is-locked">
              <span className="locked-text">Clue {i + 1}</span>
            </Tag>
          </li>
        );
      })}
      <li className="knot-row is-mine" key={`fifth-${fifth?.key ?? 'empty'}`} aria-live="polite">
        {fifth ? (
          <Tag variant={`is-mine ${fifth.pass ? 'is-pass' : 'is-fail'}`} label={fifth.label}>
            <ItemView domain={domain} item={fifth.item} />
            <VerdictBadge pass={fifth.pass} chain={chain} />
          </Tag>
        ) : (
          <Tag variant="is-mine is-empty" label="5th">
            <span className="locked-text">?</span>
          </Tag>
        )}
      </li>
    </ol>
  );
}
