import Link from 'next/link';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'brand' | 'outline' | 'ghost' | 'mono';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  // 'default' = neutral CTA on dark = light pill, used for less-frequent secondary actions
  default:
    'bg-fg text-bg hover:bg-fg/90 shadow-soft',
  // 'brand' = the primary purple CTA — used sparingly, ONE per screen ideally
  brand:
    'bg-brand text-brand-fg hover:bg-brand/90 shadow-glow transition-shadow',
  outline:
    'border border-border-strong bg-bg-elevated text-fg hover:border-fg hover:bg-bg-muted',
  ghost: 'text-fg hover:bg-bg-muted',
  mono:
    'font-mono uppercase tracking-wider border border-border bg-bg-elevated text-fg hover:border-fg-muted text-xs',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
};

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50';

function classes(variant: Variant, size: Size, className?: string) {
  return cn(baseClass, variants[variant], sizes[size], className);
}

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = 'default',
  size = 'md',
  className,
  children,
  href,
  ...rest
}: CommonProps & {
  href?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>) {
  const cls = classes(variant, size, className);

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button {...rest} className={cls}>
      {children}
    </button>
  );
}
