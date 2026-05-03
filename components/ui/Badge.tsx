import { cn } from '@/lib/utils';

type Variant = 'default' | 'brand' | 'mono';

const variants: Record<Variant, string> = {
  default:
    'border border-border bg-bg-elevated text-fg-muted',
  brand: 'bg-brand-soft text-brand',
  mono:
    'border border-border bg-bg-elevated text-fg-muted font-mono uppercase tracking-wider',
};

export function Badge({
  variant = 'default',
  className,
  children,
}: {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
