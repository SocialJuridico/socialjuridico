export const SITE_URL = "https://www.socialjuridico.com.br";
export const SITE_NAME = "Social Jurídico";

/**
 * Rotas privadas, autenticadas ou que expõem tokens/documentos.
 * Não devem aparecer nos resultados nem ter seus links rastreados.
 */
export const privateRobots = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
    "max-image-preview": "none",
    "max-snippet": 0,
    "max-video-preview": 0,
  },
};

/**
 * Rotas públicas transitórias, utilitárias ou duplicadas.
 * A página não deve ser indexada, mas os links internos podem ser seguidos.
 */
export const noIndexFollowRobots = {
  index: false,
  follow: true,
  nocache: true,
  googleBot: {
    index: false,
    follow: true,
    noimageindex: true,
    "max-image-preview": "none",
    "max-snippet": 0,
    "max-video-preview": 0,
  },
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icon.png`,
  },
  description:
    "Plataforma tecnológica que facilita o contato entre pessoas e advogados cadastrados e oferece ferramentas para a organização da atividade jurídica.",
  email: "socialjuridico3@gmail.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Sorocaba",
    addressRegion: "SP",
    addressCountry: "BR",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: "+55-15-98165-7317",
      email: "socialjuridico3@gmail.com",
      areaServed: "BR",
      availableLanguage: "pt-BR",
    },
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: "+55-15-99265-3066",
      email: "socialjuridico3@gmail.com",
      areaServed: "BR",
      availableLanguage: "pt-BR",
    },
  ],
  sameAs: [
    "https://www.facebook.com/groups/1667675480204134",
  ],
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  inLanguage: "pt-BR",
  publisher: {
    "@id": `${SITE_URL}/#organization`,
  },
};
