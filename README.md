# SocialBoost AI 🚀

La plateforme tout-en-un qui transforme les créateurs et TPE en "médias solo" grâce à l'IA.

## 📋 Vue d'ensemble

SocialBoost AI génère, planifie et publie du contenu sur Instagram, TikTok, LinkedIn, X et Facebook. 
Notre IA apprend votre style unique pour produire du contenu authentique qui engage votre audience.

### Fonctionnalités Clés

- **🧠 Style DNA Cloner** : Clone votre style d'écriture unique
- **♻️ Content Remix Engine** : Transformez un contenu long en campagne multi-plateforme
- **🔮 Predictive Boost Score** : Prédisez la performance avant publication
- **📅 Calendrier Éditorial Intelligent** : Planification automatique aux meilleurs horaires
- **📊 Analytics Actionnables** : Recommandations concrètes basées sur vos performances

## 🏗 Architecture du Projet

```
socialboost-app/
├── public/                 # Assets statiques
├── src/
│   ├── components/         # Composants réutilisables
│   │   ├── Layout.jsx      # Structure principale (Sidebar + Header)
│   │   ├── KPIs.jsx        # Cartes de statistiques
│   │   ├── Calendar.jsx    # Calendrier éditorial
│   │   ├── Generator.jsx   # Générateur IA étape par étape
│   │   ├── Analytics.jsx   # Graphiques et insights
│   │   └──AILab/           # Features innovantes
│   │       ├── StyleDNA.jsx
│   │       ├── RemixEngine.jsx
│   │       └── Predictor.jsx
│   ├── pages/              # Pages principales
│   │   ├── Dashboard.jsx
│   │   ├── Calendar.jsx
│   │   ├── Generator.jsx
│   │   ├── Analytics.jsx
│   │   ├── AILab.jsx
│   │   └── Settings.jsx
│   ├── hooks/              # Hooks personnalisés
│   ├── utils/              # Fonctions utilitaires
│   ├── App.jsx             # Routing principal
│   └── main.jsx            # Point d'entrée
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🛠 Stack Technique

- **Frontend** : React 18 + Vite
- **Styling** : Tailwind CSS
- **Routing** : React Router DOM v6
- **Charts** : Recharts
- **Icons** : Lucide React
- **Animations** : Framer Motion
- **Backend (à venir)** : Node.js/Express ou Python/FastAPI
- **Database (à venir)** : PostgreSQL + Redis
- **AI** : Claude API / OpenAI GPT-4
- **Paiement** : Stripe

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Stripe (pour les paiements)
- Clé API Claude/OpenAI

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/yannicke819-max/socialboost-ai.git
cd socialboost-app

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API

# 4. Lancer le serveur de développement
npm run dev

# 5. Ouvrir http://localhost:5173
```

## 📦 Variables d'Environnement

Créez un fichier `.env` à la racine :

```env
# AI
VITE_CLAUDE_API_KEY=your_claude_api_key
VITE_OPENAI_API_KEY=your_openai_api_key

# Stripe
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Base de données (production)
DATABASE_URL=postgresql://user:password@localhost:5432/socialboost
REDIS_URL=redis://localhost:6379

# OAuth Social
VITE_INSTAGRAM_CLIENT_ID=...
VITE_LINKEDIN_CLIENT_ID=...
VITE_TWITTER_CLIENT_ID=...
```

## 🎯 Roadmap

### Phase 1 : MVP (Actuel) ✅
- [x] Landing Page
- [x] Page Pricing
- [x] Dashboard de base
- [x] Générateur de posts IA
- [x] Calendrier éditorial
- [x] Analytics basiques

### Phase 2 : AI Lab (En cours) 🚧
- [x] Style DNA Cloner
- [x] Content Remix Engine
- [x] Predictive Boost Score
- [ ] Intégration API IA réelle
- [ ] Sauvegarde des styles utilisateurs

### Phase 3 : Production (Prochainement)
- [ ] Authentification complète (Email + Google OAuth)
- [ ] Connexion réseaux sociaux (OAuth Instagram, LinkedIn, X, TikTok)
- [ ] Publication réelle via APIs
- [ ] Système de paiement Stripe
- [ ] Base de données utilisateurs
- [ ] Gestion des quotas et abonnements

### Phase 4 : Scale
- [ ] Mode Agence (multi-clients)
- [ ] API publique
- [ ] Marketplace de templates
- [ ] Collaboration d'équipe
- [ ] Mobile App (React Native)

## 💰 Modèle Économique

### Plans
- **Free** : 0€ - 1 compte, 10 posts/mois
- **Creator** : 14,90€/mois - 3 comptes, 100 posts/mois ⭐
- **Pro** : 29,90€/mois - 6 comptes, 400 posts/mois
- **Agency** : 79,90€/mois - 20 comptes, 1500 posts/mois

### Add-ons
- Compte supplémentaire : 3€/mois
- Pack 50 posts : 5€
- Pack 50 visuels : 12€
- Seat additionnel : 12€/mois

## 🔒 Sécurité & Conformité

- RGPD compliant
- Hébergement des données en Europe
- Chiffrement des tokens OAuth
- Pas de revente de données
- Logs d'audit pour l'AI Act

## 🤝 Contribuer

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

MIT License - voir [LICENSE](LICENSE) pour plus de détails.

## 📞 Contact

- Site web : (à venir)
- Email : contact@socialboost.ai
- Twitter : @socialboost_ai

---

**SocialBoost AI** - Publie moins, gagne plus. 🚀
