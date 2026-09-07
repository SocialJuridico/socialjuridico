/** @type {import('next').NextConfig} */
const nextConfig = {
  // Empacotamento autocontido: gera `.next/standalone/server.js` com apenas o
  // que e necessario em runtime. Permite fazer o BUILD LOCAL e enviar so o
  // resultado para a VPS (que nao aguenta rodar `next build` sem estourar a RAM).
  output: "standalone",
  // Exclui do trace do standalone pastas de workspace/documentacao que NAO sao
  // runtime, evitando inchar `.next/standalone` (que chegava a ~180MB com elas).
  outputFileTracingExcludes: {
    "/*": [
      "database/**",
      "divulgacao-notebooklm/**",
      "docs/**",
      "graphify-out/**",
      "laudosEDocumentos/**",
      "Legado/**",
      "scratch/**",
      "supabaseteste/**",
      "mobile/**",
      "**/*.md",
      "**/*.patch",
    ],
  },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ui-avatars.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/dashboard/advogado",
        missing: [{ type: "query", key: "legacy" }],
        destination: "/dashboard/advogado/dashboard",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https:; media-src 'self' blob: https:; object-src 'none';",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: 'camera=(self "https://meet.jit.si"), microphone=(self "https://meet.jit.si"), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
