import { cn } from '@/lib/utils';

/**
 * Editorial dark gradient mesh — purple + amber blobs at low opacity over deep ink.
 * Used full-bleed behind hero / section backgrounds.
 */
export function GradientMesh({
  className,
  intensity = 'soft',
}: {
  className?: string;
  intensity?: 'soft' | 'strong';
}) {
  const opacity = intensity === 'soft' ? 0.5 : 0.75;
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
        className,
      )}
    >
      <div
        className="absolute -left-1/4 top-0 h-[60vh] w-[60vw] rounded-full blur-[120px]"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--brand) / 0.4), transparent 70%)',
          opacity,
        }}
      />
      <div
        className="absolute -right-1/4 top-1/3 h-[50vh] w-[50vw] rounded-full blur-[120px]"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--amber) / 0.18), transparent 70%)',
          opacity: opacity * 0.7,
        }}
      />
    </div>
  );
}
