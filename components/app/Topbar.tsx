import { Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-bg-elevated px-4 sm:px-6">
      <h1 className="text-xl font-bold tracking-tight text-fg">{title}</h1>
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-md border border-border text-fg-muted transition hover:border-border-strong hover:text-fg"
          aria-label="Notifications"
        >
          <Bell size={16} />
        </button>
        <Button href="/studio" variant="brand" size="sm">
          <Plus size={14} /> Nouvelle campagne
        </Button>
      </div>
    </header>
  );
}
