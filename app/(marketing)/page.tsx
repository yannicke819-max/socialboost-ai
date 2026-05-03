import Link from 'next/link';
import {
  ArrowRight,
  Dna,
  Layers,
  Gauge,
  Mic,
  Globe,
  FileText,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { FAQ } from '@/components/marketing/FAQ';
import { PricingTable } from '@/components/marketing/PricingTable';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Pillars />
      <Comparison />
      <ForWho />
      <Testimonials />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pt-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-brand-600">
          Studio de production éditoriale piloté par IA
        </p>
        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Une idée. Une semaine de contenu. <span className="text-brand-500">Ta voix.</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-300">
          Colle un transcript, une URL ou une note. SocialBoost livre une campagne LinkedIn,
          Instagram, X et TikTok qui sonne réellement comme toi. Pas du ChatGPT générique.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
          >
            Démarrer mon Brand Voice
          </Link>
          <Link
            href="#how"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold transition hover:border-brand-500 hover:text-brand-600 dark:border-gray-700"
          >
            Voir une démo de 90 s
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Trial 14 jours sur le plan Pro · Sans carte bleue · Annulation en 1 clic
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-5xl">
        <DemoFrame />
      </div>
    </section>
  );
}

function DemoFrame() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950">
      <div className="grid gap-0 md:grid-cols-2">
        <div className="border-b border-gray-100 p-6 dark:border-gray-800 md:border-b-0 md:border-r">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Input · 1 brief
          </p>
          <div className="mt-3 rounded-lg bg-gray-50 p-4 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            « J&apos;ai testé 4 outils de prospection LinkedIn pendant 60 jours. Voici les 3 erreurs
            que je vois chez 90 % des consultants solo, et comment j&apos;ai triplé mon taux de
            réponse… »
          </div>
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Output · 4 plateformes natives
          </p>
          <div className="mt-3 space-y-2">
            <PlatformPill name="LinkedIn" preview="Post long-form · 1 200 caractères · CTA commentaires" />
            <PlatformPill name="Instagram" preview="Carrousel 7 slides · hook visuel · hashtags ciblés" />
            <PlatformPill name="X / Twitter" preview="Thread 8 tweets · hook contradictoire" />
            <PlatformPill name="TikTok" preview="Script vidéo 45 s · hook 3 s · structure problème → solution" />
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

