/** Hand-drawn style ball of yarn, coloured by --thread. */
export function YarnBall({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`yarn-ball ${className}`} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="22" cy="25" r="17" fill="var(--thread)" stroke="var(--ink)" strokeWidth="2.5" />
      <g fill="none" stroke="var(--thread-hi)" strokeWidth="2.2" strokeLinecap="round">
        <path d="M8 21c8-6 20-8 30-2" />
        <path d="M6.5 29c9-5 22-5 32 1" />
        <path d="M15 10c4 8 5 21 0 31" />
        <path d="M27 8.5c5 9 6 23 1 33" />
      </g>
      <path d="M37 33c5 1 7 5 6 9" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
