import { Bell, Plus } from 'lucide-react';
import Link from 'next/link';

export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6 dark:border-gray-800 dark:bg-gray-950">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 transition hover:border-brand-500 dark:border-gray-700"
          aria-label="Notifications"
        >
          <Bell size={16} />
        </button>
        <Link
          href="/studio"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <Plus size={16} /> Nouvelle campagne
        </Link>
      </div>
    </header>
  );
}
