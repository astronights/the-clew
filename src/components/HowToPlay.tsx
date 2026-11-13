import { useEffect, useRef } from 'react';
import { CLUE_COUNT } from '../rules/types';
import { ItemView, VerdictBadge } from './ItemView';

export function HowToPlay({ onClose }: { onClose: () => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="howto-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="howto-title">How to play</h2>
        <p>
          There's <strong>one secret rule</strong> a day, the same for everyone. Each clue is something that fits the rule or doesn't.
        </p>
        <div className="howto-example">
          <span className="howto-pair">
            <ItemView domain="words" item="cookie" size="sm" /> <VerdictBadge pass />
          </span>
          <span className="howto-pair">
            <ItemView domain="words" item="plucky" size="sm" /> <VerdictBadge pass={false} />
          </span>
        </div>
        <ol className="howto-steps">
          <li>There are {CLUE_COUNT} clues. Only the first is showing.</li>
          <li>
            <strong>Guess</strong> what comes next (or something that fits). The next clue opens and tells you if your guess was right. Leave the box empty to just open the next clue.
          </li>
          <li>
            <strong>Name the rule</strong> whenever you think you know it. That's what's scored: the fewer clues you needed, the better.
          </li>
        </ol>
        <p className="note">Mon &amp; Fri numbers · Tue sequences · Wed &amp; Sat tiles · Thu &amp; Sun words · new rule at 00:00 UTC</p>
        <button ref={btn} className="btn btn-primary btn-block" onClick={onClose}>
          Let's go
        </button>
      </div>
    </div>
  );
}
