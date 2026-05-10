import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXTERNAL_INSPIRATION_PLATFORMS,
  EXTERNAL_INSPIRATION_SOURCE_TYPES,
  FORBIDDEN_PHRASES,
  ORCHESTRATOR_VERSION,
  PROMPT_TASKS,
  buildExpertPrompt,
  buildExternalInspirationPrompt,
  containsForbiddenPhrase,
  promptToClipboardText,
  type ExternalInspirationInput,
} from '../prompt-orchestrator';
import {
  AD_STUDIO_BRIEF_HINT_EN,
  AD_STUDIO_BRIEF_HINT_FR,
  PROMPT_INSPECTOR_EN,
  PROMPT_INSPECTOR_FR,
} from '../prompt-inspector-labels';
import { KIND_TO_DIMENSIONS, type AdUnit, type Asset, type Offer } from '../types';

const NOW = '2026-05-04T00:00:00Z';

function makeOffer(over: Partial<Offer> = {}): Offer {
  return {
    id: over.id ?? 'ofr_orchestrator',
    name: over.name ?? 'Atelier Nova',
    status: 'draft',
    goal: 'social_content',
    language: over.language ?? 'fr',
    brief: over.brief ?? {
      businessName: 'Atelier Nova',
      offer: "Programme de 4 semaines pour clarifier l'offre des indépendants B2B.",
      targetAudience: 'indépendants B2B qui vendent des services',
      tone: 'professional',
      language: 'fr',
      platforms: ['linkedin', 'email'],
      proofPoints: ['Méthode testée sur 12 offres de consultants'],
    },
    confidence_score: 80,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function mkAsset(over: Partial<Asset> = {}): Asset {
  const kind = over.kind ?? 'hook';
  return {
    id: over.id ?? `ast_${kind}`,
    offerId: over.offerId ?? 'ofr_orchestrator',
    kind,
    title: over.title,
    body: over.body ?? 'Une phrase courte qui ouvre la discussion.',
    dimensions: KIND_TO_DIMENSIONS[kind] ?? ['asset'],
    status: over.status ?? 'approved',
    source: 'mock',
    createdAt: NOW,
  };
}

function mkAdUnit(): AdUnit {
  return {
    id: 'ofr_orchestrator:product_promo_vertical',
    offerId: 'ofr_orchestrator',
    templateId: 'product_promo_vertical',
    type: 'product_promo_video',
    format: '9:16',
    channel: 'tiktok',
    name: 'Promo produit · vertical 20s',
    objective: 'Capter et générer un clic.',
    hook: 'Stoppe le scroll, ton audience.',
    copy: 'Body line.\nProof verbatim.\nClique le lien.',
    cta: 'Clique le lien en bas.',
    status: 'draft',
    ready_score: 70,
    audience_fit: 65,
    checklist: {
      hook_in_first_3s: true,
      legible_without_sound: true,
      single_clear_cta: true,
      explicit_benefit: true,
      proof_or_credibility: true,
      format_fits_channel: true,
      no_mock_leak_in_public_copy: true,
      language_consistency: true,
    },
    derivedAt: NOW,
  };
}

// -----------------------------------------------------------------------------

describe('buildExpertPrompt — shape + invariants', () => {
  it('produces a PromptVersion for every PromptTask', () => {
    const offer = makeOffer();
    for (const task of PROMPT_TASKS) {
      const prompt = buildExpertPrompt({ offer, task });
      assert.equal(prompt.task, task);
      assert.equal(prompt.version, ORCHESTRATOR_VERSION);
      assert.ok(prompt.systemPrompt.length > 0);
      assert.ok(prompt.userPrompt.length > 0);
      assert.ok(prompt.expectedOutput.length > 0);
      assert.ok(prompt.guardrails.length >= 6);
      assert.ok(prompt.qualityChecklist.length >= 5);
    }
  });

  it('respects offer.brief.language even when chrome language differs', () => {
    const offer = makeOffer({ language: 'fr', brief: { ...makeOffer().brief, language: 'fr' } });
    const prompt = buildExpertPrompt({ offer, task: 'user_advice', language: 'en' });
    assert.equal(prompt.language, 'fr');
    assert.match(prompt.systemPrompt, /Tu es un copywriter senior/);
  });

  it('falls back to chrome language when brief is silent', () => {
    const offer = makeOffer({
      language: 'en',
      brief: {
        businessName: 'Acme',
        offer: 'Product.',
        tone: 'professional',
        language: 'en',
        platforms: ['linkedin'],
        proofPoints: ['Tested with 12 customers'],
      },
    });
    const prompt = buildExpertPrompt({ offer, task: 'user_advice' });
    assert.equal(prompt.language, 'en');
    assert.match(prompt.systemPrompt, /You are a senior B2B copywriter/);
  });

  it('determinism — same input → identical output', () => {
    const offer = makeOffer();
    const a = buildExpertPrompt({ offer, task: 'ad_generation', channel: 'linkedin' });
    const b = buildExpertPrompt({ offer, task: 'ad_generation', channel: 'linkedin' });
    assert.deepEqual(a, b);
  });
});

describe('buildExpertPrompt — guardrails enforced everywhere', () => {
  it('every prompt embeds the common guardrails (≥ 6 items)', () => {
    const offer = makeOffer();
    for (const task of PROMPT_TASKS) {
      const prompt = buildExpertPrompt({ offer, task });
      assert.ok(prompt.guardrails.some((g) => /preuve|proof/.test(g)),
        `task ${task} missing the proof-preservation guardrail`);
      assert.ok(prompt.guardrails.some((g) => /humain|human/.test(g)),
        `task ${task} missing the human-review guardrail`);
      assert.ok(prompt.guardrails.some((g) => /langue|language/i.test(g)),
        `task ${task} missing the language guardrail`);
    }
  });

  it('NO prompt contains any forbidden 2-word phrase (FR + EN)', () => {
    const offer = makeOffer();
    for (const task of PROMPT_TASKS) {
      for (const lang of ['fr', 'en'] as const) {
        const prompt = buildExpertPrompt({ offer, task, language: lang });
        const blob = `${prompt.systemPrompt}\n${prompt.userPrompt}\n${prompt.guardrails.join('\n')}\n${prompt.qualityChecklist.join('\n')}`;
        const hit = containsForbiddenPhrase(blob);
        assert.equal(hit, undefined, `task ${task} (${lang}) leaks forbidden phrase "${hit}"`);
      }
    }
  });

  it('FORBIDDEN_PHRASES list contains the spec-required pairs', () => {
    assert.ok(FORBIDDEN_PHRASES.includes('viral garanti'));
    assert.ok(FORBIDDEN_PHRASES.includes('revenus garantis'));
    assert.ok(FORBIDDEN_PHRASES.includes('guaranteed virality'));
    assert.ok(FORBIDDEN_PHRASES.includes('guaranteed revenue'));
  });
});

describe('per-task expectations', () => {
  const offer = makeOffer();

  it('offer_diagnosis asks for strengths/weaknesses/missingInfo/suggestedPositioning', () => {
    const p = buildExpertPrompt({ offer, task: 'offer_diagnosis' });
    assert.match(p.expectedOutput, /strengths/);
    assert.match(p.expectedOutput, /weaknesses/);
    assert.match(p.expectedOutput, /missingInfo/);
    assert.match(p.expectedOutput, /suggestedPositioning/);
  });

  it('angle_discovery asks for 5 to 8 angles', () => {
    const p = buildExpertPrompt({ offer, task: 'angle_discovery' });
    assert.match(p.userPrompt, /5 (?:à|to) 8 angles/);
    assert.match(p.expectedOutput, /angleName/);
    assert.match(p.expectedOutput, /emotionalTrigger/);
    assert.match(p.expectedOutput, /whyItCanWork/);
    assert.match(p.expectedOutput, /risk/);
    assert.match(p.expectedOutput, /suggestedChannels/);
  });

  it('post_ideas asks for hook/body/cta/channelFit', () => {
    const p = buildExpertPrompt({ offer, task: 'post_ideas' });
    assert.match(p.expectedOutput, /hook/);
    assert.match(p.expectedOutput, /body/);
    assert.match(p.expectedOutput, /cta/);
    assert.match(p.expectedOutput, /channelFit/);
  });

  it('ad_generation includes audience, proof, objection, channel + 3 variants', () => {
    const p = buildExpertPrompt({ offer, task: 'ad_generation', channel: 'linkedin' });
    assert.match(p.expectedOutput, /headline/);
    assert.match(p.expectedOutput, /body/);
    assert.match(p.expectedOutput, /cta/);
    assert.match(p.expectedOutput, /proofUsage/);
    assert.match(p.expectedOutput, /objectionHandled/);
    // Audience surfaced in user prompt (it is not "specified" in offer but rendered as a labeled line)
    assert.match(p.userPrompt, /Audience/);
    // Proof block surfaced
    assert.match(p.userPrompt, /Preuves|Proof points/);
    // Channel surfaced
    assert.match(p.userPrompt, /linkedin/);
    // Exactly 3 variants asked
    assert.match(p.userPrompt, /3 variantes|3 ad variants/);
  });

  it('ad_critique includes scoring clarity/attention/credibility/action', () => {
    const adUnit = mkAdUnit();
    const p = buildExpertPrompt({ offer, task: 'ad_critique', adUnit });
    assert.match(p.expectedOutput, /clarity/);
    assert.match(p.expectedOutput, /attention/);
    assert.match(p.expectedOutput, /credibility/);
    assert.match(p.expectedOutput, /action/);
    assert.match(p.expectedOutput, /jargonRisk/);
    assert.match(p.expectedOutput, /recommendations/);
    // Ad supplied is included in the user prompt
    assert.match(p.userPrompt, /Annonce à traiter|Ad to work on/);
    assert.match(p.userPrompt, /Stoppe le scroll/);
  });

  it('ad_improvement asks for an improved variant + a changeLog', () => {
    const adUnit = mkAdUnit();
    const p = buildExpertPrompt({ offer, task: 'ad_improvement', adUnit });
    assert.match(p.expectedOutput, /improved/);
    assert.match(p.expectedOutput, /changeLog/);
  });

  it('weekly_plan asks for 7 days with goal/channel/content/reason', () => {
    const p = buildExpertPrompt({ offer, task: 'weekly_plan' });
    assert.match(p.expectedOutput, /goal/);
    assert.match(p.expectedOutput, /channel/);
    assert.match(p.expectedOutput, /content/);
    assert.match(p.expectedOutput, /reason/);
    assert.match(p.userPrompt, /Lun..Dim|Mon..Sun/);
  });

  it('user_advice asks for advice/recommendedAction/why', () => {
    const p = buildExpertPrompt({ offer, task: 'user_advice' });
    assert.match(p.expectedOutput, /advice/);
    assert.match(p.expectedOutput, /recommendedAction/);
    assert.match(p.expectedOutput, /why/);
  });
});

describe('selectedAssets surfacing', () => {
  it('lists up to 6 selected assets in the user prompt', () => {
    const offer = makeOffer();
    const assets: Asset[] = Array.from({ length: 8 }, (_, i) =>
      mkAsset({ id: `ast_${i}`, body: `Asset body ${i}` }),
    );
    const p = buildExpertPrompt({ offer, task: 'post_ideas', selectedAssets: assets });
    // Should include the heading + at most 6 asset lines (i=0..5).
    assert.match(p.userPrompt, /Idées sélectionnées|Selected ideas/);
    assert.match(p.userPrompt, /Asset body 0/);
    assert.match(p.userPrompt, /Asset body 5/);
    assert.equal(p.userPrompt.includes('Asset body 6'), false,
      'engine must not include more than 6 asset lines');
  });
});

describe('promptToClipboardText', () => {
  it('contains task, system prompt, user prompt, expected output, guardrails, quality (FR)', () => {
    const offer = makeOffer();
    const p = buildExpertPrompt({ offer, task: 'ad_generation', channel: 'linkedin' });
    const text = promptToClipboardText(p, 'fr');
    assert.match(text, /Brief IA/);
    assert.match(text, /Prompt système/);
    assert.match(text, /Prompt utilisateur/);
    assert.match(text, /Sortie attendue/);
    assert.match(text, /Garde-fous/);
    assert.match(text, /Critères qualité/);
  });

  it('mirrors the labels in EN', () => {
    const offer = makeOffer();
    const p = buildExpertPrompt({ offer, task: 'ad_generation' });
    const text = promptToClipboardText(p, 'en');
    assert.match(text, /AI brief/);
    assert.match(text, /System prompt/);
    assert.match(text, /User prompt/);
    assert.match(text, /Guardrails/);
  });
});

describe('AI-015 addendum — External Inspiration Intelligence', () => {
  const offer = makeOffer();
  const inspirations: ExternalInspirationInput[] = [
    {
      sourcePlatform: 'linkedin',
      sourceType: 'organic_post',
      pastedText:
        "Voici comment je suis passé de 3 leads par mois à un calendrier rempli, sans changer d'outil.",
      observedSignals: [
        'beaucoup de commentaires',
        'partagé par plusieurs leaders du secteur',
      ],
      userNotes: 'Ce post est dans mon feed depuis 2 semaines.',
      language: 'fr',
      market: 'B2B services FR',
      doNotCopy: true,
    },
    {
      sourcePlatform: 'tiktok',
      sourceType: 'paid_ad',
      pastedText: 'Stop scrolling — here is the part nobody tells you about [topic].',
      observedSignals: ['publicité active depuis longtemps'],
      language: 'fr',
      doNotCopy: true,
    },
  ];

  it('PROMPT_TASKS now includes external_inspiration_analysis', () => {
    assert.ok((PROMPT_TASKS as readonly string[]).includes('external_inspiration_analysis'));
  });

  it('platform + source type taxonomies match the spec', () => {
    assert.deepEqual([...EXTERNAL_INSPIRATION_PLATFORMS], [
      'linkedin', 'instagram', 'tiktok', 'facebook', 'youtube', 'email', 'landing', 'other',
    ]);
    assert.deepEqual([...EXTERNAL_INSPIRATION_SOURCE_TYPES], [
      'organic_post', 'paid_ad', 'video_script', 'carousel', 'email', 'landing_section', 'other',
    ]);
  });

  it('buildExternalInspirationPrompt FR — task = external_inspiration_analysis with the right output shape', () => {
    const p = buildExternalInspirationPrompt({ offer, inspirations });
    assert.equal(p.task, 'external_inspiration_analysis');
    assert.equal(p.language, 'fr');
    // Output shape covers all required pattern fields.
    for (const key of [
      'patternName', 'platform', 'format', 'hookMechanic', 'emotionalTrigger',
      'promiseType', 'proofType', 'objectionHandled', 'engagementMechanic',
      'whyItMayWork', 'risks', 'howToAdaptForOffer', 'originalityGuidance',
    ]) {
      assert.match(p.expectedOutput, new RegExp(key), `expectedOutput missing field ${key}`);
    }
  });

  it('inspirations prompt contains "Ne copie pas" and "patterns" in FR', () => {
    const p = buildExternalInspirationPrompt({ offer, inspirations });
    const blob = `${p.systemPrompt}\n${p.userPrompt}\n${p.guardrails.join('\n')}`;
    assert.match(blob, /Ne copie pas/i);
    assert.match(blob, /patterns/i);
    assert.match(blob, /adaptation originale/i);
  });

  it('inspirations prompt EN contains "Never copy" and "patterns"', () => {
    const enOffer = makeOffer({
      language: 'en',
      brief: { ...makeOffer().brief, language: 'en' },
    });
    const p = buildExternalInspirationPrompt({ offer: enOffer, inspirations });
    const blob = `${p.systemPrompt}\n${p.userPrompt}\n${p.guardrails.join('\n')}`;
    assert.match(blob, /Never copy/i);
    assert.match(blob, /patterns/i);
    assert.match(blob, /original adaptation/i);
  });

  it('inspirations prompt — system + user + guardrails do NOT contain any forbidden phrase', () => {
    const p = buildExternalInspirationPrompt({ offer, inspirations });
    const blob = `${p.systemPrompt}\n${p.userPrompt}\n${p.guardrails.join('\n')}\n${p.qualityChecklist.join('\n')}`;
    assert.equal(containsForbiddenPhrase(blob), undefined);
  });

  it('observed signals are surfaced as "indices déclaratifs, PAS preuve" (FR)', () => {
    const p = buildExternalInspirationPrompt({ offer, inspirations });
    assert.match(p.userPrompt, /indices déclaratifs.*PAS preuve/i);
  });

  it('pasted text is truncated in the user prompt to ≤ 600 chars per inspiration', () => {
    const long = 'A'.repeat(2000);
    const p = buildExternalInspirationPrompt({
      offer,
      inspirations: [{
        sourcePlatform: 'linkedin', sourceType: 'organic_post',
        pastedText: long, language: 'fr', doNotCopy: true,
      }],
    });
    // The body should not contain the full 2000 'A's — it should be truncated.
    assert.equal(p.userPrompt.includes('A'.repeat(1000)), false);
  });

  it('buildExpertPrompt with inspirations on angle_discovery extends the task line (FR)', () => {
    const p = buildExpertPrompt({ offer, task: 'angle_discovery', inspirations });
    assert.match(p.userPrompt, /Inspirations externes/);
    assert.match(p.userPrompt, /angles originaux adaptés/i);
    assert.match(p.userPrompt, /Ne copie pas/i);
  });

  it('buildExpertPrompt with inspirations on ad_generation extends the task line (FR)', () => {
    const p = buildExpertPrompt({ offer, task: 'ad_generation', inspirations });
    assert.match(p.userPrompt, /Inspirations externes/);
    assert.match(p.userPrompt, /inspiration stratégique/i);
    assert.match(p.userPrompt, /copie originale/i);
    assert.match(p.userPrompt, /Ne copie pas/i);
  });

  it('without inspirations, angle_discovery + ad_generation prompts stay valid (no inspirations block surfaced)', () => {
    const a = buildExpertPrompt({ offer, task: 'angle_discovery' });
    const b = buildExpertPrompt({ offer, task: 'ad_generation' });
    assert.equal(/Inspirations externes/.test(a.userPrompt), false);
    assert.equal(/Inspirations externes/.test(b.userPrompt), false);
    // But the task is still complete (≥ 5 quality items + ≥ 6 guardrails).
    assert.ok(a.guardrails.length >= 6);
    assert.ok(b.guardrails.length >= 6);
  });

  it('extracted patterns guidance: prompt mentions cliché / promesse excessive risk (FR)', () => {
    const p = buildExternalInspirationPrompt({ offer, inspirations });
    const blob = `${p.systemPrompt}\n${p.guardrails.join('\n')}`;
    // The risks language is part of the extra guardrails.
    assert.match(blob, /cliché/i);
    assert.match(blob, /imitation trop proche/i);
  });
});

describe('inspector microcopy', () => {
  it('FR labels expose "Voir le brief IA" and "Copier le brief IA"', () => {
    assert.equal(PROMPT_INSPECTOR_FR.triggerLabel, 'Voir le brief IA');
    assert.equal(PROMPT_INSPECTOR_FR.copyButton, 'Copier le brief IA');
    assert.equal(PROMPT_INSPECTOR_FR.panelTitle, 'Brief IA utilisé');
  });

  it('EN labels mirror the FR shape', () => {
    assert.equal(PROMPT_INSPECTOR_EN.triggerLabel, 'View AI brief');
    assert.equal(PROMPT_INSPECTOR_EN.copyButton, 'Copy AI brief');
  });

  it('every PromptTask has a localized FR + EN option label in the inspector', () => {
    for (const task of PROMPT_TASKS) {
      assert.ok(PROMPT_INSPECTOR_FR.taskOptions[task], `FR inspector missing option for ${task}`);
      assert.ok(PROMPT_INSPECTOR_EN.taskOptions[task], `EN inspector missing option for ${task}`);
    }
  });

  it('AdStudio brief hint mentions audience + proof + objection + channel (FR)', () => {
    assert.match(AD_STUDIO_BRIEF_HINT_FR, /audience/i);
    assert.match(AD_STUDIO_BRIEF_HINT_FR, /preuve/i);
    assert.match(AD_STUDIO_BRIEF_HINT_FR, /objection/i);
    assert.match(AD_STUDIO_BRIEF_HINT_FR, /canal/i);
    // EN counterpart
    assert.match(AD_STUDIO_BRIEF_HINT_EN, /audience/i);
    assert.match(AD_STUDIO_BRIEF_HINT_EN, /proof/i);
    assert.match(AD_STUDIO_BRIEF_HINT_EN, /objection/i);
    assert.match(AD_STUDIO_BRIEF_HINT_EN, /channel/i);
  });
});
