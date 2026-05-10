/**
 * Free Prompt Pack generator (AI-016A).
 *
 * Transforms a `PromptVersion` produced by the AI-015 orchestrator into a
 * copyable expert prompt that the Free user can paste into their own AI
 * assistant. SocialBoost performs NO provider call in Free mode.
 *
 * Hard rules:
 *   - Pure: no `fetch`, no `process.env`, no provider import.
 *   - Same input → byte-identical output.
 *   - `providerCallAllowed` and `adminCostAllowed` are ALWAYS `false`.
 *   - The output text always includes:
 *     - "prêt à coller dans ton assistant IA préféré"
 *     - "Aucun modèle IA n'a été lancé par SocialBoost en mode gratuit."
 *   - No format ever asks for chain-of-thought (`<thinking>` and similar).
 */

import type { PromptVersion } from './prompt-orchestrator';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export const FREE_PROMPT_FORMATS = [
  'generic_markdown',
  'claude_xml',
  'chatgpt_markdown',
  'gemini_structured',
] as const;
export type FreePromptFormat = (typeof FREE_PROMPT_FORMATS)[number];

export interface FreePromptPack {
  mode: 'free_prompt_pack';
  format: FreePromptFormat;
  title: string;
  userFacingSummary: string;
  copyablePrompt: string;
  recommendedModelLabel: string;
  upgradeHint: string;
  estimatedCreditsIfRun: number;
  providerCallAllowed: false;
  adminCostAllowed: false;
}

