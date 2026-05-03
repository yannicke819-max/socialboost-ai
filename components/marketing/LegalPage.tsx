type Section = { h: string; p: string };

export function LegalPage({
  title,
  updated,
  updatedLabel,
  sections,
}: {
  title: string;
  updated: string;
  updatedLabel: string;
  sections: ReadonlyArray<Section>;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">
          {updatedLabel} : {updated}
        </p>
      </header>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-bold sm:text-xl">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
              {s.p}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
