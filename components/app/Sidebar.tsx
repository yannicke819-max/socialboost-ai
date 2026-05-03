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
    <aside className="hidden w-60 shrink-0 border-r border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950 md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-gray-100 px-6 dark:border-gray-800">
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
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                active
                  ? 'bg-brand-500/10 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-100 p-4 dark:border-gray-800">
        <div className="rounded-lg bg-brand-500/5 p-3 text-sm">
          <p className="font-semibold">Trial Pro</p>
          <p className="mt-1 text-xs text-gray-500">14 jours · campagnes illimitées</p>
          <Link
            href="/pricing"
            className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline"
          >
            Voir les plans →
          </Link>
        </div>
      </div>
    </aside>
  );
}
