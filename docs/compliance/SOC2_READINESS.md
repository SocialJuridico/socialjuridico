# Social Juridico SOC 2 Readiness

**Status:** preparacao interna  
**Versao:** 2026-06-16  
**Escopo recomendado inicial:** SOC 2 Type I, Trust Services Criteria - Security  
**Escopo recomendado evolutivo:** SOC 2 Type II, Security + Availability + Confidentiality

## 1. Objetivo

Este documento define a base inicial de prontidao SOC 2 do Social Juridico. Ele organiza controles, evidencias e lacunas para apoiar auditoria independente futura, due diligence de investidores e avaliacoes de clientes corporativos.

SOC 2 nao e uma certificacao automatica do software. O relatorio precisa ser emitido por auditor independente habilitado, com base em controles desenhados, documentados e operados pela organizacao.

## 2. Sistema em escopo

Sistema principal:

- Plataforma web Social Juridico em `https://socialjuridico.com.br`.
- Aplicacao Next.js com rotas publicas, privadas e APIs internas.
- Dashboards de cliente, advogado, escritorio, anunciante e administrador.
- Integracoes com Supabase, Stripe, Resend, OpenAI, OneSignal, Cloudflare e provedores de pagamento.
- Recursos de documentos, assinatura, notificacoes, CRM juridico, IA e comunicacao.

Fora do escopo inicial:

- Auditoria financeira formal.
- Certificacao ISO/IEC 27001.
- Pentest independente completo.
- Operacao de terceiros alem do modelo de responsabilidade compartilhada.

## 3. Trust Services Criteria

### 3.1 Security

Prioridade inicial. Abrange protecao contra acesso nao autorizado, segregacao de areas privadas, controle de autenticacao, hardening de borda, protecao de APIs, gestao de vulnerabilidades e registro de incidentes.

Controles ja existentes ou iniciados:

- HTTPS obrigatorio e TLS gerenciado na camada de borda.
- Headers de seguranca em `next.config.mjs`.
- Rotas privadas protegidas por `middleware.js`.
- Dashboards segregados por perfil.
- Rotas administrativas dedicadas.
- Politicas publicas de privacidade, termos, seguranca e exclusao de dados.
- OpenAPI publico inicial em `public/openapi.json`.
- API publica de advogados reduzida para campos de exibicao publica.

### 3.2 Availability

Recomendado para a fase Type II. Abrange disponibilidade, monitoramento, continuidade operacional, backup, recuperacao e resposta a falhas.

Controles a formalizar:

- RTO e RPO.
- Rotina de backup e restauracao Supabase.
- Monitoramento de uptime e erros.
- Procedimento de rollback de deploy.
- Registro de incidentes e indisponibilidades.

### 3.3 Confidentiality

Recomendado apos estabilizar Security. Abrange protecao de informacoes confidenciais, documentos juridicos, dados de clientes, mensagens e arquivos.

Controles a formalizar:

- Classificacao de dados.
- Retencao e descarte.
- Minimizacao de logs.
- Inventario de fornecedores.
- Regras para uso de IA com dados sensiveis.

### 3.4 Privacy

Relacionado a LGPD. Pode ser tratado como programa paralelo ou etapa posterior do SOC 2, dependendo da estrategia comercial.

Controles ja iniciados:

- Politica de Privacidade.
- Pagina de Exclusao de Dados.
- Termos de Uso.
- Informacoes sobre operadores e uso de IA.

## 4. Evidencias tecnicas iniciais

Evidencias disponiveis no repositorio:

- `SECURITY.md`
- `SECURITY_UI_IMPROVEMENTS.md`
- `laudo_lgpd_2026.md`
- `laudo_tecnico_2026-06-07.md`
- `laudo_tecnico_comercial_pos_refatoramento_2026-06-16.md`
- `Auditoria Noindex e Rotas Privadas.md`
- `Atualizacoes Camada Publica e SEO.md`
- `public/openapi.json`
- `next.config.mjs`
- `middleware.js`

Evidencias externas mencionadas:

- Security Headers by Snyk: nota A.
- Qualys SSL Labs: nota A+.
- Probely/Snyk API & Web: varredura inicial com achado TLS Low e endpoints publicos testados.

## 5. Gaps prioritarios

| Prioridade | Gap | Acao recomendada |
|---|---|---|
| Alta | Politicas internas ainda dispersas | Manter pasta `docs/compliance` como fonte de evidencia. |
| Alta | Registro formal de mudancas | Usar `CHANGE_MANAGEMENT.md` e vincular PRs/deploys. |
| Alta | Resposta a incidentes | Adotar `INCIDENT_RESPONSE.md` como processo operacional. |
| Alta | Inventario de fornecedores | Manter `VENDOR_AND_ASSET_REGISTER.md`. |
| Media | Logs e dados sensiveis | Revisar APIs e reduzir payloads/logs publicos. |
| Media | Matriz de acesso | Formalizar perfis e permissoes por sistema. |
| Media | Backup/DR | Documentar backup, restore, RTO e RPO. |
| Media | Evidencias recorrentes | Registrar scans, releases, incidentes e revisoes. |

## 6. Caminho recomendado

1. Consolidar documentos desta pasta.
2. Revisar rotas publicas e payloads para minimizacao.
3. Criar rotina mensal de evidencias.
4. Executar readiness assessment com auditor ou consultor.
5. Corrigir gaps de Security.
6. Rodar SOC 2 Type I.
7. Coletar 3 a 6 meses de evidencias.
8. Rodar SOC 2 Type II.

## 7. Declaracao para investidor

Texto sugerido:

> O Social Juridico iniciou um programa interno de prontidao SOC 2, com escopo inicial em Security. A plataforma ja possui controles tecnicos de borda, segregacao de areas privadas, documentacao publica de privacidade e seguranca, OpenAPI inicial para varreduras automatizadas e processo de hardening em andamento. A obtencao de relatorio SOC 2 depende de auditoria independente futura.

