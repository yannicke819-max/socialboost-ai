import { Topbar } from '@/components/app/Topbar';
import { GeneratorForm } from '@/components/app/GeneratorForm';

export default function GeneratorPage() {
  return (
    <>
      <Topbar title="Générateur" />
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-gray-600 dark:text-gray-300">
            Décris en une phrase ce que tu veux raconter. L&apos;IA produit 3 variantes adaptées à
            la plateforme.
          </p>
          <GeneratorForm />
        </div>
      </div>
    </>
  );
}
