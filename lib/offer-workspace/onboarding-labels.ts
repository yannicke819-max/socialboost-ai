/**
 * Wizard-facing microcopy (AI-014 humanization patch).
 *
 * Pure constant module. Lives outside the wizard component so:
 *   - tests can import the strings from a Node context;
 *   - the wizard re-renders strictly identical strings;
 *   - any future humanization pass touches one file.
 *
 * Hard rules:
 *   - No engine logic here. Strings only.
 *   - Same shape FR / EN. Tests pin both.
 *   - No "CTA", "asset", "audience cible", "niveau de maturité" etc. in user-
 *     facing FR copy. The user is a non-technical creator.
 */

export interface OnboardingWizardCopy {
  eyebrow: string;
  title: string;
  improveTitle: string;
  subtitle: string;
  introTitle: string;
  introBody: string;
  choiceNew: string;
  choiceNewBody: string;
  choiceImprove: string;
  choiceImproveBody: string;
  backToOffers: string;
  useExample: string;
  mockBanner: string;
  stepLabel: string;
  back: string;
  continue: string;
  finalCta: string;
  busy: string;
  cancel: string;

  s1Title: string;
  s1Hint: string;
  s1Name: string;
  s1Type: string;
  s1OneLiner: string;
  s1OneLinerPh: string;

  s2Title: string;
  s2Hint: string;
  s2Audience: string;
  s2AudiencePh: string;
  s2Problem: string;
  s2ProblemPh: string;
  s2Maturity: string;

  s3Title: string;
  s3Hint: string;
  s3Proof: string;
  s3ProofPh: string;
  s3Benefit: string;
  s3BenefitPh: string;
  s3Objection: string;
  s3ObjectionPh: string;

  s4Title: string;
  s4Hint: string;
  s4Cta: string;
  s4CtaPh: string;
  s4Tone: string;
  s4Language: string;

  errName: string;
  errOneLiner: string;
  errAudience: string;
  errProblem: string;
  errProofOrBenefit: string;
  errCta: string;
  errLanguage: string;
}

export const ONBOARDING_WIZARD_LABELS_FR: OnboardingWizardCopy = {
  eyebrow: 'Onboarding',
  title: 'Crée ta première annonce',
  improveTitle: 'Améliore ton offre existante',
  subtitle:
    "On va générer tes premières annonces à partir de ces réponses. Aucune publication réelle.",
  introTitle: 'Crée ta première annonce',
  introBody: "Tu as déjà une offre. On peut en créer une nouvelle ou améliorer une existante.",
  choiceNew: 'Créer une nouvelle annonce',
  choiceNewBody: 'Démarre depuis zéro avec une nouvelle offre.',
  choiceImprove: 'Améliorer une offre existante',
  choiceImproveBody: 'Reprends une offre déjà saisie et régénère ses annonces.',
  backToOffers: 'Retour aux offres',
  useExample: 'Remplir avec un exemple',
  mockBanner:
    "Aucune annonce ne sera publiée automatiquement. Tu pourras tout relire avant diffusion.",
  stepLabel: 'Étape',
  back: 'Retour',
  continue: 'Continuer',
  finalCta: 'Voir mes annonces',
  busy: 'Génération…',
  cancel: 'Annuler',

  s1Title: 'Ce que tu vends',
  s1Hint: "Donne un nom et explique en une phrase ce que tu vends.",
  s1Name: "Nom de l'offre",
  s1Type: 'Type',
  s1OneLiner: "J'aide qui à obtenir quoi ?",
  s1OneLinerPh:
    "J'aide les indépendants B2B à clarifier leur offre et à publier une page de vente simple en 4 semaines.",

  s2Title: 'Pour qui ?',
  s2Hint: "Décris simplement les personnes que tu veux toucher.",
  s2Audience: 'Qui veux-tu toucher ?',
  s2AudiencePh: 'indépendants B2B qui vendent des services',
  s2Problem: 'Quel problème veux-tu résoudre ?',
  s2ProblemPh: "Leur offre n'est pas claire, ils perdent des prospects.",
  s2Maturity: 'Où en est ton client ?',

  s3Title: 'Pourquoi te faire confiance ?',
  s3Hint: "Ajoute une preuve, un résultat ou une promesse simple.",
  s3Proof: 'Ce qui te rend crédible',
  s3ProofPh: 'Méthode testée sur 12 offres de consultants',
  s3Benefit: 'Ce que ton client va gagner',
  s3BenefitPh: 'Une seule offre claire et une page de vente prête en 4 semaines.',
  s3Objection: 'Ce qui peut le freiner',
  s3ObjectionPh: "Je n'ai pas le temps de refaire toute mon offre.",

  s4Title: 'Que doit faire la personne ensuite ?',
  s4Hint: "Indique l'action à proposer à la fin de l'annonce.",
  s4Cta: 'Prochaine action à proposer',
  s4CtaPh: 'Réserver un appel',
  s4Tone: "Style de l'annonce",
  s4Language: 'Langue des annonces',

  errName: 'Ajoute un nom court.',
  errOneLiner: 'Ajoute au moins une phrase.',
  errAudience: 'Ajoute quelques mots sur les personnes que tu veux toucher.',
  errProblem: 'Ajoute le problème que tu veux résoudre.',
  errProofOrBenefit:
    'Ajoute au moins une preuve OU ce que ton client va gagner.',
  errCta: 'Ajoute la prochaine action à proposer.',
  errLanguage: 'Choisis une langue.',
};

