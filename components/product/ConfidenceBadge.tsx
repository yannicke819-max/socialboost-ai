import { cn } from '@/lib/utils';

/**
 * Compact confidence badge — used inline on cards or post variants.
 * Score in mono, dot pulse + amber. Reasoning preview in fg-muted.
 */
export function ConfidenceBadge({
  score,
  reason,
  className,
}: {
  score: number;
  reason?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-amber/30 bg-amber-soft px-2.5 py-1',
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-amber"
        aria-hidden
      />
      <span className="font-mono text-xs font-medium text-amber">{clamped}/100</span>
      {reason && (
        <span className="hidden text-xs text-fg-muted sm:inline">· {reason}</span>
      )}
    </div>
  );
}
