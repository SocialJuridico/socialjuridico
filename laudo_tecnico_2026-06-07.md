# Laudo tecnico do projeto SocialJuridico

**Data da analise:** 07/06/2026  
**Projeto analisado:** SocialJuridico  
**Escopo:** analise estatica do codigo-fonte, estrutura do projeto, configuracoes, dependencias, rotas, integracoes, seguranca e capacidade operacional.  
**Limitacao relevante:** os comandos de teste e lint nao puderam ser executados neste ambiente porque o `npm` local esta quebrado, com erro de modulo ausente em `C:\Users\marys\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js`.

## 1. Resumo executivo

O projeto e uma plataforma juridica digital de porte medio/alto, construida principalmente em Next.js, React e Supabase, com modulos para clientes, advogados, escritorios, anunciantes e administradores. A aplicacao tambem possui APIs internas, webhooks de pagamento, recursos de IA, PWA, notificacoes, CRM, radar de oportunidades, assinatura digital e um subprojeto mobile em Expo/React Native.

O codigo demonstra uma evolucao funcional ampla e varias preocupacoes corretas de seguranca, como autenticacao via Supabase SSR, verificacoes de perfil no banco de dados em rotas administrativas, headers HTTP de seguranca, validacao de webhooks e mascaramento de dados sensiveis em utilitarios. Apesar disso, o projeto apresenta riscos operacionais importantes: rotas temporarias de diagnostico ainda presentes, uso de segredos padrao em cron, rate limit em memoria, muitos logs de producao, README desatualizado/inconsistente, possivel exposicao historica de credenciais no subprojeto mobile e ausencia de validacao automatica executavel no ambiente atual.

**Conclusao tecnica:** o projeto esta funcionalmente avancado e possui boa base arquitetural, mas nao deve ser considerado plenamente maduro para operacao critica sem uma rodada de saneamento de seguranca, governanca de segredos, padronizacao de autenticacao/autorizacao, limpeza de rotas temporarias e estabilizacao do pipeline de testes/build.

## 2. Visao geral da stack

### Aplicacao web

- **Framework:** Next.js 16.1.6 com App Router.
- **UI:** React 19.2.3, CSS Modules e componentes proprios.
- **Banco e autenticacao:** Supabase/PostgreSQL, `@supabase/ssr` e `@supabase/supabase-js`.
- **Pagamentos:** Stripe, InfinitePay e Greenn.
- **IA:** OpenAI API em modulos de CRM, chat, redator, extracao/analisador de documentos e classificacao de oportunidades.
- **Email:** Resend.
- **Notificacoes:** OneSignal, Expo Push e PWA.
- **Arquivos/PDF:** `pdf-lib`, `pdf-parse`, `pdfjs-dist`, `jspdf`, `unpdf`, upload via Supabase Storage.
- **Testes:** Jest configurado.

### Aplicacao mobile

- Subprojeto em `mobile/`.
- **Stack:** Expo 54, React Native 0.81.5, React 19.1.0, Supabase JS 2.45.4.
- Usa bibliotecas de camera, midia, notificacoes, secure store, document picker e autenticacao/local storage.

## 3. Dimensao e estrutura do projeto

Foram identificados:

- **133 arquivos de rota API** em `src/app/api`.
- **52 paginas/telas** em `src/app`.
- **8 migracoes Supabase** em `supabase/migrations`.
- Modulos principais em `src/lib`, `src/services`, `src/components` e `src/app/dashboard`.
- Subprojeto mobile separado em `mobile/`.
- Laudos anteriores ja existentes no repositorio, alem deste documento.

Principais dominios funcionais observados:

- Marketplace/captacao de casos juridicos.
- Cadastro, login e onboarding de clientes e advogados.
- Dashboards de advogado, cliente, escritorio, anunciante e admin.
- Chat e mensagens.
- CRM juridico.
- Assinatura digital e OTP.
- Financeiro, assinaturas, planos e creditos "Juris".
- Radar de oportunidades com coleta, classificacao e aprovacao.
- Emails, push notifications e comunicados administrativos.
- Rotas de webhooks para provedores de pagamento.
- PWA e integracao mobile.

## 4. Arquitetura observada

### Pontos positivos

- Separacao clara entre paginas, componentes, bibliotecas e APIs.
- Uso do App Router do Next.js, adequado para a organizacao atual.
- Existencia de `middleware.js` para protecao de areas privadas.
- Uso de `supabaseServer.js` para cliente SSR com cookies.
- Existencia de utilitarios de seguranca em `src/lib/securityUtils.js`.
- Rotas administrativas relevantes validam usuario autenticado e confirmam o papel ADMIN no banco de dados.
- Webhook Stripe usa segredo configurado por ambiente.
- Migrations Supabase presentes, indicando algum controle de evolucao de schema.

