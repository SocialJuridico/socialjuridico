# Vendor and Asset Register

**Versao:** 2026-06-16

## Fornecedores criticos

| Fornecedor | Uso | Tipo de dado/processo | Risco | Controle esperado |
|---|---|---|---|---|
| Cloudflare | DNS, CDN, TLS, borda | Trafego publico e configuracao SSL | Alto | MFA, minimo TLS, revisao de regras |
| Supabase | Banco, Auth, Storage | Dados de usuarios, casos, documentos | Alto | RLS, backup, controle de service role |
| Stripe | Pagamentos | Transacoes e assinaturas | Alto | Webhook secret, idempotencia, logs minimos |
| Resend | E-mail transacional | E-mails de contato e notificacoes | Medio | Dominios verificados, logs minimos |
| OpenAI | Recursos de IA | Textos enviados a ferramentas de IA | Alto | Minimizacao, consentimento, limites de dados |
| OneSignal | Push notifications | Identificadores de notificacao | Medio | Consentimento, escopo minimo |
| Jitsi | Videochamadas | Comunicacao em tempo real | Medio | Sem gravacao padrao, aviso ao usuario |
| InfinitePay/Greenn | Pagamentos | Transacoes comerciais | Medio | Webhooks protegidos, reconciliacao |

## Ativos internos

| Ativo | Local | Criticidade | Observacao |
|---|---|---|---|
| Aplicacao Next.js | Repositorio principal | Alta | Rotas publicas, privadas e APIs. |
| Middleware de autenticacao | `middleware.js` | Alta | Controle de acesso a rotas privadas. |
| Headers de seguranca | `next.config.mjs` | Alta | HSTS, CSP, X-Frame-Options e outros. |
| OpenAPI publico | `public/openapi.json` | Media | Especificacao inicial para scanners. |
| APIs admin | `src/app/api/admin` | Alta | Exigem autenticacao e autorizacao. |
| APIs advogado | `src/app/api/advogado` | Alta | Recursos profissionais e IA. |
| Politicas publicas | `src/app/privacidade`, `src/app/termos`, `src/app/seguranca` | Media | Evidencia de governanca externa. |

## Revisao recomendada

- Revisar este inventario a cada novo fornecedor.
- Registrar proprietario de cada credencial.
- Evitar segredos em repositorio.
- Revogar credenciais nao usadas.
- Documentar suboperadores relevantes para LGPD.

