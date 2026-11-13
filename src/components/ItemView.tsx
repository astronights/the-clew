import type { Colour, Domain, Item, SequenceItem, Shape, Tile, TileItem } from '../rules/types';
import { COLOUR_NAMES, describeItem } from '../lib/items';

const COLOUR_VAR: Record<Colour, string> = { R: 'var(--red)', B: 'var(--blue)', G: 'var(--green)', Y: 'var(--yellow)' };

function ShapePath({ s, fill }: { s: Shape; fill: string }) {
  const edge = { stroke: 'var(--shape-edge)', strokeWidth: 1.5, strokeLinejoin: 'round' as const };
  switch (s) {
    case 'circle':
      return <circle cx="20" cy="20" r="13" fill={fill} {...edge} />;
    case 'triangle':
      return <polygon points="20,6 34,32 6,32" fill={fill} {...edge} />;
    case 'square':
      return <rect x="7.5" y="7.5" width="25" height="25" rx="3" fill={fill} {...edge} />;
    case 'star':
      return <polygon points="20,4.5 24.4,14.6 35.4,15.6 27.1,22.9 29.6,33.7 20,28 10.4,33.7 12.9,22.9 4.6,15.6 15.6,14.6" fill={fill} {...edge} />;
  }
}

/** One tile: the shape in colour plus its colour letter, so colour is never the only cue. */
export function TileGlyph({ tile, size = 34 }: { tile: Tile; size?: number }) {
  return (
    <span className="tile-glyph" style={{ width: size, height: size }} role="img" aria-label={`${COLOUR_NAMES[tile.c]} ${tile.s}`}>
      <svg viewBox="0 0 40 40" width={size * 0.8} height={size * 0.8} aria-hidden="true">
        <ShapePath s={tile.s} fill={COLOUR_VAR[tile.c]} />
      </svg>
      <span className="tile-letter" aria-hidden="true">
        {tile.c}
      </span>
    </span>
  );
}

export function ItemView({ domain, item, size = 'md' }: { domain: Domain; item: Item; size?: 'sm' | 'md' }) {
  const label = describeItem(domain, item);
  if (domain === 'tiles')
    return (
      <span className={`item item-tiles item-${size}`} role="group" aria-label={label}>
        {(item as TileItem).map((t, i) => (
          <TileGlyph key={i} tile={t} size={size === 'sm' ? 26 : 32} />
        ))}
      </span>
    );
  const text =
    domain === 'sequences' ? (
      (item as SequenceItem).map((n, i) => (
        <span key={i}>
          {i > 0 && <span className="item-sep">·</span>}
          {n}
        </span>
      ))
    ) : domain === 'words' ? (
      (item as string).toUpperCase()
    ) : domain === 'chain' ? (
      String(item)
    ) : (
      String(item)
    );
  return (
    <span className={`item item-text item-${domain} item-${size}`} aria-label={label}>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}

/** "✓ FITS" / "✗ DOESN'T": a symbol and a word, never colour alone. */
export function VerdictBadge({ pass, chain = false }: { pass: boolean; chain?: boolean }) {
  const [yes, no, srYes, srNo] = chain ? ["That's next", 'Not next', '', ''] : ['Fits', "Doesn't", ' the rule', ' fit the rule'];
  return (
    <span className={`verdict ${pass ? 'is-pass' : 'is-fail'}`}>
      <span aria-hidden="true">{pass ? '✓' : '✗'}</span> {pass ? yes : no}
      <span className="sr-only">{pass ? srYes : srNo}</span>
    </span>
  );
}
