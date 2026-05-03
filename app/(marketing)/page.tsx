import Link from 'next/link';
import { ArrowRight, Dna, Layers, Gauge, Mic, Globe, FileText, Sparkles, Check, X } from 'lucide-react';
import { FAQ } from '@/components/marketing/FAQ';
import { PricingTable } from '@/components/marketing/PricingTable';
import { getDict } from '@/lib/i18n';
import { buildPlans } from '@/lib/pricing';

export default function HomePage() {
  const t = getDict();
  return (
    <>
      <Hero t={t.hero} demo={t.demo} />
      <Problem t={t.problem} />
      <HowItWorks t={t.how} />
      <Pillars t={t.pillars} />
      <Comparison t={t.comparison} />
      <ForWho t={t.forwho} />
      <Testimonials t={t.testimonials} />
      <PricingSection t={t.pricingHome} plans={buildPlans(t)} labels={t.pricingPage} />
      <FAQSection title={t.faq.title} items={t.faq.items} />
      <FinalCTA t={t.finalCta} />
    </>
  );
}

function Hero({
  t,
  demo,
}: {
  t: ReturnType<typeof getDict>['hero'];
  demo: ReturnType<typeof getDict>['demo'];
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-600 sm:text-sm">
          {t.eyebrow}
        </p>
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
          {t.titleStart} <span className="text-brand-500">{t.titleEnd}</span>
        </h1>
        <p className="mt-5 text-base text-gray-600 dark:text-gray-300 sm:mt-6 sm:text-lg">
          {t.subtitle}
        </p>
        <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-500 px-6 py-3 text-center font-semibold text-white transition hover:bg-brand-600"
          >
            {t.primaryCta}
          </Link>
          <Link
            href="#how"
            className="rounded-lg border border-gray-300 px-6 py-3 text-center font-semibold transition hover:border-brand-500 hover:text-brand-600 dark:border-gray-700"
          >
            {t.secondaryCta}
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-500 sm:text-sm">{t.fineprint}</p>
      </div>

      <div className="mx-auto mt-12 max-w-5xl sm:mt-16">
        <DemoFrame t={demo} />
      </div>
    </section>
  );
}

