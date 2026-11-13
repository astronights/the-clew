import { useEffect, useRef, useState } from 'react';
import type { Domain, Item, SequenceItem, Tile } from '../../rules/types';
import { COLOURS, COLOUR_NAMES, ITEM_NOUN, MAX_TILES, normalizeWord, SHAPES, validateItem, WORD_MAX } from '../../lib/items';
import { Sheet } from '../Sheet';
import { TileGlyph } from '../ItemView';

export interface FifthValue {
  item: Item | null;
  error: string | null;
}

interface Props {
  domain: Domain;
  /** Changing this key clears the field (after a submit). */
  resetKey: number;
  onChange: (v: FifthValue) => void;
  disabled?: boolean;
}

const LABEL: Record<Domain, string> = {
  numbers: 'Test a number · does it fit?',
  sequences: 'Test three numbers · do they fit?',
  tiles: 'Test a row · does it fit?',
  words: 'Test a word · does it fit?',
  chain: 'Guess the 5th · what comes next?',
};

export function FifthInput({ domain, resetKey, onChange, disabled }: Props) {
  return (
    <div className="field">
      <span className="field-label" id="fifth-label">
        {LABEL[domain]}
      </span>
      {domain === 'numbers' && <NumberField key={resetKey} onChange={onChange} disabled={disabled} />}
      {domain === 'sequences' && <SequenceField key={resetKey} onChange={onChange} disabled={disabled} />}
      {domain === 'words' && <WordField key={resetKey} onChange={onChange} disabled={disabled} />}
      {domain === 'tiles' && <TileField key={resetKey} onChange={onChange} disabled={disabled} />}
      {domain === 'chain' && <AnswerField key={resetKey} onChange={onChange} disabled={disabled} />}
    </div>
  );
}

type FieldProps = { onChange: (v: FifthValue) => void; disabled?: boolean };

function NumberField({ onChange, disabled }: FieldProps) {
  const [v, setV] = useState('');
  return (
    <input
      className="input"
      aria-labelledby="fifth-label"
      inputMode="numeric"
      autoComplete="off"
      placeholder="1–999"
      value={v}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
        setV(raw);
        const n = Number(raw);
        onChange(raw ? { item: n, error: validateItem('numbers', n) } : { item: null, error: null });
      }}
    />
  );
}

function SequenceField({ onChange, disabled }: FieldProps) {
  const [parts, setParts] = useState(['', '', '']);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const update = (i: number, raw: string) => {
    const next = parts.slice();
    next[i] = raw.replace(/[^\d]/g, '').slice(0, 2);
    setParts(next);
    if (next[i].length === 2 && i < 2) refs[i + 1].current?.focus();
    const complete = next.every((p) => p !== '');
    const item = next.map(Number) as SequenceItem;
    onChange(complete ? { item, error: validateItem('sequences', item) } : { item: null, error: null });
  };
  return (
    <div className="seq-fields" role="group" aria-labelledby="fifth-label">
      {parts.map((p, i) => (
        <input
          key={i}
          ref={refs[i]}
          className="input"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`Number ${i + 1}`}
          placeholder={String(i + 1)}
          value={p}
          disabled={disabled}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !p && i > 0) refs[i - 1].current?.focus();
          }}
        />
      ))}
    </div>
  );
}

function WordField({ onChange, disabled }: FieldProps) {
  const [v, setV] = useState('');
  return (
    <input
      className="input"
      aria-labelledby="fifth-label"
      value={v}
      maxLength={WORD_MAX + 8}
      autoCapitalize="none"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      placeholder="type a word…"
      disabled={disabled}
      onChange={(e) => {
        setV(e.target.value);
        const { word, rejected } = normalizeWord(e.target.value);
        if (rejected.length) onChange({ item: null, error: `Letters only, please. Can't use ${rejected.map((c) => `“${c}”`).join(' ')}.` });
        else onChange(word ? { item: word, error: validateItem('words', word) } : { item: null, error: null });
      }}
    />
  );
}

/** Free text in any script; matched against the accepted answers after normalising. */
function AnswerField({ onChange, disabled }: FieldProps) {
  const [v, setV] = useState('');
  return (
    <input
      className="input"
      aria-labelledby="fifth-label"
      value={v}
      maxLength={60}
      autoComplete="off"
      spellCheck={false}
      placeholder="what comes 5th?"
      disabled={disabled}
      onChange={(e) => {
        setV(e.target.value);
        const t = e.target.value.trim();
        onChange(t ? { item: t, error: validateItem('chain', t) } : { item: null, error: null });
      }}
    />
  );
}

function TileField({ onChange, disabled }: FieldProps) {
  const [row, setRow] = useState<Tile[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => onChange(row.length ? { item: row, error: null } : { item: null, error: null }), [row]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <button type="button" className="input input-button" aria-labelledby="fifth-label" onClick={() => setOpen(true)} disabled={disabled}>
        {row.length ? (
          <span className="item item-tiles">
            {row.map((t, i) => (
              <TileGlyph key={i} tile={t} size={28} />
            ))}
          </span>
        ) : (
          <span className="input-placeholder">tap to build a row…</span>
        )}
      </button>
      {open && (
        <Sheet title={`Build a ${ITEM_NOUN.tiles} to test`} onClose={() => setOpen(false)}>
          <TileBuilder
            initial={row}
            onDone={(r) => {
              setRow(r);
              setOpen(false);
            }}
          />
        </Sheet>
      )}
    </>
  );
}

function TileBuilder({ initial, onDone }: { initial: Tile[]; onDone: (row: Tile[]) => void }) {
  const [row, setRow] = useState<Tile[]>(initial);
  return (
    <div>
      <div className="build-row" aria-live="polite">
        {row.length ? (
          row.map((t, i) => (
            <button key={i} type="button" className="tile-btn" onClick={() => setRow(row.filter((_, j) => j !== i))} aria-label={`Remove ${COLOUR_NAMES[t.c]} ${t.s}`}>
              <TileGlyph tile={t} size={42} />
            </button>
          ))
        ) : (
          <span className="input-placeholder">Tap tiles to add them (up to {MAX_TILES}). Tap a tile in the row to remove it.</span>
        )}
      </div>
      <div className="tile-palette" role="group" aria-label="Tile palette">
        {COLOURS.map((c) =>
          SHAPES.map((s) => (
            <button key={c + s} type="button" className="tile-btn" disabled={row.length >= MAX_TILES} onClick={() => setRow([...row, { c, s }])} aria-label={`Add ${COLOUR_NAMES[c]} ${s}`}>
              <TileGlyph tile={{ c, s }} size={50} />
            </button>
          )),
        )}
      </div>
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => setRow([])} disabled={!row.length}>
          Clear
        </button>
        <button type="button" className="btn btn-primary" onClick={() => onDone(row)} disabled={!row.length}>
          Use this row
        </button>
      </div>
    </div>
  );
}
