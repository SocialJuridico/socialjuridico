# Auditoria Interna do PIMS — Q2 2026

**Norma:** ISO/IEC 27701:2025 — Seção 9.2 | LGPD Art. 50, §2  
**Documento:** SJ-PIMS-AUDIT-2026-Q2 | **Versão:** 1.0 — 2026-06-16  
**Auditor:** Saulo Pavanello (Software Engineer)

---

> **Nota:** Esta é uma auditoria interna (primeira parte). A certificação ISO/IEC 27701:2025
> requer auditoria por organismo acreditado (terceira parte).

---

## Escopo da auditoria

Todos os controles do PIMS conforme documentação em `docs/compliance/iso27701/`.

## Critérios de auditoria

ISO/IEC 27701:2025 — Seção 6 (Planejamento), 7 (Suporte), 8 (Operação), 9 (Avaliação), 10 (Melhoria)

---

## Resultados por área

| Área | Controle | Status | Observação |
|---|---|---|---|
| Escopo e política | Escopo documentado | ✅ Conforme | `PIMS_SCOPE.md` v2.0 |
| Inventário de dados | ROPA com 12 campos | ✅ Conforme | `PII_INVENTORY.md` v2.0 |
| Contratos de fornecedores | DPAs para 8 fornecedores | ✅ Parcial | 8/8 inventariados e avaliados; 6/8 com documentação suficiente; 2/8 aguardando formalização complementar. |
| Contratos de fornecedores | InfinitePay — DPA formal | ⚠️ Oportunidade de melhoria | Solicitar DPA assinado formalmente (ver OM-01) |
| Contratos de fornecedores | VPS — Napoleon registrado | ⚠️ Oportunidade de melhoria | Formalizar assinatura complementar de DPA (ver OM-02) |
| Papéis e responsabilidades | Controlador/operador definido | ✅ Conforme | `PRIVACY_ROLES_AND_RESPONSIBILITIES.md` |
| Direitos dos titulares | Procedimento documentado | ✅ Conforme | `DATA_SUBJECT_RIGHTS_PROCEDURE.md` |
| Direitos dos titulares | Teste controlado realizado | ✅ Conforme | `DATA_SUBJECT_REQUEST_TEST_LOG.md` |
| Direitos dos titulares | LGPD_PURGE_COMPLETED | ✅ Conforme | Executado com sucesso em produção (ID: 1adcecf7-...) |
| Retenção e descarte | Política documentada | ✅ Conforme | `PRIVACY_RETENTION_POLICY.md` |
| Privacy by design | Evidências técnicas | ✅ Conforme | `PRIVACY_BY_DESIGN_EVIDENCE.md` |
| DPIA — módulo de IA | Avaliação documentada | ✅ Conforme | `DPIA_AI_MODULE.md` |
| DPIA — exclusão LGPD | Avaliação documentada | ✅ Conforme | `DPIA_LGPD_DELETION.md` |
| Trilha de auditoria | `security_audit_events` ativa | ✅ Conforme | `SECURITY_AUDIT_MIGRATION_EVIDENCE.md` |
| Incidentes | Procedimento documentado | ✅ Conforme | `PRIVACY_INCIDENT_PROCEDURE.md` |
| Incidentes | Log operacional ativo | ✅ Conforme | `PRIVACY_INCIDENT_LOG.md` |
| Treinamento | Registro documentado | ✅ Conforme | `PRIVACY_TRAINING_LOG.md` |
| Avisos de privacidade | Histórico de revisões | ✅ Conforme | `PRIVACY_NOTICES_REVIEW_LOG.md` |
| Jitsi / vídeo | Aviso de transferência internacional | ⚠️ Oportunidade de melhoria | Implementar aviso antes de iniciar chamada (ver OM-03) |
| Portabilidade de dados | Direito não implementado | ⚠️ Oportunidade de melhoria | Previsto para Q3 2026 (ver OM-04) |
| Consentimento granular para IA | Não implementado | ⚠️ Oportunidade de melhoria | Previsto para Q3 2026 (ver OM-05) |

---

## Resumo de não conformidades e oportunidades de melhoria

| # | Tipo | Descrição | Prazo | Responsável |
|---|---|---|---|---|
| **OM-01** | Oportunidade de melhoria | InfinitePay: formalizar DPA assinado | 2026-09-16 | Carlos Henrique |
| **OM-02** | Oportunidade de melhoria | VPS (Napoleon): formalizar assinatura do DPA | 2026-07-16 | Carlos Henrique |
| **OM-03** | Oportunidade de melhoria | Jitsi: implementar aviso de transferência internacional antes da chamada | 2026-09-16 | Engenharia |
| **OM-04** | Oportunidade de melhoria | Portabilidade de dados (Art. 18, V LGPD) | 2026-09-16 | Engenharia |
| **OM-05** | Oportunidade de melhoria | Consentimento granular para módulo de IA | 2026-09-16 | Engenharia |

---

## Planejamento de Independência para Auditorias do PIMS
A fim de manter a objetividade das avaliações do PIMS de primeira parte:
- **Alta Direção / DPO**: Carlos Henrique gerencia o PIMS e a governança de privacidade.
- **Auditoria Interna**: Saulo Pavanello (Software Engineer) atua como auditor, assegurando avaliação técnica imparcial dos processos de desenvolvimento, anonimização e exclusão lógica de dados.

---

## Conclusão

**Resultado da auditoria interna:** APROVADO com oportunidades de melhoria

Não foram identificadas **não conformidades maiores** que impeçam a operação do PIMS.
Todas as áreas críticas estão documentadas e com controles técnicos operacionais.

**Próxima auditoria interna:** 2026-12-16 (Q4)

---

## Aprovação e assinaturas

| Papel | Nome | Decisão | Data | Assinatura |
|---|---|---|---|---|
| Auditor Interno | Saulo Pavanello | Aprovado com plano | 2026-06-16 | [Assinado digitalmente por Saulo Pavanello] |
| Alta Direção / DPO | Carlos Henrique | Aceito com plano | 2026-06-16 | [Assinado digitalmente por Carlos Henrique] |

