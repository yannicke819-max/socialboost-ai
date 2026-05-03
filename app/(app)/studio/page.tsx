import { Topbar } from '@/components/app/Topbar';
import { GeneratorForm } from '@/components/app/GeneratorForm';
import { getDict } from '@/lib/i18n';

export default function StudioPage() {
  const t = getDict().studio;
  return (
    <>
      <Topbar title={t.title} />
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">{t.heading}</h2>
            <p className="mt-2 text-sm text-fg-muted sm:text-base">{t.subtitle}</p>
          </div>
          <GeneratorForm />
        </div>
      </div>
    </>
  );
}
