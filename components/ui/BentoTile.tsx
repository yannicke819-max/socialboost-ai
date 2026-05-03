import { cn } from '@/lib/utils';

type BentoTileProps = React.HTMLAttributes<HTMLDivElement> & {
  span?: 'sm' | 'md' | 'lg' | 'wide';
  highlight?: boolean;
};

const spans: Record<NonNullable<BentoTileProps['span']>, string> = {
  sm: 'md:col-span-1',
  md: 'md:col-span-2',
  lg: 'md:col-span-3 md:row-span-2',
  wide: 'md:col-span-3',
};

export function BentoTile({
  span = 'md',
  highlight = false,
  className,
  ...props
}: BentoTileProps) {
  return (
    <div
      {...props}
      className={cn(
        'group relative overflow-hidden rounded-xl bg-bg-elevated transition',
        highlight ? 'border border-brand/40 shadow-glow' : 'border border-border shadow-soft',
        spans[span],
        className,
      )}
    />
  );
}
