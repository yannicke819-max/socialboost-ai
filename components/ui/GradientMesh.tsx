import { cn } from '@/lib/utils';

export function GradientMesh({
  className,
  intensity = 'soft',
}: {
  className?: string;
  intensity?: 'soft' | 'strong';
}) {
  const opacity = intensity === 'soft' ? 0.45 : 0.7;
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        className,
      )}
    >
      <div
        className="absolute -left-1/4 top-0 h-[60vh] w-[60vw] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--brand) / 0.35), transparent 70%)',
          opacity,
        }}
      />
      <div
        className="absolute -right-1/4 top-1/4 h-[55vh] w-[55vw] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--violet) / 0.20), transparent 70%)',
          opacity,
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[45vh] w-[45vw] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--lime) / 0.18), transparent 70%)',
          opacity: opacity * 0.8,
        }}
      />
    </div>
  );
}
