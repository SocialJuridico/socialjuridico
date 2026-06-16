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
| 2026-06-16 | SOC 2 | Pacote de evidencias Security Q2 | `docs/compliance/soc2/SOC2_SECURITY_EVIDENCE_PACKAGE_2026_Q2.md` | Consolida evidencias de logs, acessos, mudancas, incidente simulado e backup. |
| 2026-06-16 | SOC 2 | Evidencia de retencao de logs | `docs/compliance/soc2/LOG_RETENTION_EVIDENCE_2026_Q2.md` | Define prints/exports externos de Supabase, Cloudflare/VPS e logs por 90 dias. |
| 2026-06-16 | SOC 2 | Teste de falha de login | `docs/compliance/soc2/LOGIN_FAILURE_TEST_2026_Q2.md` | Procedimento e query para capturar evento anonimizado em `security_audit_events`. |
| 2026-06-16 | SOC 2 | Historico de releases e aprovacoes | `docs/compliance/soc2/CHANGE_APPROVAL_REGISTER_2026_Q2.md` | Registra mudancas de seguranca, banco e privacidade aprovadas em Q2. |
| 2026-06-16 | SOC 2 | Incidente simulado | `docs/compliance/soc2/INCIDENT_SIMULATION_2026_Q2.md` | Tabletop de falhas de login repetidas, classificacao e plano de resposta. |
| 2026-06-16 | SOC 2 | Revisao trimestral de administradores | `docs/compliance/soc2/ADMIN_ACCESS_REVIEW_2026_Q2.md` | Registra revisao Q2 com dois administradores identificados. |
| 2026-06-16 | SOC 2 | Remocao de acesso inativo | `docs/compliance/soc2/INACTIVE_ACCESS_REMOVAL_EVIDENCE_2026_Q2.md` | Registra baseline sem admin inativo e template para remocoes futuras. |
| 2026-06-16 | SOC 2 | Backup e restauracao | `docs/compliance/soc2/BACKUP_RESTORE_EVIDENCE_2026_Q2.md` | Documenta escopo, procedimento e evidencias externas necessarias. |
| 2026-06-16 | Incident Response | Processo de incidente | `docs/compliance/INCIDENT_RESPONSE.md` | Registro e severidade. |
| 2026-06-16 | Change Management | Politica de mudancas | `docs/compliance/CHANGE_MANAGEMENT.md` | Checklist de release. |
| 2026-06-16 | Vendors | Inventario inicial | `docs/compliance/VENDOR_AND_ASSET_REGISTER.md` | Fornecedores e ativos criticos. |
| 2026-06-16 | ISO 27001 | Kit inicial SGSI/readiness | `docs/compliance/iso27001/README.md` | Escopo, politica, riscos, SoA, acesso, backup, fornecedores e auditoria interna. |
| 2026-06-16 | ISO 27001 | Procedimento operacional do SGSI | `docs/compliance/iso27001/ISMS_OPERATING_PROCEDURE.md` | Rotinas mensal, trimestral, semestral e anual. |
| 2026-06-16 | ISO 27001 | Kit de auditoria interna | `docs/compliance/iso27001/INTERNAL_AUDIT_CHECKLIST_Q1.md` | Checklist, template de relatorio e registro de acoes corretivas. |
| 2026-06-16 | ISO 27001 | Registro de aprovacao documental | `docs/compliance/iso27001/DOCUMENT_APPROVAL_REGISTER.md` | Documentos do SGSI aprovados para operacao interna por Carlos Henrique. |
| 2026-06-16 | ISO 27001 | Evidencia da migration de auditoria | `docs/compliance/iso27001/SECURITY_AUDIT_MIGRATION_EVIDENCE.md` | Migration aplicada no Supabase com print de sucesso salvo em `docs/compliance/iso27001/evidence/`. |
| 2026-06-16 | ISO 27001 | Relatorio de auditoria interna Q2 | `docs/compliance/iso27001/INTERNAL_AUDIT_REPORT_2026_Q2.md` | Auditoria interna executada por Saulo Pavanello e aprovada com plano de acao. |
| 2026-06-16 | ISO 27001 | Ata de analise critica Q2 | `docs/compliance/iso27001/MANAGEMENT_REVIEW_MINUTES_2026_Q2.md` | Analise critica da direcao registrada e aprovada com plano de acao. |
| 2026-06-16 | SOC 2 / ISO 27001 | Politica de retencao de logs | `docs/compliance/AUDIT_LOG_RETENTION_POLICY.md` | Define Auth, PostgREST, VPS e eventos de aplicacao por no minimo 90 dias. |
| 2026-06-16 | Audit trail | Tabela append-only de eventos de seguranca | `docs/compliance/sql/20260616_soc2_security_audit_events.sql` | Bloqueia update/delete/truncate e usa hashes para e-mail/IP. |
| 2026-06-16 | Audit trail | Instrumentacao de login e eventos sensiveis | `src/lib/audit/securityAuditLog.js` | Registra falhas de login, login enterprise, equipe, remocao administrativa e purga LGPD. |
| 2026-06-16 | ISO 27701 | Kit inicial PIMS/readiness | `docs/compliance/iso27701/README.md` | Escopo PIMS, inventario PII, papeis, direitos dos titulares, incidente de privacidade e SoA PIMS. |
| 2026-06-16 | ISO 27701 | Aviso contextual de privacidade no Link na Bio | `src/app/cartao/[slug]/PublicDigitalCard.jsx` | Informa finalidade do registro tecnico e reforca Privacy by Design. |
| 2026-06-16 | ISO 27701 | Aviso contextual em notificacao extrajudicial | `src/app/notificacao/[token]/page.js` | Explica IP, User-Agent, horario e finalidade de citacao juridica/cadeia de custodia. |

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
- Evidencia de revisao do inventario de dados pessoais e contratos com operadores/processadores.

## Cadencia recomendada

- Mensal: varredura de seguranca e revisao de achados.
- A cada deploy relevante: checklist de mudanca.
- Trimestral: revisao de acessos administrativos.
- Semestral: teste de recuperacao/backup.
- Anual: pentest ou auditoria independente.
