import { forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'outline' | 'ghost' | 'mono';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  default:
    'bg-fg text-bg hover:bg-fg/90 shadow-soft hover:shadow-pop transition-shadow',
  outline:
    'border border-border-strong bg-bg-elevated text-fg hover:border-fg hover:bg-bg',
  ghost: 'text-fg hover:bg-bg-muted',
  mono:
    'font-mono uppercase tracking-wider border border-border bg-bg-elevated text-fg hover:border-fg-muted text-xs',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type AsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type AsLink = CommonProps &
  Omit<React.ComponentProps<typeof Link>, keyof CommonProps | 'href'> & { href: string };

type ButtonProps = AsButton | AsLink;

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = 'default', size = 'md', className, children, ...rest }, ref) => {
    const cls = cn(
      'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50',
      variants[variant],
      sizes[size],
      className,
    );

    if ('href' in rest && rest.href) {
      const { href, ...linkRest } = rest as AsLink;
      return (
        <Link
          {...linkRest}
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={cls}
        >
          {children}
        </Link>
      );
    }

    const buttonRest = rest as AsButton;
    return (
      <button
        {...buttonRest}
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cls}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
