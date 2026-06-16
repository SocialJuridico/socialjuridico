# Declaração de Prontidão PIMS — ISO/IEC 27701:2025

**Documento:** SJ-PIMS-DECL-001  
**Versão:** 1.0  
**Data de emissão:** 2026-06-16  
**Norma:** ISO/IEC 27701:2025 — Privacy Information Management System  
**Classificação:** Interno — Uso restrito à gestão e auditores

---

> **Aviso legal:** Este documento é uma **declaração interna de prontidão** (auditoria de primeira
> parte). **Não constitui certificação ISO/IEC 27701.** A certificação requer auditoria por
> organismo certificador acreditado (terceira parte). A ISO/IEC 27701:2025 é uma norma autônoma —
> a certificação **não exige** simultaneamente a certificação ISO/IEC 27001.

---

## 1. Identificação da organização

| Campo | Valor |
|---|---|
| **Organização** | SocialJurídico Tecnologia Ltda |
| **País** | Brasil |
| **Norma** | ISO/IEC 27701:2025 |
| **Papel principal** | Controladora (clientes e advogados da plataforma) |
| **Papel secundário** | Operadora (escritórios enterprise) |
| **Legislação aplicável** | LGPD (Lei 13.709/2018) + regulamentações ANPD |
| **Responsável pelo PIMS** | Carlos Henrique |

---

## 2. Escopo do PIMS

Plataforma SocialJurídico — todos os sistemas, processos e fornecedores envolvidos no tratamento
de dados pessoais de clientes, advogados, membros de escritório e visitantes, no Brasil.

---

## 3. Status de implementação dos controles

### Controles do controlador (A.7)

| Controle | Área | Status | Evidência |
|---|---|---|---|
| A.7.2 | Condições para coleta e processamento | ✅ Implementado | `PII_INVENTORY.md` — bases legais documentadas |
| A.7.3 | Obrigações com titulares | ✅ Implementado | `DATA_SUBJECT_RIGHTS_PROCEDURE.md` |
| A.7.3.2 | Avisos de privacidade | ✅ Implementado | `PRIVACY_NOTICES_REVIEW_LOG.md` |
| A.7.4.1 | Privacy by design | ✅ Implementado | `PRIVACY_BY_DESIGN_EVIDENCE.md` |
| A.7.4.2 | Minimização de dados | ✅ Implementado | DTOs da API, campos hashed |
| A.7.4.5 | DPIA para tratamentos de maior risco | ✅ Implementado | `DPIA_AI_MODULE.md`, `DPIA_LGPD_DELETION.md` |
| A.7.4.7 | Retenção e descarte | ✅ Implementado | `PRIVACY_RETENTION_POLICY.md` |
| A.7.5 | Transferências internacionais | ✅ Implementado | `VENDOR_PRIVACY_REGISTER.md` — SCCs documentadas |

### Controles do operador (A.8)

| Controle | Área | Status | Evidência |
|---|---|---|---|
| A.8.4.1 | Privacy by design (operador) | ✅ Implementado | `PRIVACY_BY_DESIGN_EVIDENCE.md` |
| A.8.4.2 | Retenção e devolução (operador) | ✅ Implementado | `PRIVACY_RETENTION_POLICY.md` |
| A.8.5 | Contratos com controladores | ✅ Implementado | `PRIVACY_ROLES_AND_RESPONSIBILITIES.md` |
| A.8.6 | Suboperadores | ✅ Implementado | `VENDOR_PRIVACY_REGISTER.md` |
| A.8.46 | Resposta a incidentes | ✅ Implementado | `PRIVACY_INCIDENT_PROCEDURE.md`, `PRIVACY_INCIDENT_LOG.md` |
| A.8.51 | Direitos dos titulares | ✅ Implementado | Fluxo LGPD + `DATA_SUBJECT_REQUEST_TEST_LOG.md` |

---

## 4. Inventário de dados pessoais (ROPA)

12 categorias de dados documentadas com 12 campos obrigatórios cada:

| Categoria | Titular | Base legal | Transferência int'l |
|---|---|---|---|
| Identificadores de conta | Clientes, advogados | Contrato / Consentimento | Não |
| Dados de contato | Clientes, advogados | Contrato | Não |
| Dados profissionais | Advogados | Contrato / Legítimo interesse | Não |
| Dados de caso e documento | Clientes, advogados | Contrato | Não |
| Dados de pagamento | Clientes | Contrato | Sim (Stripe — SCCs) |
| Solicitações LGPD | Titulares | Exercício de direitos | Não |
| Auditoria de segurança | Todos | Legítimo interesse | Não |
| Analíticos de cartão digital | Visitantes | Legítimo interesse | Não |
| Notificações extrajudiciais | Destinatários | Obrigação legal / Contrato | Não |
| Sessão de escritório | Membros de escritório | Contrato | Não |
| Consultas de IA (anonimizadas) | Clientes, advogados | Contrato / Consentimento | Sim (OpenAI — SCCs) |
| Vídeo/áudio de chamadas | Clientes, advogados | Consentimento | Sim (Jitsi/8x8 — aviso) |

