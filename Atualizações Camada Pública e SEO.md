# Atualizações da Camada Pública e Planejamento de SEO

**Data:** 08 de junho de 2026

## 1. Objetivo

Este documento registra as alterações realizadas nas rotas públicas do Social Jurídico e define a próxima etapa de SEO técnico, indexação e descoberta pelos mecanismos de busca.

A camada pública passou por revisão de:

- posicionamento institucional;
- UI/UX;
- responsividade;
- acessibilidade;
- transparência jurídica;
- privacidade e segurança;
- canais de atendimento;
- consistência de linguagem;
- remoção de promessas absolutas ou sem comprovação.

---

# 2. Rotas públicas refatoradas

## 2.1. Home `/`

Foram revisados:

- Header;
- Hero institucional;
- contadores públicos;
- recursos para clientes;
- diferenciais;
- funcionamento da plataforma;
- origem na comunidade;
- FAQ;
- CTA final;
- navegação mobile semelhante a aplicativo;
- Footer;
- ScrollToTop;
- PWAInstallPrompt;
- metadados básicos.

O rastreamento avançado de conversão ficou reservado para a futura refatoração do dashboard administrativo.

---

## 2.2. Advogados `/sou-advogado`

Foram revisados:

- posicionamento institucional;
- Hero;
- jornada do advogado;
- casos publicados;
- Radar Jurídico;
- CRM;
- agenda e prazos;
- assinatura digital;
- Notificação Extrajudicial Blindada;
- Inteligência Artificial;
- atendimento centralizado;
- planos Start e Pro;
- CTA final;
- responsividade e acessibilidade.

Foram removidas promessas como contratação garantida, clientes garantidos, análise definitiva de viabilidade, imutabilidade absoluta e recursos ilimitados sem confirmação.

---

## 2.3. Termos de Uso `/termos`

O documento foi ampliado para abordar:

- natureza da plataforma;
- cadastro e segurança da conta;
- publicação de casos;
- funcionamento para advogados;
- Radar Jurídico;
- comunicação e contratação;
- planos, Stripe e InfinitePay;
- cancelamento, arrependimento e reembolso;
- Inteligência Artificial;
- documentos e assinatura;
- Notificação Extrajudicial Blindada;
- condutas proibidas;
- propriedade intelectual;
- suspensão de contas;
- privacidade;
- retenção e exclusão;
- responsabilidades;
- foro de Sorocaba — SP;
- contato oficial.

Dados atuais:

- localidade: Sorocaba — SP;
- e-mail: socialjuridico3@gmail.com;
- CNPJ: em regularização;
- foro: Sorocaba — SP.

---

## 2.4. Política de Privacidade `/privacidade`

Foi criado CSS próprio e uma política mais completa, cobrindo:

- categorias de dados;
- origem dos dados;
- finalidades;
- bases legais;
- dados sensíveis;
- dados de menores;
- visibilidade dos casos;
- compartilhamentos;
- Supabase;
- Resend;
- OneSignal;
- Stripe;
- InfinitePay;
- OpenAI;
- transferência internacional;
- cookies e armazenamento local;
- videochamadas transmitidas sem gravação;
- Inteligência Artificial;
- segurança;
- retenção;
- direitos dos titulares;
- incidentes;
- canal de privacidade.

Informações operacionais confirmadas:

- exclusão em até 30 dias;
- resíduos de backup por até 180 dias;
- Supabase configurado na região de São Paulo/Américas;
- OpenAI recebe apenas textos enviados às ferramentas;
- dados sensíveis não são solicitados para uso da IA;
- videochamadas não são gravadas;
- portabilidade automatizada ainda não está disponível;
- responsável pelo canal de privacidade: Carlos Henrique.

---

## 2.5. Aviso de cookies

Foi planejado o componente `CookieNotice` para informar o uso de tecnologias essenciais.

Como o projeto não utiliza atualmente cookies publicitários identificados, o aviso inicial não deve simular consentimento para publicidade inexistente.

O aviso informa uso de tecnologias necessárias para:

- autenticação;
- segurança;
- preferências;
- funcionamento da PWA;
- notificações, quando autorizadas.

Quando ferramentas opcionais de analytics ou publicidade forem adicionadas, o componente deverá evoluir para um gerenciador de consentimento por categorias.

---

## 2.6. Exclusão de Dados `/exclusao-de-dados`

Foi criado CSS próprio e atualizado o conteúdo para refletir o processo real:

- solicitação por e-mail, contato ou painel quando disponível;
- confirmação de identidade;
- desativação da conta;
- processamento em até 30 dias;
- eliminação ou anonimização;
- retenção legal;
- backups por até 180 dias;
- registros financeiros e de segurança;
- dados legitimamente conservados por outros usuários;
- irreversibilidade após exclusão;
- canal responsável: Carlos Henrique;
- e-mail: socialjuridico3@gmail.com.

