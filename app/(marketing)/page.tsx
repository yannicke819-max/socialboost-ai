import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Dna,
  Gauge,
  Inbox,
  LineChart,
  Lock,
  Sparkles,
  TrendingUp,
  Wand2,
  X,
} from 'lucide-react';
import { FAQ } from '@/components/marketing/FAQ';
import { PricingTable } from '@/components/marketing/PricingTable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { GradientMesh } from '@/components/ui/GradientMesh';
import { NoiseLayer } from '@/components/ui/NoiseLayer';
import { Marquee } from '@/components/ui/Marquee';
import { InputCard } from '@/components/product/InputCard';
import { OutputDeck } from '@/components/product/OutputDeck';
import { BoostMeter } from '@/components/product/BoostMeter';
import { RevenueSignalMini } from '@/components/product/RevenueSignalMini';
import { getDict } from '@/lib/i18n';
import { buildPlans } from '@/lib/pricing';

export default function HomePage() {
  const t = getDict();
  const plans = buildPlans(t);

  return (
    <>
      <Hero t={t.hero} demo={t.demo} />
      <SocialProofBar />
      <Problem t={t.problem} />
      <WorkflowHow t={t.how} />
      <BentoPillars t={t.pillars} />
      <NotAScheduler t={t.comparison} />
      <Measurable t={t.measurable} />
      <PricingSection homeT={t.pricingHome} plans={plans} labels={t.pricingPage} />
      <FAQSection title={t.faq.title} items={t.faq.items} />
      <FinalCTA t={t.finalCta} />
    </>
  );
}

/* ================================================================== */
/* HERO                                                                */
/* ================================================================== */

