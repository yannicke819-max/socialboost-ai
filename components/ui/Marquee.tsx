import { cn } from '@/lib/utils';

export function Marquee({
  children,
  className,
  pauseOnHover = true,
}: {
  children: React.ReactNode;
  className?: string;
  pauseOnHover?: boolean;
}) {
  return (
    <div className={cn('group relative flex w-full overflow-hidden', className)}>
      <div
        className={cn(
          'flex shrink-0 animate-marquee items-center gap-12',
          pauseOnHover && 'group-hover:[animation-play-state:paused]',
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          'flex shrink-0 animate-marquee items-center gap-12',
          pauseOnHover && 'group-hover:[animation-play-state:paused]',
        )}
        aria-hidden
      >
        {children}
      </div>
    </div>
  );
}
