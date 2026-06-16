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

## Evidencias externas a anexar

- Print ou PDF do Security Headers by Snyk com nota A.
- Print ou PDF do Qualys SSL Labs com nota A+.
- Export do Probely/Snyk API & Web.
- Evidencia de Minimum TLS Version no Cloudflare.
- Evidencia de TLS 1.3 habilitado.

## Cadencia recomendada

- Mensal: varredura de seguranca e revisao de achados.
- A cada deploy relevante: checklist de mudanca.
- Trimestral: revisao de acessos administrativos.
- Semestral: teste de recuperacao/backup.
- Anual: pentest ou auditoria independente.

