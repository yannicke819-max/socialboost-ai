import { cn } from '@/lib/utils';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'plain';
};

export function Card({ variant = 'default', className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-lg',
        variant === 'default' && 'bg-bg-elevated border border-border shadow-soft',
        variant === 'plain' && 'bg-bg-elevated border border-border',
        className,
      )}
    />
  );
}
