'use client';

import { useMemo, useRef, useState } from 'react';
import {
  Check,
  ClipboardCopy,
  Download,
  FileWarning,
  Hammer,
  Package,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkspaceStore } from '@/lib/offer-workspace/store';
import {
  diagnosticString,
  parseOfferImport,
  parseWorkspaceImport,
  serializeOffer,
  serializeWorkspace,
  summarizeWorkspace,
} from '@/lib/offer-workspace/persistence';
import type {
  OfferBundle,
  RepairReport,
  WorkspaceFile,
  WorkspaceImportErrorCode,
  WorkspaceMergeMode,
  WorkspaceSummary,
} from '@/lib/offer-workspace/types';

interface WorkspaceBackupPanelProps {
  store: WorkspaceStore;
  refresh: () => void;
  language: 'fr' | 'en';
}

type Pending =
  | { kind: 'workspace'; envelope: WorkspaceFile; summary: WorkspaceSummary; mode: WorkspaceMergeMode }
  | { kind: 'offer'; bundle: OfferBundle };

export function WorkspaceBackupPanel({ store, refresh, language }: WorkspaceBackupPanelProps) {
  const labels = language === 'en' ? L_EN : L_FR;
  const fileWorkspaceInput = useRef<HTMLInputElement>(null);
  const fileOfferInput = useRef<HTMLInputElement>(null);

  // Bump on every persist op so the summary refreshes deterministically.
  const [tick, setTick] = useState(0);
  const summary = useMemo(() => summarizeWorkspace(store.getEnvelope()), [store, tick]);
  const offers = store.listOffers();

  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [lastRepair, setLastRepair] = useState<RepairReport | null>(null);

  const showNotice = (tone: 'ok' | 'warn', text: string) => {
    setNotice({ tone, text });
    setTimeout(() => setNotice(null), 2500);
  };

  // -----------------------------------------------------------------------------
  // Export workspace
  // -----------------------------------------------------------------------------

  const handleExportWorkspace = () => {
    const env = store.getEnvelope();
    const text = serializeWorkspace(env, new Date().toISOString());
    download(text, 'socialboost-workspace.json');
    showNotice('ok', labels.exportedWorkspace);
  };

  // -----------------------------------------------------------------------------
  // Export single offer
  // -----------------------------------------------------------------------------

  const handleExportOffer = () => {
    if (!selectedOfferId) {
      showNotice('warn', labels.pickOfferFirst);
      return;
    }
    const env = store.getEnvelope();
    const text = serializeOffer(env, selectedOfferId, new Date().toISOString());
    if (!text) {
      showNotice('warn', labels.offerNotFound);
      return;
    }
    download(text, `socialboost-offer-${selectedOfferId}.json`);
    showNotice('ok', labels.exportedOffer);
  };

  // -----------------------------------------------------------------------------
  // Import workspace (with preview + confirm)
  // -----------------------------------------------------------------------------

  const handlePickWorkspaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (fileWorkspaceInput.current) fileWorkspaceInput.current.value = '';
    if (!f) return;
    const text = await f.text();
    const result = parseWorkspaceImport(text);
    if (!result.ok) {
      showNotice('warn', importErrorMsg(result.code, language));
      return;
    }
    setPending({
      kind: 'workspace',
      envelope: result.envelope,
      summary: result.summary,
      mode: 'merge',
    });
  };

  const handlePickOfferFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (fileOfferInput.current) fileOfferInput.current.value = '';
    if (!f) return;
    const text = await f.text();
    const result = parseOfferImport(text);
    if (!result.ok) {
      showNotice('warn', importErrorMsg(result.code, language));
      return;
    }
    setPending({ kind: 'offer', bundle: result.bundle });
  };

  const confirmImport = () => {
    if (!pending) return;
    if (pending.kind === 'workspace') {
      store.mergeIncoming(pending.envelope, pending.mode);
      showNotice(
        'ok',
        pending.mode === 'replace' ? labels.workspaceReplaced : labels.workspaceMerged,
      );
    } else {
      store.mergeIncomingOffer(pending.bundle);
      showNotice('ok', labels.offerMerged);
    }
    setPending(null);
    setTick((n) => n + 1);
    refresh();
  };

  const cancelImport = () => {
    setPending(null);
    showNotice('warn', labels.importCancelled);
  };

  // -----------------------------------------------------------------------------
  // Diagnostic + Repair
  // -----------------------------------------------------------------------------

  const handleCopyDiagnostic = async () => {
    const text = diagnosticString(
      store.getEnvelope(),
      'socialboost.offer_workspace',
      language,
    );
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      showNotice('ok', labels.diagnosticCopied);
    } catch {
      showNotice('warn', labels.diagnosticFailed);
    }
  };

  const handleRepair = () => {
    const report = store.repair();
    setLastRepair(report);
    setTick((n) => n + 1);
    refresh();
    const total =
      report.removed.assets +
      report.removed.calendar_slots +
      report.removed.recommendations +
      report.removed.weekly_plans +
      report.removed.feedback_recommendations +
      report.removed.feedback_history +
      report.removed.feedback_preferences +
      report.removed.plan_slot_links +
      report.removed.calendar_slot_links;
    showNotice(
      'ok',
      total === 0 ? labels.repairCleanAlready : `${labels.repairDone} (${total})`,
    );
  };

  // -----------------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------------

  return (
    <details className="rounded-md border border-border bg-bg-elevated/40">
      <summary className="cursor-pointer list-none rounded-md px-4 py-3 hover:bg-bg-elevated">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-fg-subtle" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg">
              {labels.title}
            </span>
            <span className="rounded-full border border-amber-400/40 bg-amber-400/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-400">
              {labels.mockBadge}
            </span>
          </div>
          <p className="font-mono text-[10px] text-fg-subtle">
            {summary.offers} {labels.offers} · {summary.assets} {labels.assets} ·{' '}
            {summary.weekly_plans} {labels.plans}
          </p>
        </div>
      </summary>

      <div className="space-y-4 border-t border-border px-4 py-4">
        <SummaryGrid summary={summary} labels={labels} />

        {notice && (
          <p
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
              notice.tone === 'ok'
                ? 'border-emerald-400/40 bg-emerald-400/5 text-emerald-400'
                : 'border-amber-400/40 bg-amber-400/5 text-amber-400',
            )}
          >
            {notice.tone === 'ok' ? <Check size={10} /> : <FileWarning size={10} />}
            {notice.text}
          </p>
        )}

        {/* Workspace export / import */}
        <section className="space-y-2">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {labels.workspaceSection}
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <ActionBtn
              icon={<Download size={12} />}
              label={labels.exportWorkspace}
              onClick={handleExportWorkspace}
              tone="brand"
            />
            <ActionBtn
              icon={<Upload size={12} />}
              label={labels.importWorkspace}
              onClick={() => fileWorkspaceInput.current?.click()}
            />
            <input
              ref={fileWorkspaceInput}
              type="file"
              accept="application/json"
              onChange={handlePickWorkspaceFile}
              className="hidden"
              aria-hidden
            />
          </div>
        </section>

        {/* Single-offer export / import */}
        <section className="space-y-2">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {labels.offerSection}
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedOfferId}
              onChange={(e) => setSelectedOfferId(e.target.value)}
              className="min-w-[220px] rounded border border-border bg-bg px-2 py-1 font-mono text-[11px] text-fg focus-visible:ring-2 focus-visible:ring-brand"
            >
              <option value="">{labels.pickOffer}</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} · {o.id.slice(-6)}
                </option>
              ))}
            </select>
            <ActionBtn
              icon={<Download size={12} />}
              label={labels.exportOffer}
              onClick={handleExportOffer}
            />
            <ActionBtn
              icon={<Upload size={12} />}
              label={labels.importOffer}
              onClick={() => fileOfferInput.current?.click()}
            />
            <input
              ref={fileOfferInput}
              type="file"
              accept="application/json"
              onChange={handlePickOfferFile}
              className="hidden"
              aria-hidden
            />
          </div>
        </section>

        {/* Diagnostic + Repair */}
        <section className="space-y-2">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
            {labels.maintenanceSection}
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            <ActionBtn
              icon={<ClipboardCopy size={12} />}
              label={labels.copyDiagnostic}
              onClick={handleCopyDiagnostic}
            />
            <ActionBtn
              icon={<Hammer size={12} />}
              label={labels.repair}
              onClick={handleRepair}
            />
          </div>
          {lastRepair && (
            <RepairReportView report={lastRepair} labels={labels} />
          )}
        </section>

        <p className="text-[11px] text-fg-subtle">{labels.localOnlyNote}</p>
      </div>

      {/* Confirm import overlay (in-flow, no portal) */}
      {pending && (
        <ImportConfirm
          pending={pending}
          labels={labels}
          onConfirm={confirmImport}
          onCancel={cancelImport}
          onChangeMode={(mode) =>
            setPending((p) => (p && p.kind === 'workspace' ? { ...p, mode } : p))
          }
        />
      )}
    </details>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function SummaryGrid({
  summary,
  labels,
}: {
  summary: WorkspaceSummary;
  labels: typeof L_FR;
}) {
  const cells: { label: string; value: number | string }[] = [
    { label: labels.offers, value: summary.offers },
    { label: labels.assets, value: summary.assets },
    { label: labels.plans, value: summary.weekly_plans },
    { label: labels.calendarSlots, value: summary.calendar_slots },
    { label: labels.recos, value: summary.recommendations },
    { label: labels.feedbackRecos, value: summary.feedback_recommendations },
    { label: labels.feedbackHistory, value: summary.feedback_history },
    { label: labels.feedbackPrefs, value: summary.feedback_preferences },
  ];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-md border border-border bg-bg p-2 text-center"
          >
            <p className="font-mono text-[9px] uppercase tracking-wider text-fg-subtle">
              {c.label}
            </p>
            <p className="font-display text-base font-semibold text-fg">{c.value}</p>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10px] text-fg-subtle">
        {labels.lastSaved} {summary.last_saved_at ? formatTs(summary.last_saved_at) : '—'} ·{' '}
        v{summary.version} · {labels.storageKey} <code>socialboost.offer_workspace</code>
      </p>
    </div>
  );
}

