'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

type Platform = 'instagram' | 'tiktok' | 'linkedin' | 'x' | 'facebook';

type Draft = {
  hook_type: string;
  body: string;
  hashtags: string[];
  cta: string;
  estimated_format: string;
  warnings: string[];
};

type GenerateResponse = {
  drafts?: { drafts: Draft[] };
  error?: string;
  raw?: string;
};

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X / Twitter' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
];

export function GeneratorForm() {
  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [brief, setBrief] = useState('');
  const [tone, setTone] = useState('Pédagogue et chaleureux');
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDrafts(null);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, brief, tone, niche }),
      });
      const data: GenerateResponse = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erreur inconnue');
        return;
      }

      setDrafts(data.drafts?.drafts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
        <div>
          <label className="mb-2 block text-sm font-semibold">Plateforme</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  platform === p.id
                    ? 'bg-brand-500 text-white'
                    : 'border border-gray-200 hover:border-brand-500 dark:border-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Niche">
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Ex: e-commerce déco minimaliste"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </Field>
          <Field label="Ton">
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="Ex: chaleureux, expert, fun"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
            />
          </Field>
        </div>

        <Field label="Brief">
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Décris en une phrase ce que tu veux raconter cette semaine."
            rows={4}
            required
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
          />
        </Field>

        <button
          type="submit"
          disabled={loading || !brief.trim()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Génération…' : 'Générer 3 variantes'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          <p className="font-semibold">Erreur</p>
          <p className="mt-1">{error}</p>
          {error === 'Unauthorized' && (
            <p className="mt-2 text-xs">
              Connecte-toi pour utiliser le générateur.
            </p>
          )}
        </div>
      )}

      {drafts && drafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Variantes proposées</h3>
          {drafts.map((d, i) => (
            <DraftCard key={i} draft={d} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function DraftCard({ draft, index }: { draft: Draft; index: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          Variante {index} · {draft.hook_type}
        </span>
        <span className="text-xs text-gray-500">{draft.estimated_format}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{draft.body}</p>
      {draft.hashtags?.length > 0 && (
        <p className="mt-3 text-sm text-brand-600">{draft.hashtags.join(' ')}</p>
      )}
      {draft.cta && (
        <p className="mt-3 text-xs text-gray-500">
          <strong>CTA :</strong> {draft.cta}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
        >
          Utiliser cette variante
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold hover:border-brand-500 dark:border-gray-700"
        >
          Régénérer
        </button>
      </div>
    </div>
  );
}
