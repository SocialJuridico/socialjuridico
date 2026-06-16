# Evidências de Privacidade desde a Concepção (Privacy by Design)

**Norma:** ISO/IEC 27701:2025 — A.7.4.1, A.8.4.1 | LGPD Art. 46, §2  
**Documento:** SJ-PIMS-PBD-001 | **Versão:** 1.0 — 2026-06-16

---

## Princípios implementados

A SocialJurídico adota os 7 princípios de Privacy by Design de Ann Cavoukian como guia de implementação técnica.

---

## 1. Proativo, não reativo — Preventivo, não corretivo

| Controle | Implementação | Evidência |
|---|---|---|
| Avaliação de risco antes do lançamento | DPIA obrigatório para módulos de IA e novos tratamentos de maior risco | `DPIA_AI_MODULE.md`, `DPIA_LGPD_DELETION.md` |
| Revisão de privacidade em PRs | Checklist de privacidade para funcionalidades com dados pessoais | Processo de revisão de código |

---

## 2. Privacidade como padrão (Privacy as Default)

| Controle | Implementação | Evidência |
|---|---|---|
| Minimização de dados na API pública | DTOs de advogados expõem apenas campos públicos; sem e-mail bruto | Código da API (`/api/advogados`) |
| RLS (Row Level Security) ativa por padrão | Todas as tabelas com dados pessoais têm políticas RLS no Supabase | Migrations do banco de dados |
| Cookies com atributos seguros | `HttpOnly`, `SameSite=Strict`, `Secure` em produção | Código de sessão de escritório |
| Sem rastreamento desnecessário | Cartão digital registra apenas hash de IP, user-agent e domínio de referência — sem cookies de rastreamento | Tabela de eventos do cartão |

---

## 3. Privacidade incorporada ao design

| Controle | Implementação | Evidência |
|---|---|---|
| Trilha de auditoria imutável | `security_audit_events` com triggers BEFORE que bloqueiam UPDATE, DELETE e TRUNCATE | `SECURITY_AUDIT_MIGRATION_EVIDENCE.md` |
| Hashing de PII na trilha de auditoria | E-mails e IPs armazenados apenas como SHA-256 | Campo `actor_email_hash`, `request_ip_hash` |
| Sessão multi-tenant com assinatura HMAC | Cookie de escritório assinado com HMAC — sem dados pessoais no payload | Código `sj_escritorio_session` |
| Anonimização antes do envio à IA | Dados enviados à OpenAI API passam por sanitização/anonimização prévia | Módulo de IA (código) |

---

## 4. Funcionalidade completa — Soma positiva, não soma zero

| Controle | Implementação |
|---|---|
| Autenticação segura sem sacrificar UX | Supabase Auth com OTP/magic link — sem armazenar senhas localmente |
| Notificações extrajudiciais com evidência legal | Rastreamento de acesso com fins legais sem expor dados desnecessários |

---

## 5. Segurança fim a fim — Proteção durante todo o ciclo de vida

| Controle | Implementação | Evidência |
|---|---|---|
| Criptografia em repouso | Supabase com criptografia AES-256 em repouso | Certificações Supabase (SOC 2, ISO 27001) |
| Criptografia em trânsito | TLS 1.2+ obrigatório em todas as conexões | Configuração Cloudflare + Supabase |
| Expiração automática de registros | Campo `retention_until` em `security_audit_events` | Schema da tabela |
| Purga controlada com auditoria | Fluxo LGPD gera evento `LGPD_PURGE_COMPLETED` | `DATA_SUBJECT_REQUEST_TEST_LOG.md` |

---

## 6. Visibilidade e transparência

| Controle | Implementação |
|---|---|
| Aviso de privacidade no cartão digital público | Footer com finalidade e dados coletados |
| Aviso em notificações extrajudiciais | Página de acesso exibe finalidade e dados registrados |
| Aviso antes de videochamada Jitsi | Exibir mensagem sobre transferência internacional antes de iniciar chamada |
| Política de privacidade publicada | Disponível em socialjuridico.com.br/privacidade |

---

## 7. Respeito pela privacidade do usuário — Centrado no usuário

| Controle | Implementação |
|---|---|
| Fluxo de exclusão LGPD | Titular pode solicitar exclusão diretamente pela plataforma |
| Portabilidade de dados | A implementar (Q3 2026) |
| Consentimento granular | A implementar para módulo de IA (Q3 2026) |

---

## Checklist para novos módulos

Para cada nova funcionalidade que trate dados pessoais, verificar antes do lançamento:

- [ ] DPIA necessário? (alto risco → sim)
- [ ] Minimização de dados aplicada?
- [ ] RLS configurada nas tabelas?
- [ ] Dados sensíveis hashados ou criptografados?
- [ ] Aviso de privacidade contextual incluído?
- [ ] Prazo de retenção definido?
- [ ] Fluxo de exclusão coberto?
- [ ] Transferência internacional documentada?
