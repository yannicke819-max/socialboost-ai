import { NextResponse } from 'next/server';
import { z } from 'zod';
import { anthropic, MODELS } from '@/lib/anthropic';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `Tu es l'assistant rédactionnel de SocialBoost AI.

Règles absolues :
1. Adapter le format à la plateforme (longueur, hashtags, ton).
2. Coller au ton fourni par l'utilisateur, sans le surjouer.
3. Bannir les formules clichées : "Dans un monde où…", "Unlock the power…", "Game-changer", "Let's gooo".
4. Max 2 emojis pour 100 caractères (sauf ton "fun" explicite). Max 1 CTA. Vocabulaire varié.
5. Structure : hook fort, corps avec valeur concrète, CTA aligné sur l'objectif.
6. Toujours produire 3 variantes avec des hook_type différents (question, chiffre, story, contradiction, teaser).
7. Ne jamais inventer de chiffres, témoignages ou citations.

Sortie : JSON strict (pas de markdown autour) au schéma :
{
  "drafts": [
    {
      "hook_type": "...",
      "body": "...",
      "hashtags": ["#..."],
      "cta": "...",
      "estimated_format": "...",
      "warnings": []
    }
  ]
}`;

const RequestSchema = z.object({
  brief: z.string().min(1).max(2000),
  platform: z.enum(['instagram', 'tiktok', 'linkedin', 'x', 'facebook']),
  niche: z.string().max(200).optional(),
  tone: z.string().max(200).optional(),
  objective: z.enum(['notoriete', 'engagement', 'trafic', 'ventes']).optional(),
  forbidden: z.array(z.string()).max(50).optional(),
  references: z.array(z.string()).max(10).optional(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: z.infer<typeof RequestSchema>;
  try {
    payload = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: 'Invalid payload', details: String(err) }, { status: 400 });
  }

  const userBrief = [
    `Plateforme : ${payload.platform}`,
    payload.niche && `Niche : ${payload.niche}`,
    payload.tone && `Ton : ${payload.tone}`,
    payload.objective && `Objectif : ${payload.objective}`,
    payload.forbidden?.length && `Mots interdits : ${payload.forbidden.join(', ')}`,
    payload.references?.length && `Références de style :\n${payload.references.join('\n---\n')}`,
    `Brief :\n${payload.brief}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await anthropic.messages.create({
    model: MODELS.workhorse,
    max_tokens: 1500,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userBrief }],
  });

  const textBlocks = response.content.filter((b) => b.type === 'text');
  const text = textBlocks.map((b) => (b.type === 'text' ? b.text : '')).join('\n');

  let drafts: unknown = null;
  try {
    drafts = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: 'AI returned non-JSON output', raw: text },
      { status: 502 },
    );
  }

  return NextResponse.json({
    drafts,
    usage: response.usage,
    model: response.model,
  });
}
