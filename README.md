# ⚖️ SocialJurídico 2026 - Soluções Jurídicas com IA

![Status](https://img.shields.io/badge/Status-Produção-success?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-DB_%26_Auth-3ECF8E?style=for-the-badge&logo=supabase)
![Stripe](https://img.shields.io/badge/Stripe-Pagamentos-008CDD?style=for-the-badge&logo=stripe)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)

O **SocialJurídico** é um ecossistema digital de alta performance desenhado para conectar clientes e advogados através de Inteligência Artificial Generativa. O projeto foi arquitetado com foco em **Segurança de Dados (LGPD)**, **Escalabilidade** e **Experiência do Usuário (UX)**.

---

## 🚀 Principais Funcionalidades

- **🤖 Redator Jurídico IA:** Geração automatizada de petições, contratos e minutas complexas utilizando GPT-4o e Gemini.
- **💼 Marketplace de Casos:** Triagem inteligente de casos jurídicos com sistema de interesses para advogados.
- **🏦 Gestão de Créditos (Juris):** Sistema financeiro integrado para advocacia com checkout via Stripe.
- **💬 Chat em Tempo Real:** Comunicação segura e direta entre advogado e cliente com notificações instantâneas.
- **📊 Dashboard Administrativo:** Controle total de usuários, banners, comunicados e estatísticas de uso.
- **🛡️ Triagem com IA:** Diagnóstico preliminar de casos jurídicos para determinar área e urgência.

---

## 🔒 Camadas de Segurança (DevSecOps)

- **Auth SSR:** Autenticação robusta no servidor via Supabase SSR, eliminando vulnerabilidades de autenticação client-side.
- **RBAC (Role-Based Access Control):** Verificação de permissões profunda no banco de dados para Admin, Advogado e Cliente.
- **LGPD Compliance:** Filtro de informações sensíveis (PII) antes do processamento por APIs de terceiros.
- **Security Middleware:** Headers HTTP de segurança (CSP, HSTS, XSS Protection) ativos em todas as rotas.
- **Rate Limiting:** Proteção contra abusos de API e controle de custos de Inteligência Artificial.
- **Cloud Storage:** Gestão de arquivos e anexos via Supabase Storage, garantindo performance e integridade dos dados.

---

## 🛠️ Stack Tecnológica

- **Framework:** Next.js (App Router + Standalone Output)
- **Linguagem:** JavaScript / Node.js
- **Banco de Dados:** PostgreSQL (Supabase)
- **Autenticação:** Supabase SSR Auth
- **Estilização:** Tailwind CSS + CSS Modules
- **Pagamentos:** Stripe API
- **IA:** OpenAI (GPT-4o) & Google Gemini (Flash 1.5/2.0)
- **Email:** Resend API

---

## 📦 Instalação e Desenvolvimento

1. Clone o repositório:
```bash
git clone https://github.com/usuario/socialjuridico.git
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente no arquivo `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
...
```

4. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

---

## 👨‍💻 Créditos e Desenvolvimento

Este projeto foi auditado e refatorado para atingir os mais altos padrões de segurança e performance do mercado jurídico digital.

**Desenvolvido por Saulo Pavanello**  
*Desenvolvedor FullStack e Eng. de Software*  

📱 **Contato:** +55 15 99265-3066  
🌐 **Site:** [www.saulopavanello.com](https://www.saulopavanello.com)

---

> **Atenção:** Este repositório contém código proprietário. O uso não autorizado é estritamente proibido.