import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Input Card — visualizes the offer + brief input that drives the Campaign Engine.
 * Used in Hero demo and #how workflow.
 */
export function InputCard({
  label,
  offer,
  brief,
  className,
}: {
  label: string;
  offer: string;
  brief: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-bg-elevated p-5', className)}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{label}</p>

      <div className="mt-3 flex items-start gap-2 rounded-md border border-amber/30 bg-amber-soft px-3 py-2">
        <Tag size={13} className="mt-0.5 shrink-0 text-amber" aria-hidden />
        <span className="text-sm text-amber">{offer}</span>
      </div>

      <div className="mt-3 rounded-md bg-bg-muted p-3">
        <p className="text-sm leading-relaxed text-fg-muted">{brief}</p>
      </div>
    </div>
  );
}
