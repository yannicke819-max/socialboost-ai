'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-border bg-bg-elevated p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-semibold text-fg">Plateforme</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition font-mono',
                  platform === p.id
                    ? 'bg-fg text-bg'
                    : 'border border-border text-fg-muted hover:border-border-strong hover:text-fg',
                )}
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
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </Field>
          <Field label="Ton">
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="Ex: chaleureux, expert, fun"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
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
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </Field>

        <button
          type="submit"
          disabled={loading || !brief.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg shadow-glow transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {loading ? 'Génération…' : 'Remixer en 3 variantes'}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-amber/40 bg-amber-soft p-4 text-sm text-amber">
          <p className="font-semibold">Erreur</p>
          <p className="mt-1">{error}</p>
          {error === 'Unauthorized' && (
            <p className="mt-2 text-xs text-fg-muted">
              Connecte-toi pour utiliser le générateur.
            </p>
          )}
        </div>
      )}

      {drafts && drafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold tracking-tight text-fg">Variantes proposées</h3>
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
      <span className="mb-2 block text-sm font-semibold text-fg">{label}</span>
      {children}
    </label>
  );
}

function DraftCard({ draft, index }: { draft: Draft; index: number }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elevated p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          Variante {index} · {draft.hook_type}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
          {draft.estimated_format}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-fg">{draft.body}</p>
      {draft.hashtags?.length > 0 && (
        <p className="mt-3 font-mono text-xs text-fg-muted">{draft.hashtags.join(' ')}</p>
      )}
      {draft.cta && (
        <p className="mt-3 text-xs text-fg-muted">
          <strong className="text-fg">CTA :</strong> {draft.cta}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg transition hover:bg-brand/90"
        >
          Utiliser cette variante
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-fg transition hover:border-border-strong hover:bg-bg-muted"
        >
          Régénérer
        </button>
      </div>
    </div>
  );
}
