import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getDict } from '@/lib/i18n';

export const metadata = { title: 'About — SocialBoost AI' };

export default function AboutPage() {
  const dict = getDict();
  const t = dict.about;

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <Badge variant="mono" className="mb-4">
        {t.eyebrow}
      </Badge>
      <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl md:text-5xl">
        {t.title}
      </h1>
      <p className="mt-5 text-base text-fg-muted sm:text-lg">{t.subtitle}</p>

      <div className="mt-12 space-y-10">
        {t.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted sm:text-base">{s.p}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <Button href="/signup" variant="brand" size="md">
          {dict.hero.primaryCta} <ArrowRight size={16} />
        </Button>
      </div>
    </main>
  );
}
