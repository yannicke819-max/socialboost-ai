'use client';

import { CalendarClock } from 'lucide-react';

export function ComingSoonTab({
  language,
  title,
  body,
}: {
  language: 'fr' | 'en';
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border bg-bg-elevated/40 p-10 text-center">
      <CalendarClock size={20} className="mx-auto mb-3 text-fg-subtle" />
      <h3 className="font-display text-xl font-semibold text-fg">
        {title}
        <span className="ml-2 rounded-full border border-border bg-bg-elevated px-2 py-0.5 align-middle font-mono text-[10px] font-normal text-fg-subtle">
          {language === 'en' ? 'Soon — AI-008b' : 'Bientôt — AI-008b'}
        </span>
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-fg-muted">{body}</p>
    </div>
  );
}
