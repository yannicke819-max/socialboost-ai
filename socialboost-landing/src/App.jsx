import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, TrendingUp, Clock, CheckCircle, Play, Star, ChevronDown,
  Menu, X, ArrowRight, Zap, Users, BarChart3, Shield, Globe, Heart
} from 'lucide-react'

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pricingAnnual, setPricingAnnual] = useState(true)
  const [openFaq, setOpenFaq] = useState(null)

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const navLinks = [
    { name: 'Comment ça marche', href: '#how-it-works' },
    { name: 'Tarifs', href: '#pricing' },
    { name: 'Témoignages', href: '#testimonials' },
    { name: 'FAQ', href: '#faq' },
  ]

  const features = [
    {
      icon: Zap,
      title: '1 mois de contenu en 10 minutes',
      description: 'Génère, planifie et publie automatiquement. Fini les 15h de travail manuel.',
    },
    {
      icon: TrendingUp,
      title: '+37% d\'engagement moyen',
      description: 'Nos créateurs voient leur engagement augmenter en 90 jours.',
    },
    {
      icon: Heart,
      title: 'Ton style, ta voix',
      description: "L'IA apprend de tes meilleurs posts pour imiter ton ton unique.",
    },
  ]

  const useCases = [
    {
      icon: Users,
      title: 'Créateurs solo',
      description: 'Tu jongles entre création, edit, et community management. On prend en charge le community management.',
    },
    {
      icon: Globe,
      title: 'E-commerce & TPE',
      description: 'Tu vends des produits, pas du contenu. Transforme ton catalogue en posts qui convertissent.',
    },
    {
      icon: BarChart3,
      title: 'Coachs & experts',
      description: 'Recycle ton podcast, articles et lives en 20 posts sans y passer tes soirées.',
    },
    {
      icon: Shield,
      title: 'Micro-agences',
      description: 'Même outil, plusieurs espaces. Multiplie ta capacité sans embaucher.',
    },
  ]

  const testimonials = [
    {
      quote: "J'ai gagné 8h par semaine. Et mon engagement IG a doublé en 2 mois.",
      author: 'Léa M.',
      role: 'Créatrice lifestyle, 24k followers',
    },
    {
      quote: 'Je vends sur Shopify. Depuis SocialBoost, mes ventes via Instagram ont fait +46%.',
      author: 'Marc D.',
      role: 'Boutique déco',
    },
    {
      quote: 'Je gère 4 clients toute seule. Impensable sans SocialBoost.',
      author: 'Sofia L.',
      role: 'Micro-agence',
    },
  ]

  const plans = [
    {
      name: 'Free',
      price: 0,
      description: 'Teste l\'IA',
      features: [
        '1 compte social',
        '10 posts IA / mois',
        'Calendrier basique',
        'Support communautaire',
      ],
      cta: 'Commencer gratuitement',
      popular: false,
    },
    {
      name: 'Creator',
      price: pricingAnnual ? 11.90 : 14.90,
      description: 'Pour créateur solo',
      features: [
        '3 comptes sociaux',
        '100 posts IA / mois',
        'Toutes plateformes',
        'Smart scheduling',
        'Repurposing (5/mois)',
        'Analytics basiques',
      ],
      cta: 'Essayer 7 jours',
      popular: true,
    },
    {
      name: 'Pro',
      price: pricingAnnual ? 23.90 : 29.90,
      description: 'TPE / freelance actif',
      features: [
        '6 comptes sociaux',
        '400 posts IA / mois',
        'Repurposing illimité',
        'Analytics avancées',
        'Recos IA hebdo',
        'Support prioritaire',
      ],
      cta: 'Choisir Pro',
      popular: false,
    },
  ]

  const faqs = [
    {
      question: 'Est-ce que les posts ressemblent à du contenu IA générique ?',
      answer: "Non. SocialBoost apprend de tes anciens posts et de tes références pour coller à ton ton. On détecte et on bloque automatiquement les formules LLM clichées (tu sais, les \"Dans un monde où…\"). Tu peux éditer chaque post avant publication.",
    },
    {
      question: 'Est-ce que je risque un shadowban ?',
      answer: "Non. On respecte les APIs officielles, on ne fait pas de DM automatique, on adapte les hashtags et la fréquence aux règles de chaque plateforme.",
    },
    {
      question: 'Quelles plateformes sont supportées ?',
      answer: 'Instagram, TikTok, LinkedIn, X/Twitter, Facebook. YouTube Shorts et Pinterest arrivent très bientôt.',
    },
    {
      question: 'Je peux éditer les posts ?',
      answer: "Oui, chaque brouillon est éditable. Tu peux aussi refuser une idée et en demander d'autres. L'IA apprend de tes choix.",
    },
    {
      question: "Qu'est-ce qui se passe si je dépasse mon quota de posts ?",
      answer: "On t'alerte à 80%. Tu peux acheter un pack de 50 posts à 5€ ou passer au plan supérieur. Rien ne casse.",
    },
    {
      question: 'Je peux annuler quand je veux ?',
      answer: 'Oui, en 1 clic depuis ton compte. Pas de frais, pas de mail à envoyer, pas d\'engagement.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Zap className="h-8 w-8 text-yellow-400" />
              <span className="text-xl font-bold">SocialBoost AI</span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <button className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-colors">
                Essayer gratuitement
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-white/10">
            <div className="px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block text-gray-300 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <button className="w-full bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-colors">
                Essayer gratuitement
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            Publie moins, gagne plus.
            <br />
            <span className="text-yellow-400">L'IA qui fait tourner tes réseaux à ta place.</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto"
          >
            SocialBoost AI génère, planifie et publie ton contenu sur Instagram, TikTok, LinkedIn, X et Facebook. 
            Tu gardes le contrôle, l'IA fait le reste.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
          >
            <button className="bg-yellow-400 text-slate-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2">
              Essayer gratuitement — sans carte bleue
              <ArrowRight className="h-5 w-5" />
            </button>
            <button className="border-2 border-white/30 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
              <Play className="h-5 w-5" />
              Voir une démo de 90 secondes
            </button>
          </motion.div>

          {/* Platform Icons - Using text since social icons not available in lucide-react */}
          <div className="flex flex-wrap justify-center gap-6 text-gray-400 font-semibold">
            <span>Instagram</span>
            <span>LinkedIn</span>
            <span>X</span>
            <span>Facebook</span>
            <span>YouTube</span>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white/5">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 mb-6">Déjà 12 000+ créateurs et TPE boostent leurs réseaux avec SocialBoost</p>
          <div className="flex flex-wrap justify-center gap-8 mb-6">
            <span className="text-gray-500 font-semibold">BDM</span>
            <span className="text-gray-500 font-semibold">Maddyness</span>
            <span className="text-gray-500 font-semibold">Siècle Digital</span>
            <span className="text-gray-500 font-semibold">Journal du Net</span>
          </div>
          <div className="inline-block bg-yellow-400/20 text-yellow-400 px-6 py-3 rounded-full font-semibold">
            🚀 31 487 posts publiés cette semaine — rejoins le mouvement
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Publier sur les réseaux, c'est un job à plein temps.
            <br />
            <span className="text-red-400">Tu n'as pas ce temps.</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {[
              "Tu commences la semaine avec 5 idées géniales… qui restent dans ta tête.",
              "Tu passes ton dimanche soir à écrire des posts que personne ne lit.",
              "Tu sais que la régularité paye, mais tu craques au bout de 3 semaines.",
              "Tu vois tes concurrents publier 5x par jour et tu ne comprends pas comment.",
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 p-6 bg-white/5 rounded-xl"
              >
                <X className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
                <p className="text-gray-300">{item}</p>
              </motion.div>
            ))}
          </div>
          
          <p className="text-center mt-12 text-xl text-yellow-400 font-semibold">
            Spoiler : ils utilisent probablement ce qu'on va te montrer.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Trois choses que SocialBoost fait, et qui vont te changer la vie.
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-8 bg-slate-800/50 rounded-2xl border border-white/10"
              >
                <feature.icon className="h-12 w-12 text-yellow-400 mb-4" />
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Ton premier post publié en moins de 5 minutes.
          </h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Raconte-nous ton univers', desc: 'Ta niche, ton ton, ton objectif. 3 questions, c\'est tout.', time: '60 secondes' },
              { step: '2', title: 'Connecte tes réseaux', desc: 'Instagram, TikTok, LinkedIn, X, Facebook. Un clic par plateforme.', time: '60 secondes' },
              { step: '3', title: 'L\'IA te propose 10 posts', desc: 'Tu swipes : garde, jette, édite. Comme sur Tinder, mais pour du contenu.', time: '30 secondes' },
              { step: '4', title: 'Planifie et oublie', desc: 'Un bouton. SocialBoost publie pour toi, au meilleur moment, partout.', time: '30 secondes' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="text-6xl font-bold text-yellow-400/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 mb-2">{item.desc}</p>
                <span className="text-sm text-yellow-400 font-semibold">{item.time}</span>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <button className="bg-yellow-400 text-slate-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors">
              Je teste gratuitement →
            </button>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Conçu pour celles et ceux qui font beaucoup avec peu.
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 bg-slate-800/50 rounded-xl border border-white/10"
              >
                <useCase.icon className="h-10 w-10 text-yellow-400 mb-4" />
                <h3 className="font-bold mb-2">{useCase.title}</h3>
                <p className="text-gray-400 text-sm">{useCase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Ils ont repris le contrôle de leurs réseaux
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-8 bg-gradient-to-br from-yellow-400/10 to-purple-500/10 rounded-2xl border border-white/10"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-lg mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-bold">{testimonial.author}</p>
                  <p className="text-gray-400 text-sm">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Des tarifs pensés pour les solos et les petits budgets.
          </h2>
          <p className="text-center text-gray-400 mb-8">À partir de 14,90€/mois. Essai gratuit 7 jours. Sans carte bleue.</p>
          
          {/* Toggle */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center gap-4">
              <span className={!pricingAnnual ? 'text-white font-semibold' : 'text-gray-400'}>Mensuel</span>
              <button
                onClick={() => setPricingAnnual(!pricingAnnual)}
                className="relative w-16 h-8 bg-yellow-400 rounded-full transition-colors"
              >
                <div className={`absolute top-1 w-6 h-6 bg-slate-900 rounded-full transition-transform ${pricingAnnual ? 'left-9' : 'left-1'}`} />
              </button>
              <span className={pricingAnnual ? 'text-white font-semibold' : 'text-gray-400'}>
                Annuel <span className="text-green-400 text-sm">(-20%)</span>
              </span>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-8 rounded-2xl border ${
                  plan.popular 
                    ? 'bg-gradient-to-br from-yellow-400/20 to-purple-500/20 border-yellow-400 relative' 
                    : 'bg-slate-800/50 border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
                    Most popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-4">{plan.description}</p>
                <div className="mb-6">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">{plan.price}€</span>
                      <span className="text-gray-400">/mois</span>
                    </>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
                    : 'bg-white/10 hover:bg-white/20'
                }`}>
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Questions fréquentes</h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4"
                >
                  <span className="font-semibold">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-gray-400">
                    {faq.answer}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-gradient-to-r from-yellow-400/20 to-purple-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Arrête de te battre avec ton planning. Commence à grandir.
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            7 jours gratuits. Sans carte bleue. Ton premier post dans 5 minutes.
          </p>
          <button className="bg-yellow-400 text-slate-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors inline-flex items-center gap-2">
            Démarrer mon essai gratuit →
          </button>
          <p className="mt-4 text-gray-400 text-sm">
            Rejoins 12 000+ créateurs qui ont repris le contrôle de leurs réseaux.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="h-6 w-6 text-yellow-400" />
                <span className="font-bold">SocialBoost AI</span>
              </div>
              <p className="text-gray-400 text-sm">
                L'IA qui transforme les créateurs et TPE en médias solo.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-white">Tarifs</a></li>
                <li><a href="#" className="hover:text-white">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Statut</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">CGU</a></li>
                <li><a href="#" className="hover:text-white">Confidentialité</a></li>
                <li><a href="#" className="hover:text-white">Mentions légales</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 text-center text-gray-400 text-sm">
            © 2025 SocialBoost AI. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
