import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getDict } from '@/lib/i18n';

export default function NotFound() {
  const t = getDict().notFound;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-display text-7xl text-fg/20 sm:text-8xl">{t.title}</p>
      <p className="mt-4 text-lg text-fg-muted sm:text-xl">{t.subtitle}</p>
      <Button href="/" variant="outline" size="md" className="mt-8">
        <ArrowLeft size={16} /> {t.cta}
      </Button>
    </main>
  );
}
