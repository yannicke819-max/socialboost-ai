import Link from 'next/link';
import { Calendar, Sparkles, BarChart3, Clock, TrendingUp, Target, ArrowRight } from 'lucide-react';
import { FAQ } from '@/components/marketing/FAQ';
import { PricingTable } from '@/components/marketing/PricingTable';

export default function HomePage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Problem />
      <Benefits />
      <HowItWorks />
      <UseCases />
      <Testimonials />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-brand-600">
          IA pour créateurs et petits business
        </p>
        <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Publie moins, <span className="text-brand-500">gagne plus.</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 dark:text-gray-300">
          L&apos;IA qui idée, rédige, planifie et publie ton contenu sur Instagram, TikTok,
          LinkedIn, X et Facebook. Tu gardes le contrôle, l&apos;IA fait le reste.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
          >
            Essayer gratuitement
          </Link>
          <Link
            href="#how"
            className="rounded-lg border border-gray-300 px-6 py-3 font-semibold transition hover:border-brand-500 hover:text-brand-600 dark:border-gray-700"
          >
            Voir comment ça marche
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          7 jours gratuits · Sans carte bleue · Annulation en 1 clic
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <HeroBullet icon={<Clock size={20} />} title="1 mois en 10 min" sub="vs 15 h à la main" />
        <HeroBullet icon={<TrendingUp size={20} />} title="+37 % d'engagement" sub="moyen 90 jours" />
        <HeroBullet icon={<Target size={20} />} title="Ton style, ta voix" sub="l'IA apprend de toi" />
      </div>
    </section>
  );
}

function HeroBullet({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500/10 text-brand-600">
        {icon}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-500">{sub}</p>
      </div>
    </div>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-gray-100 bg-gray-50 py-10 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-sm font-medium text-gray-500">
          Déjà <span className="font-bold text-gray-900 dark:text-gray-100">12 000+ créateurs</span>{' '}
          et TPE boostent leurs réseaux avec SocialBoost.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          31 487 posts publiés cette semaine — rejoins le mouvement.
        </p>
      </div>
    </section>
  );
}