function DemoFrame({ t }: { t: ReturnType<typeof getDict>['demo'] }) {
  const platforms: { key: keyof typeof t.platforms; label: string }[] = [
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'x', label: 'X / Twitter' },
    { key: 'tiktok', label: 'TikTok' },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-6 md:border-b-0 md:border-r">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t.inputLabel}
          </p>
          <div className="mt-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            {t.inputExample}
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t.outputLabel}
          </p>
          <div className="mt-3 space-y-2">
            {platforms.map((p) => (
              <PlatformPill key={p.key} name={p.label} preview={t.platforms[p.key]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformPill({ name, preview }: { name: string; preview: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-500/10 text-xs font-bold text-brand-600">
        {name.charAt(0)}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-gray-500">{preview}</p>
      </div>
    </div>
  );
}

function Problem({ t }: { t: ReturnType<typeof getDict>['problem'] }) {
  return (
    <section className="border-y border-gray-100 bg-gray-50 py-16 dark:border-gray-800 dark:bg-gray-900 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">{t.title}</h2>
        <p className="mt-5 text-base text-gray-600 dark:text-gray-300 sm:mt-6 sm:text-lg">
          {t.body}
        </p>
        <p className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg">
          {t.punchline}
        </p>
      </div>
    </section>
  );
}

function HowItWorks({ t }: { t: ReturnType<typeof getDict>['how'] }) {
  const icons = [<Dna key="dna" size={20} />, <Layers key="layers" size={20} />, <Gauge key="gauge" size={20} />];
  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">{t.title}</h2>
      </div>
      <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 md:grid-cols-3">
        {t.steps.map((s, i) => (
          <div key={s.title} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950 sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 font-bold text-white">
                {i + 1}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {s.time}
              </span>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <span className="text-brand-500">{icons[i]}</span>
              <h3 className="text-lg font-bold">{s.title}</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pillars({ t }: { t: ReturnType<typeof getDict>['pillars'] }) {
  const icons = [<Dna key="dna" size={22} />, <Layers key="layers" size={22} />, <Gauge key="gauge" size={22} />];
  return (
    <section id="features" className="bg-gray-50 py-20 dark:bg-gray-900 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 sm:text-sm">
            {t.eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl md:text-4xl">{t.title}</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 md:grid-cols-3">
          {t.items.map((p, i) => (
            <div key={p.title} className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800 sm:p-7">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-600">
                {icons[i]}
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-brand-600">
                {p.tag}
              </p>
              <h3 className="mt-1 text-xl font-bold">{p.title}</h3>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Comparison({ t }: { t: ReturnType<typeof getDict>['comparison'] }) {
  const cells: Array<[boolean | string, boolean | string, boolean | string]> = [
    [false, false, true],
    [false, false, true],
    [false, false, true],
    [true, false, true],
    [true, false, true],
    [false, true, t.soon],
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">{t.title}</h2>
      </div>
      <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 sm:mt-10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-3 text-left font-semibold sm:px-4"></th>
                <th className="px-3 py-3 text-center font-semibold text-gray-500 sm:px-4">{t.cols.chatgpt}</th>
                <th className="px-3 py-3 text-center font-semibold text-gray-500 sm:px-4">{t.cols.buffer}</th>
                <th className="px-3 py-3 text-center font-semibold text-brand-600 sm:px-4">{t.cols.socialboost}</th>
              </tr>
            </thead>
            <tbody>
              {t.rows.map((label, i) => (
                <tr key={label} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-3 font-medium sm:px-4">{label}</td>
                  <td className="px-3 py-3 text-center sm:px-4">{renderCell(cells[i][0])}</td>
                  <td className="px-3 py-3 text-center sm:px-4">{renderCell(cells[i][1])}</td>
                  <td className="px-3 py-3 text-center sm:px-4">{renderCell(cells[i][2])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function renderCell(v: boolean | string) {
  if (v === true) return <Check size={18} className="mx-auto text-brand-500" />;
  if (v === false) return <X size={18} className="mx-auto text-gray-300" />;
  return <span className="text-xs font-medium text-gray-500">{v}</span>;
}

function ForWho({ t }: { t: ReturnType<typeof getDict>['forwho'] }) {
  const icons = [<Mic key="mic" size={22} />, <FileText key="file" size={22} />, <Globe key="globe" size={22} />];
  return (
    <section className="bg-gray-50 py-20 dark:bg-gray-900 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">{t.title}</h2>
        </div>
        <div className="mt-10 grid gap-5 sm:mt-12 sm:gap-6 md:grid-cols-3">
          {t.items.map((c, i) => (
            <div key={c.title} className="rounded-2xl bg-white p-6 dark:bg-gray-800">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-500/10 text-brand-600">
                {icons[i]}
              </span>
              <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ t }: { t: ReturnType<typeof getDict>['testimonials'] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
        {t.items.map((it) => (
          <blockquote key={it.who} className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
            <p className="text-base font-medium leading-relaxed">« {it.quote} »</p>
            <footer className="mt-4 text-sm text-gray-500">— {it.who}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

function PricingSection({
  t,
  plans,
  labels,
}: {
  t: ReturnType<typeof getDict>['pricingHome'];
  plans: ReturnType<typeof buildPlans>;
  labels: ReturnType<typeof getDict>['pricingPage'];
}) {
  return (
    <section id="pricing" className="bg-gray-50 py-20 dark:bg-gray-900 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl md:text-4xl">{t.title}</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">{t.subtitle}</p>
        </div>
        <div className="mt-10 sm:mt-12">
          <PricingTable plans={plans} labels={labels} />
        </div>
      </div>
    </section>
  );
}

function FAQSection({
  title,
  items,
}: {
  title: string;
  items: ReturnType<typeof getDict>['faq']['items'];
}) {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24">
      <h2 className="text-center text-2xl font-bold sm:text-3xl md:text-4xl">{title}</h2>
      <div className="mt-10 sm:mt-12">
        <FAQ items={items} />
      </div>
    </section>
  );
}

function FinalCTA({ t }: { t: ReturnType<typeof getDict>['finalCta'] }) {
  return (
    <section className="bg-brand-500 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Sparkles size={32} className="mx-auto opacity-50" />
        <h2 className="mt-4 text-2xl font-bold sm:text-3xl md:text-4xl">{t.title}</h2>
        <p className="mt-4 text-base text-brand-50 sm:text-lg">{t.subtitle}</p>
        <Link
          href="/signup"
          className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-600 transition hover:bg-gray-100 sm:mt-8 sm:px-7 sm:py-3.5"
        >
          {t.cta} <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
