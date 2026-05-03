'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type FAQItem = { q: string; a: string };

export function FAQ({ items }: { items: ReadonlyArray<FAQItem> }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="rounded-xl border border-border bg-bg-elevated transition hover:border-border-strong"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-fg sm:px-5 sm:py-4"
              aria-expanded={isOpen}
            >
              <span className="flex items-baseline gap-3 text-sm font-semibold sm:text-base">
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {item.q}
              </span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-fg-muted transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm leading-relaxed text-fg-muted sm:px-5 sm:pb-5 sm:text-base">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
