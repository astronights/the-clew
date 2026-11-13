import { useEffect, useState } from 'react';
import type { Puzzle } from '../lib/puzzle';
import { msUntilNextPuzzle } from '../lib/daily';
import { ROWS, type Outcome } from '../lib/game';
import { neededMorePercent, shareText, solvedPercent } from '../lib/share';

function Countdown() {
  const [ms, setMs] = useState(() => msUntilNextPuzzle());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextPuzzle()), 15_000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return (
    <p className="note">
      Next clew in {h}h {m}m
    </p>
  );
}

interface Props {
  puzzle: Puzzle;
  solvedOn: number;
  outcomes: Outcome[];
  puzzleNo?: number;
  counts?: number[] | null;
}

export function ResultCard({ puzzle, solvedOn, outcomes, puzzleNo, counts }: Props) {
  const [status, setStatus] = useState('');
  const solved = solvedOn > 0;
  const text = shareText(puzzleNo ?? 0, solvedOn, outcomes);
  const pct = counts ? (solved ? neededMorePercent(counts, solvedOn) : solvedPercent(counts)) : null;

  const share = async () => {
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setStatus('Copied. Paste it anywhere.');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') setStatus("Couldn't copy. Select the text above instead.");
    }
  };

  return (
    <section className="result" aria-live="polite">
      <h2 className="result-head">{solved ? (solvedOn === 1 ? 'First clue. Wow.' : `Untangled on clue ${solvedOn} of ${ROWS}.`) : 'Tangled today.'}</h2>
      <p className="eyebrow">The rule</p>
      <p className="result-rule">{puzzle.connection}</p>
      <p className="result-expl">{puzzle.explanation}</p>


      {pct !== null && <p className="note">{solved ? `${pct}% of players needed more clues.` : `${pct}% of players got it today.`}</p>}

      <>
          <p className="eyebrow">Your share</p>
          <div className="bubble">{text}</div>
          <button className="btn btn-primary btn-block" onClick={share}>
            Share
          </button>
          <p className="note" role="status">
            {status || ' '}
          </p>
        <Countdown />
      </>
    </section>
  );
}
