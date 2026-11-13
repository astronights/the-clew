import type { Colour, Domain, Item, SequenceItem, Shape, Tile, TileItem } from '../rules/types';
import { COLOUR_NAMES, describeItem } from '../lib/items';

const COLOUR_VAR: Record<Colour, string> = { R: 'var(--red)', B: 'var(--blue)', G: 'var(--green)', Y: 'var(--yellow)' };

function ShapePath({ s, fill }: { s: Shape; fill: string }) {
  const stroke = { stroke: 'var(--shape-edge)', strokeWidth: 2.5, strokeLinejoin: 'round' as const };
  switch (s) {
    case 'circle':
      return <circle cx="20" cy="20" r="13" fill={fill} {...stroke} />;
    case 'triangle':
      return <polygon points="20,6 34,32 6,32" fill={fill} {...stroke} />;
    case 'square':
      return <rect x="7.5" y="7.5" width="25" height="25" rx="4" fill={fill} {...stroke} />;
    case 'star':
      return (
        <polygon points="20,4.5 24.4,14.6 35.4,15.6 27.1,22.9 29.6,33.7 20,28 10.4,33.7 12.9,22.9 4.6,15.6 15.6,14.6" fill={fill} {...stroke} />
      );
  }
}

/** A single tile: the shape in colour, plus a colour letter so colour is never the only cue. */
export function TileGlyph({ tile, size = 44 }: { tile: Tile; size?: number }) {
  return (
    <span className="tile-glyph" style={{ width: size, height: size }} role="img" aria-label={`${COLOUR_NAMES[tile.c]} ${tile.s}`}>
      <svg viewBox="0 0 40 40" width={size * 0.78} height={size * 0.78} aria-hidden="true">
        <ShapePath s={tile.s} fill={COLOUR_VAR[tile.c]} />
      </svg>
      <span className="tile-letter" aria-hidden="true">
        {tile.c}
      </span>
    </span>
  );
}

export function ItemView({ domain, item, size = 'md' }: { domain: Domain; item: Item; size?: 'sm' | 'md' }) {
  const cls = `item item-${domain} item-${size}`;
  switch (domain) {
    case 'numbers':
      return (
        <span className={cls} aria-label={describeItem(domain, item)}>
          <span className="chip chip-big" aria-hidden="true">
            {String(item)}
          </span>
        </span>
      );
    case 'sequences':
      return (
        <span className={cls} aria-label={describeItem(domain, item)}>
          {(item as SequenceItem).map((n, i) => (
            <span key={i} className="seq-part" aria-hidden="true">
              {i > 0 && <span className="seq-sep">›</span>}
              <span className="chip">{n}</span>
            </span>
          ))}
        </span>
      );
    case 'tiles':
      return (
        <span className={cls} role="group" aria-label={describeItem(domain, item)}>
          {(item as TileItem).map((t, i) => (
            <TileGlyph key={i} tile={t} size={size === 'sm' ? 34 : 44} />
          ))}
        </span>
      );
    case 'words':
      return (
        <span className={cls} aria-label={describeItem(domain, item)}>
          {(item as string)
            .toUpperCase()
            .split('')
            .map((ch, i) => (
              <span key={i} className="letter" aria-hidden="true">
                {ch}
              </span>
            ))}
        </span>
      );
  }
}

export function VerdictBadge({ pass, animate = true }: { pass: boolean; animate?: boolean }) {
  return (
    <span className={`verdict ${pass ? 'is-pass' : 'is-fail'} ${animate ? 'in' : ''}`}>
      <span aria-hidden="true">{pass ? '✓' : '✗'}</span>
      {pass ? 'Passes' : 'Fails'}
    </span>
  );
}