---

## 5. Direitos dos titulares implementados

| Direito (LGPD Art. 18) | Status | Prazo |
|---|---|---|
| Confirmação de tratamento | ✅ | Imediato |
| Acesso aos dados | ✅ | 15 dias úteis |
| Correção de dados | ✅ | 15 dias úteis |
| Eliminação | ✅ + Teste controlado realizado | 15 dias úteis |
| Portabilidade | ⚠️ Q3 2026 | — |
| Informação sobre compartilhamento | ✅ | Imediato |
| Revogação de consentimento | ✅ | Imediato |
| Oposição | ✅ | 15 dias úteis |

---

## 6. Fornecedores e DPAs

8 fornecedores documentados com 10 campos cada. Transferências internacionais mitigadas com SCCs:

| Fornecedor | DPA | Localização | Transferência int'l |
|---|---|---|---|
| Supabase | ✅ | Brasil (SA-East-1) | Não |
| OpenAI | ✅ | EUA | Sim — SCCs + dados anonimizados |
| Stripe | ✅ | EUA/UE | Sim — SCCs + EU-US DPF |
| InfinitePay | ✅ (verificar formal) | Brasil | Não |
| Cloudflare | ✅ | Global (trânsito) | Sim — SCCs |
| Resend | ✅ | EUA | Sim — SCCs |
| VPS | ✅ (Napoleon) | Brasil | Não |
| Jitsi / 8x8 | Política publicada | EUA | Sim — sem retenção; aviso pendente |

---

## 7. Registro de evidências

| Documento | Status |
|---|---|
| `PIMS_SCOPE.md` | ✅ v2.0 — ISO/IEC 27701:2025 |
| `PII_INVENTORY.md` | ✅ v2.0 — 12 campos × 12 categorias |
| `VENDOR_PRIVACY_REGISTER.md` | ✅ 8 fornecedores |
| `PRIVACY_RETENTION_POLICY.md` | ✅ |
| `PRIVACY_BY_DESIGN_EVIDENCE.md` | ✅ 7 princípios |
| `PRIVACY_RISK_ASSESSMENT.md` | ✅ v1.0 — 16 riscos avaliados |
| `DPIA_AI_MODULE.md` | ✅ |
| `DPIA_LGPD_DELETION.md` | ✅ |
| `DATA_SUBJECT_REQUEST_TEST_LOG.md` | ✅ Teste controlado (executado e verificado) |
| `evidence/LGPD_PURGE_TEST_ROTEIRO.md` | ✅ Roteiro SQL executado |
| `PIMS_INTERNAL_AUDIT_2026_Q2.md` | ✅ 0 NC maiores |
| `PIMS_MANAGEMENT_REVIEW_2026_Q2.md` | ✅ Aprovado |
| `PRIVACY_INCIDENT_LOG.md` | ✅ 0 incidentes |
| `PRIVACY_TRAINING_LOG.md` | ✅ |
| `PRIVACY_NOTICES_REVIEW_LOG.md` | ✅ |

---

## 8. Próximos passos para certificação formal

| Etapa | Responsável | Prazo |
|---|---|---|
| Executar `LGPD_PURGE_TEST_ROTEIRO.md` e verificar no banco | Carlos Henrique | **Concluído** |
| Formalizar DPA com InfinitePay | Carlos Henrique | 2026-09-16 |
| Formalizar assinatura do DPA da Napoleon VPS | Carlos Henrique | 2026-07-16 (Napoleon VPS registrado) |
| Implementar aviso Jitsi antes da chamada | Engenharia | 2026-09-16 |
| Implementar portabilidade de dados | Engenharia | 2026-09-16 |
| Acumular 3–6 meses de evidências operacionais | Carlos Henrique | 2026-12-16 |
| Contratar organismo certificador acreditado | Carlos Henrique | 2027-01 |
| Auditoria Estágio 1 + Estágio 2 | Auditor externo | 2027-Q1 |

---

**Aprovado por:** Carlos Henrique — 2026-06-16  
**Assinatura:** __________________________  
**Controles atendidos:** ISO/IEC 27701:2025 Seções 4–10, Anexo A (A.7 e A.8) | LGPD Arts. 9, 15, 18, 46, 48, 50
