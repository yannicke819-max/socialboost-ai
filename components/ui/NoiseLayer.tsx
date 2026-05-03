import { cn } from '@/lib/utils';

const NOISE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.7 0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.7"/>
  </svg>`,
)}`;

/**
 * Subtle film-grain noise overlay — adds editorial texture on dark surfaces.
 * Use with very low opacity (0.04-0.08) at section level, never globally.
 */
export function NoiseLayer({
  className,
  opacity = 0.05,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 -z-10 mix-blend-overlay', className)}
      style={{
        backgroundImage: `url("${NOISE_SVG}")`,
        backgroundRepeat: 'repeat',
        opacity,
      }}
    />
  );
}