export const ONBOARDING_WIZARD_LABELS_EN: OnboardingWizardCopy = {
  eyebrow: 'Onboarding',
  title: 'Create your first ad',
  improveTitle: 'Improve your existing offer',
  subtitle: 'We will generate your first ads from these answers. No real publishing.',
  introTitle: 'Create your first ad',
  introBody: 'You already have an offer. You can create a new one or improve an existing one.',
  choiceNew: 'Create a new ad',
  choiceNewBody: 'Start fresh with a new offer.',
  choiceImprove: 'Improve an existing offer',
  choiceImproveBody: 'Pick an existing offer and regenerate its ads.',
  backToOffers: 'Back to offers',
  useExample: 'Fill with an example',
  mockBanner:
    'No ad will be published automatically. You can review everything before sharing.',
  stepLabel: 'Step',
  back: 'Back',
  continue: 'Continue',
  finalCta: 'See my ads',
  busy: 'Generating…',
  cancel: 'Cancel',

  s1Title: 'What you sell',
  s1Hint: 'Give it a name and describe what you sell in one sentence.',
  s1Name: 'Offer name',
  s1Type: 'Type',
  s1OneLiner: 'I help who get what?',
  s1OneLinerPh:
    'I help B2B consultants articulate their offer and ship a simple sales page in 4 weeks.',

  s2Title: 'For whom?',
  s2Hint: 'Describe the people you want to reach in plain words.',
  s2Audience: 'Who do you want to reach?',
  s2AudiencePh: 'B2B consultants who sell services',
  s2Problem: 'What problem do you solve?',
  s2ProblemPh: 'Their offer is unclear, they lose prospects.',
  s2Maturity: 'Where is your customer today?',

  s3Title: 'Why should people trust you?',
  s3Hint: 'Add a proof, an outcome, or a simple promise.',
  s3Proof: 'What makes you credible',
  s3ProofPh: 'Tested with 12 consultant offers',
  s3Benefit: 'What your customer gains',
  s3BenefitPh: 'One clear offer and a sales page ready in 4 weeks.',
  s3Objection: 'What might hold them back',
  s3ObjectionPh: "I don't have time to redo my whole offer.",

  s4Title: 'What should they do next?',
  s4Hint: 'Pick the action you want them to take after watching the ad.',
  s4Cta: 'Next action to suggest',
  s4CtaPh: 'Book a call',
  s4Tone: 'Ad style',
  s4Language: 'Ad language',

  errName: 'Add a short name.',
  errOneLiner: 'Add at least one sentence.',
  errAudience: 'Add a few words about the people you want to reach.',
  errProblem: 'Add the problem you want to solve.',
  errProofOrBenefit: 'Add at least a proof OR what your customer gains.',
  errCta: 'Add the next action to suggest.',
  errLanguage: 'Choose a language.',
};