### Pontos de atencao

- Algumas rotas e arquivos indicam carater temporario ou diagnostico: `debug`, `fix`, `investigate`, `test-email-caso`, `init-db`.
- Ha mistura de padroes de autenticacao: Supabase Auth, cookies customizados de escritorio/anunciante, Bearer token para mobile e fallback por query/header em alguns fluxos.
- O `README.md` esta com caracteres corrompidos e informa tecnologias que nao aparecem nas dependencias atuais, como TailwindCSS e Gemini.
- O projeto tem muitos logs com dados operacionais, inclusive em webhooks, checkout e fluxos de login.
- O rate limiting central em `src/lib/rateLimitMiddleware.js` e em memoria, o que nao e suficiente para ambiente serverless, multi-instancia ou producao escalavel.

## 5. Seguranca

### Achados positivos

- Headers de seguranca configurados em `next.config.mjs`: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e Permissions-Policy.
- `poweredByHeader` desativado.
- Funcoes de mascaramento de email, telefone, CPF/CNPJ e IDs em `securityUtils.js`.
- Utilitario alerta explicitamente para nao confiar em `user_metadata` como fonte final de permissao.
- Rotas admin importantes, como `api/admin/stats`, `api/admin/me` e `api/admin/advogados`, validam ADMIN por consulta na tabela `admins`.
- Webhooks usam `service_role` de forma coerente com operacoes server-side, embora isso exija controles fortes.

### Riscos altos

1. **Segredo padrao em cron de verificacao de planos**

   Arquivo: `src/app/api/cron/verificar-planos/route.js`

   A rota usa `process.env.CRON_SECRET || "socialjuridico_cron_secret_2026"`. Em producao, fallback de segredo fixo deve ser removido. Caso a variavel nao esteja configurada, a protecao passa a depender de um valor previsivel.

2. **Fluxo de login com senha padrao para migracao**

   Arquivo: `src/app/api/auth/login/route.js`

   Existe fallback para usuarios antigos usando a senha `socialjuridico1!`. Embora o codigo marque necessidade de troca de senha, esse fluxo amplia a superficie de ataque. Deve ser removido apos migracao ou substituido por processo de reset seguro com token de uso unico.

3. **Rotas temporarias/diagnosticas expostas no codigo**

   Exemplos observados:

   - `src/app/api/admin/debug-buckets/route.js`
   - `src/app/api/admin/debug-michele/route.js`
   - `src/app/api/investigate-gabrielly/route.js`
   - `src/app/api/investigate-juris/route.js`
   - `src/app/api/fix-gabrielly/route.js`
   - `src/app/api/test-email-caso/route.js`
   - `src/app/api/crm/assinatura/init-db/route.js`

   Essas rotas devem ser auditadas individualmente e removidas, protegidas por admin + segredo, ou bloqueadas por ambiente.

4. **Possivel exposicao historica de credenciais no mobile**

   O arquivo `mobile/README_SECRETS.md` informa que `google-services.json` e `eas.json` foram removidos do indice Git, mas ainda podem existir no historico. Tambem foram vistos arquivos locais sensiveis no diretorio mobile, como `google-services.json` e `tmp_client.json`.

   Recomendacao: revogar credenciais, confirmar `.gitignore`, verificar historico e considerar limpeza com `git filter-repo` ou BFG.

### Riscos medios

1. **CSP ainda permissiva**

   Arquivo: `next.config.mjs`

   A politica permite `script-src 'unsafe-inline' 'unsafe-eval' https: blob:`. Isso reduz a efetividade contra XSS. Pode ser necessario para algumas bibliotecas, mas deve ser revisado por rota/necessidade.

2. **Rate limiting em memoria**

   Arquivo: `src/lib/rateLimitMiddleware.js`

   O proprio comentario informa que a implementacao e para desenvolvimento. Em producao, o ideal e Redis, Upstash, Vercel KV, Supabase-based throttling ou provedor dedicado.

3. **Uso amplo de `console.log`**

   Foram encontrados muitos logs em APIs, checkout, webhooks, radar, notificacoes e telas. Logs podem vazar IDs, emails, payloads, metadados de pagamento e dados juridicos sensiveis.

