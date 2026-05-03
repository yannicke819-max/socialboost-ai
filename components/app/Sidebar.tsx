'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wand2, LineChart, Settings, type LucideIcon } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

type Item = { href: string; label: string; icon: LucideIcon };

const ITEMS: Item[] = [
  { href: '/studio', label: 'Studio', icon: Wand2 },
  { href: '/performance', label: 'Performance', icon: LineChart },
  { href: '/settings', label: 'Réglages', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-bg-elevated md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Logo href="/studio" />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                active
                  ? 'bg-bg-muted font-semibold text-fg'
                  : 'text-fg-muted hover:bg-bg-muted hover:text-fg',
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="rounded-md border border-border bg-bg p-3 text-sm">
          <p className="font-semibold text-fg">Trial Pro</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            14 jours · campagnes illimitées
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-fg-muted transition-colors hover:text-fg"
          >
            Voir les plans →
          </Link>
        </div>
      </div>
    </aside>
  );
}