function Problem() {
  const items = [
    'Tu commences la semaine avec 5 idées géniales… qui restent dans ta tête.',
    'Tu passes ton dimanche soir à écrire des posts que personne ne lit.',
    'Tu sais que la régularité paye, mais tu craques au bout de 3 semaines.',
    'Tu vois tes concurrents publier 5× par jour et tu ne comprends pas comment.',
  ];
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold sm:text-4xl">
        Publier sur les réseaux, c&apos;est un job à plein temps. Tu n&apos;as pas ce temps.
      </h2>
      <ul className="mx-auto mt-10 max-w-2xl space-y-3">
        {items.map((t) => (
          <li key={t} className="rounded-lg bg-gray-50 px-4 py-3 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
            — {t}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-center italic text-gray-500">
        Spoiler : ils utilisent probablement ce qu&apos;on va te montrer.
      </p>
    </section>
  );
}

function Benefits() {
  const blocks = [
    {
      icon: <Sparkles size={22} />,
      title: 'Idées & rédaction illimitées',
      sub: 'Fini la page blanche.',
      body: "L'IA te propose chaque lundi 10 idées calées sur ta niche et les tendances. Tu valides, elle rédige. En 30 secondes par post.",
    },
    {
      icon: <Calendar size={22} />,
      title: 'Calendrier qui se remplit tout seul',
      sub: 'Une vue, tous tes réseaux.',
      body: 'Drag-and-drop, adaptation automatique par plateforme, publication au meilleur moment. Tu bosses 2 h le lundi, tu es tranquille toute la semaine.',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Analytics qui parlent humain',
      sub: '"Ton carrousel du mardi a cartonné — on en refait 2 ?"',
      body: 'Pas de graphiques cryptiques. Juste des recos concrètes en français. Tu sais ce qui marche. Tu le refais. Tu grandis.',
    },
  ];
  return (
    <section id="features" className="bg-gray-50 py-24 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Trois choses que SocialBoost fait, et qui vont te changer la vie.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {blocks.map((b) => (
            <div key={b.title} className="rounded-2xl bg-white p-7 shadow-sm dark:bg-gray-800">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-600">
                {b.icon}
              </span>
              <h3 className="mt-5 text-xl font-bold">{b.title}</h3>
              <p className="mt-2 text-sm font-medium text-brand-600">{b.sub}</p>
              <p className="mt-3 text-gray-600 dark:text-gray-300">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: '1', title: 'Raconte-nous ton univers', time: '60 s', body: "Ta niche, ton ton, ton objectif. 3 questions, c'est tout." },
    { n: '2', title: 'Connecte tes réseaux', time: '60 s', body: 'Instagram, TikTok, LinkedIn, X, Facebook. Un clic par plateforme.' },
    { n: '3', title: "L'IA te propose 10 posts", time: '30 s', body: 'Tu swipes : garde, jette, édite. Comme sur Tinder, mais pour du contenu.' },
    { n: '4', title: 'Planifie et oublie', time: '30 s', body: 'Un bouton. SocialBoost publie pour toi, au meilleur moment, partout.' },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-center text-3xl font-bold sm:text-4xl">
        Ton premier post publié en moins de 5 minutes.
      </h2>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <div key={s.n} className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 font-bold text-white">
                {s.n}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {s.time}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
        >
          Je teste gratuitement <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

function UseCases() {
  const cases = [
    { emoji: '🎨', title: 'Créateurs solo', body: 'Tu jongles entre création, edit et community management. On prend en charge le community management.' },
    { emoji: '🛍', title: 'Petits commerces & e-commerce', body: 'Tu vends des produits, pas du contenu. On transforme ton catalogue en posts qui convertissent.' },
    { emoji: '💼', title: 'Coachs, consultants, experts', body: 'On recycle ton podcast, tes articles, tes lives en 20 posts pendant que tu fais ton job.' },
    { emoji: '🏢', title: 'Micro-agences (1 – 5 clients)', body: 'Même outil, plusieurs espaces. Multiplie ta capacité sans embaucher.' },
  ];
  return (
    <section className="bg-gray-50 py-24 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Conçu pour celles et ceux qui font beaucoup avec peu.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {cases.map((c) => (
            <div key={c.title} className="rounded-2xl bg-white p-6 dark:bg-gray-800">
              <p className="text-3xl">{c.emoji}</p>
              <h3 className="mt-3 text-lg font-bold">{c.title}</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { quote: "J'ai gagné 8 h par semaine. Et mon engagement IG a doublé en 2 mois.", who: 'Léa M., créatrice lifestyle, 24 k followers' },
    { quote: 'Je vends sur Shopify. Depuis SocialBoost, mes ventes via Instagram ont fait +46 %.', who: 'Marc D., boutique déco' },
    { quote: 'Je gère 4 clients toute seule. Impensable sans SocialBoost.', who: 'Sofia L., micro-agence' },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((t) => (
          <blockquote key={t.who} className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
            <p className="text-lg font-medium">« {t.quote} »</p>
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
            Des tarifs pensés pour les solos et les petits budgets.
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            À partir de 14,90 €/mois. Essai gratuit 7 jours sans carte bleue.
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
        Les questions qu&apos;on nous pose le plus.
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
        <h2 className="text-3xl font-bold sm:text-4xl">
          Arrête de te battre avec ton planning. Commence à grandir.
        </h2>
        <p className="mt-4 text-lg text-brand-50">
          7 jours gratuits. Sans carte bleue. Ton premier post dans 5 minutes.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-3.5 font-semibold text-brand-600 transition hover:bg-gray-100"
        >
          Démarrer mon essai gratuit <ArrowRight size={18} />
        </Link>
        <p className="mt-4 text-sm text-brand-100">
          Rejoins 12 000+ créateurs qui ont repris le contrôle de leurs réseaux.
        </p>
      </div>
    </section>
  );
}
