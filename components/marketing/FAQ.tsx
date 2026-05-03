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
            className="rounded-xl border border-gray-200 bg-white transition dark:border-gray-800 dark:bg-gray-900"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left font-semibold sm:px-5 sm:py-4"
              aria-expanded={isOpen}
            >
              <span className="text-sm sm:text-base">{item.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-300 sm:px-5 sm:pb-5 sm:text-base">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
