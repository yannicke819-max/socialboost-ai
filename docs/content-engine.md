# Content Engine — SocialBoost AI

## 1. Inputs & signaux

### Inputs utilisateur (one-time, onboarding)
- **Niche** : liste de 40 presets (lifestyle, tech, food, fitness…) + champ libre → embedding.
- **Sous-thèmes** : 3 – 5 mots-clés.
- **Ton** : sliders (formel ↔ familier, sérieux ↔ fun, pédagogue ↔ provocateur).
- **Langues** : liste multiple.
- **Objectif principal** : notoriété / engagement / trafic / ventes (1 dominant + 1 secondaire).
- **Interdits** : mots, sujets, emojis, concurrents à ne jamais mentionner.
- **Références** : 3 – 10 URLs ou uploads de posts admirés → extraction de patterns stylistiques.

### Inputs utilisateur (récurrents)
- **Brief libre** : "cette semaine on parle du lancement X".
- **Assets** : photos, vidéos, articles de blog, transcript podcast.
- **Moments-clés** : dates de lancement, promos, événements.

### Signaux automatiques
- Historique de performance (likes, reach, saves par post).
- Heures de publication réelles de l'audience.
- Tendances de la niche (hashtags montants, sons TikTok).
- Contexte calendaire (jours fériés, événements sectoriels).
- Météo saisonnière du marketing (Saint-Valentin, rentrée, Black Friday).

## 2. Workflows principaux

### Workflow A — Génération "from scratch"
1. **Idéation** : niche + objectif + tendances → 10 angles d'idées (1 phrase chacun).
2. **Sélection** : l'utilisateur valide 3 – 5 idées (swipe UI).
3. **Rédaction** : pour chaque idée, brouillon par plateforme demandée.
4. **Enrichissement** : hashtags, brief visuel, CTA.
5. **Validation humaine** : édition inline possible.
6. **Programmation** : créneau suggéré + override manuel.

### Workflow B — Repurposing long-form
1. **Input** : URL article, upload audio/vidéo, transcript.
2. **Extraction** : 5 – 10 insights via Claude (chunking + résumé).
3. **Transformation multi-format** :
   - **X** : thread 6 tweets.
   - **LinkedIn** : post 1200 – 1500 car. (hook + corps + CTA).
   - **IG carrousel** : 7 slides (hook + 5 insights + CTA).
   - **TikTok/Reels** : script 30 s (hook 3 s + 3 points + CTA).
   - **Newsletter** : version condensée.
4. **Séquencement** : l'IA propose un calendrier étalé sur 2 – 3 semaines.

### Workflow C — Calendrier éditorial & planning auto
1. **Cadence cible** : "3 posts IG / 5 tweets / 2 LinkedIn par semaine".
2. **Auto-remplissage** : 1 mois généré respectant cadence + diversité thématique.
3. **Smart scheduling** : horaires choisis selon audience + baseline plateforme.
4. **Verrouillage** : l'utilisateur peut "figer" un post (protégé contre refresh IA).

### Workflow D — Boucle de feedback
1. **Ingestion stats** quotidienne → score normalisé par user.
2. **Catégorisation** : tag automatique (hook_type, length, format, thème, CTA).
3. **Learning** :
   - Top 20 % → few-shot dans prompts suivants.
   - Bottom 20 % → patterns à éviter.
4. **Recommandations actives** :
   - "Tes hooks question performent 2× mieux → on en fait 3 cette semaine ?"
   - "Le format carrousel stagne → on teste du Reels ?"
5. **Auto-refresh** (v2) : posts sous-performants re-générés avec variantes.

## 3. Règles de qualité contenu

### Originalité
- Similarité cosinus avec les 50 derniers posts du user > 0.85 → rejet.
- Détection de formules LLM (liste noire évolutive) : "Dans un monde où…", "Unlock the power…", "Game-changer".
- Vocabulaire varié imposé (TF-IDF sur les 20 derniers posts).

### Anti-spam
- Max 1 CTA par post.
- Max 3 hashtags sur X/LinkedIn, 10 sur IG, 5 sur TikTok.
- Max 2 emojis / 100 caractères (sauf ton "fun").
- Détection de mots "shadowban-sensibles" par plateforme.

### Variété des formats
- Rotation imposée : question / storytelling / conseil / chiffre choc / coulisses / avis / call-to-comment.
- Max 2 posts du même format consécutifs.
- Alerte si ratio format > 40 % sur 30 jours.

### Call-to-action
- Bibliothèque de 30 CTAs catégorisés (engagement, trafic, save, share).
- Alignement CTA ↔ objectif du user.
- A/B testable en v2.

### Linguistique
- Grammar check (LanguageTool API).
- Respect du ton via few-shot extrait des références user.
- Longueur adaptée par plateforme (hard cap).

## 4. Points de contrôle utilisateur

| Étape | Contrôle humain | Friction |
|---|---|---|
| Idéation | Valide 3 – 5 idées sur 10 | Obligatoire (1 clic) |
| Brouillon | Peut éditer texte, hashtags, média | Optionnel |
| Visuel | Valide / régénère | Obligatoire si image générée |
| Planning | Valide créneau, peut déplacer | Optionnel (auto-ok) |
| Publication | "Publier maintenant" ou queue | Obligatoire au 1er usage, auto-ok après opt-in |
| Post-publication | Archiver, refaire, épingler | Optionnel |

**Règle d'or** : jamais de publication automatique non consentie. Le mode full-auto exige un opt-in explicite (v1.2).

## 5. Données & features exposées dans l'UI

### Tags visibles sur chaque post
- **Format** : Reel / Carrousel / Texte / Thread / Story.
- **Hook type** : question / chiffre / story / polémique / teaser.
- **Thème** : tag libre + auto-tagging IA.
- **Bucket** : éducatif / inspirationnel / promo / behind-the-scenes.
- **Statut** : idée / brouillon / planifié / publié / échec.

### Scores
- **Score de performance** (0 – 100) normalisé vs baseline user.
- **Score d'originalité** (0 – 100) vs historique.
- **Score de conformité plateforme** (warnings avant publication).

### Vues & filtres
- Filtrer calendrier par format / bucket / plateforme.
- Dashboard "top 10 posts 90 jours" → 1 clic "refaire dans le même esprit".
- Library de "templates perso" dérivés automatiquement des tops.

## 6. Évolutions v2+

- **A/B tests créas** : 2 variantes, publication du gagnant après test sur échantillon.
- **Auto-refresh** des posts sous-performants (re-génération + re-queue 14 j plus tard).
- **Collaboration** : commentaires internes, approbation multi-niveaux (agence).
- **Content packs** : achats ponctuels de 50 posts thématiques (Black Friday, Noël).
- **Voix clonée** (TTS) pour scripts TikTok/Reels.
- **Multi-langue auto** : traduire adapté (pas littéral) en 5 langues.
- **Predictive scoring** : prédire engagement avant publication.
- **Trend radar** : détection précoce + alerte "fenêtre de tir 48 h".