4. **Fallback de Stripe para chave placeholder**

   Arquivo: `src/lib/stripe.js`

   `STRIPE_SECRET_KEY || 'sk_test_placeholder'` evita quebra de build, mas pode mascarar configuracao incorreta. Em ambiente de producao, a ausencia da chave deve falhar cedo.

5. **Autenticacao fragmentada**

   Ha autenticacao por Supabase cookies, Bearer token, `x-access-token`, token por query string e cookies customizados. Isso aumenta custo de auditoria e chance de inconsistencias.

## 6. LGPD e privacidade

O projeto lida com dados pessoais e potencialmente sensiveis: dados de clientes, advogados, OAB, contatos, mensagens, casos juridicos, documentos, assinaturas, geolocalizacao, pagamentos e logs de acesso.

### Pontos positivos

- Ha pagina/rota de exclusao de dados.
- Existem utilitarios para mascarar dados pessoais.
- Ha documentos de seguranca e LGPD ja presentes no repositorio.
- O projeto demonstra preocupacao com controle de acesso por perfil.

### Lacunas observadas

- Nao foi possivel confirmar uma politica uniforme de minimizacao de logs.
- Rotas de IA processam textos e documentos, mas e necessario comprovar sanitizacao/consentimento/retenção por fluxo.
- Integracoes com terceiros incluem OpenAI, Google, Stripe, Resend, OneSignal, Supabase, InfinitePay e Greenn. E necessario manter inventario de operadores/suboperadores e base legal.
- Geolocalizacao aparece em recursos de notificacao/blindagem; isso exige consentimento explicito e finalidade clara.

## 7. Banco de dados e Supabase

O projeto contem migrations para:

- Financeiro e assinaturas.
- Politicas RLS.
- Midia.
- Funil de email.
- Radar de oportunidades e campos relacionados.

Ha tambem um arquivo `Tabelas supabase.txt` com snapshot de schema, indicando muitas tabelas de negocio.

### Avaliacao

O uso de migrations e positivo, mas o snapshot textual e arquivos manuais nao substituem um processo formal de migracao e auditoria. Para producao, recomenda-se:

- Garantir que todas as alteracoes de banco estejam em migrations versionadas.
- Auditar RLS em todas as tabelas com dados pessoais ou juridicos.
- Evitar rotas que contornem RLS com `service_role` quando a regra puder ser implementada com politicas adequadas.
- Criar testes automatizados de permissao para perfis CLIENT, LAWYER, ADMIN, ESCRITORIO e ANUNCIANTE.

## 8. Qualidade de codigo e manutencao

### Pontos positivos

- Estrutura modular razoavel.
- Testes unitarios existem em pelo menos alguns modulos, como `securityUtils.test.js`, `financialStats.test.js` e `assinatura.test.js`.
- ESLint e Jest estao configurados.
- Ha arquivos dedicados para integracoes e utilitarios.

### Pontos de melhoria

- O `npm` local nao esta funcional neste ambiente, impedindo validacao por `npm test` e `npm run lint`.
- O projeto declara `packageManager` como Yarn 4, mas existe `package-lock.json` de npm. Isso pode causar divergencia de instalacao.
- `README.md` tem codificacao corrompida e menciona tecnologias possivelmente desatualizadas.
- Ha muitos logs de debug e arquivos temporarios.
- O arquivo `$file` e `schema_snapshot.ts` vazio indicam residuos de desenvolvimento.
- A cobertura de testes parece baixa para a quantidade de APIs criticas.

## 9. Dependencias e integracoes

Dependencias principais identificadas:

- Next.js 16.1.6
- React 19.2.3
- Supabase JS 2.99.1 e Supabase SSR 0.9.0
- Stripe 20.4.1
- OpenAI 6.29.0
- Resend 6.9.3
- Google APIs 171.4.0
- PDF/Documentos: `pdf-lib`, `pdf-parse`, `pdfjs-dist`, `jspdf`, `unpdf`
- Jitsi React SDK
- OneSignal/Expo via SDKs e chamadas HTTP

### Observacoes

- O README cita GPT-4o/Gemini e TailwindCSS, mas as dependencias analisadas nao mostram SDK Gemini nem Tailwind. O texto deve ser corrigido para refletir a implementacao real.
- Next.js, React e algumas dependencias estao em versoes muito recentes; isso e bom para recursos, mas exige CI rigoroso para evitar regressao por mudancas de ecossistema.

## 10. Operacao, deploy e observabilidade

### Pontos positivos

