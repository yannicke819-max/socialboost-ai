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
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-wider text-fg-subtle">
          {updatedLabel} · {updated}
        </p>
      </header>
      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-bold tracking-tight text-fg sm:text-xl">{s.h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted sm:text-base">{s.p}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
