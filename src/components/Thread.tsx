import { useRef, type CSSProperties } from 'react';
import type { Entry } from '../lib/game';
import { ROWS, type Puzzle } from '../lib/puzzle';

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th'];
type Guess = Extract<Entry, { kind: 'test' }>;

interface Props {
  puzzle: Puzzle;
  revealed: number;
  over: boolean;
  /** The guess that opened each row. */
  guesses: Map<number, Guess>;
}

/** Five rows. Row 1 starts open; each guess opens the next, marked ✓/✗ for that guess. */
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
            <div className={`tag ${shown ? '' : 'is-unused'} ${guess ? (guess.pass ? 'guess-right' : 'guess-wrong') : ''}`}>
              <span className="tag-label">
                {shown ? `Clue ${i + 1}` : `Clue ${i + 1} · unused`}
                {guess && (
                  <span className={`guess-mark ${guess.pass ? 'is-right' : 'is-wrong'}`}>
                    {' · '}your guess {guess.pass ? '✓' : '✗'}
                    <span className="sr-only">
                      {' '}
                      ({guess.item} was {guess.pass ? 'right' : 'wrong'})
                    </span>
                  </span>
                )}
              </span>
              <span className={`item-text ${shown ? '' : 'item-sm'}`}>{puzzle.rows[i]}</span>
              <span className="verdict">{ORDINAL[i]}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
