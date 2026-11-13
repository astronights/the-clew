import { useRef, type CSSProperties } from 'react';
import type { Entry } from '../lib/game';
import { ROWS, type Puzzle } from '../lib/puzzle';

type Guess = Extract<Entry, { kind: 'test' }>;

interface Props {
  puzzle: Puzzle;
  revealed: number;
  over: boolean;
  /** The guess that opened each row. */
  guesses: Map<number, Guess>;
}

/** Five rows. Row 1 starts open; each guess opens the next, and rows you called correctly get a ✓. */
export function Thread({ puzzle, revealed, over, guesses }: Props) {
  const initial = useRef(revealed);
  return (
    <ol className="thread" aria-label="Clues">
      {Array.from({ length: ROWS }, (_, i) => {
        const shown = i < revealed;
        const guess = guesses.get(i);
        const style = { '--d': i < initial.current ? `${i * 60}ms` : '0ms' } as CSSProperties;
        if (!shown && !over)
          return (
            <li key={i} className="knot-row is-locked" aria-label={`Clue ${i + 1}, hidden`}>
              <div className="tag is-locked">
                <span className="locked-text">Clue {i + 1}</span>
              </div>
            </li>
          );
        return (
          <li key={i} className={`knot-row ${shown ? '' : 'is-unused'}`} style={style}>
            <div className={`tag ${shown ? '' : 'is-unused'} ${guess?.pass ? 'guess-right' : ''}`}>
              <span className="tag-label">
                Clue {i + 1}
              </span>
              <span className={`item-text ${shown ? '' : 'item-sm'}`}>{puzzle.rows[i]}</span>
              {guess?.pass && (
                <span className="verdict guess-verdict is-right">
                  <span aria-hidden="true">✓</span> Called it
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
