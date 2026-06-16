# Statement of Applicability - Initial Draft

**Versao:** 2026-06-16  
**Norma-alvo:** ISO/IEC 27001:2022  
**Observacao:** este e um rascunho interno de aplicabilidade. A SoA final deve ser validada por consultor/auditor antes de certificacao.

## 1. Criterio de decisao

Um controle e marcado como aplicavel quando reduz risco relevante ao escopo do SGSI, atende necessidade legal/contratual, apoia continuidade do SaaS ou melhora a protecao de dados pessoais/juridicos.

## 2. Resumo por dominio

| Dominio | Aplicabilidade | Justificativa |
|---|---|---|
| A.5 Controles organizacionais | Aplicavel | Necessario para governanca, politicas, ativos, fornecedores e incidentes. |
| A.6 Controles de pessoas | Aplicavel parcial | Equipe enxuta, mas precisa de responsabilidades, conscientizacao e offboarding. |
| A.7 Controles fisicos | Aplicavel parcial | Infra principal em nuvem/terceiros; ainda requer controle de dispositivos e locais administrativos. |
| A.8 Controles tecnologicos | Aplicavel | Essencial para SaaS, APIs, autenticao, logs, backups, vulnerabilidades e desenvolvimento seguro. |

## 3. Controles iniciais aplicaveis

| Controle interno | Dominio ISO 27001:2022 | Aplicavel | Implementacao/evidencia |
|---|---|---|---|
| Politica de seguranca da informacao | Organizacional | Sim | `INFORMATION_SECURITY_POLICY.md` |
| Escopo do SGSI | Organizacional | Sim | `ISMS_SCOPE.md` |
| Avaliacao e tratamento de riscos | Organizacional | Sim | `RISK_ASSESSMENT_METHOD.md`, `RISK_REGISTER.md` |
| Inventario de ativos e fornecedores | Organizacional | Sim | `VENDOR_AND_ASSET_REGISTER.md` |
| Resposta a incidentes | Organizacional | Sim | `INCIDENT_RESPONSE.md` |
| Gestao de mudancas | Organizacional/Tecnologico | Sim | `CHANGE_MANAGEMENT.md` |
| Controle de acesso | Tecnologico/Pessoas | Sim | `ACCESS_CONTROL_POLICY.md`, `middleware.js` |
| Desenvolvimento seguro | Tecnologico | Sim | APIs com validacao, OpenAPI, minimizacao de payload |
| Backup e recuperacao | Tecnologico/Disponibilidade | Sim | `BACKUP_AND_RECOVERY_POLICY.md` |
| Seguranca de fornecedores | Organizacional | Sim | `SUPPLIER_SECURITY_POLICY.md` |
| Auditoria interna | Organizacional | Sim | `INTERNAL_AUDIT_PLAN.md` |
| Monitoramento e evidencias | Organizacional/Tecnologico | Sim | `EVIDENCE_REGISTER.md` |
| Seguranca fisica de datacenter proprio | Fisico | Nao no escopo atual | Infra principal hospedada em provedores terceiros |
| Criptografia ponta a ponta para todos os dados | Tecnologico | Nao declarado | Nao deve ser afirmado sem arquitetura especifica |

## 4. Pendencias para SoA final

- Mapear todos os controles da norma com numeracao final licenciada, sem reproduzir conteudo protegido.
- Confirmar controles fisicos aplicaveis ao ambiente administrativo.
- Validar fornecedores e contratos.
- Associar cada risco do `RISK_REGISTER.md` a controles selecionados.
- Registrar aceitacao formal de riscos residuais.

