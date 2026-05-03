import { Topbar } from '@/components/app/Topbar';
import { GeneratorForm } from '@/components/app/GeneratorForm';

export default function StudioPage() {
  return (
    <>
      <Topbar title="Studio" />
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Une idée. Cinq plateformes. Ta voix.
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Colle un brief, un transcript ou une URL. SocialBoost adapte au format natif de
              chaque réseau et garde ton ton.
            </p>
          </div>
          <GeneratorForm />
        </div>
      </div>
    </>
  );
}
