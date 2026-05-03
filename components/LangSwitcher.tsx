'use client';

import { useState, useTransition } from 'react';
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
  const [open, setOpen] = useState(false);

  function setLocale(next: Locale) {
    setOpen(false);
    if (next === current) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className={cn('relative', className)} aria-label={label}>
      {/* Mobile: globe + active code, dropdown opens on tap */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-xs uppercase tracking-wider text-fg-muted transition hover:text-fg sm:hidden"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe size={12} aria-hidden />
        {current}
      </button>

      {open && (
        <ul
          className="absolute right-0 top-full z-50 mt-1 flex flex-col rounded-md border border-border-strong bg-bg-elevated p-1 shadow-pop sm:hidden"
          role="listbox"
        >
          {LOCALES.map((loc) => (
            <li key={loc}>
              <button
                type="button"
                onClick={() => setLocale(loc)}
                disabled={isPending}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition',
                  current === loc ? 'bg-bg-muted text-fg' : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
                )}
                role="option"
                aria-selected={current === loc}
              >
                <span>{loc}</span>
                <span className="text-[10px] normal-case tracking-normal text-fg-subtle">
                  {LOCALE_LABELS[loc]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Desktop: inline list of all codes */}
      <div className="hidden items-center gap-1 sm:flex">
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
                current === loc ? 'text-fg' : 'text-fg-muted hover:text-fg',
              )}
              aria-current={current === loc ? 'true' : undefined}
              title={LOCALE_LABELS[loc]}
            >
              {loc}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
