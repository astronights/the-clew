/** Minimal mark: a ball of thread drawn as a ring with one wound strand and a loose end. */
export function ClewMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`clew-mark ${className}`} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="13" r="10" stroke="currentColor" strokeWidth="2.2" />
      <path d="M8.5 9.5c4.5-2 10.5-2 15 1M7 15.5c5-2 12-2 17 .5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <path d="M9.5 20.5C6 23 3 26.5 6 28.5c3 1.8 8-.5 13 0s8 1.5 11 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