export interface BuildFreePromptPackInput {
  promptVersion: PromptVersion;
  format?: FreePromptFormat;
  estimatedCreditsIfRun?: number;
  productName?: string;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

const DEFAULT_PRODUCT_NAME = 'SocialBoost';

const NO_MODEL_LAUNCHED_FR =
  "Aucun modèle IA n'a été lancé par SocialBoost en mode gratuit.";
const READY_TO_PASTE_FR = 'Ce prompt est prêt à coller dans ton assistant IA préféré.';

export function buildFreePromptPack(input: BuildFreePromptPackInput): FreePromptPack {
  const format: FreePromptFormat = input.format ?? 'generic_markdown';
  const productName = input.productName ?? DEFAULT_PRODUCT_NAME;
  const v = input.promptVersion;
  const title = `Brief IA ${productName} — ${v.task}`;
  const userFacingSummary = `Brief expert pour la tâche « ${v.task} », langue ${v.language}${v.channel ? `, canal ${v.channel}` : ''}.`;
  const copyablePrompt = renderFormat(format, v, productName);
  const recommendedModelLabel = recommendedFor(format);
  const upgradeHint =
    'Passe en Starter pour générer automatiquement dans SocialBoost, sans copier-coller.';
  return {
    mode: 'free_prompt_pack',
    format,
    title,
    userFacingSummary,
    copyablePrompt,
    recommendedModelLabel,
    upgradeHint,
    estimatedCreditsIfRun: input.estimatedCreditsIfRun ?? 0,
    providerCallAllowed: false,
    adminCostAllowed: false,
  };
}

function recommendedFor(format: FreePromptFormat): string {
  switch (format) {
    case 'claude_xml':
      return 'Optimisé pour Claude / assistants compatibles XML';
    case 'chatgpt_markdown':
      return 'Optimisé pour ChatGPT';
    case 'gemini_structured':
      return 'Optimisé pour Gemini';
    case 'generic_markdown':
    default:
      return 'Compatible avec Claude, ChatGPT, Gemini ou Mistral';
  }
}

// -----------------------------------------------------------------------------
// Format renderers
// -----------------------------------------------------------------------------

function renderFormat(
  format: FreePromptFormat,
  v: PromptVersion,
  productName: string,
): string {
  switch (format) {
    case 'claude_xml':
      return renderClaudeXml(v, productName);
    case 'chatgpt_markdown':
      return renderChatGptMarkdown(v, productName);
    case 'gemini_structured':
      return renderGeminiStructured(v, productName);
    case 'generic_markdown':
    default:
      return renderGenericMarkdown(v, productName);
  }
}

function header(productName: string, v: PromptVersion): string {
  return [
    `# Brief IA ${productName}`,
    `task: ${v.task}`,
    `version: ${v.version}`,
    `language: ${v.language}`,
    v.channel ? `channel: ${v.channel}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

function readyToPasteFooter(): string {
  return [READY_TO_PASTE_FR, NO_MODEL_LAUNCHED_FR].join(' ');
}

function renderGenericMarkdown(v: PromptVersion, productName: string): string {
  const lines: string[] = [];
  lines.push(`# Brief IA ${productName}`);
  lines.push('');
  lines.push('## Objectif');
  lines.push(v.systemPrompt.split('\n')[0] ?? v.task);
  lines.push('');
  lines.push('## Rôle');
  lines.push(v.systemPrompt);
  lines.push('');
  lines.push('## Contexte');
  lines.push(v.userPrompt);
  lines.push('');
  lines.push('## Tâche');
  lines.push(v.task);
  lines.push('');
  lines.push('## Contraintes');
  lines.push('Respecte rigoureusement les garde-fous listés.');
  lines.push('');
  lines.push('## Sortie attendue');
  lines.push(v.expectedOutput);
  lines.push('');
  lines.push('## Garde-fous');
  for (const g of v.guardrails) lines.push(`- ${g}`);
  lines.push('');
  lines.push('## Checklist qualité');
  for (const q of v.qualityChecklist) lines.push(`- ${q}`);
  lines.push('');
  lines.push('---');
  lines.push(readyToPasteFooter());
  lines.push('');
  lines.push(`# meta`);
  lines.push(header(productName, v));
  return lines.join('\n');
}

function renderClaudeXml(v: PromptVersion, productName: string): string {
  // Claude works well with descriptive XML tags for structured prompts. We
  // deliberately do NOT request chain-of-thought (`<thinking>`) — the engine
  // forbids it across every format.
  const lines: string[] = [];
  lines.push(`<!-- Brief IA ${productName} — Optimisé pour Claude / assistants compatibles XML -->`);
  lines.push('<socialboost_prompt>');
  lines.push('  <role>');
  lines.push(`    ${escapeXml(v.systemPrompt)}`);
  lines.push('  </role>');
  lines.push('  <context>');
  lines.push(`    Langue: ${v.language}${v.channel ? `, canal: ${v.channel}` : ''}`);
  lines.push(`    Tâche: ${v.task}`);
  lines.push('  </context>');
  lines.push('  <task>');
  lines.push(`    ${escapeXml(v.userPrompt)}`);
  lines.push('  </task>');
  lines.push('  <instructions>');
  lines.push('    Réponds en respectant strictement le format ci-dessous.');
  lines.push('    Ne demande pas de raisonnement étape par étape, ne produis pas de pensée intermédiaire, écris directement la sortie.');
  lines.push('  </instructions>');
  lines.push('  <expected_output>');
  lines.push(`    ${escapeXml(v.expectedOutput)}`);
  lines.push('  </expected_output>');
  lines.push('  <guardrails>');
  for (const g of v.guardrails) lines.push(`    <item>${escapeXml(g)}</item>`);
  lines.push('  </guardrails>');
  lines.push('  <quality_checklist>');
  for (const q of v.qualityChecklist) lines.push(`    <item>${escapeXml(q)}</item>`);
  lines.push('  </quality_checklist>');
  lines.push('</socialboost_prompt>');
  lines.push('');
  lines.push(`<!-- ${readyToPasteFooter()} -->`);
  return lines.join('\n');
}

function renderChatGptMarkdown(v: PromptVersion, productName: string): string {
  const lines: string[] = [];
  lines.push(`### Instructions (${productName} — Optimisé pour ChatGPT)`);
  lines.push(v.systemPrompt);
  lines.push('');
  lines.push('### Contexte');
  lines.push(`Langue: ${v.language}${v.channel ? ` · canal: ${v.channel}` : ''}`);
  lines.push(`Tâche: ${v.task}`);
  lines.push('');
  lines.push('### Prompt utilisateur');
  lines.push(v.userPrompt);
  lines.push('');
  lines.push('### Format de sortie');
  lines.push(v.expectedOutput);
  lines.push('');
  lines.push('### Contraintes');
  for (const g of v.guardrails) lines.push(`- ${g}`);
  lines.push('');
  lines.push('### Checklist qualité');
  for (const q of v.qualityChecklist) lines.push(`- ${q}`);
  lines.push('');
  lines.push('---');
  lines.push(readyToPasteFooter());
  return lines.join('\n');
}

function renderGeminiStructured(v: PromptVersion, productName: string): string {
  const lines: string[] = [];
  lines.push(`# Brief IA ${productName} — Optimisé pour Gemini`);
  lines.push('');
  lines.push('## Objectif');
  lines.push(v.systemPrompt.split('\n')[0] ?? v.task);
  lines.push('');
  lines.push('## Contexte');
  lines.push(v.systemPrompt);
  lines.push('');
  lines.push('## Contraintes');
  for (const g of v.guardrails) lines.push(`- ${g}`);
  lines.push('');
  lines.push('## Étapes de travail');
  lines.push('1. Lis le contexte ci-dessus.');
  lines.push('2. Applique les contraintes.');
  lines.push('3. Produis directement la sortie attendue, sans préambule.');
  lines.push('');
  lines.push('## Format de sortie');
  lines.push(v.expectedOutput);
  lines.push('');
  lines.push('## Critères qualité');
  for (const q of v.qualityChecklist) lines.push(`- ${q}`);
  lines.push('');
  lines.push('---');
  lines.push(readyToPasteFooter());
  return lines.join('\n');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
