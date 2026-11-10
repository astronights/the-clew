import { useId } from 'react';

const STRANDS = [-6, -1.5, 3, 7.5];

/** Strands wrapping the ball in one direction, as parallel arcs. */
function Band({ angle, hi = false }: { angle: number; hi?: boolean }) {
  return (
    <g transform={`rotate(${angle} 22 24)`}>
      {STRANDS.map((dy) => (
        <path
          key={dy}
          d={`M2 ${24 + dy} Q22 ${15 + dy * 1.6} 42 ${24 + dy}`}
          fill="none"
          stroke={hi ? 'var(--thread-hi)' : 'var(--ink)'}
          strokeOpacity={hi ? 0.9 : 0.42}
          strokeWidth={hi ? 1.3 : 1.6}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

/**
 * A wound ball of yarn. `tail` adds a loose end trailing along the bottom;
 * leave it off where the thread line itself continues from the ball.
 */
export function YarnBall({ size = 32, className = '', tail = true }: { size?: number; className?: string; tail?: boolean }) {
  const clip = `yarn-${useId().replace(/:/g, '')}`;
  const tailPath = 'M12 37 C8 43 14 46 21 44.5 S33 42 38 46.5';
  return (
    <svg className={`yarn-ball ${className}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <circle cx="22" cy="24" r="16" />
        </clipPath>
      </defs>
      {/* loose end, drawn first so the ball sits on top of it */}
      {tail && (
        <>
          <path d={tailPath} fill="none" stroke="var(--ink)" strokeWidth="5.5" strokeLinecap="round" />
          <path d={tailPath} fill="none" stroke="var(--thread)" strokeWidth="2.8" strokeLinecap="round" />
        </>
      )}
      <circle cx="22" cy="24" r="17" fill="var(--thread)" />
      <g clipPath={`url(#${clip})`}>
        <Band angle={-28} />
        <Band angle={62} />
        {/* a top band wound over the others */}
        <g transform="rotate(14 22 24)">
          <path d="M0 17 Q22 7 44 17 L44 32 Q22 22 0 32 Z" fill="var(--thread)" />
        </g>
        <Band angle={14} hi />
        {/* shading on the lower-right side */}
        <circle cx="28" cy="30" r="17" fill="none" stroke="var(--ink)" strokeOpacity="0.16" strokeWidth="8" />
      </g>
      <circle cx="22" cy="24" r="17" fill="none" stroke="var(--ink)" strokeWidth="2.5" />
    </svg>
  );
}
