import { useState } from 'react';
import { validateGuess } from '../lib/answer';

export interface GuessValue {
  text: string;
  error: string | null;
}

interface Props {
  /** Changing this key clears the field (after a guess). */
  resetKey: number;
  onChange: (v: GuessValue) => void;
  disabled?: boolean;
}

/** Free text in any script: the player's guess for what comes next. */
export function GuessInput({ resetKey, onChange, disabled }: Props) {
  return <Field key={resetKey} onChange={onChange} disabled={disabled} />;
}

function Field({ onChange, disabled }: Omit<Props, 'resetKey'>) {
  const [text, setText] = useState('');
  return (
    <div className="field">
      <label className="field-label" htmlFor="guess-input">
        Guess what comes next
      </label>
      <input
        id="guess-input"
        className="input"
        value={text}
        maxLength={60}
        autoComplete="off"
        spellCheck={false}
        placeholder="what comes next?"
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          const t = e.target.value.trim();
          onChange({ text: t, error: t ? validateGuess(t) : null });
        }}
      />
    </div>
  );
}