- Scripts padrao de `dev`, `build`, `start`, `lint` e `test`.
- Headers de seguranca no Next config.
- Rotas cron para processos recorrentes.
- Webhooks de pagamento implementados.

### Pontos criticos

- Ausencia de evidencia de CI/CD no repositorio principal; `.github` contem apenas arquivo de agente.
- Sem evidencia de monitoramento estruturado, alertas, Sentry/Datadog/OpenTelemetry ou trilha formal de auditoria.
- Logs usam `console.log`/`console.error` diretamente, sem padrao de severidade, mascaramento centralizado ou correlacao.
- Rate limit nao e adequado para producao distribuida.

## 11. Classificacao de maturidade

| Area | Nota tecnica | Situacao |
| --- | ---: | --- |
| Arquitetura funcional | 8/10 | Plataforma ampla e bem organizada por dominios |
| Seguranca aplicacional | 6/10 | Boa base, mas com riscos relevantes em rotas temporarias, segredos e logs |
| LGPD/privacidade | 6/10 | Ha preocupacao, mas faltam evidencias de governanca completa |
| Qualidade/testes | 5/10 | Testes existem, mas validacao nao executou e cobertura parece insuficiente |
| Operacao/DevOps | 5/10 | Scripts existem, mas faltam CI, observabilidade e rate limit distribuido |
| Documentacao | 5/10 | Ha documentos, mas README esta corrompido/desatualizado |
| Mobile | 5/10 | Stack presente, mas com alerta forte sobre arquivos sensiveis |

**Maturidade geral estimada:** 6/10.

## 12. Plano de acao recomendado

### Prioridade critica

1. Remover fallback de segredo fixo em `src/app/api/cron/verificar-planos/route.js`.
2. Remover ou bloquear rotas `debug`, `fix`, `investigate`, `test` e `init-db`.
3. Desativar o login por senha padrao apos migracao ou migrar para fluxo seguro de reset.
4. Revogar credenciais possivelmente expostas no mobile e revisar historico Git.
5. Corrigir o ambiente de Node/npm/Yarn para permitir build, lint e testes.

### Prioridade alta

1. Implantar rate limiting distribuido.
2. Substituir logs sensiveis por logger estruturado com mascaramento.
3. Auditar todas as rotas com `SUPABASE_SERVICE_ROLE_KEY`.
4. Criar testes de autorizacao por perfil em rotas admin, CRM, casos, mensagens, financeiro e documentos.
5. Validar webhooks de todos os provedores de pagamento com assinatura/segredo.

### Prioridade media

1. Revisar CSP e reduzir `unsafe-inline`/`unsafe-eval` quando possivel.
2. Atualizar README e documentacao de setup.
3. Padronizar gerenciador de pacotes: escolher Yarn ou npm e remover lockfile conflitante.
4. Criar `.env.example` sem valores reais.
5. Formalizar inventario LGPD de dados, terceiros, bases legais e retencao.

### Prioridade baixa

1. Remover arquivos residuais como `$file` e `schema_snapshot.ts` vazio se nao forem necessarios.
2. Padronizar comentarios com codificacao UTF-8.
3. Consolidar laudos antigos ou mover para pasta `docs/`.
4. Documentar arquitetura em diagrama simples.

## 13. Checklist de aceite para producao

Antes de considerar a aplicacao pronta para ambiente critico, recomenda-se validar:

- `npm/yarn install` reproduzivel em ambiente limpo.
- `build` executado com sucesso.
- `lint` sem erros bloqueantes.
- Testes automatizados executando em CI.
- Nenhum segredo real versionado.
- Nenhum segredo padrao em rotas publicas.
- Rotas temporarias removidas ou bloqueadas.
- RLS auditado em tabelas sensiveis.
- Logs sem payloads sensiveis.
- Webhooks com assinatura validada.
- Rate limiting distribuido ativo.
- Politica de backup e recuperacao do Supabase documentada.
- Politica LGPD de retencao/exclusao testada.

## 14. Conclusao

O SocialJuridico e um produto robusto em escopo e com uma base tecnica promissora. A aplicacao ja possui modulos relevantes para operacao juridica, monetizacao, IA, notificacoes e administracao. A maior fragilidade nao esta na falta de funcionalidades, mas na necessidade de consolidar seguranca, operacao e governanca.

Com a remocao de rotas temporarias, eliminacao de segredos padrao, saneamento de credenciais mobile, padronizacao do pipeline e reforco de testes de autorizacao, o projeto pode evoluir para um nivel significativamente mais seguro e sustentavel.
