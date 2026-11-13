import { useRef, type CSSProperties, type ReactNode } from 'react';
import type { Domain, Rule } from '../rules/types';
import { CLUE_COUNT, type Entry } from '../lib/game';
import { describeItem } from '../lib/items';
import { ItemView, VerdictBadge } from './ItemView';

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th'];
type Guess = Extract<Entry, { kind: 'test' }>;

function Tag({ children, variant = '', label }: { children: ReactNode; variant?: string; label?: ReactNode }) {
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
  /** The guess that revealed each row. */
  guesses: Map<number, Guess>;
}

/** Five rows, one per clue. Row 1 starts open; each guess opens the next and is marked ✓/✗ on it. */
export function Thread({ domain, rule, revealed, over, guesses }: Props) {
  const initial = useRef(revealed);
  const chain = domain === 'chain';
  return (
    <ol className="thread" aria-label="Clues">
      {Array.from({ length: CLUE_COUNT }, (_, i) => {
        const clue = rule.clues[i];
        const shown = i < revealed;
        const guess = guesses.get(i);
        const style = { '--d': i < initial.current ? `${i * 60}ms` : '0ms' } as CSSProperties;
        if (!shown && !over)
          return (
            <li key={i} className="knot-row is-locked" aria-label={`Clue ${i + 1}, hidden`}>
              <Tag variant="is-locked">
                <span className="locked-text">Clue {i + 1}</span>
              </Tag>
            </li>
          );
        const label = (
          <>
            {shown ? `Clue ${i + 1}` : `Clue ${i + 1} · unused`}
            {guess && (
              <span className={`guess-mark ${guess.pass ? 'is-right' : 'is-wrong'}`}>
                {' · '}your guess {guess.pass ? '✓' : '✗'}
                <span className="sr-only">
                  {' '}
                  ({describeItem(domain, guess.item)} was {guess.pass ? 'right' : 'wrong'})
                </span>
              </span>
            )}
          </>
        );
        return (
          <li key={i} className={`knot-row ${shown ? '' : 'is-unused'}`} style={style}>
            <Tag variant={`${shown ? '' : 'is-unused'} ${chain || clue.pass ? 'is-pass' : 'is-fail'} ${guess ? (guess.pass ? 'guess-right' : 'guess-wrong') : ''}`} label={label}>
              <ItemView domain={domain} item={clue.item} size={shown ? 'md' : 'sm'} />
              {chain ? <span className="verdict">{ORDINAL[i]}</span> : <VerdictBadge pass={clue.pass} />}
            </Tag>
          </li>
        );
      })}
    </ol>
  );
}
