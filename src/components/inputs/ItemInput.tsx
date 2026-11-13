import { useEffect, useRef, useState } from 'react';
import type { Domain, Item, SequenceItem, Tile } from '../../rules/types';
import { COLOURS, COLOUR_NAMES, MAX_TILES, normalizeWord, SHAPES, validateItem, WORD_MAX } from '../../lib/items';
import { ItemView, TileGlyph } from '../ItemView';
import { Keypad } from './Keypad';

interface Props {
  domain: Domain;
  onSubmit: (item: Item) => void;
  submitLabel: string;
}

function Submit({ disabled, label, error }: { disabled: boolean; label: string; error: string | null }) {
  return (
    <>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={disabled}>
        {label}
      </button>
    </>
  );
}

function NumberInput({ onSubmit, submitLabel }: Omit<Props, 'domain'>) {
  const [v, setV] = useState('');
  const n = Number(v);
  const err = v ? validateItem('numbers', n) : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v && !err) onSubmit(n);
      }}
    >
      <div className="input-display" aria-live="polite">
        {v ? <span className="chip chip-big">{v}</span> : <span className="placeholder">1–999</span>}
      </div>
      <Keypad onKey={(k) => setV((s) => (s.length >= 3 || (s === '' && k === '0') ? s : s + k))} onBackspace={() => setV((s) => s.slice(0, -1))} />
      <Submit disabled={!v || !!err} label={submitLabel} error={err} />
    </form>
  );
}

function SequenceInput({ onSubmit, submitLabel }: Omit<Props, 'domain'>) {
  const [parts, setParts] = useState<string[]>(['', '', '']);
  const [active, setActive] = useState(0);
  const complete = parts.every((p) => p !== '');
  const item = parts.map(Number) as SequenceItem;
  const err = complete ? validateItem('sequences', item) : null;
  const type = (k: string) => {
    const next = parts.slice();
    if (next[active].length >= 2) return;
    next[active] = next[active] === '0' ? k : next[active] + k;
    setParts(next);
    if (next[active].length === 2 && active < 2) setActive(active + 1);
  };
  const back = () => {
    const next = parts.slice();
    if (next[active] === '' && active > 0) {
      next[active - 1] = next[active - 1].slice(0, -1);
      setActive(active - 1);
    } else next[active] = next[active].slice(0, -1);
    setParts(next);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (complete && !err) onSubmit(item);
      }}
    >
      <div className="input-display seq-slots">
        {parts.map((p, i) => (
          <button
            key={i}
            type="button"
            className={`slot ${i === active ? 'is-active' : ''}`}
            onClick={() => setActive(i)}
            aria-label={`Number ${i + 1}${p ? `: ${p}` : ', empty'}`}
            aria-pressed={i === active}
          >
            {p || '·'}
          </button>
        ))}
      </div>
      <Keypad
        onKey={type}
        onBackspace={back}
        extraKey={{ label: '›', aria: 'Next number', onPress: () => setActive((a) => Math.min(2, a + 1)), disabled: active === 2 }}
      />
      <Submit disabled={!complete || !!err} label={submitLabel} error={err} />
    </form>
  );
}

function TileInput({ onSubmit, submitLabel }: Omit<Props, 'domain'>) {
  const [row, setRow] = useState<Tile[]>([]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (row.length) onSubmit(row);
      }}
    >
      <div className="input-display tile-row-build" aria-live="polite">
        {row.length ? (
          row.map((t, i) => (
            <button key={i} type="button" className="tile-btn in-row" onClick={() => setRow(row.filter((_, j) => j !== i))} aria-label={`Remove ${COLOUR_NAMES[t.c]} ${t.s}`}>
              <TileGlyph tile={t} size={46} />
            </button>
          ))
        ) : (
          <span className="placeholder">Tap tiles to build a row (up to {MAX_TILES})</span>
        )}
      </div>
      <div className="tile-palette" role="group" aria-label="Tile palette">
        {COLOURS.map((c) =>
          SHAPES.map((s) => (
            <button
              key={c + s}
              type="button"
              className="tile-btn"
              disabled={row.length >= MAX_TILES}
              onClick={() => setRow([...row, { c, s }])}
              aria-label={`Add ${COLOUR_NAMES[c]} ${s}`}
            >
              <TileGlyph tile={{ c, s }} size={52} />
            </button>
          )),
        )}
      </div>
      <div className="row-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setRow(row.slice(0, -1))} disabled={!row.length}>
          ⌫ Undo
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setRow([])} disabled={!row.length}>
          Clear
        </button>
      </div>
      <Submit disabled={!row.length} label={submitLabel} error={null} />
    </form>
  );
}

function WordInput({ onSubmit, submitLabel }: Omit<Props, 'domain'>) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const { word, rejected } = normalizeWord(v);
  const err = rejected.length
    ? `Letters only, please. Can't use ${rejected.map((c) => `“${c}”`).join(' ')}.`
    : word
      ? validateItem('words', word)
      : null;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (word && !err) onSubmit(word);
      }}
    >
      <div className="input-display">
        {word && !err ? <ItemView domain="words" item={word} size="sm" /> : <span className="placeholder">Type any word. Capitals and accents are fine.</span>}
      </div>
      <label className="sr-only" htmlFor="word-input">
        Word
      </label>
      <input
        id="word-input"
        ref={ref}
        className="text-input"
        value={v}
        maxLength={WORD_MAX + 8}
        onChange={(e) => setV(e.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="go"
        placeholder="e.g. puzzle"
      />
      <Submit disabled={!word || !!err} label={submitLabel} error={err} />
    </form>
  );
}

export function ItemInput({ domain, onSubmit, submitLabel }: Props) {
  switch (domain) {
    case 'numbers':
      return <NumberInput onSubmit={onSubmit} submitLabel={submitLabel} />;
    case 'sequences':
      return <SequenceInput onSubmit={onSubmit} submitLabel={submitLabel} />;
    case 'tiles':
      return <TileInput onSubmit={onSubmit} submitLabel={submitLabel} />;
    case 'words':
      return <WordInput onSubmit={onSubmit} submitLabel={submitLabel} />;
  }
}
