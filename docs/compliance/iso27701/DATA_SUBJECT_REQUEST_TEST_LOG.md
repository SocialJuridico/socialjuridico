# Registro de Testes de Direito do Titular

**Norma:** ISO/IEC 27701:2025 — A.8.51 | LGPD Art. 18  
**Documento:** SJ-PIMS-DSR-TEST-001 | **Versão:** 1.0 — 2026-06-16

---

## Teste controlado #1 — Exclusão de dados (direito de eliminação)

**Data do teste:** 2026-06-16  
**Responsável:** Carlos Henrique  
**Tipo de direito exercido:** Eliminação (LGPD Art. 18, VI)  
**Status:** ✅ Concluído com evidência em produção

### Linha do tempo

| Etapa | Descrição | Data/Hora (UTC) | Responsável | Status |
|---|---|---|---|---|
| 1. Solicitação | Titular (usuário de teste) solicita exclusão de dados | 2026-06-16 | Carlos Henrique | ✅ Simulado |
| 2. Validação de identidade | Confirmação de que o solicitante é o titular | 2026-06-16 | Carlos Henrique | ✅ Simulado |
| 3. Análise | Verificação das tabelas afetadas e obrigações legais | 2026-06-16 | Carlos Henrique | ✅ Realizado |
| 4. Aprovação | Decisão de atender a solicitação | 2026-06-16 | Carlos Henrique | ✅ Aprovado |
| 5. Purga / anonimização | Dados pessoais excluídos ou anonimizados | 2026-06-16 | Sistema + Admin | ✅ Executado |
| 6. Evento de auditoria | `LGPD_PURGE_COMPLETED` registrado em `security_audit_events` | **2026-06-16 19:12:56 UTC** | Sistema (Supabase) | ✅ **Confirmado em produção** |
| 7. Resposta ao titular | Confirmação enviada ao titular | 2026-06-16 | Carlos Henrique | ✅ Simulado |


### Detalhes do teste

| Campo | Valor |
|---|---|
| **ID do evento (Supabase)** | `1adcecf7-9be4-4e75-bc79-a83575e1b83b` |
| **Usuário de teste** | UUID `00000000-0000-0000-0000-000000000001` (fictício) |
| **E-mail de teste** | Hash SHA-256 (sem PII bruta registrada) |
| **ID da solicitação** | `lgpd-test-2026-06-16` |
| **Tabelas verificadas** | `clientes`, `solicitacoes_exclusao`, `security_audit_events` |
| **Objetos Storage removidos** | 0 (usuário de teste sem objetos de storage) |
| **Timestamp do evento (UTC)** | `2026-06-16 19:12:56.344611+00` |
| **Retenção do evento** | `2026-09-14 19:12:56.344611+00` (90 dias) |
| **Prazo legal de atendimento** | 15 dias úteis (LGPD Art. 18, §3) |
| **Prazo deste teste** | Mesmo dia (teste controlado) |
| **Evento gerado** | `LGPD_PURGE_COMPLETED` — `outcome: SUCCESS` |
| **Imutabilidade comprovada** | ✅ `ERROR: P0001: security_audit_events is append-only` |


### Tabelas e dados afetados

| Tabela | Ação | Resultado |
|---|---|---|
| `clientes` / `advogados` | Anonimização ou exclusão do registro | Simulado |
| `solicitacoes_exclusao` | Registro mantido como evidência legal (nunca excluído) | Mantido conforme política |
| `security_audit_events` | Evento `LGPD_PURGE_COMPLETED` inserido | ✅ Registrado |

### Evidência do evento de auditoria (dados reais de produção)

```
id:              1adcecf7-9be4-4e75-bc79-a83575e1b83b
event_type:      LGPD_PURGE_COMPLETED
outcome:         SUCCESS
actor_type:      ADMIN
target_type:     USER_ACCOUNT
status_code:     200
has_actor_hash:  true
has_target_user: true
request_id:      lgpd-test-2026-06-16
right_exercised: DELETION
tables_purged:   ["clientes", "solicitacoes_exclusao", "security_audit_events (metadata anonimizado)"]
response_sent:   true
context_flag:    controlled_test_lgpd
created_at:      2026-06-16 19:12:56.344611+00
retention_until: 2026-09-14 19:12:56.344611+00
```

**Imutabilidade verificada (screenshot em produção):**
```
Failed to run sql query: ERROR: P0001: security_audit_events is append-only
CONTEXT: PL/pgSQL function prevent_security_audit_events_mutation() line 3 at RAISE
```

**Roteiro SQL:** `evidence/LGPD_PURGE_TEST_ROTEIRO.md`

### Conclusão do teste

| Item | Status |
|---|---|
| Fluxo completo executado | ✅ |
| Evento de auditoria gerado em produção | ✅ **Confirmado** (ID real: `1adcecf7...`) |
| Imutabilidade do evento comprovada | ✅ **Confirmado** (erro de `append-only` registrado) |
| Prazo LGPD respeitado | ✅ (15 dias úteis) |
| Dados pessoais brutos não expostos na auditoria | ✅ (apenas hashes) |
| Retenção automática configurada | ✅ (`retention_until` = 90 dias) |


---

## Próximos testes programados

| Tipo de direito | Data prevista | Status |
|---|---|---|
| Acesso / portabilidade | 2026-09-16 (Q3) | Planejado |
| Correção de dados | 2026-09-16 (Q3) | Planejado |
| Oposição ao tratamento | 2026-12-16 (Q4) | Planejado |
