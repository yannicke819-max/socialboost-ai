import { Topbar } from '@/components/app/Topbar';
import { TrendingUp, Eye, Users, Sparkles } from 'lucide-react';

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Tableau de bord" />
      <div className="flex-1 space-y-8 p-8">
        <BoostScore score={72} />
        <KPIGrid />
        <UpcomingPosts />
      </div>
    </>
  );
}

function BoostScore({ score }: { score: number }) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-8 text-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-brand-50">
            SocialBoost Score
          </p>
          <p className="mt-2 text-6xl font-bold">{score}</p>
          <p className="mt-2 text-brand-50">
            Tu fais mieux que <strong>72 %</strong> des créateurs de ta niche cette semaine.
          </p>
        </div>
        <Sparkles size={32} className="opacity-50" />
      </div>
    </section>
  );
}

function KPIGrid() {
  const kpis = [
    { label: 'Portée 7 j', value: '12 487', delta: '+18 %', icon: <Eye size={18} /> },
    { label: 'Engagement', value: '4,8 %', delta: '+0,6 pt', icon: <TrendingUp size={18} /> },
    { label: 'Nouveaux abonnés', value: '+342', delta: '+24 %', icon: <Users size={18} /> },
    { label: 'Posts publiés', value: '7 / 10', delta: 'cette semaine', icon: <Sparkles size={18} /> },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{k.label}</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-600">
              {k.icon}
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold">{k.value}</p>
          <p className="mt-1 text-xs text-gray-500">{k.delta}</p>
        </div>
      ))}
    </section>
  );
}

function UpcomingPosts() {
  const posts = [
    { when: 'Aujourd\'hui 18:00', platform: 'LinkedIn', body: '5 leçons que j\'ai apprises en lançant ma boutique en ligne…' },
    { when: 'Demain 09:30', platform: 'Instagram', body: 'Carrousel : 7 outils gratuits pour les créateurs en 2026.' },
    { when: 'Vendredi 12:00', platform: 'X', body: 'Thread : pourquoi je publie 1 fois / jour (et pas plus).' },
  ];
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
      <h2 className="text-lg font-bold">Posts à venir</h2>
      <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
        {posts.map((p, i) => (
          <li key={i} className="flex items-start gap-4 py-4">
            <div className="w-32 shrink-0 text-sm">
              <p className="font-semibold">{p.when}</p>
              <p className="text-xs text-brand-600">{p.platform}</p>
            </div>
            <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">{p.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