function Problem() {
  return (
    <section className="border-y border-gray-100 bg-gray-50 py-20 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          Tu publies du contenu IA → ça se voit → ton audience décroche.
        </h2>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-300">
          Tu connais ChatGPT. Tu produis vite. Mais tes posts sentent l&apos;IA à 10 km :
          structure plate, vocabulaire convenu, voix qui n&apos;est pas la tienne. Résultat : tu
          publies plus, tu engages moins, tu finis par lâcher.
        </p>
        <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Le problème n&apos;est pas l&apos;IA. C&apos;est l&apos;IA générique.
        </p>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Setup ta voix',
      time: '5 min, une fois',
      body: "Tu colles 3 à 5 de tes meilleurs posts. SocialBoost extrait ton style, ton ton, tes tics de langage. C'est ton Brand Voice — il ne bouge plus.",
      icon: <Dna size={20} />,
    },
    {
      n: '2',
      title: 'Remixe une idée',
      time: '30 secondes',
      body: 'Brief, transcript, URL, note vocale. SocialBoost décompose, adapte au format natif de chaque réseau, garde ta voix. Pas du copier-coller multi-plateformes.',
      icon: <Layers size={20} />,
    },
    {
      n: '3',
      title: 'Publie ce qui compte',
      time: 'avant publication',
      body: "Le Boost Score prédit la performance de chaque variante. Tu choisis. Tu publies. Tu n'apprends plus en post-mortem — tu décides en amont.",
      icon: <Gauge size={20} />,
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          De l&apos;idée brute à 4 publications, sans diluer ta voix.
        </h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-gray-200 bg-white p-7 dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 font-bold text-white">
                {s.n}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {s.time}
              </span>
            </div>
            <div className="mt-5 flex items-center gap-2">
              <span className="text-brand-500">{s.icon}</span>
              <h3 className="text-lg font-bold">{s.title}</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Pillars() {
  const pillars = [
    {
      icon: <Dna size={22} />,
      title: 'Style DNA',
      tag: 'Le moat',
      body: "L'IA n'invente pas ta voix, elle la reproduit. Entraîné sur tes propres posts, ton Brand Voice s'affine à chaque génération.",
    },
    {
      icon: <Layers size={22} />,
      title: 'Remix multi-plateformes',
      tag: 'Le rendement',
      body: 'Un input → 5 outputs au format natif. Pas du copier-coller adapté à la marge : LinkedIn long-form, IG carrousel, X thread, TikTok script.',
    },
    {
      icon: <Gauge size={22} />,
      title: 'Boost Score prédictif',
      tag: 'La décision',
      body: 'Avant de publier, tu sais quelle variante va performer. Apprend de tes propres résultats au fil du temps.',
    },
  ];
  return (
    <section id="features" className="bg-gray-50 py-24 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            Trois piliers, zéro fioriture
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            On ne fait pas le travail à ta place. On fait ton meilleur travail, plus vite.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white p-7 shadow-sm dark:bg-gray-800">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-600">
                {p.icon}
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

function Comparison() {
  const rows: Array<[string, boolean | string, boolean | string, boolean | string]> = [
    ['Multi-plateformes au format natif', false, false, true],
    ['Apprentissage de ta voix sur tes propres posts', false, false, true],
    ['Score prédictif avant publication', false, false, true],
    ['Génération en 30 secondes', true, false, true],
    ['Pensé pour les solos (pas pour DSI)', true, false, true],
    ['Scheduling de publication', false, true, 'Bientôt'],
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">
          SocialBoost n&apos;est pas une IA en plus. C&apos;est une autre catégorie.
        </h2>
      </div>
      <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold"></th>
              <th className="px-4 py-3 text-center font-semibold text-gray-500">ChatGPT</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-500">Buffer / Hootsuite</th>
              <th className="px-4 py-3 text-center font-semibold text-brand-600">SocialBoost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, a, b, c], i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 font-medium">{label}</td>
                <td className="px-4 py-3 text-center">{renderCell(a)}</td>
                <td className="px-4 py-3 text-center">{renderCell(b)}</td>
                <td className="px-4 py-3 text-center">{renderCell(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function renderCell(v: boolean | string) {
  if (v === true) return <Check size={18} className="mx-auto text-brand-500" />;
  if (v === false) return <X size={18} className="mx-auto text-gray-300" />;
  return <span className="text-xs font-medium text-gray-500">{v}</span>;
}

function ForWho() {
  const cases = [
    {
      icon: <Mic size={22} />,
      title: 'Consultants & coachs solo',
      body: "Ton contenu = ton pipeline. Publie 3× par semaine sur LinkedIn sans diluer ta voix d'expert.",
    },
    {
      icon: <FileText size={22} />,
      title: 'Infopreneurs & formateurs',
      body: 'Recycle un module de cours, un podcast ou un live en 20 posts pour nourrir tes lancements de cohorte.',
    },
    {
      icon: <Globe size={22} />,
      title: 'Founders e-commerce',
      body: 'Transforme tes fiches produit, ton podcast fondateur et tes coulisses en campagnes mix lifestyle / acquisition.',
    },
  ];
  return (
    <section className="bg-gray-50 py-24 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Pour les médias solos qui font beaucoup avec peu.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cases.map((c) => (
            <div key={c.title} className="rounded-2xl bg-white p-6 dark:bg-gray-800">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-500/10 text-brand-600">
                {c.icon}
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

function Testimonials() {
  const items = [
    {
      quote: "J'ai retrouvé 8 h par semaine. Et surtout, mes posts ne sentent plus l'IA. Mon engagement LinkedIn a doublé en 60 jours.",
      who: 'Léa M., consultante stratégie · 18 k followers',
    },
    {
      quote: "Je publiais 1 fois par semaine. Maintenant 4. Mon ghostwriter coûtait 1 200 €/mois. SocialBoost me coûte 79 €.",
      who: 'Marc D., coach business · 9 k followers',
    },
    {
      quote: "Le Boost Score change la donne. Je ne publie plus à l'aveugle, je sais quelle variante choisir.",
      who: 'Sofia L., infopreneuse · 32 k followers',
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <blockquote key={t.who} className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
            <p className="text-base font-medium leading-relaxed">« {t.quote} »</p>
            <footer className="mt-4 text-sm text-gray-500">— {t.who}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="bg-gray-50 py-24 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Trois plans. Pas de free tier qui dilue le signal.
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            14 jours gratuits sur le Pro. Annulation en 1 clic.
          </p>
        </div>
        <div className="mt-12">
          <PricingTable />
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold sm:text-4xl">
        Les objections qu&apos;on entend le plus.
      </h2>
      <div className="mt-12">
        <FAQ />
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-brand-500 py-20 text-white">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Sparkles size={32} className="mx-auto opacity-50" />
        <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
          Arrête de publier du contenu IA générique. Publie le tien, en mieux.
        </h2>
        <p className="mt-4 text-lg text-brand-50">
          14 jours gratuits sur le Pro. Sans carte bleue. Première campagne dans 5 minutes.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 font-semibold text-brand-600 transition hover:bg-gray-100"
        >
          Démarrer mon Brand Voice <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
