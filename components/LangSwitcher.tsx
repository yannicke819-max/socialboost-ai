'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import { LOCALES, LOCALE_LABELS, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';

export function LangSwitcher({
  current,
  label,
  className,
}: {
  current: Locale;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setLocale(next: Locale) {
    if (next === current) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className={cn('flex items-center gap-1', className)} aria-label={label}>
      <Globe size={14} className="text-fg-subtle" aria-hidden />
      {LOCALES.map((loc, i) => (
        <span key={loc} className="flex items-center">
          {i > 0 && <span className="px-0.5 text-fg-subtle">·</span>}
          <button
            type="button"
            onClick={() => setLocale(loc)}
            disabled={isPending}
            className={cn(
              'rounded px-1 font-mono text-xs uppercase tracking-wider transition',
              current === loc ? 'text-fg' : 'text-fg-subtle hover:text-fg',
            )}
            aria-current={current === loc ? 'true' : undefined}
            title={LOCALE_LABELS[loc]}
          >
            {loc}
          </button>
        </span>
      ))}
    </div>
  );
}
