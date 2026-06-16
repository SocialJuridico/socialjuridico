# Corrective Action Log — Registro de Acoes Corretivas Concluidas

**Controle ISO 27001:2022:** A.5.27 — Aprendizado com incidentes | A.5.36 — Conformidade  
**Frequencia:** Continuo — atualizado apos cada acao corretiva  
**Proprietario:** Carlos Henrique

---

## Historico de acoes corretivas

### AC-001 — Exposicao de campos sensiveis em API publica

| Campo | Valor |
|---|---|
| Origem | Auditoria interna / analise de codigo |
| Descricao do problema | Endpoint `/api/advogados` retornava campos nao destinados ao publico |
| Data de identificacao | 2026-Q1 |
| Risco relacionado | R-001 |
| Acao corretiva | Implementacao de DTO publico — apenas campos necessarios sao retornados |
| Responsavel | Engenharia |
| Data de conclusao | 2026-Q1 |
| Evidencia | Codigo em `src/app/api/advogados/route.js` |
| Status | Concluida |
| Verificacao | Confirmado que o endpoint nao expoe campos sensiveis |

---

### AC-002 — Migracao da trilha de auditoria de seguranca

| Campo | Valor |
|---|---|
| Origem | Auditoria interna Q2 — achado IA-002 |
| Descricao do problema | Ausencia de trilha de auditoria tecnica para eventos de seguranca |
| Data de identificacao | 2026-06-16 |
| Risco relacionado | R-003, R-004, R-010 |
| Acao corretiva | Criacao da tabela `security_audit_events` com triggers de imutabilidade |
| Responsavel | Carlos Henrique / Engenharia |
| Data de conclusao | 2026-06-16 |
| Evidencia | `SECURITY_AUDIT_MIGRATION_EVIDENCE.md`; `evidence/supabase-security-audit-migration-success-2026-06-16.png` |
| Status | Concluida (coleta de amostra anonimizada pendente) |
| Verificacao | Screenshot de sucesso da migracao anexado |

---

### AC-003 — Expansao do Risk Register e SoA

| Campo | Valor |
|---|---|
| Origem | Analise de lacunas ISO 27001:2022 |
| Descricao do problema | Risk Register com 6 campos (faltavam 4); SoA com 4 colunas (faltavam 3) |
| Data de identificacao | 2026-06-16 |
| Risco relacionado | Todos |
| Acao corretiva | Expansao do Risk Register para 10 campos + aceite formal; SoA para 7 colunas com 93 controles |
| Responsavel | Carlos Henrique |
| Data de conclusao | 2026-06-16 |
| Evidencia | `RISK_REGISTER.md` e `STATEMENT_OF_APPLICABILITY.md` revisados |
| Status | Concluida |
| Verificacao | Documentos revisados e aprovados por Carlos Henrique |

---

### AC-004 — Criacao de evidencias operacionais do SGSI

| Campo | Valor |
|---|---|
| Origem | Analise de lacunas ISO 27001:2022 |
| Descricao do problema | Ausencia de logs de evidencia provando que controles sao praticados |
| Data de identificacao | 2026-06-16 |
| Risco relacionado | Todos |
| Acao corretiva | Criacao de 11 documentos de evidencia operacional na pasta `evidence/` |
| Responsavel | Carlos Henrique |
| Data de conclusao | 2026-06-16 |
| Evidencia | Arquivos em `docs/compliance/iso27001/evidence/` |
| Status | Concluida |
| Verificacao | Arquivos verificados em repositorio |

---

## Acoes corretivas em aberto

| ID | Descricao | Prazo | Responsavel |
|---|---|---|---|
| AC-005 (pendente) | Coletar amostra anonimizada de `security_audit_events` apos eventos controlados | 2026-07-31 | Carlos Henrique |
| AC-006 (pendente) | Formalizar canal de relato de incidentes | 2026-08-31 | Carlos Henrique |
| AC-007 (pendente) | Executar e documentar primeiro teste de restauracao de backup | 2026-07-31 | Carlos Henrique |
| AC-008 (pendente) | Formalizar procedimento de notificacao ANPD | 2026-07-31 | Carlos Henrique |
