import { useEffect, useRef } from 'react';
import { ROWS } from '../lib/puzzle';
import { rolloverLocalTime } from '../lib/daily';

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
          Every day there's <strong>one sequence</strong>, the same for everyone: {ROWS} things that come in a fixed order.
        </p>
        <p className="howto-example">
          <span>A</span> → <span>B</span> → <span>C</span> → <span>D</span> → <span>?</span>
        </p>
        <ol className="howto-steps">
          <li>Only the first clue is showing.</li>
          <li>
            <strong>Name the rule</strong> in your own words as soon as you've spotted it, e.g. "the alphabet". The fewer clues you needed, the
            better.
          </li>
          <li>
            Not sure yet? Tap <strong>Next clue</strong>. A wrong guess opens the next clue too.
          </li>
        </ol>
        <p className="note">New sequence every day at 03:14:15 UTC ({rolloverLocalTime()} your time).</p>
        <button ref={btn} className="btn btn-primary btn-block" onClick={onClose}>
          Let's go
        </button>
      </div>
    </div>
  );
}
