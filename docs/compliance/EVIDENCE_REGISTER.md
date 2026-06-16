# Compliance Evidence Register

**Versao:** 2026-06-16

Use este arquivo como indice de evidencias para SOC 2 readiness, due diligence e auditorias tecnicas.

## Evidencias iniciais

| Data | Area | Evidencia | Local | Observacao |
|---|---|---|---|---|
| 2026-06-16 | API Security | OpenAPI inicial publicado | `public/openapi.json` | Usado para Probely/Snyk API & Web. |
| 2026-06-16 | Data minimization | API publica de advogados reduzida | `src/app/api/advogados/route.js` | Remove metadados internos do payload publico. |
| 2026-06-16 | SOC 2 | Plano de readiness | `docs/compliance/SOC2_READINESS.md` | Escopo inicial Security. |
| 2026-06-16 | SOC 2 | Matriz de controles | `docs/compliance/CONTROLS_MATRIX.md` | Controles iniciais e gaps. |
| 2026-06-16 | Incident Response | Processo de incidente | `docs/compliance/INCIDENT_RESPONSE.md` | Registro e severidade. |
| 2026-06-16 | Change Management | Politica de mudancas | `docs/compliance/CHANGE_MANAGEMENT.md` | Checklist de release. |
| 2026-06-16 | Vendors | Inventario inicial | `docs/compliance/VENDOR_AND_ASSET_REGISTER.md` | Fornecedores e ativos criticos. |
| 2026-06-16 | ISO 27001 | Kit inicial SGSI/readiness | `docs/compliance/iso27001/README.md` | Escopo, politica, riscos, SoA, acesso, backup, fornecedores e auditoria interna. |
| 2026-06-16 | ISO 27001 | Procedimento operacional do SGSI | `docs/compliance/iso27001/ISMS_OPERATING_PROCEDURE.md` | Rotinas mensal, trimestral, semestral e anual. |
| 2026-06-16 | ISO 27001 | Kit de auditoria interna | `docs/compliance/iso27001/INTERNAL_AUDIT_CHECKLIST_Q1.md` | Checklist, template de relatorio e registro de acoes corretivas. |
| 2026-06-16 | SOC 2 / ISO 27001 | Politica de retencao de logs | `docs/compliance/AUDIT_LOG_RETENTION_POLICY.md` | Define Auth, PostgREST, VPS e eventos de aplicacao por no minimo 90 dias. |
| 2026-06-16 | Audit trail | Tabela append-only de eventos de seguranca | `docs/compliance/sql/20260616_soc2_security_audit_events.sql` | Bloqueia update/delete/truncate e usa hashes para e-mail/IP. |
| 2026-06-16 | Audit trail | Instrumentacao de login e eventos sensiveis | `src/lib/audit/securityAuditLog.js` | Registra falhas de login, login enterprise, equipe, remocao administrativa e purga LGPD. |

## Evidencias externas a anexar

- Print ou PDF do Security Headers by Snyk com nota A.
- Print ou PDF do Qualys SSL Labs com nota A+.
- Export do Probely/Snyk API & Web.
- Evidencia de Minimum TLS Version no Cloudflare.
- Evidencia de TLS 1.3 habilitado.
- Print/export do Supabase Auth Logs com janela de retencao configurada.
- Print/export do Supabase PostgREST/API Logs com janela de retencao configurada.
- Evidencia de retencao dos logs da VPS/hospedagem por no minimo 90 dias.
- Amostra anonimizada de `security_audit_events` contendo falha de login, criacao/alteracao de equipe e purga LGPD.

## Cadencia recomendada

- Mensal: varredura de seguranca e revisao de achados.
- A cada deploy relevante: checklist de mudanca.
- Trimestral: revisao de acessos administrativos.
- Semestral: teste de recuperacao/backup.
- Anual: pentest ou auditoria independente.
