import { useState } from 'react';
import type { Domain, Item } from '../../rules/types';
import { describeItem, parseItem, TEST_EXAMPLE } from '../../lib/items';

export interface FifthValue {
  item: Item | null;
  error: string | null;
}

interface Props {
  domain: Domain;
  /** Changing this key clears the field (after a test). */
  resetKey: number;
  onChange: (v: FifthValue) => void;
  disabled?: boolean;
}

/** One free-text box for every kind of day; the text is read as the day's kind of item. */
export function FifthInput({ domain, resetKey, onChange, disabled }: Props) {
  return <Field key={resetKey} domain={domain} onChange={onChange} disabled={disabled} />;
}

function Field({ domain, onChange, disabled }: Omit<Props, 'resetKey'>) {
  const [text, setText] = useState('');
  const parsed = parseItem(domain, text);
  // show how the text was read when it isn't obvious (tiles, sequences, cleaned-up words)
  const reading = parsed.item !== null && !parsed.error ? describeItem(domain, parsed.item) : '';
  const showReading = reading && reading.toLowerCase() !== text.trim().toLowerCase();
  return (
    <div className="field">
      <label className="field-label" htmlFor="test-input">
        {domain === 'chain' ? 'Guess what comes next' : 'Guess something that fits'}
      </label>
      <input
        id="test-input"
        className="input"
        value={text}
        maxLength={80}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={TEST_EXAMPLE[domain]}
        disabled={disabled}
        aria-describedby="test-reading"
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseItem(domain, e.target.value));
        }}
      />
      <span id="test-reading" className="field-hint" aria-live="polite">
        {showReading ? `reads as: ${reading}` : ' '}
      </span>
    </div>
  );
}
