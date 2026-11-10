interface Props {
  onKey: (k: string) => void;
  onBackspace: () => void;
  extraKey?: { label: string; aria: string; onPress: () => void; disabled?: boolean };
}

/** Big, thumb-friendly numeric keypad. */
export function Keypad({ onKey, onBackspace, extraKey }: Props) {
  return (
    <div className="keypad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
        <button key={k} type="button" className="key" onClick={() => onKey(k)}>
          {k}
        </button>
      ))}
      {extraKey ? (
        <button type="button" className="key key-soft" onClick={extraKey.onPress} aria-label={extraKey.aria} disabled={extraKey.disabled}>
          {extraKey.label}
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="key" onClick={() => onKey('0')}>
        0
      </button>
      <button type="button" className="key key-soft" onClick={onBackspace} aria-label="Delete">
        ⌫
      </button>
    </div>
  );
}
