/** Tiny dependency-free confetti burst of yarn snippets. Respects reduced motion. */
export function confetti(durationMs = 2600): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.remove();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  resize();
  const colours = ['#d22d1f', '#111111', '#3b6fb6', '#e2b23c', '#3f8f5f', '#c9c4bc'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 12,
    vy: -Math.random() * 13 - 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    len: 8 + Math.random() * 14,
    c: colours[Math.floor(Math.random() * colours.length)],
    curl: Math.random() * 6 - 3,
  }));
  const start = performance.now();
  const frame = (t: number) => {
    const elapsed = t - start;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = Math.max(0, 1 - elapsed / durationMs);
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.5;
    for (const p of pieces) {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.strokeStyle = p.c;
      ctx.beginPath();
      ctx.moveTo(-p.len / 2, 0);
      ctx.quadraticCurveTo(0, p.curl * 2, p.len / 2, 0);
      ctx.stroke();
      ctx.restore();
    }
    if (elapsed < durationMs) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
