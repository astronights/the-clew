import { useRef, type CSSProperties } from 'react';
import { ROWS, type Puzzle } from '../lib/puzzle';

interface Props {
  puzzle: Puzzle;
  revealed: number;
  over: boolean;
}

/** Five rows. Row 1 starts open; each wrong rule or "Next clue" opens the next. */
export function Thread({ puzzle, revealed, over }: Props) {
  const initial = useRef(revealed);
  return (
    <ol className="thread" aria-label="Clues">
      {Array.from({ length: ROWS }, (_, i) => {
        const shown = i < revealed;
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
            <div className={`tag ${shown ? '' : 'is-unused'}`}>
              <span className="tag-label">Clue {i + 1}</span>
              <span className={`item-text ${shown ? '' : 'item-sm'}`}>{puzzle.rows[i]}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
