# Video watchlist — SocialBoost AI

> **Status: veille uniquement.** Aucun de ces outils n'est intégré au produit
> aujourd'hui. Aucun appel réseau, aucun provider vidéo, aucune génération réelle.
> Cette liste sert à suivre les frameworks / modèles vidéo qui pourraient
> alimenter SocialBoost dans une future étape **après** AI-016 (provider IA réel)
> et **après** une décision produit explicite.

## Hors scope explicite

- Aucun ajout de dépendance (`package.json` non touché tant que la décision
  d'intégration n'est pas prise).
- Aucun rendu MP4 / aucune génération vidéo réelle dans le produit.
- Aucun stockage de média sur serveur.
- Aucun appel d'API externe.
- Aucune publication automatisée.

## Catégorie 1 — Frameworks vidéo programmatiques

### Remotion

- **Type** : framework vidéo programmatique React. Permet d'écrire des vidéos
  comme des composants React rendus en MP4 via FFmpeg.
- **Modalité** : code-first (TypeScript / JSX), templates réutilisables,
  rendu côté serveur ou serverless.
- **Usage potentiel pour SocialBoost** :
  - Générer des vidéos sociales (shorts 9:16, ads 1:1, explainers 16:9) depuis
    des templates pilotés par les contenus AI-009 et les annonces AI-013.
  - Convertir un `VideoScene[]` (AI-013) en MP4 cohérent (timeline, captions,
    on-screen text, transitions).
  - Pipeline : AdUnit → Remotion render queue → preview MP4 dans Ad Studio.
- **Notes d'intégration future** :
  - Côté serveur uniquement (jamais bundle navigateur).
  - À gater derrière `SOCIALBOOST_AI_PROVIDER_ENABLED` ou un flag dédié
    `SOCIALBOOST_VIDEO_RENDER_ENABLED`.
  - Coût compute non négligeable — penser file d'attente avec Inngest.

### HyperFrames / Hyperframers

- **Type** : framework HTML/CSS/JS → vidéo, orienté agents IA. L'IA compose
  directement les scènes en HTML/CSS/JS qui sont ensuite rasterisées.
- **Modalité** : agentic video authoring — l'IA "écrit" la vidéo comme une
  page web statique animée.
- **Usage potentiel pour SocialBoost** :
  - Laisser le Prompt Orchestrator (AI-015) demander à l'IA de composer
    directement des scènes vidéo en HTML/CSS/JS structuré.
  - Convertir un script SocialBoost en scènes vidéo sans passer par un DSL
    propriétaire.
  - Générer des MP4 cohérents depuis les templates AI-013.
- **Notes d'intégration future** :
  - À évaluer en parallèle de Remotion (le choix dépend de la maturité agentic
    et du contrôle déterministe souhaité).
  - L'output HTML/CSS/JS doit être strictement sandboxé avant rasterisation.

## Catégorie 2 — Modèles IA vidéo open-source

### Open-Sora 2

- **Type** : modèle open-source text-to-video / image-to-video.
- **Modalité** : génération directe de pixels par diffusion. Durée et
  résolution dépendent de la version.
- **Usage potentiel pour SocialBoost** :
  - Génération de clips sociaux courts à partir des prompts AI-015.
  - Prototypage de contenus visuels (B-roll, transitions) à partir d'un
    `VideoScene` (AI-013).
  - Exploration vidéo IA open-source pour les utilisateurs sans budget
    media propriétaire.
- **Notes d'intégration future** :
  - Self-hostable — éviter une dépendance API tierce si possible.
  - Coût GPU — penser à un pool partagé / quota par offre.

### LTX-2 / LTX-2.3

- **Type** : modèle IA vidéo open-source / multimodal.
- **Modalité** : text-to-video, image-to-video, et selon les capacités
  publiées de la version, audio-to-video.
- **Usage potentiel pour SocialBoost** :
  - Text-to-video à partir des hooks et copy AI-013.
  - Image-to-video pour animer un visuel statique (Static Meta ad → short).
  - Retakes / refinement / variantes créatives via le bouton "Créer une
    autre version" d'Ad Studio.
  - Génération de shorts ou ads visuels en complément des scripts AI-013.
- **Notes d'intégration future** :
  - Suivre les benchmarks indépendants avant choix vs Open-Sora.
  - Vérifier la licence sur usage commercial.

## Garde-fous produit (rappel)

Ces outils, s'ils sont un jour intégrés, devront respecter les invariants
hérités d'AI-013 et AI-015 :

- Aucune publication automatique. Le rendu MP4 reste une preview à relire.
- Le contenu généré suit `offer.brief.language`.
- `containsForbiddenPhrase` (AI-015) appliqué à toute légende / script vidéo
  avant rendu.
- Le scanner d'imitation (AI-015 addendum External Inspiration Intelligence)
  doit refuser de produire un visuel qui reproduit une source externe
  fournie en inspiration.
- Mode démonstration explicite si le rendu sert d'exemple.

## Référence rapide

| Outil | Catégorie | Open-source | Côté serveur | Statut |
|---|---|---|---|---|
| Remotion | Framework programmatique React | Oui | Oui (FFmpeg) | Veille |
| HyperFrames / Hyperframers | Framework HTML/CSS/JS agentic | À vérifier | Oui | Veille |
| Open-Sora 2 | Modèle text/image-to-video | Oui | Oui (GPU) | Veille |
| LTX-2 / LTX-2.3 | Modèle multimodal vidéo | Oui | Oui (GPU) | Veille |

## Décision produit requise avant intégration

1. Choix d'un framework programmatique (Remotion vs HyperFrames) — décision
   architecturale à prendre dans un sprint dédié type AI-019.
2. Choix d'un modèle IA vidéo (Open-Sora 2 vs LTX-2) — à benchmarker sur les
   `VideoScene[]` produits par AI-013 avant adoption.
3. Définition d'un quota / coût acceptable par offre.
4. Définition d'un flag d'activation dédié (proposition :
   `SOCIALBOOST_VIDEO_RENDER_ENABLED`) distinct du provider texte.
