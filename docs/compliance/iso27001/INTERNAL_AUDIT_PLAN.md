# Internal Audit Plan - ISO 27001 Readiness

**Versao:** 2026-06-16

## 1. Objetivo

Definir um plano inicial de auditoria interna para verificar se o SGSI do Social Juridico esta documentado, implementado e produzindo evidencias.

## 2. Frequencia

- Auditoria interna completa: anual.
- Revisao de controles criticos: trimestral.
- Revisao extraordinaria: apos incidente relevante ou mudanca estrutural.

## 3. Escopo da primeira auditoria interna

- Escopo do SGSI.
- Politica de seguranca.
- Registro de riscos.
- Matriz de aplicabilidade.
- Controle de acesso.
- Gestao de mudancas.
- Resposta a incidentes.
- Fornecedores.
- Backup e recuperacao.
- Evidencias de scanners e hardening.

## 4. Checklist inicial

| Area | Pergunta de auditoria | Evidencia esperada |
|---|---|---|
| Escopo | O escopo do SGSI esta definido? | `ISMS_SCOPE.md` |
| Politica | Existe politica aprovada? | `INFORMATION_SECURITY_POLICY.md` |
| Risco | Riscos foram avaliados? | `RISK_REGISTER.md` |
| Controles | Aplicabilidade foi definida? | `STATEMENT_OF_APPLICABILITY.md` |
| Acesso | Admins sao revisados? | Registro de revisao |
| Mudancas | Mudancas possuem evidencia? | `CHANGE_MANAGEMENT.md`, commits/deploys |
| Incidentes | Ha processo de resposta? | `INCIDENT_RESPONSE.md` |
| Fornecedores | Fornecedores criticos estao listados? | `VENDOR_AND_ASSET_REGISTER.md` |
| Backup | Restore foi testado? | Evidencia de teste |
| Scans | Achados sao registrados e tratados? | Probely, SSL Labs, Security Headers |

## 5. Saida da auditoria

O resultado deve gerar:

- lista de conformidades;
- nao conformidades;
- oportunidades de melhoria;
- acoes corretivas;
- responsavel;
- prazo;
- evidencia de fechamento.

