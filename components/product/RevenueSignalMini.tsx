import { ArrowUpRight, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';

type Row = {
  date: string;
  post: string;
  clicks: number;
  destination: string;
};

/**
 * Revenue Signal mini-dashboard — illustrates how a post drives clicks
 * to the user's offer link. Amber accents on numbers (business signal).
 */
export function RevenueSignalMini({
  rows,
  totalClicks,
  className,
}: {
  rows: ReadonlyArray<Row>;
  totalClicks: number;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-bg-elevated p-5', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            Revenue Signal · 30 derniers jours
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl text-fg">{totalClicks}</span>
            <span className="text-sm text-fg-muted">clics → ton offre</span>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-md border border-amber/30 bg-amber-soft px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-amber">
          <ArrowUpRight size={12} />
          tracké
        </span>
      </div>

      <ul className="mt-5 divide-y divide-border">
        {rows.map((row, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">{row.post}</p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {row.date} · → {row.destination}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 font-mono text-sm text-amber">
              <MousePointerClick size={13} />
              {row.clicks}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
