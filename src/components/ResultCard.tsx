import { useEffect, useState } from 'react';
import type { Rule } from '../rules/types';
import { msUntilNextPuzzle } from '../lib/daily';
import { neededMorePercent, shareText, solvedPercent, threadBar } from '../lib/share';

function Countdown() {
  const [ms, setMs] = useState(() => msUntilNextPuzzle());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextPuzzle()), 15_000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return (
    <p className="muted center">
      Next clew in {h}h {m}m
    </p>
  );
}

interface Props {
  rule: Rule;
  solvedOn: number;
  puzzleNo?: number;
  counts?: number[] | null;
  practice?: boolean;
  onAgain?: () => void;
}

export function ResultCard({ rule, solvedOn, puzzleNo, counts, practice, onAgain }: Props) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const solved = solvedOn > 0;
  const pct = counts ? (solved ? neededMorePercent(counts, solvedOn) : solvedPercent(counts)) : null;

  const copy = async () => {
    const text = shareText(puzzleNo ?? 0, solvedOn, counts ?? null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };

  return (
    <section className={`result card pop-in ${solved ? 'is-solved' : 'is-failed'}`} aria-live="polite">
      <div className="result-bar" aria-hidden="true">
        {threadBar(solvedOn)}
      </div>
      <h2>{solved ? (solvedOn === 1 ? 'First clue. Wizardry!' : `Solved on clue ${solvedOn}!`) : 'The thread snapped'}</h2>
      <p className="result-rule">
        <span className="muted">The rule was</span>
        <strong>{rule.description}</strong>
      </p>
      {!practice && pct !== null && <p className="center">{solved ? `${pct}% of players needed more clues` : `${pct}% of players solved it`}</p>}
      {!practice && (
        <>
          <button className="btn btn-primary btn-block" onClick={copy}>
            📋 Copy result
          </button>
          <p className="muted center copy-status" role="status">
            {copied === 'ok' ? 'Copied! Paste it anywhere.' : copied === 'fail' ? 'Could not copy — your browser blocked it.' : ' '}
          </p>
          {copied === 'fail' && <pre className="share-preview">{shareText(puzzleNo ?? 0, solvedOn, counts ?? null)}</pre>}
          <Countdown />
        </>
      )}
      {practice && onAgain && (
        <button className="btn btn-primary btn-block" onClick={onAgain}>
          🧶 Another practice rule
        </button>
      )}
    </section>
  );
}
