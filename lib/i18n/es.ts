import type { fr } from './fr';

export const es: typeof fr = {
  meta: {
    siteName: 'SocialBoost AI',
    tagline: 'Convierte tu experiencia en ingresos, post tras post.',
  },
  nav: {
    how: 'Cómo funciona',
    features: 'Producto',
    pricing: 'Precios',
    faq: 'FAQ',
    login: 'Iniciar sesión',
    signup: 'Empezar gratis',
    languageLabel: 'Idioma',
  },
  footer: {
    tagline: 'Convierte tu experiencia en ingresos, post tras post.',
    productCol: 'Producto',
    companyCol: 'Empresa',
    legalCol: 'Legal',
    features: 'Producto',
    pricing: 'Precios',
    how: 'Cómo funciona',
    faq: 'FAQ',
    blog: 'Blog',
    about: 'Sobre nosotros',
    contact: 'Contacto',
    terms: 'Términos',
    privacy: 'Privacidad',
    cookies: 'Cookies',
    rights: 'Todos los derechos reservados.',
    hosted: 'Alojado en Europa · RGPD',
  },
  hero: {
    eyebrow: 'Editorial Revenue System para creadores solo y pymes',
    titleLine1: 'Danos tu oferta.',
    titleLine2Pre: 'Construimos la ',
    titleAccent: 'campaña',
    titleLine2Post: ' que la vende.',
    subtitle:
      'SocialBoost transforma tu experiencia — un artículo, una transcripción, una ficha de oferta — en una campaña multiplataforma, en tu voz, ligada a un objetivo de negocio medible. No likes. Resultados.',
    primaryCta: 'Construir mi campaña',
    secondaryCta: 'Ver la demo en 60 s',
    fineprint: 'Plan Free disponible · Trial 14 días en Pro · Sin tarjeta · Cancela en 1 clic',
  },
  demo: {
    inputLabel: 'Input · 1 oferta + 1 idea',
    inputExample:
      "« Coaching LinkedIn para consultores — 900 € / 4 semanas. Promesa: triplicar las reuniones cualificadas en 30 días. Enlace: calendly.com/audit-30min »",
    outputLabel: 'Output · campaña ligada a tu oferta',
    platforms: {
      linkedin: 'Post long-form · 1 200 caracteres · CTA Calendly',
      instagram: 'Carrusel 7 slides · hook visual · enlace bio rastreado',
      x: 'Hilo 8 tweets · hook contradictorio · CTA respuesta',
      tiktok: 'Guion vídeo 45 s · hook 3 s · CTA "enlace en bio"',
    },
  },
  problem: {
    title: "La IA generativa está en todas partes. El contenido ya no es escaso. Lo que sí lo es: la conversión.",
    body:
      "Produces rápido con ChatGPT. Pero tus posts no traen leads, ni clientes, ni ingresos. La mayoría de los creadores ni siquiera saben si su contenido genera negocio. Ninguna herramienta conecta un post publicado con un euro ingresado.",
    punchline: 'La buena herramienta no genera más. Convierte tu experiencia en sistema de venta editorial.',
  },
  how: {
    title: 'De tu oferta a diez posts que venden, en menos de cinco minutos.',
    steps: [
      {
        time: '60 segundos',
        title: 'Danos tu oferta',
        body:
          'Coaching, formación, producto, audit gratuito, enlace Calendly. SocialBoost memoriza tu promesa, precio, target — es tu Offer Memory.',
      },
      {
        time: '30 segundos',
        title: 'El motor construye la campaña',
        body:
          "Diez posts adaptados a LinkedIn, Instagram, X, TikTok. Cada uno escrito en tu Style DNA, ligado a tu objetivo de negocio del mes (ventas / leads / autoridad), con un Confidence Score explicado.",
      },
      {
        time: 'antes de publicar',
        title: 'Validas, publicas, mides',
        body:
          'Apruebas con un swipe. SocialBoost programa los posts en el mejor horario. El Revenue Signal te dice qué posts trajeron clics a tu oferta — no solo likes.',
      },
    ],
  },
  pillars: {
    eyebrow: 'Cuatro capas. Una sola promesa: del contenido a los ingresos.',
    title: "No hacemos más posts. Hacemos posts que traen negocio.",
    items: [
      {
        tag: 'El wedge',
        title: 'Campaign Engine',
        body:
          'Un input + una oferta → campaña completa multiplataforma. No es reformateo: adaptación editorial por red, en tu Style DNA, ligada a tu objetivo del mes.',
      },
      {
        tag: 'El moat',
        title: 'Style DNA auto-aprendiente',
        body:
          'Tu voz preservada y mejorada con cada corrección. Cuanto más lo usas, más preciso. Tus datos quedan en tu cuenta, intransferibles — es tu fingerprint editorial.',
      },
      {
        tag: 'La decisión',
        title: 'Confidence Score',
        body:
          'Antes de cada publicación: un score 0-100 + tres razones humanas. "Este post va a funcionar porque hook fuerte, estructura narrativa + CTA, y publicas en tu mejor franja." No un número, una decisión.',
      },
      {
        tag: 'La atribución',
        title: 'Revenue Signal',
        body:
          'Cada enlace generado se rastrea. A fin de mes: "Tus 3 posts del 12 de marzo enviaron 47 personas a tu Calendly." Primera herramienta solo/pyme que conecta contenido e ingresos, sin CRM ni pixel.',
      },
    ],
  },
  comparison: {
    title: "SocialBoost no es otra IA. Es otra categoría.",
    cols: { chatgpt: 'ChatGPT', buffer: 'Buffer / Hootsuite', socialboost: 'SocialBoost' },
    rows: [
      'Campaña ligada a una oferta de negocio',
      'Style DNA auto-aprendiente por usuario',
      'Confidence Score explicado antes de publicar',
      'Revenue Signal — clics rastreados a tus enlaces',
      'Adaptación editorial nativa por red',
      'Programación de publicación',
    ],
    soon: 'Pronto',
  },
  forwho: {
    title: 'Para quienes lo hacen todo solos — y quieren vender, no solo publicar.',
    items: [
      {
        title: 'Consultores y coaches solo',
        body:
          'Tu contenido = tu pipeline. Publica 3 veces por semana sin diluir tu voz de experto, y mide qué posts llenan tu agenda.',
      },
      {
        title: 'Infoproductores y formadores',
        body:
          'Recicla un módulo de curso, un podcast o un live en una campaña ligada al lanzamiento de tu cohorte. Mide las inscripciones por post.',
      },
      {
        title: 'Founders e-commerce',
        body:
          'Convierte tus fichas de producto en campañas mix lifestyle / acquisición ligadas a tu catálogo Shopify. Mide las ventas atribuidas al contenido.',
      },
    ],
  },
  testimonials: {
    items: [
      {
        quote:
          "Vendo un coaching a 900 €. SocialBoost generó 47 reuniones cualificadas en 8 semanas vía mis posts LinkedIn. Primera vez que una herramienta de contenido me da una cifra de negocio real.",
        who: 'Marc D., business coach · 9 k followers',
      },
      {
        quote:
          "8 horas recuperadas por semana. Y mis posts ya no huelen a IA — la voz se mantiene en cinco plataformas. Engagement LinkedIn duplicado en 60 días.",
        who: 'Léa M., consultora estrategia · 18 k followers',
      },
      {
        quote:
          "El Confidence Score lo cambia todo. Ya no publico a ciegas, sé qué post va a funcionar antes de hacer clic.",
        who: 'Sofia L., infoproductora · 32 k followers',
      },
    ],
  },
  pricingHome: {
    title: 'Cuatro planes. Free disponible, sin marca de agua.',
    subtitle: 'Free para validar la promesa. Pro a 39 €/mes para la producción semanal.',
  },
  faq: {
    title: 'Las preguntas que más escuchamos.',
    items: [
      {
        q: '¿Qué pego concretamente en el Studio?',
        a:
          'Una oferta (coaching, formación, producto, audit gratuito, enlace Calendly) + un input con sustancia (artículo, transcripción de podcast, ficha de producto, post largo de LinkedIn). SocialBoost extrae el argumento, lo declina en cada red y lo conecta con tu oferta.',
      },
      {
        q: '¿Cómo se conecta el Revenue Signal a mi negocio?',
        a:
          'Cada enlace generado en tus posts se rastrea vía un short link. A fin de mes ves exactamente cuántas personas hicieron clic hacia tu oferta, por post. Sin CRM, sin pixel — incluido desde el Pro.',
      },
      {
        q: "Y la voz, ¿no se diluirá en el remix?",
        a:
          'No. El Style DNA corre en segundo plano en cada generación: extraemos tu estilo de 3-5 de tus mejores posts, aprendemos de cada corrección que hagas, filtramos los clichés LLM. Cuanto más lo usas, más preciso.',
      },
      {
        q: '¿Cuántas plataformas por generación?',
        a:
          'Free: solo LinkedIn. Solo: 2 redes. Pro: las 5 (LinkedIn, IG, X, TikTok, Facebook), 3-5 variantes por red. Agency: 20 cuentas multi-cliente.',
      },
      {
        q: 'Ya tengo ChatGPT (o Taplio), ¿qué haces de más?',
        a:
          'ChatGPT = un texto genérico. Taplio = solo LinkedIn, sin atribución de negocio. SocialBoost = campaña multiplataforma adaptada nativamente, ligada a tu oferta, con Revenue Signal que te dice qué trae clientes de verdad. Otra categoría de herramienta.',
      },
      {
        q: '¿El Confidence Score es serio o es marketing?',
        a:
          'Es un score basado en longitud, hook, estructura, alineamiento con tu Style DNA, hora de publicación e historial de rendimiento. Inicialmente basado en reglas; a medida que publicas, aprende de TUS propios resultados — no de un promedio global.',
      },
      {
        q: '¿Qué plataformas para la publicación automática?',
        a:
          'Generación en las 5 desde Pro. Publicación automática: LinkedIn primero (Sprint 6), luego Instagram, después X y TikTok. Mientras tanto, copy-paste en un clic desde el Studio.',
      },
      {
        q: '¿Mis datos y posts están seguros?',
        a:
          "Alojamiento UE, RGPD, tokens OAuth cifrados. No vendemos nada, no usamos tu contenido para entrenar un modelo global — tu Style DNA queda aislado en tu cuenta.",
      },
      {
        q: '¿Y si cancelo?',
        a:
          'Un clic desde tu cuenta. Sin gastos, sin compromiso. Mantienes el acceso hasta el final del periodo pagado y puedes exportar tus campañas.',
      },
    ],
  },
  finalCta: {
    title: 'Danos tu oferta. SocialBoost construye la campaña que la vende.',
    subtitle: 'Plan Free disponible. Sin tarjeta. Primera campaña en menos de 5 minutos.',
    cta: 'Construir mi campaña',
  },
  pricingPage: {
    eyebrow: 'Precios',
    title: 'Cuatro planes. Del test a la agencia multi-cliente.',
    subtitle:
      'Free para validar la promesa. Solo a 17 € para empezar. Pro a 39 € para producción semanal. Agency a 89 € para gestionar clientes. Anual = -20 %.',
    monthly: 'Mensual',
    yearly: 'Anual',
    yearlyBadge: '−20 %',
    perMonth: '/ mes',
    yearlyTotal: '{total} € facturados anualmente',
    popular: 'Más popular',
    betaBadge: 'Beta price',
    free: 'Gratis',
    fineprint: 'Free sin marca de agua · Trial 14 días en Pro · Cancela en 1 clic · Stripe',
    questionsTitle: 'Preguntas frecuentes',
  },
  plans: {
    free: {
      name: 'Free',
      tagline: 'Descubrimiento',
      cta: 'Empezar gratis',
      features: [
        '1 cuenta social',
        '5 posts IA / mes',
        'Style DNA básico',
        'Confidence Score básico',
        'Sin Campaign Engine',
        'Sin marca de agua',
      ],
    },
    solo: {
      name: 'Solo',
      tagline: 'El motor',
      cta: 'Empezar Solo',
      features: [
        '2 cuentas sociales',
        '80 posts IA / mes',
        'Campaign Engine (3 / mes)',
        'Style DNA completo',
        'Confidence Score',
        'Programación inteligente',
        'Soporte email',
      ],
    },
    pro: {
      name: 'Pro',
      tagline: 'El arsenal — producción semanal',
      cta: 'Empezar trial 14 días',
      features: [
        '5 cuentas sociales',
        '300 posts IA / mes',
        'Campaign Engine ilimitado',
        'Style DNA avanzado (auto-aprendiente)',
        'Confidence Score premium',
        'Goal-Driven Strategy mensual',
        'Revenue Signal básico',
        'Repurposing audio / vídeo (transcripción → campaña)',
        'Export LinkedIn 1-clic',
        'Soporte prioritario',
      ],
      soonFeatures: ['Publicación LinkedIn automática'],
    },
    agency: {
      name: 'Agency',
      tagline: 'Studio multi-cliente',
      cta: 'Elegir Agency',
      features: [
        '20 cuentas sociales multi-cliente',
        'Posts ilimitados',
        '3 Brand Voices clientes',
        '3 asientos incluidos',
        'Revenue Signal completo',
        'Soporte prioritario Slack',
      ],
      soonFeatures: ['White-label reports', 'Acceso API', 'Onboarding 1:1'],
    },
  },
  auth: {
    login: {
      title: 'Bienvenido de vuelta.',
      subtitle: 'Inicia sesión para retomar tus campañas.',
      email: 'Email',
      password: 'Contraseña',
      submit: 'Iniciar sesión',
      forgot: '¿Olvidaste tu contraseña?',
      noAccount: '¿Aún no tienes cuenta?',
      signupLink: 'Crear cuenta',
      orContinue: 'O continúa con',
      google: 'Continuar con Google',
    },
    signup: {
      title: 'Construye tu primera campaña.',
      subtitle: 'Plan Free disponible. Sin tarjeta. Primera campaña en 5 minutos.',
      email: 'Email',
      password: 'Contraseña',
      passwordHint: '8 caracteres mínimo.',
      submit: 'Crear cuenta',
      alreadyAccount: '¿Ya tienes cuenta?',
      loginLink: 'Iniciar sesión',
      termsBefore: 'Al crear una cuenta, aceptas nuestros ',
      termsLink: 'Términos',
      termsAnd: ' y nuestra ',
      privacyLink: 'Política de privacidad',
      termsAfter: '.',
      orContinue: 'O continúa con',
      google: 'Continuar con Google',
    },
  },
  legal: {
    updatedLabel: 'Última actualización',
    terms: {
      title: 'Términos y condiciones de uso',
      updated: '1 de mayo de 2026',
      sections: [
        {
          h: 'Objeto',
          p: 'Los presentes Términos rigen el acceso al servicio SocialBoost AI operado por SocialBoost SAS, registrada en Francia.',
        },
        {
          h: 'Cuenta',
          p: 'Certificas ser mayor de edad y proporcionar información exacta. Eres responsable de la confidencialidad de tus credenciales y de toda actividad en tu cuenta.',
        },
        {
          h: 'Suscripción',
          p: 'La suscripción es mensual o anual, cobrada por adelantado vía Stripe. El trial de 14 días del Pro no genera ningún cobro antes del fin del periodo de prueba.',
        },
        {
          h: 'Contenido',
          p: 'Conservas la propiedad de todo contenido que aportas (posts de referencia, briefs, URLs). Obtenemos una licencia limitada para procesar este contenido vía nuestros proveedores de IA. No usamos tu contenido para entrenar un modelo global.',
        },
        {
          h: 'Cancelación',
          p: 'Puedes cancelar en cualquier momento desde tu cuenta. La cancelación tiene efecto al final del periodo pagado. Sin reembolso prorrateado.',
        },
        {
          h: 'Responsabilidad',
          p: 'El servicio se proporciona "tal cual". No garantizamos un retorno cifrado. Eres responsable del cumplimiento de tus publicaciones con las reglas de cada plataforma social.',
        },
        {
          h: 'Derecho aplicable',
          p: 'Los presentes están regidos por el derecho francés. Cualquier litigio depende de los tribunales competentes.',
        },
      ],
    },
    privacy: {
      title: 'Política de privacidad',
      updated: '1 de mayo de 2026',
      sections: [
        {
          h: 'Datos recopilados',
          p: 'Email, contraseña hasheada, contenido proporcionado (posts de referencia, briefs, ofertas), metadatos de uso (modelo usado, tokens consumidos), datos de pago procesados por Stripe, estadísticas de clics en enlaces rastreados (Revenue Signal).',
        },
        {
          h: 'Finalidades',
          p: 'Proveer el servicio, calcular tu facturación, mejorar tu Style DNA (en tu cuenta únicamente), producir tu Revenue Signal, responder al soporte.',
        },
        {
          h: 'Alojamiento',
          p: 'Datos alojados en la Unión Europea (Supabase Frankfurt y Vercel Frankfurt/París). Sin transferencia fuera de la UE sin cláusulas SCC.',
        },
        {
          h: 'Subcontratistas IA',
          p: 'Anthropic (Claude) procesa tus briefs para generar variantes. Sin entrenamiento sobre tus datos. Eliminación posible al cancelar.',
        },
        {
          h: 'Tus derechos RGPD',
          p: 'Acceso, rectificación, supresión, portabilidad, oposición. Contacta privacy@socialboost.ai. Respuesta en 30 días.',
        },
        {
          h: 'Conservación',
          p: 'Mientras tu cuenta esté activa. Eliminación completa en 30 días tras cancelación, salvo obligación legal (facturas: 10 años).',
        },
      ],
    },
    cookies: {
      title: 'Política de cookies',
      updated: '1 de mayo de 2026',
      sections: [
        {
          h: 'Cookies esenciales',
          p: 'Sesión de autenticación, preferencias (idioma, tema). Indispensables para el funcionamiento del servicio. Sin consentimiento requerido.',
        },
        {
          h: 'Cookies de medición',
          p: 'Medición de audiencia anonimizada (visitas, páginas vistas). Usadas únicamente para mejorar el producto, nunca revendidas.',
        },
        {
          h: 'Cookies de terceros',
          p: 'Stripe (pago) deposita sus propias cookies en la página de checkout. Ver la política de Stripe.',
        },
        {
          h: 'Tus opciones',
          p: 'Puedes rechazar las cookies no esenciales vía los ajustes de tu navegador o vía el banner de consentimiento en tu primera visita.',
        },
      ],
    },
  },
  about: {
    eyebrow: 'Sobre nosotros',
    title: 'Construimos el primer Editorial Revenue System para medios solos.',
    subtitle:
      'La IA que convierte tu experiencia en ingresos, post tras post. No para departamentos IT o agencias de 50 personas — para quienes lo hacen todo solos y quieren vender, no solo publicar.',
    sections: [
      {
        h: 'El constato',
        p: 'La IA generativa se ha vuelto omnipresente. El contenido ya no es escaso; la conversión sí lo es. La mayoría de los solos y pymes no saben qué posts generan negocio. Ninguna herramienta SMB conecta un post con un euro ingresado.',
      },
      {
        h: 'La convicción',
        p: 'La IA es una commodity. El moat no está en el modelo — está en el sistema: un input, tu oferta, una campaña multiplataforma, una voz estable, un score predictivo y, progresivamente, una capa de atribución de negocio. Datos privados, switching cost real.',
      },
      {
        h: 'La trayectoria',
        p: 'V1: Campaign Engine + Style DNA + Confidence Score + Revenue Signal v1. V2: publicación real LinkedIn luego IG. V3: Media Agent autónomo controlado, Micro-Funnel completo (lead magnet + secuencia email + landing). Preferimos hacer cuatro cosas bien que treinta mal.',
      },
    ],
  },
  contact: {
    eyebrow: 'Contacto',
    title: 'Hablemos.',
    subtitle: 'Pregunta de producto, partnership, prensa — leemos todo, respondemos rápido.',
    name: 'Nombre',
    email: 'Email',
    message: 'Mensaje',
    submit: 'Enviar',
    sent: 'Mensaje enviado. Volveremos a ti en 48 h.',
    or: 'O directamente por email:',
    addresses: [
      { label: 'Soporte producto', email: 'support@socialboost.ai' },
      { label: 'Partnerships', email: 'partners@socialboost.ai' },
      { label: 'Prensa', email: 'press@socialboost.ai' },
    ],
  },
  studio: {
    title: 'Remix Studio',
    heading: 'Danos tu oferta. Construye tu campaña.',
    subtitle:
      'Pega tu oferta + una idea, una transcripción, una URL o un post largo. SocialBoost construye una campaña multiplataforma en tu Style DNA, ligada a tu objetivo de negocio.',
  },
  notFound: {
    title: '404',
    subtitle: 'Esta página no existe — o ya no.',
    cta: 'Volver al inicio',
  },
};
