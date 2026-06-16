# SOC 2 Initial Controls Matrix

**Versao:** 2026-06-16  
**Escopo inicial:** Security

## Matriz de controles

| ID | Criterio | Controle | Evidencia atual | Status |
|---|---|---|---|---|
| SEC-01 | Security | Trafego publico usa HTTPS e TLS gerenciado na borda. | SSL Labs A+, Cloudflare SSL/TLS, dominio publico. | Implementado |
| SEC-02 | Security | Headers HTTP de seguranca sao aplicados globalmente. | `next.config.mjs`, Security Headers A. | Implementado |
| SEC-03 | Security | Rotas privadas exigem autenticacao. | `middleware.js`. | Implementado |
| SEC-04 | Security | Dashboards sao segregados por perfil. | Rotas `/dashboard/*`, APIs por dominio. | Implementado |
| SEC-05 | Security | Areas privadas nao devem ser indexadas. | `Auditoria Noindex e Rotas Privadas.md`. | Implementado |
| SEC-06 | Security | APIs publicas documentadas por OpenAPI inicial. | `public/openapi.json`. | Implementado inicial |
| SEC-07 | Security | API publica retorna somente dados necessarios. | `/api/advogados` com DTO publico. | Implementado inicial |
| SEC-08 | Security | Formularios publicos usam validacao e rate limit. | `/api/contato`. | Implementado inicial |
| SEC-09 | Security | Incidentes seguem processo definido. | `INCIDENT_RESPONSE.md`. | Documentado |
| SEC-10 | Security | Mudancas passam por registro e validacao. | `CHANGE_MANAGEMENT.md`. | Documentado |
| SEC-11 | Security | Fornecedores criticos sao inventariados. | `VENDOR_AND_ASSET_REGISTER.md`. | Documentado inicial |
| SEC-12 | Security | Evidencias de auditoria sao registradas. | `EVIDENCE_REGISTER.md`. | Documentado |
| AV-01 | Availability | Disponibilidade e recuperacao possuem RTO/RPO. | Pendente. | Planejado |
| AV-02 | Availability | Backups e restores sao testados periodicamente. | Pendente. | Planejado |
| CONF-01 | Confidentiality | Dados juridicos e documentos possuem politica de retencao. | Politica publica + pendente interno. | Parcial |
| CONF-02 | Confidentiality | Logs evitam dados sensiveis. | Revisao recomendada. | Planejado |

## Status aceitos

- Implementado: controle existe e possui evidencia verificavel.
- Implementado inicial: controle existe, mas precisa de rotina recorrente.
- Documentado: politica/processo criado, ainda sem historico operacional.
- Parcial: existe em parte, mas precisa refinamento.
- Planejado: controle ainda deve ser implementado.

