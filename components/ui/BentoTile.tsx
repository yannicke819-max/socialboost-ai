import { cn } from '@/lib/utils';

type BentoTileProps = React.HTMLAttributes<HTMLDivElement> & {
  span?: 'sm' | 'md' | 'lg' | 'wide' | 'tall';
  highlight?: 'brand' | 'amber';
};

const spans: Record<NonNullable<BentoTileProps['span']>, string> = {
  sm: 'md:col-span-1',
  md: 'md:col-span-2',
  lg: 'md:col-span-3 md:row-span-2',
  wide: 'md:col-span-3',
  tall: 'md:col-span-1 md:row-span-2',
};

export function BentoTile({
  span = 'md',
  highlight,
  className,
  ...props
}: BentoTileProps) {
  return (
    <div
      {...props}
      className={cn(
        'group relative overflow-hidden rounded-xl bg-bg-elevated transition',
        highlight === 'brand' && 'border border-brand/40 shadow-glow',
        highlight === 'amber' && 'border border-amber/40 shadow-glow-amber',
        !highlight && 'border border-border shadow-soft',
        spans[span],
        className,
      )}
    />
  );
}
