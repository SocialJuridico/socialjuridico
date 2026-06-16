# DPIA — Fluxo de Exclusão e Purga LGPD

**Norma:** ISO/IEC 27701:2025 — A.8.51 | LGPD Art. 5, XVII e Art. 18, VI  
**Documento:** SJ-PIMS-DPIA-LGPD-001 | **Versão:** 1.0 — 2026-06-16  
**Responsável:** Carlos Henrique | **Status:** Aprovado

---

## 1. Descrição do tratamento

| Campo | Detalhe |
|---|---|
| **Processo** | Atendimento de solicitações de exclusão de dados pessoais (direito LGPD Art. 18, VI) |
| **Finalidade** | Cumprir o direito de eliminação do titular e registrar evidência de cumprimento |
| **Dados tratados** | Todos os dados pessoais do titular nas tabelas do escopo |
| **Resultado** | Dados excluídos ou anonimizados; registro de auditoria permanente criado |

---

## 2. Fluxo de dados

```
Titular solicita exclusão
    → Plataforma registra solicitação em `solicitacoes_exclusao`
    → Equipe valida identidade do titular
    → Análise das tabelas afetadas e obrigações legais de retenção
    → Execução da purga: exclusão de PII em tabelas no escopo
    → Evento LGPD_PURGE_COMPLETED registrado em `security_audit_events`
    → Resposta enviada ao titular
```

---

## 3. Necessidade e proporcionalidade

| Critério | Avaliação |
|---|---|
| A finalidade é legítima? | ✅ Sim — cumprimento de obrigação legal (LGPD Art. 18) |
| Os dados residuais são necessários? | ✅ Sim — apenas evidência legal mínima (sem PII bruta) |
| A anonimização é suficiente? | ✅ Sim — SHA-256 é irreversível para os fins desta política |

---

## 4. Identificação de riscos

| # | Risco | Probabilidade | Impacto | Nível | Mitigação |
|---|---|---|---|---|---|
| R-1 | Exclusão incompleta — tabela esquecida no fluxo | Baixa | Alto | Médio | Checklist de tabelas; revisão do procedimento a cada mudança de schema |
| R-2 | Registro de auditoria expõe PII bruta do titular excluído | Muito baixa | Alto | Baixo | Apenas hashes registrados; sem campos de texto bruto |
| R-3 | Solicitação de exclusão fraudulenta (pessoa não é o titular) | Baixa | Alto | Médio | Validação de identidade obrigatória antes da execução |
| R-4 | Exclusão de dados com retenção legal obrigatória | Baixa | Médio | Baixo | Tabela de retenção (`PRIVACY_RETENTION_POLICY.md`) consultada antes da execução |

---

## 5. Medidas de mitigação implementadas

| Medida | Status |
|---|---|
| Validação de identidade do titular antes da execução | ✅ Procedimento documentado |
| Checklist de tabelas afetadas | ✅ Documentado em `DATA_SUBJECT_RIGHTS_PROCEDURE.md` |
| Registro imutável do evento de purga | ✅ `LGPD_PURGE_COMPLETED` em trilha append-only |
| Política de retenção consultada antes de cada exclusão | ✅ `PRIVACY_RETENTION_POLICY.md` |
| Prazo de atendimento monitorado (15 dias úteis) | ✅ Registrado em `solicitacoes_exclusao` |
| Resposta formal ao titular após conclusão | ✅ Procedimento documentado |

---

## 6. Conclusão

**Nível de risco residual:** Baixo  
**Decisão:** O fluxo pode operar com as medidas de mitigação implementadas.  
**Revisão:** Obrigatória ao alterar o schema das tabelas no escopo ou ao adicionar novas categorias de dados.

**Aprovado por:** Carlos Henrique — 2026-06-16