function ImportConfirm({
  pending,
  labels,
  onConfirm,
  onCancel,
  onChangeMode,
}: {
  pending: Pending;
  labels: typeof L_FR;
  onConfirm: () => void;
  onCancel: () => void;
  onChangeMode: (mode: WorkspaceMergeMode) => void;
}) {
  return (
    <div className="border-t border-border bg-bg-elevated/80 p-4">
      <div className="flex items-start gap-2">
        <Package size={14} className="mt-0.5 text-brand" />
        <div className="flex-1">
          <h4 className="font-display text-base font-semibold text-fg">
            {pending.kind === 'workspace' ? labels.previewWorkspace : labels.previewOffer}
          </h4>
          {pending.kind === 'workspace' ? (
            <ul className="mt-2 grid gap-0.5 text-[12px] text-fg-muted sm:grid-cols-2">
              <li>{labels.offers}: <span className="font-mono">{pending.summary.offers}</span></li>
              <li>{labels.assets}: <span className="font-mono">{pending.summary.assets}</span></li>
              <li>{labels.plans}: <span className="font-mono">{pending.summary.weekly_plans}</span></li>
              <li>{labels.calendarSlots}: <span className="font-mono">{pending.summary.calendar_slots}</span></li>
              <li>{labels.recos}: <span className="font-mono">{pending.summary.recommendations}</span></li>
              <li>{labels.feedbackRecos}: <span className="font-mono">{pending.summary.feedback_recommendations}</span></li>
              <li>{labels.feedbackHistory}: <span className="font-mono">{pending.summary.feedback_history}</span></li>
              <li>{labels.feedbackPrefs}: <span className="font-mono">{pending.summary.feedback_preferences}</span></li>
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-fg-muted">
              {pending.bundle.offer.name} · {pending.bundle.assets.length} {labels.assets} ·{' '}
              {pending.bundle.weekly_plans.length} {labels.plans}
            </p>
          )}

          {pending.kind === 'workspace' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(['merge', 'replace'] as WorkspaceMergeMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeMode(m)}
                  aria-pressed={pending.mode === m}
                  className={cn(
                    'rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition',
                    pending.mode === m
                      ? 'border-brand bg-brand/10 text-fg'
                      : 'border-border bg-bg text-fg-muted hover:border-border-strong',
                  )}
                >
                  {m === 'merge' ? labels.modeMerge : labels.modeReplace}
                </button>
              ))}
            </div>
          )}

          {pending.kind === 'workspace' && pending.mode === 'replace' && (
            <p className="mt-2 inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-400">
              <FileWarning size={10} /> {labels.replaceWarning}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-400/60 bg-emerald-400/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-400/25"
            >
              <Check size={11} /> {labels.confirm}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted transition hover:border-border-strong hover:text-fg"
            >
              <X size={11} /> {labels.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepairReportView({
  report,
  labels,
}: {
  report: RepairReport;
  labels: typeof L_FR;
}) {
  const { removed } = report;
  return (
    <div className="rounded-md border border-border bg-bg p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
        {labels.repairSummary}
      </p>
      <ul className="mt-1 grid gap-0.5 text-[12px] text-fg-muted sm:grid-cols-2">
        <li>{labels.assets}: −{removed.assets}</li>
        <li>{labels.calendarSlots}: −{removed.calendar_slots}</li>
        <li>{labels.recos}: −{removed.recommendations}</li>
        <li>{labels.plans}: −{removed.weekly_plans}</li>
        <li>{labels.feedbackRecos}: −{removed.feedback_recommendations}</li>
        <li>{labels.feedbackHistory}: −{removed.feedback_history}</li>
        <li>{labels.feedbackPrefs}: −{removed.feedback_preferences}</li>
        <li>{labels.brokenLinks}: {removed.plan_slot_links + removed.calendar_slot_links}</li>
      </ul>
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'brand';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        tone === 'brand'
          ? 'border-brand/40 bg-brand/5 text-fg hover:border-brand'
          : 'border-border bg-bg text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {icon} {label}
    </button>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function download(text: string, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatTs(iso: string): string {
  // Compact human-friendly stamp without locale dependency.
  return iso.slice(0, 16).replace('T', ' ');
}

function importErrorMsg(code: WorkspaceImportErrorCode, lang: 'fr' | 'en'): string {
  const en = lang === 'en';
  switch (code) {
    case 'invalid_json':
      return en ? 'Invalid JSON.' : 'JSON invalide.';
    case 'not_an_envelope':
      return en ? 'Not a workspace envelope.' : "Ce n'est pas une enveloppe workspace.";
    case 'unsupported_version':
      return en ? 'Unsupported workspace version.' : 'Version de workspace non supportée.';
    case 'wrong_bundle_kind':
      return en
        ? 'Wrong bundle: expected a workspace, got an offer (or vice-versa).'
        : "Mauvais format : workspace attendu, mais offre reçue (ou inversement).";
    case 'empty':
      return en ? 'Empty file.' : 'Fichier vide.';
  }
}

// -----------------------------------------------------------------------------
// Microcopy
// -----------------------------------------------------------------------------

const L_FR = {
  title: 'Workspace backup',
  mockBadge: 'MOCK V1',
  offers: 'offres',
  assets: 'contenus',
  plans: 'plans',
  calendarSlots: 'créneaux cal.',
  recos: 'recos',
  feedbackRecos: 'recos feedback',
  feedbackHistory: 'historique',
  feedbackPrefs: 'préférences',
  lastSaved: 'Dernière sauvegarde locale :',
  storageKey: 'clé localStorage :',
  workspaceSection: 'Workspace complet',
  offerSection: 'Une offre',
  maintenanceSection: 'Maintenance',
  exportWorkspace: 'Exporter workspace JSON',
  importWorkspace: 'Importer workspace JSON',
  pickOffer: 'Choisir une offre…',
  exportOffer: 'Exporter cette offre',
  importOffer: 'Importer une offre',
  copyDiagnostic: 'Copier diagnostic',
  repair: 'Réparer workspace',
  pickOfferFirst: "Choisis d'abord une offre.",
  offerNotFound: 'Offre introuvable.',
  exportedWorkspace: 'Workspace exporté.',
  exportedOffer: 'Offre exportée.',
  workspaceMerged: 'Workspace fusionné.',
  workspaceReplaced: 'Workspace remplacé.',
  offerMerged: 'Offre fusionnée.',
  importCancelled: 'Import annulé.',
  diagnosticCopied: 'Diagnostic copié.',
  diagnosticFailed: 'Copie indisponible.',
  repairDone: 'Réparation terminée',
  repairCleanAlready: 'Aucune référence cassée.',
  repairSummary: 'Résumé de réparation',
  brokenLinks: 'liens cassés réparés',
  previewWorkspace: 'Aperçu du workspace à importer',
  previewOffer: 'Aperçu de l\'offre à importer',
  modeMerge: 'Fusion (sans doublons)',
  modeReplace: 'Remplacer (efface tout)',
  replaceWarning:
    "Replace efface toutes les données locales actuelles avant de charger l'import.",
  confirm: 'Confirmer',
  cancel: 'Annuler',
  localOnlyNote:
    "Tout est local (localStorage). Aucune sauvegarde cloud, aucun serveur, aucune analytics réelle.",
};

const L_EN: typeof L_FR = {
  title: 'Workspace backup',
  mockBadge: 'MOCK V1',
  offers: 'offers',
  assets: 'contents',
  plans: 'plans',
  calendarSlots: 'cal. slots',
  recos: 'recos',
  feedbackRecos: 'feedback recos',
  feedbackHistory: 'history',
  feedbackPrefs: 'preferences',
  lastSaved: 'Last local save:',
  storageKey: 'localStorage key:',
  workspaceSection: 'Full workspace',
  offerSection: 'Single offer',
  maintenanceSection: 'Maintenance',
  exportWorkspace: 'Export workspace JSON',
  importWorkspace: 'Import workspace JSON',
  pickOffer: 'Pick an offer…',
  exportOffer: 'Export this offer',
  importOffer: 'Import an offer',
  copyDiagnostic: 'Copy diagnostic',
  repair: 'Repair workspace',
  pickOfferFirst: 'Pick an offer first.',
  offerNotFound: 'Offer not found.',
  exportedWorkspace: 'Workspace exported.',
  exportedOffer: 'Offer exported.',
  workspaceMerged: 'Workspace merged.',
  workspaceReplaced: 'Workspace replaced.',
  offerMerged: 'Offer merged.',
  importCancelled: 'Import cancelled.',
  diagnosticCopied: 'Diagnostic copied.',
  diagnosticFailed: 'Clipboard unavailable.',
  repairDone: 'Repair complete',
  repairCleanAlready: 'No broken references.',
  repairSummary: 'Repair summary',
  brokenLinks: 'broken links repaired',
  previewWorkspace: 'Preview of the workspace to import',
  previewOffer: 'Preview of the offer to import',
  modeMerge: 'Merge (no duplicates)',
  modeReplace: 'Replace (erases all)',
  replaceWarning: 'Replace wipes all current local data before loading the import.',
  confirm: 'Confirm',
  cancel: 'Cancel',
  localOnlyNote:
    'Everything stays local (localStorage). No cloud backup, no server, no real analytics.',
};

