'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type QA = { q: string; a: string };

const FAQS: QA[] = [
  {
    q: 'Est-ce que les posts ressemblent à du contenu IA générique ?',
    a: "Non. SocialBoost apprend de tes anciens posts et de tes références pour coller à ton ton. On détecte et on bloque automatiquement les formules LLM clichées (les « Dans un monde où… »). Tu peux éditer chaque post avant publication.",
  },
  {
    q: 'Est-ce que je risque un shadowban ?',
    a: "Non. On respecte les APIs officielles, pas de DM automatique, on adapte hashtags et fréquence aux règles de chaque plateforme.",
  },
  {
    q: 'Quelles plateformes sont supportées ?',
    a: 'Instagram, TikTok, LinkedIn, X/Twitter, Facebook. YouTube Shorts et Pinterest arrivent très bientôt.',
  },
  {
    q: 'Je peux éditer les posts ?',
    a: "Oui, chaque brouillon est éditable. Tu peux refuser une idée et en demander d'autres. L'IA apprend de tes choix.",
  },
  {
    q: 'Que se passe-t-il si je dépasse mon quota de posts ?',
    a: "On t'alerte à 80 %. Tu peux acheter un pack de 50 posts à 5 € ou passer au plan supérieur. Rien ne casse.",
  },
  {
    q: 'Je peux annuler quand je veux ?',
    a: "Oui, en 1 clic depuis ton compte. Pas de frais, pas de mail à envoyer, pas d'engagement.",
  },
  {
    q: 'Mes données sont-elles en sécurité ?',
    a: "Oui. Hébergement en Europe, conformité RGPD, tokens d'accès chiffrés. On ne revend rien à personne.",
  },
  {
    q: "Et si je veux publier manuellement un post en urgence ?",
    a: "Aucun souci. SocialBoost est un assistant, pas une prison. Tu publies quand tu veux.",
  },
  {
    q: 'Ça marche dans quelle langue ?',
    a: "Français, anglais, espagnol, allemand, italien. L'IA peut traduire tes posts pour toucher plusieurs audiences.",
  },
  {
    q: "Je n'y connais rien en IA, c'est compliqué ?",
    a: 'Si tu sais envoyer un SMS, tu sais utiliser SocialBoost. Promis.',
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
