# ISO/IEC 27701:2025 — PIMS SocialJurídico

## Propósito

Esta pasta contém o Sistema de Gestão de Privacidade da Informação (PIMS) da SocialJurídico,
implementado em conformidade com a norma **ISO/IEC 27701:2025**.

## Nota sobre a edição 2025

A ISO/IEC 27701:2025 substituiu a edição de 2019 e passou a ser uma **norma autônoma** de
sistema de gestão de privacidade. A certificação ISO/IEC 27701:2025 **não requer** que a
organização possua ou busque simultaneamente a certificação ISO/IEC 27001, embora a integração
entre os dois sistemas seja recomendada e foi adotada pela SocialJurídico.

> **Aviso:** Esta documentação representa prontidão e conformidade interna (auditoria de primeira
> parte). A certificação formal requer auditoria por organismo certificador acreditado (terceira parte).

## Escopo atual do PIMS

- Plataforma web e fluxos do marketplace (clientes e advogados)
- Dashboards de advogado, cliente, escritório e administrador
- Supabase Auth e tabelas de aplicação com dados pessoais
- Fluxo de exclusão e purga LGPD (`solicitacoes_exclusao`)
- Trilha de auditoria de segurança (`security_audit_events`)
- Cartões digitais públicos / Link na Bio e avisos de privacidade contextuais
- Links de acesso a notificações extrajudiciais para evidência de citação legal
- Fornecedores que processam dados pessoais em nome da SocialJurídico

## Conjunto de documentos

### Framework e escopo
- `PIMS_SCOPE.md` — escopo e objetivos de privacidade
- `PRIVACY_ROLES_AND_RESPONSIBILITIES.md` — papéis controlador/operador
- `PIMS_STATEMENT_OF_APPLICABILITY.md` — SoA completa ISO/IEC 27701:2025

### Inventário e contratos
- `PII_INVENTORY.md` — inventário de dados pessoais (12 campos)
- `VENDOR_PRIVACY_REGISTER.md` — registro de fornecedores e DPAs

### Políticas e design
- `PRIVACY_RETENTION_POLICY.md` — retenção e descarte por categoria
- `PRIVACY_BY_DESIGN_EVIDENCE.md` — evidências de privacy by design
- `CONSENT_MANAGEMENT.md` — gestão de consentimento

### Direitos dos titulares
- `DATA_SUBJECT_RIGHTS_PROCEDURE.md` — procedimento de atendimento
- `DATA_SUBJECT_REQUEST_TEST_LOG.md` — registro de testes controlados

### Avaliação de riscos e DPIAs
- `PRIVACY_RISK_ASSESSMENT.md` — avaliação de riscos de privacidade
- `DPIA_AI_MODULE.md` — RIPD módulo de IA (OpenAI)
- `DPIA_LGPD_DELETION.md` — RIPD fluxo de exclusão LGPD

### Governança e auditoria
- `PIMS_INTERNAL_AUDIT_2026_Q2.md` — auditoria interna do PIMS Q2 2026
- `PIMS_MANAGEMENT_REVIEW_2026_Q2.md` — análise crítica da direção Q2 2026
- `PIMS_CORRECTIVE_ACTIONS.md` — ações corretivas de privacidade
- `PRIVACY_TRAINING_LOG.md` — treinamento e conscientização
- `PRIVACY_INCIDENT_PROCEDURE.md` — procedimento de incidentes
- `PRIVACY_INCIDENT_LOG.md` — registro operacional de violações
- `PRIVACY_NOTICES_REVIEW_LOG.md` — histórico de revisões de avisos
- `ISO27701_PIMS_STATEMENT.md` — declaração de prontidão PIMS

## Status de prontidão

**Versão:** 2026-06-16 | **Norma:** ISO/IEC 27701:2025 | **Status:** Prontidão documentada

| Área | Status |
|---|---|
| Escopo e objetivos | ✅ Documentado |
| Inventário de dados pessoais | ✅ Completo (12 campos) |
| Contratos e DPAs de fornecedores | ✅ Registrados (8 fornecedores) |
| Política de retenção | ✅ Documentada |
| Privacy by design | ✅ Evidenciado |
| Gestão de consentimento | ✅ Documentada |
| Direitos dos titulares — procedimento | ✅ Documentado |
| Direitos dos titulares — teste controlado | ✅ Executado (LGPD_PURGE_COMPLETED) |
| DPIA módulo IA | ✅ Documentado |
| DPIA fluxo LGPD | ✅ Documentado |
| Auditoria interna PIMS | ✅ Realizada (Q2 2026) |
| Análise crítica da direção | ✅ Realizada (Q2 2026) |
| Treinamento e conscientização | ✅ Registrado |
| Resposta a incidentes | ✅ Documentado e log ativo |
