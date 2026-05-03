import type { fr } from './fr';

export const en: typeof fr = {
  meta: {
    siteName: 'SocialBoost AI',
    tagline: 'One idea → five native publications. In thirty minutes.',
  },
  nav: {
    how: 'How it works',
    features: 'Product',
    pricing: 'Pricing',
    faq: 'FAQ',
    login: 'Log in',
    signup: 'Try free',
    languageLabel: 'Language',
  },
  footer: {
    tagline: 'One idea → five native publications. In thirty minutes.',
    productCol: 'Product',
    companyCol: 'Company',
    legalCol: 'Legal',
    features: 'Product',
    pricing: 'Pricing',
    how: 'How it works',
    faq: 'FAQ',
    blog: 'Blog',
    about: 'About',
    contact: 'Contact',
    terms: 'Terms',
    privacy: 'Privacy',
    cookies: 'Cookies',
    rights: 'All rights reserved.',
    hosted: 'Hosted in Europe · GDPR',
  },
  hero: {
    eyebrow: 'AI-powered editorial production studio',
    titleStart: 'One idea →',
    titleEnd: 'five native publications.',
    subtitle:
      "The AI that turns a brief, a transcript, or a URL into a LinkedIn, Instagram, X, and TikTok campaign tailored to each network's native format. Without diluting your voice, without rewriting the same post five times.",
    primaryCta: 'Remix my first idea',
    secondaryCta: 'Watch the 60-second demo',
    fineprint: '14-day Pro trial · No credit card · Cancel in one click',
  },
  demo: {
    inputLabel: 'Input · 1 brief',
    inputExample:
      "“I tested 4 LinkedIn prospecting tools for 60 days. Here are the 3 mistakes I see in 90% of solo consultants — and how I tripled my reply rate…”",
    outputLabel: 'Output · 4 native platforms',
    platforms: {
      linkedin: 'Long-form post · 1,200 chars · comments CTA',
      instagram: '7-slide carousel · visual hook · targeted hashtags',
      x: '8-tweet thread · contrarian hook',
      tiktok: '45-sec video script · 3-sec hook · problem → solution',
    },
  },
  problem: {
    title: 'You publish AI content → it shows → your audience tunes out.',
    body:
      "You ship fast with ChatGPT, but your posts smell of AI from a mile away: flat structure, predictable vocabulary, a voice that isn't yours. And every platform demands its own format — so you rewrite five times, or you flatly copy-paste. You publish more, you engage less, you eventually quit.",
    punchline:
      "The right tool doesn't generate more. It transforms one input into five coherent outputs.",
  },
  how: {
    title: 'From a raw input to five native publications, in thirty minutes.',
    steps: [
      {
        time: '5-30 seconds',
        title: 'Paste your input',
        body:
          'A brief, a podcast transcript, an article, a product page, a long LinkedIn post, a voice memo. You paste. SocialBoost reads.',
      },
      {
        time: '30 seconds',
        title: 'The engine remixes',
        body:
          "Five publications adapted to each network's native format: LinkedIn long-form, IG carousel, X thread, TikTok script, Facebook. Not copy-paste. Your voice preserved by Style DNA running in the background.",
      },
      {
        time: 'before publishing',
        title: 'You pick, you publish',
        body:
          'The Boost Score predicts the performance of each variant. You validate the ones that match your brand. You publish — or you schedule.',
      },
    ],
  },
  pillars: {
    eyebrow: 'Three levers, in this order',
    title: "Editorial throughput. Without cheating on the voice.",
    items: [
      {
        tag: 'The wedge',
        title: 'Content Remix Engine',
        body:
          "One input → five publications adapted to each network's native format. No copy-paste. No manual rewriting. The product's core.",
      },
      {
        tag: 'The moat',
        title: 'Style DNA',
        body:
          "Your voice preserved with every generation. SocialBoost trains on your best posts; the more you use it, the sharper it gets. Unmatchable by a competitor without your data.",
      },
      {
        tag: 'The decision',
        title: 'Predictive Boost Score',
        body:
          'Before publishing, you know which variant will perform. Score based on structure, hook, length, voice alignment. Learns from your own results over time.',
      },
    ],
  },
  comparison: {
    title: "SocialBoost isn't another AI tool. It's a different category.",
    cols: { chatgpt: 'ChatGPT', buffer: 'Buffer / Hootsuite', socialboost: 'SocialBoost' },
    rows: [
      '1 input → native publications per network',
      'Voice learning from your own posts',
      'Predictive score before publishing',
      'Generation in under 30 seconds',
      'Built for solos (not for IT teams)',
      'Publishing scheduler',
    ],
    soon: 'Soon',
  },
  forwho: {
    title: 'For solo media operators who do a lot with little.',
    items: [
      {
        title: 'Solo consultants & coaches',
        body:
          'Your content = your pipeline. Publish 3× a week on LinkedIn without diluting your expert voice.',
      },
      {
        title: 'Course creators & infopreneurs',
        body:
          'Recycle a course module, a podcast, or a live into 20 posts to fuel your cohort launches.',
      },
      {
        title: 'E-commerce founders',
        body:
          "Turn product pages, founder podcasts, and behind-the-scenes into mixed lifestyle / acquisition campaigns.",
      },
    ],
  },
  testimonials: {
    items: [
      {
        quote:
          "I used to publish once a week on LinkedIn. Now four times, plus IG and X automatically. My ghostwriter cost €1,200/mo. SocialBoost costs me €79.",
        who: 'Marc D., business coach · 9k followers',
      },
      {
        quote:
          "I got 8 hours back per week. And my posts no longer smell of AI — the voice holds across all five platforms. LinkedIn engagement doubled in 60 days.",
        who: 'Léa M., strategy consultant · 18k followers',
      },
      {
        quote:
          "The Boost Score is a game-changer. I no longer publish blind — I know which variant to pick before.",
        who: 'Sofia L., infopreneur · 32k followers',
      },
    ],
  },
  pricingHome: {
    title: 'Three plans. No free tier diluting the signal.',
    subtitle: '14 days free on Pro. Cancel in one click.',
  },
  faq: {
    title: 'The questions we hear most.',
    items: [
      {
        q: 'Concretely, what do I paste into the Studio?',
        a:
          "Any input with substance: a text brief, a podcast transcript (10-60 minutes), an article URL, a product sheet, a long LinkedIn post, a pillar email. SocialBoost extracts the main argument and declines it across networks.",
      },
      {
        q: 'How many platforms per generation?',
        a:
          'Starter: 3 networks (LinkedIn, IG, X). Pro and Studio: all 5 (LinkedIn, IG, X, TikTok, Facebook), with 3 to 5 variants per network. You choose which to publish.',
      },
      {
        q: "And the voice — won't it get diluted in the remix?",
        a:
          "No. Style DNA runs in the background on every generation: we extract your style from 3-5 of your best posts, we filter LLM clichés (\"In a world where…\", \"Game-changer\"), and you can always edit before publishing.",
      },
      {
        q: 'I already have ChatGPT — what do you do extra?',
        a:
          "ChatGPT gives you generic text on one platform. SocialBoost ships a campaign tailored to 5 platforms, trained on your voice, with a predictive score before publishing. It's a different category of tool.",
      },
      {
        q: 'Too expensive for yet another tool?',
        a:
          "Do the math: 15 hours of rewriting per week → 1 hour. At €80/h billed, payback under a week. Pro at €79/mo is cheaper than a €1,200 ghostwriter — and it doesn't go on holiday.",
      },
      {
        q: 'Is the Boost Score serious, or marketing fluff?',
        a:
          "It's a predictive score based on length, hooks, structure, voice alignment, and hashtags. Initially rule-based; as you publish, it learns from YOUR own results — not a global average.",
      },
      {
        q: 'Which platforms for auto-publishing?',
        a:
          'Generation on all 5 from Pro. Auto-publishing: LinkedIn first (Sprint 6), then Instagram, then X and TikTok. Until then, one-click copy-paste from the Studio.',
      },
      {
        q: 'Is my data safe?',
        a:
          "EU hosting, GDPR compliance, OAuth tokens encrypted at rest. We don't sell anything, we don't use your content to train a global model — your Brand Voice stays isolated to your account.",
      },
      {
        q: 'What if I cancel?',
        a:
          'One click from your account. No fees, no commitment. You keep access until the end of your paid period.',
      },
    ],
  },
  finalCta: {
    title: 'Stop rewriting the same post five times. Remix once, publish everywhere.',
    subtitle: '14 days free on Pro. No credit card. First campaign in under 5 minutes.',
    cta: 'Remix my first idea',
  },
  pricingPage: {
    eyebrow: 'Pricing',
    title: 'Three plans. No free tier.',
    subtitle:
      'All plans include the Remix Engine, Style DNA, and multi-platform generation. 14-day Pro trial. Cancel in one click.',
    monthly: 'Monthly',
    yearly: 'Yearly',
    yearlyBadge: '2 months free',
    perMonth: '/ month',
    yearlyTotal: '{total} € billed yearly',
    popular: 'Most popular',
    fineprint: '14-day Pro trial · Cancel in one click · Secure payment via Stripe',
    questionsTitle: 'Frequently asked',
  },
  plans: {
    starter: {
      name: 'Starter',
      tagline: 'Test the wedge',
      cta: 'Get started',
      features: [
        '20 inputs / month',
        '3 platforms (LinkedIn, IG, X)',
        '2 variants per platform',
        '1 Brand Voice',
        'Standard Style DNA',
        'Manual publishing (copy-paste)',
        'Email support',
      ],
    },
    pro: {
      name: 'Pro',
      tagline: 'My weekly production engine',
      cta: 'Start 14-day trial',
      features: [
        '100 inputs / month',
        'All platforms (5)',
        '3 variants per platform',
        '3 Brand Voices',
        'Advanced Style DNA (post analysis)',
        'Predictive Boost Score',
        'LinkedIn auto-publish',
        'Priority support',
      ],
    },
    studio: {
      name: 'Studio',
      tagline: 'I manage clients',
      cta: 'Choose Studio',
      features: [
        'Unlimited inputs',
        '5 variants per platform',
        '10 Brand Voices (team / clients)',
        'Existing post import',
        'Boost Score + recommendations',
        'Multi-network publishing',
        '3 seats included (+€39/seat)',
        'Shared Slack with the team',
      ],
    },
  },
  auth: {
    login: {
      title: 'Welcome back.',
      subtitle: 'Log in to pick up your campaigns.',
      email: 'Email',
      password: 'Password',
      submit: 'Log in',
      forgot: 'Forgot password?',
      noAccount: 'No account yet?',
      signupLink: 'Create account',
      orContinue: 'Or continue with',
      google: 'Continue with Google',
    },
    signup: {
      title: 'Remix your first idea.',
      subtitle: '14 days free. No credit card. First campaign in 5 minutes.',
      email: 'Email',
      password: 'Password',
      passwordHint: '8 characters minimum.',
      submit: 'Create account',
      alreadyAccount: 'Already have an account?',
      loginLink: 'Log in',
      termsBefore: 'By creating an account, you agree to our ',
      termsLink: 'Terms',
      termsAnd: ' and ',
      privacyLink: 'Privacy Policy',
      termsAfter: '.',
      orContinue: 'Or continue with',
      google: 'Continue with Google',
    },
  },
  legal: {
    updatedLabel: 'Last updated',
    terms: {
      title: 'Terms of Service',
      updated: 'May 1, 2026',
      sections: [
        {
          h: 'Purpose',
          p:
            'These Terms govern access to the SocialBoost AI service operated by SocialBoost SAS, registered in France.',
        },
        {
          h: 'Account',
          p:
            'You certify that you are of legal age and provide accurate information. You are responsible for credential confidentiality and any activity on your account.',
        },
        {
          h: 'Subscription',
          p:
            'Subscriptions are monthly or yearly, charged in advance via Stripe. The 14-day Pro trial does not trigger any charge before the trial ends.',
        },
        {
          h: 'Content',
          p:
            "You retain ownership of any content you provide (reference posts, briefs, URLs). We obtain a limited license to process this content via our AI providers. We do not use your content to train a global model.",
        },
        {
          h: 'Cancellation',
          p:
            'You can cancel anytime from your account. Cancellation takes effect at the end of the paid period. No prorated refund.',
        },
        {
          h: 'Liability',
          p:
            'The service is provided “as is”. We do not guarantee any specific ROI. You remain responsible for the compliance of your publications with each social platform’s rules.',
        },
        {
          h: 'Governing law',
          p:
            'These Terms are governed by French law. Any dispute falls under competent jurisdiction.',
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      updated: 'May 1, 2026',
      sections: [
        {
          h: 'Data collected',
          p:
            'Email, hashed password, content provided (reference posts, briefs), usage metadata (model used, tokens consumed), payment data processed by Stripe.',
        },
        {
          h: 'Purposes',
          p:
            'Provide the service, compute your billing, improve your Brand Voice (on your account only), respond to support.',
        },
        {
          h: 'Hosting',
          p:
            'Data hosted in the European Union (Supabase Frankfurt and Vercel Frankfurt/Paris). No transfer outside the EU without SCCs.',
        },
        {
          h: 'AI sub-processors',
          p:
            'Anthropic (Claude) processes your briefs to generate variants. No training on your data. Deletion possible upon cancellation.',
        },
        {
          h: 'Your GDPR rights',
          p:
            'Access, rectification, erasure, portability, objection. Email privacy@socialboost.ai. Reply within 30 days.',
        },
        {
          h: 'Retention',
          p:
            'As long as your account is active. Full deletion within 30 days after cancellation, except legal obligations (invoices: 10 years).',
        },
      ],
    },
    cookies: {
      title: 'Cookie Policy',
      updated: 'May 1, 2026',
      sections: [
        {
          h: 'Essential cookies',
          p:
            'Authentication session, preferences (language, theme). Required for service operation. No consent needed.',
        },
        {
          h: 'Measurement cookies',
          p:
            'Anonymised audience measurement (visits, page views). Used solely to improve the product, never resold.',
        },
        {
          h: 'Third-party cookies',
          p:
            "Stripe (payment) drops its own cookies on the checkout page. See Stripe's policy.",
        },
        {
          h: 'Your choices',
          p:
            'You can decline non-essential cookies via your browser settings or via the consent banner on your first visit.',
        },
      ],
    },
  },
  about: {
    eyebrow: 'About',
    title: 'We build SocialBoost for solo media operators.',
    subtitle:
      "The AI that turns an idea into a profitable social campaign, without losing your voice. Not for IT teams or 50-person agencies — for those who do everything themselves.",
    sections: [
      {
        h: 'The origin',
        p:
          "Solo creators and SMBs spend 15 hours a week producing content. With ChatGPT, it's faster — but generic, and you still rewrite for each platform. SocialBoost flips it: one input, five native outputs, voice preserved as a guarantee.",
      },
      {
        h: 'The conviction',
        p:
          "AI is a commodity. The moat isn't in the model — it's in the system: one input, five platforms, stable voice, predictive score, and progressively a business attribution layer (which content actually drives leads).",
      },
      {
        h: 'The trajectory',
        p:
          "V1: Remix Engine + Style DNA + Boost Score. V2: real publishing on LinkedIn then the rest. V3: revenue intelligence — which content generates leads, meetings, sales. We prefer doing three things well over thirty things badly.",
      },
    ],
  },
  contact: {
    eyebrow: 'Contact',
    title: "Let's talk.",
    subtitle:
      'Product question, partnership inquiry, press request — we read everything and reply quickly.',
    name: 'Name',
    email: 'Email',
    message: 'Message',
    submit: 'Send',
    sent: 'Message sent. We will get back to you within 48 hours.',
    or: 'Or directly via email:',
    addresses: [
      { label: 'Product support', email: 'support@socialboost.ai' },
      { label: 'Partnerships', email: 'partners@socialboost.ai' },
      { label: 'Press', email: 'press@socialboost.ai' },
    ],
  },
  studio: {
    title: 'Remix Studio',
    heading: 'One input → your native platforms.',
    subtitle:
      "Paste a brief, a transcript, a URL, or a long post. SocialBoost remixes into variants tailored to each network's native format, without diluting your voice.",
  },
  notFound: {
    title: '404',
    subtitle: 'This page does not exist — or no longer does.',
    cta: 'Back to home',
  },
};
