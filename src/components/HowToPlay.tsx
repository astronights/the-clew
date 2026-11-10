import { useEffect, useRef } from 'react';
import { ItemView, VerdictBadge } from './ItemView';
import { YarnBall } from './YarnBall';

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
      <div className="modal card" role="dialog" aria-modal="true" aria-labelledby="howto-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="howto-title" className="howto-title">
          <YarnBall size={36} className="howto-ball" />
          How to play
        </h2>
        <p>
          Every day there's <strong>one secret rule</strong>, the same for everyone. Follow the thread of clues to find it.
        </p>
        <ol className="howto-steps">
          <li>
            Each clue is an item that <strong>passes</strong> or <strong>fails</strong> the rule.
            <span className="howto-example">
              <span className="howto-pair">
                <ItemView domain="numbers" item={47} size="sm" /> <VerdictBadge pass animate={false} />
              </span>
              <span className="howto-pair">
                <ItemView domain="numbers" item={12} size="sm" /> <VerdictBadge pass={false} animate={false} />
              </span>
            </span>
          </li>
          <li>
            After each clue, either <strong>test an item</strong> of your own, or <strong>name the rule</strong>.
          </li>
          <li>If your rule sounds right, prove it: sort 3 new items into passes / fails.</li>
          <li>Fewer clues = better score. You get 5 clues and one final guess.</li>
        </ol>
        <p className="muted small">
          Mon &amp; Fri numbers · Tue sequences · Wed &amp; Sat tiles · Thu &amp; Sun words. New rule at 00:00 UTC.
        </p>
        <button ref={btn} className="btn btn-primary btn-block" onClick={onClose}>
          Start unspooling
        </button>
      </div>
    </div>
  );
}
