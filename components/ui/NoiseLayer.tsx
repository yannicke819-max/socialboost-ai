import { cn } from '@/lib/utils';

const NOISE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0"/>
    </filter>
    <rect width="100%" height="100%" filter="url(#n)" opacity="0.65"/>
  </svg>`,
)}`;

export function NoiseLayer({
  className,
  opacity = 0.06,
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