function Hero({
  t,
  demo,
}: {
  t: ReturnType<typeof getDict>['hero'];
  demo: ReturnType<typeof getDict>['demo'];
}) {
  const deckCards = [
    {
      platform: 'linkedin' as const,
      format: 'Post long-form · 1 200 caractères',
      preview: demo.platforms.linkedin,
      score: 87,
    },
    {
      platform: 'instagram' as const,
      format: 'Carrousel 7 slides · hook visuel',
      preview: demo.platforms.instagram,
      score: 79,
    },
    {
      platform: 'x' as const,
      format: 'Thread 8 tweets · hook contradictoire',
      preview: demo.platforms.x,
      score: 84,
    },
    {
      platform: 'tiktok' as const,
      format: 'Script 45 s · hook 3 s',
      preview: demo.platforms.tiktok,
      score: 72,
    },
  ];

  return (
    <section className="relative overflow-hidden">
      <GradientMesh intensity="soft" />
      <NoiseLayer opacity={0.04} />

      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pb-20 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="mono" className="mb-6">
            {t.eyebrow}
          </Badge>
          <h1 className="font-display text-display-1 text-fg">
            {t.titleLine1}
            <br />
            <span className="italic text-fg">{t.titleLine2Pre}</span>
            <span className="italic text-brand">{t.titleAccent}</span>
            <span className="italic text-fg">{t.titleLine2Post}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-fg-muted sm:mt-8 sm:text-lg">
            {t.subtitle}
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:mt-10 sm:flex-row sm:items-center sm:justify-center">
            <Button href="/signup" variant="brand" size="lg">
              {t.primaryCta}
            </Button>
            <Button href="#how" variant="outline" size="lg">
              {t.secondaryCta}
            </Button>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {t.fineprint}
          </p>
        </div>

        {/* Live demo: Input → Output Deck */}
        <div className="mx-auto mt-14 max-w-5xl sm:mt-20">
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            <InputCard
              label={demo.inputLabel}
              offer="Coaching LinkedIn 900 € → Calendly"
              brief={demo.inputExample}
            />
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
                {demo.outputLabel}
              </p>
              <OutputDeck cards={deckCards} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* SOCIAL PROOF BAR                                                    */
/* ================================================================== */

function SocialProofBar() {
  // Placeholder labels — to be replaced with real customer logos when available
  const labels = [
    'Built for solo media operators',
    'Made in Europe',
    'Hosted EU · GDPR',
    'Powered by Anthropic Claude',
    'Stripe-secured payments',
    'Built for solo media operators',
    'Made in Europe',
    'Hosted EU · GDPR',
    'Powered by Anthropic Claude',
    'Stripe-secured payments',
  ];
  return (
    <section className="border-y border-border bg-bg-elevated/60 py-6">
      <Marquee>
        {labels.map((label, i) => (
          <span
            key={i}
            className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-fg-subtle"
          >
            {label}
            <span className="ml-12 text-fg-subtle/30">·</span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}

/* ================================================================== */
/* PROBLEM                                                             */
/* ================================================================== */

function Problem({ t }: { t: ReturnType<typeof getDict>['problem'] }) {
  return (
    <section className="bg-bg py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-display-2 text-fg">{t.title}</h2>
        <p className="mt-6 text-base text-fg-muted sm:text-lg">{t.body}</p>
        <p className="mt-6 font-display text-2xl italic text-fg sm:text-3xl">
          {t.punchline}
        </p>
      </div>
    </section>
  );
}

/* ================================================================== */
/* WORKFLOW #how — sticky scroll storytelling                          */
/* ================================================================== */

function WorkflowHow({ t }: { t: ReturnType<typeof getDict>['how'] }) {
  // Visuals per step (right side in desktop split layout)
  const visuals = [
    <InputCard
      key="step1"
      label="Étape 1 · Offer Memory"
      offer="Coaching LinkedIn 900 € → Calendly"
      brief="« Triple les RDV qualifiés en 30 jours pour les consultants solo. Lien : calendly.com/audit-30min »"
    />,
    <OutputDeck
      key="step2"
      cards={[
        {
          platform: 'linkedin',
          format: 'Long-form · CTA Calendly',
          preview: '« 3 erreurs que je vois chez 90 % des consultants solo en LinkedIn… »',
          score: 87,
        },
        {
          platform: 'instagram',
          format: 'Carrousel 7 slides',
          preview: '7 visuels — hook → solution → preuve → CTA bio',
          score: 79,
        },
        {
          platform: 'x',
          format: 'Thread 8 tweets',
          preview: 'Hook contradictoire → 6 leçons → CTA réponse',
          score: 84,
        },
        {
          platform: 'tiktok',
          format: 'Script 45 s',
          preview: 'Hook 3 s → 3 erreurs → CTA "lien en bio"',
          score: 72,
        },
      ]}
    />,
    <RevenueSignalMini
      key="step3"
      totalClicks={47}
      rows={[
        {
          date: '12 mars',
          post: 'LinkedIn — 3 erreurs des consultants solo',
          clicks: 23,
          destination: 'calendly.com',
        },
        {
          date: '14 mars',
          post: 'IG carrousel — comment tripler tes RDV',
          clicks: 18,
          destination: 'calendly.com',
        },
        {
          date: '15 mars',
          post: 'X thread — réponse contre-intuitive',
          clicks: 6,
          destination: 'calendly.com',
        },
      ]}
    />,
  ];

  const stepIcons = [
    <Inbox key="i" size={20} />,
    <Wand2 key="w" size={20} />,
    <LineChart key="l" size={20} />,
  ];

  return (
    <section id="how" className="bg-bg py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="mono" className="mb-4">
            Workflow
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{t.title}</h2>
        </div>

        <div className="mt-16 space-y-24 sm:mt-20 sm:space-y-32">
          {t.steps.map((step, i) => (
            <div
              key={step.title}
              className={`grid items-center gap-8 md:grid-cols-2 md:gap-16 ${
                i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''
              }`}
            >
              {/* Text side */}
              <div>
                <div className="flex items-baseline gap-4">
                  <span className="font-display text-step-num text-fg/15 italic">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-brand">{stepIcons[i]}</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
                      {step.time}
                    </span>
                  </div>
                </div>
                <h3 className="mt-4 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
                  {step.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-fg-muted sm:text-lg">
                  {step.body}
                </p>
              </div>

              {/* Visual side */}
              <div className="relative">{visuals[i]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* BENTO PILLARS                                                       */
/* ================================================================== */

function BentoPillars({ t }: { t: ReturnType<typeof getDict>['pillars'] }) {
  return (
    <section id="features" className="bg-bg-elevated/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="mono" className="mb-4">
            {t.eyebrow}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{t.title}</h2>
        </div>

        {/* Asymmetric bento — 4 tiles, 2 large + 2 standard */}
        <div className="mt-12 grid gap-4 sm:mt-16 sm:gap-5 md:grid-cols-3 md:grid-rows-[auto_auto]">
          {/* Tile 1 — Campaign Engine (large, hero) */}
          <PillarTile
            tag={t.items[0]?.tag ?? ''}
            title={t.items[0]?.title ?? ''}
            body={t.items[0]?.body ?? ''}
            icon={<Wand2 size={24} />}
            className="md:col-span-2 md:row-span-1"
            visual={
              <div className="mt-6 grid grid-cols-2 gap-2 opacity-80">
                {(['linkedin', 'instagram', 'x', 'tiktok'] as const).map((p, i) => (
                  <div
                    key={p}
                    className="rounded border border-border bg-bg p-2"
                    style={{ animation: `fade-up 0.5s ease-out ${i * 100}ms both` }}
                  >
                    <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                      {p}
                    </p>
                    <div className="mt-1 h-1.5 w-3/4 rounded-full bg-fg/10" />
                    <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-fg/10" />
                  </div>
                ))}
              </div>
            }
          />

          {/* Tile 2 — Style DNA (tall right) */}
          <PillarTile
            tag={t.items[1]?.tag ?? ''}
            title={t.items[1]?.title ?? ''}
            body={t.items[1]?.body ?? ''}
            icon={<Dna size={24} />}
            className="md:col-span-1 md:row-span-2"
            visual={
              <div className="mt-6 space-y-2">
                {[
                  { label: 'Tonalité', value: 'direct, pédagogue' },
                  { label: 'Hook préféré', value: 'contradiction' },
                  { label: 'Longueur idéale', value: '1 200 caractères' },
                  { label: 'Tabous LLM', value: '12 filtrés' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded border border-border bg-bg px-2.5 py-1.5"
                  >
                    <span className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                      {row.label}
                    </span>
                    <span className="text-xs text-fg">{row.value}</span>
                  </div>
                ))}
              </div>
            }
          />

          {/* Tile 3 — Confidence Score */}
          <PillarTile
            tag={t.items[2]?.tag ?? ''}
            title={t.items[2]?.title ?? ''}
            body={t.items[2]?.body ?? ''}
            icon={<Gauge size={24} />}
            className="md:col-span-1"
            visual={
              <div className="mt-4 flex justify-center">
                <BoostMeter value={87} size={140} label="prédiction" />
              </div>
            }
          />

          {/* Tile 4 — Revenue Signal */}
          <PillarTile
            tag={t.items[3]?.tag ?? ''}
            title={t.items[3]?.title ?? ''}
            body={t.items[3]?.body ?? ''}
            icon={<TrendingUp size={24} />}
            className="md:col-span-1"
            visual={
              <div className="mt-4 rounded border border-border bg-bg p-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl text-fg">47</span>
                  <span className="text-xs text-fg-muted">clics → ton offre</span>
                </div>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
                  30 derniers jours · tracké
                </p>
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}

function PillarTile({
  tag,
  title,
  body,
  icon,
  visual,
  className,
}: {
  tag: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  visual?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg-elevated p-6 transition hover:border-border-strong sm:p-7 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-bg text-fg">
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {tag}
        </span>
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-fg">{title}</h3>
      <p className="mt-2 text-sm text-fg-muted">{body}</p>
      {visual}
    </div>
  );
}

/* ================================================================== */
/* NOT A SCHEDULER — comparison redesigned typographic                 */
/* ================================================================== */

function NotAScheduler({ t }: { t: ReturnType<typeof getDict>['comparison'] }) {
  // Each row = a capability. Highlight column = SocialBoost (always wins on first 5)
  const cells: Array<[boolean | string, boolean | string, boolean | string]> = [
    [false, false, true],
    [false, false, true],
    [false, false, true],
    [false, false, true],
    [false, false, true],
    [false, true, t.soon],
  ];

  return (
    <section className="bg-bg py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="mono" className="mb-4">
            Pas un scheduler
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{t.title}</h2>
        </div>

        <div className="mt-12 space-y-2 sm:mt-16">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_repeat(3,minmax(0,80px))] gap-2 px-3 py-2 sm:grid-cols-[1fr_repeat(3,minmax(0,120px))]">
            <span />
            {[t.cols.chatgpt, t.cols.buffer, t.cols.socialboost].map((col, i) => (
              <span
                key={col}
                className={`text-center font-mono text-[10px] uppercase tracking-wider ${
                  i === 2 ? 'text-amber' : 'text-fg-subtle'
                }`}
              >
                {col}
              </span>
            ))}
          </div>

          {t.rows.map((label, i) => {
            const row = cells[i] ?? [false, false, false];
            return (
              <div
                key={label}
                className="grid grid-cols-[1fr_repeat(3,minmax(0,80px))] items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-3 transition hover:border-border-strong sm:grid-cols-[1fr_repeat(3,minmax(0,120px))]"
              >
                <span className="text-sm text-fg sm:text-base">{label}</span>
                <ComparisonCell value={row[0]} />
                <ComparisonCell value={row[1]} />
                <ComparisonCell value={row[2]} winner />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ComparisonCell({ value, winner = false }: { value: boolean | string; winner?: boolean }) {
  if (value === true)
    return (
      <span className="flex justify-center">
        <Check
          size={18}
          className={winner ? 'text-amber' : 'text-fg-muted'}
        />
      </span>
    );
  if (value === false)
    return (
      <span className="flex justify-center">
        <X size={18} className="text-fg-subtle/40" />
      </span>
    );
  return (
    <span className="text-center font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
      {value}
    </span>
  );
}

/* ================================================================== */
/* MEASURABLE — what the product tracks (no fake testimonials)         */
/* ================================================================== */

function Measurable({ t }: { t: ReturnType<typeof getDict>['measurable'] }) {
  const icons = [
    <ArrowUpRight key="i0" size={20} />,
    <Sparkles key="i1" size={20} />,
    <TrendingUp key="i2" size={20} />,
    <X key="i3" size={20} />,
  ];

  return (
    <section className="bg-bg-elevated/40 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="amber" className="mb-4">
            {t.eyebrow}
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{t.title}</h2>
          <p className="mt-4 text-base text-fg-muted sm:text-lg">{t.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:mt-16 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {t.items.map((item, i) => (
            <article
              key={item.title}
              className="flex flex-col rounded-xl border border-border bg-bg-elevated p-6 transition hover:border-border-strong"
            >
              <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-soft text-amber">
                {icons[i]}
              </span>
              <h3 className="mt-4 text-base font-semibold text-fg">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* PRICING — with trust signals                                        */
/* ================================================================== */

function PricingSection({
  homeT,
  plans,
  labels,
}: {
  homeT: ReturnType<typeof getDict>['pricingHome'];
  plans: ReturnType<typeof buildPlans>;
  labels: ReturnType<typeof getDict>['pricingPage'];
}) {
  const trustSignals = [
    { icon: <Lock size={14} />, label: 'RGPD · Hébergement EU' },
    { icon: <Check size={14} />, label: 'Stripe Verified' },
    { icon: <ArrowUpRight size={14} />, label: '14 jours money-back Pro' },
  ];

  return (
    <section id="pricing" className="bg-bg py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-fg sm:text-4xl">{homeT.title}</h2>
          <p className="mt-3 text-fg-muted">{homeT.subtitle}</p>
        </div>

        <div className="mt-12 sm:mt-16">
          <PricingTable plans={plans} labels={labels} />
        </div>

        {/* Trust signals row */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 border-t border-border pt-8 sm:gap-10">
          {trustSignals.map((sig) => (
            <span
              key={sig.label}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-fg-subtle"
            >
              <span className="text-fg-muted">{sig.icon}</span>
              {sig.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* FAQ                                                                 */
/* ================================================================== */

function FAQSection({
  title,
  items,
}: {
  title: string;
  items: ReturnType<typeof getDict>['faq']['items'];
}) {
  return (
    <section id="faq" className="bg-bg-elevated/30 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h2>
        <div className="mt-10 sm:mt-14">
          <FAQ items={items} />
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* FINAL CTA                                                           */
/* ================================================================== */

function FinalCTA({ t }: { t: ReturnType<typeof getDict>['finalCta'] }) {
  return (
    <section className="relative overflow-hidden bg-bg py-24 sm:py-32">
      <GradientMesh intensity="strong" />
      <NoiseLayer opacity={0.05} />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Sparkles size={32} className="mx-auto text-amber opacity-70" />
        <h2 className="mt-6 font-display text-display-2 italic text-fg">{t.title}</h2>
        <p className="mt-5 text-base text-fg-muted sm:text-lg">{t.subtitle}</p>
        <Button href="/signup" variant="brand" size="lg" className="mt-8">
          {t.cta} <ArrowRight size={16} />
        </Button>
      </div>
    </section>
  );
}
