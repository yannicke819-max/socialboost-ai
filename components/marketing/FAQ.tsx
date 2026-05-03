'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type QA = { q: string; a: string };

const FAQS: QA[] = [
  {
    q: "C'est encore du contenu IA générique ?",
    a: "Non. SocialBoost n'écrit pas avec sa voix, il écrit avec la tienne. Le Brand Voice Setup analyse 3 à 5 de tes meilleurs posts pour extraire ton style. Chaque génération est filtrée pour bannir les formules LLM clichées (« Dans un monde où… », « Game-changer », « Let's gooo »). Tu peux toujours éditer avant publication.",
  },
  {
    q: "J'ai déjà ChatGPT, qu'est-ce que tu fais en plus ?",
    a: "ChatGPT te livre un texte générique. SocialBoost te livre une campagne adaptée à 5 plateformes (LinkedIn long-form, IG carrousel, X thread, TikTok script, Facebook), entraînée sur ta voix, avec un score prédictif avant publication. C'est une autre catégorie d'outil.",
  },
  {
    q: "Trop cher pour un outil de plus, non ?",
    a: "Calcule : 15 h de rédaction par semaine → 1 h. À 80 €/h facturé, le retour est sous 1 semaine. Le plan Pro à 79 €/mois est moins cher qu'un ghostwriter à 1 200 € — et il ne part pas en vacances.",
  },
  {
    q: "Le Boost Score, c'est sérieux ou c'est du marketing ?",
    a: "C'est un score prédictif basé sur la longueur, les hooks, la structure, l'alignement avec ta voix et les hashtags. Au début, il s'appuie sur des règles ; à mesure que tu publies, il apprend de TES propres résultats — pas d'une moyenne globale.",
  },
  {
    q: 'Quelles plateformes sont supportées ?',
    a: 'Génération : Instagram, TikTok, LinkedIn, X, Facebook. Publication automatique : LinkedIn d\'abord (S6), les autres suivent.',
  },
  {
    q: 'Mes données et mes posts sont en sécurité ?',
    a: "Hébergement Europe, conformité RGPD, tokens OAuth chiffrés en base. On ne revend rien à personne, on n'utilise pas ton contenu pour entraîner un modèle global — ton Brand Voice reste isolé sur ton compte.",
  },
  {
    q: 'Risque de shadowban ?',
    a: "Aucun automatisme suspect : on respecte les APIs officielles, pas de DM bot, hashtags et fréquence adaptés aux règles de chaque plateforme.",
  },
  {
    q: "Et si j'annule ?",
    a: "1 clic depuis ton compte. Pas de frais, pas d'engagement. Tu gardes l'accès jusqu'à la fin de ta période payée.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white transition dark:border-gray-800 dark:bg-gray-900"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between px-5 py-4 text-left font-semibold"
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-gray-600 dark:text-gray-300">{item.a}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