Foi removida a afirmação anterior de exclusão imediata e prazo improrrogável de 15 dias.

---

## 2.7. Sobre `/sobre`

A rota passou a contar a história real da plataforma:

- origem no grupo Preciso de um Advogado;
- mais de sete anos de comunidade;
- mais de 16 mil membros;
- transformação da experiência da comunidade em produto digital;
- propósito para clientes, advogados e escritórios;
- princípios institucionais;
- papel da plataforma;
- CTA final.

Foram removidos números não comprovados como 5 mil advogados e 10 mil casos resolvidos.

---

## 2.8. Contato `/contato`

Foram atualizados:

- Hero;
- e-mail oficial;
- dois números de WhatsApp;
- localidade;
- horário de atendimento;
- aviso de que o canal não presta consultoria jurídica;
- formulário funcional;
- endpoint `/api/contato`;
- envio via Resend;
- validação de campos;
- honeypot;
- rate limit básico;
- mensagens de carregamento, sucesso e erro;
- links legais.

Contatos:

- socialjuridico3@gmail.com;
- +55 (15) 98165-7317;
- +55 (15) 99265-3066;
- Sorocaba — SP.

---

## 2.9. Segurança `/seguranca`

Foi criado CSS próprio e removido o reaproveitamento do CSS de outra rota.

A página passou a apresentar:

- autenticação e controle de acesso;
- HTTPS;
- banco e armazenamento;
- verificação manual de advogados;
- proteção de rede;
- logs e prevenção de fraude;
- arquitetura em camadas;
- proteção de dados e documentos;
- boas práticas do usuário;
- canal de relato de incidente;
- links para Privacidade e Exclusão.

Foram removidas afirmações sem auditoria independente, como:

- segurança de classe mundial;
- AES-256 ponta a ponta para todos os dados;
- atendimento de 100% da LGPD;
- garantia absoluta de segurança.

---

# 3. Correção do FAQ

Foi identificado erro de execução:

```text
ReferenceError: trackEvent is not defined
```

A função de rastreamento foi removida temporariamente do FAQ, porque a infraestrutura de eventos será criada posteriormente no dashboard administrativo.

---

# 4. Estado atual do SEO técnico

O projeto já possui no layout global:

- `metadataBase`;
- template de títulos;
- descrição global;
- Open Graph básico;
- Twitter Card;
- diretivas globais de robots;
- manifest;
- favicon e ícone Apple;
- verificação do Google Search Console.

Ainda precisam ser implementados ou auditados:

- `src/app/robots.js`;
- `src/app/sitemap.js`;
- canonical individual em todas as páginas públicas;
- bloqueio de indexação de dashboards, APIs, autenticação e páginas privadas;
- imagem Open Graph dedicada em 1200 × 630;
- JSON-LD global de Organization e WebSite;
- JSON-LD específico por página quando aplicável;
- breadcrumbs estruturados;
- página 404 otimizada;
- normalização de domínio www e HTTPS;
- submissão do sitemap ao Google Search Console e Bing Webmaster Tools;
- análise de Core Web Vitals;
- auditoria de headings, links internos, alt de imagens e conteúdo duplicado;
- política para páginas dinâmicas e parâmetros de URL;
- remoção de páginas privadas do sitemap;
- `noindex` em login, cadastro, onboarding, validação e dashboards;
- monitoramento de cobertura e indexação.

---

# 5. Rotas públicas recomendadas para indexação

Inicialmente:

```text
/
/sou-advogado
/clientes
/sobre
/contato
/seguranca
/termos
/privacidade
/exclusao-de-dados
/notificacao-blindada
```

A rota `/clientes` e `/notificacao-blindada` ainda devem ser auditadas antes de entrarem definitivamente no sitemap.

---

# 6. Rotas que não devem ser indexadas

```text
/api/*
/dashboard/*
/admin/*
/chat/*
/login
/cadastro
/onboarding
/validar
/assinatura/*
```

Outras páginas de operações internas, callbacks, webhooks, pagamentos e tokens também devem permanecer fora do índice.

---

# 7. Próxima etapa

A próxima etapa da camada pública é implementar o pacote de SEO técnico:

1. revisar o `layout.js` global;
2. criar `robots.js`;
3. criar `sitemap.js`;
4. criar JSON-LD global;
5. revisar metadados de cada rota;
6. aplicar `noindex` às páginas privadas;
7. criar imagem Open Graph oficial;
8. validar URLs canônicas;
9. testar sitemap e robots em produção;
10. enviar sitemap aos buscadores;
11. executar Lighthouse e PageSpeed;
12. acompanhar Search Console.

---

# 8. Status

A camada pública está próxima da conclusão visual e editorial.

O próximo marco necessário para considerá-la finalizada é concluir a configuração avançada de SEO técnico e validar a indexação em produção.
