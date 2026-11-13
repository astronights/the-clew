import { useEffect, useState } from 'react';
import type { Rule } from '../rules/types';
import { msUntilNextPuzzle } from '../lib/daily';
import { CLUE_COUNT, type Outcome } from '../lib/game';
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

const TRAIL_TEXT: Record<Outcome, string> = { test: 'tested', miss: 'wrong rule', solved: 'got it ✓' };

interface Props {
  rule: Rule;
  solvedOn: number;
  outcomes: Outcome[];
  puzzleNo?: number;
  counts?: number[] | null;
}

export function ResultCard({ rule, solvedOn, outcomes, puzzleNo, counts }: Props) {
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
      <h2 className="result-head">{solved ? (solvedOn === 1 ? 'First clue. Wow.' : `Untangled on clue ${solvedOn} of ${CLUE_COUNT}.`) : 'Tangled today.'}</h2>
      <p className="eyebrow">The rule</p>
      <p className="result-rule">{rule.description}</p>

      <ol className="trail" aria-label="How each clue went">
        {Array.from({ length: CLUE_COUNT }, (_, i) => {
          const o = outcomes[i];
          return (
            <li key={i} className={`trail-step ${o ? `is-${o}` : 'is-unused'}`}>
              clue {i + 1}
              <br />
              {o ? TRAIL_TEXT[o] : '—'}
            </li>
          );
        })}
      </ol>

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
