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
          <li>
            Work out the rule, then fill in <strong>your 5th</strong> (something you think fits) and <strong>the rule</strong> in your own words.
          </li>
          <li>Get the rule right and you're done. Your 5th is your own check: it's pinned on the thread so you can see if it fits.</li>
          <li>
            A miss, or <strong>Skip</strong>, shows the next clue. You get {CLUE_COUNT} clues. The fewer you need, the better.
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
