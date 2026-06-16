# Inactive Access Removal Evidence - 2026 Q2

**Status:** ✅ Concluído com evidência de teste controlado  
**Control:** SOC 2 Security - access removal / offboarding  
**Owner:** Carlos Henrique  

## 1. Requirement

When a user, administrator, staff member or intern no longer requires access, the removal must be recorded with date, responsible person, affected role and evidence. Sensitive personal data should be minimized in the evidence.

## 2. Controlled Offboarding Test (2026-06-16)

Como não havia administradores inativos no quadro real da empresa na data base de 16/06/2026, foi executado um teste controlado ponta a ponta com uma conta simulada administrativa:

1. **Criação da Conta**: Criado o usuário `test-offboarding-v3@socialjuridico.com.br` e atribuída a permissão `ADMIN` na tabela `admins`.
2. **Revogação / Desligamento**:
   - Remoção do perfil na tabela `admins` (banco de dados).
   - Exclusão do usuário no Supabase Auth via `db.auth.admin.deleteUser()`, invalidando instantaneamente as sessões ativas e revogando os tokens JWT.
3. **Verificação de Acesso**: Tentativa de autenticação com as antigas credenciais bloqueada com `Invalid login credentials`.
4. **Trilha de Auditoria**: Registro do evento `ADMIN_MEMBER_REMOVED` inserido na tabela `security_audit_events` com hashes e metadados.

### Snippet do Evento Registrado (Database)

```json
{
  "id": "f9175e94-b2e7-4ca1-8af4-cdaa5a6ca139",
  "created_at": "2026-06-16T19:36:41.522+00:00",
  "event_type": "ADMIN_MEMBER_REMOVED",
  "actor_id": null,
  "actor_type": "SYSTEM",
  "actor_email_hash": "0c54a6fd4fff3583ab2e98ecd2eb97b6e33888ad45c52055019cc2179c38114e",
  "target_user_id": "75719df2-74fe-46c0-bf06-03df17e085e9",
  "target_type": "ADMIN",
  "target_email_hash": "acc922129e1f28a1b6a27b7b23efecd8b66d23098fae10a22fe2ec052a08d6d1",
  "request_ip_hash": "7929ba9b9b52fe11af4a95d43fdfedf3c9fed234aadfc7f2deeae88a94c752a0",
  "user_agent": "SOC2-Offboarding-Script",
  "outcome": "SUCCESS",
  "status_code": 200,
  "metadata": {
    "action": "remove_admin_access",
    "context": "controlled_test_offboarding",
    "tokens_revoked": true,
    "offboarding_reason": "voluntary_resignation_simulation",
    "sessions_terminated": true,
    "approval_responsible": "Carlos Henrique (CEO)"
  },
  "retention_until": "2026-09-14T19:36:41.522+00:00",
  "event_hash": "2d9567fbb27296133c871b4cec2735c58e5bb6f9a09bc422e1399fbffd4245ea"
}
```

---

## 3. Registro de Desligamento

| Data | Cargo | Tipo de Acesso Removido | Motivo | Link da Evidência | Responsável |
|---|---|---|---|---|---|
| 2026-06-16 | `ADMIN` | Conta Auth + Registro `admins` | Simulação de desligamento voluntário | [offboarding_test_sample.json](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/offboarding_test_sample.json) | Carlos Henrique (CEO) |

---

## 4. Evidência do Sistema

| Item | Status | Evidência | Data | Responsável |
|---|---|---|---|---|
| Criação e deleção efetuadas | ✅ Concluído | Simulado via `scratch/test_offboarding.mjs` | 2026-06-16 | Carlos Henrique |
| Evento `ADMIN_MEMBER_REMOVED` logado | ✅ Concluído | Id `f9175e94-b2e7-4ca1-8af4-cdaa5a6ca139` em produção | 2026-06-16 | Carlos Henrique |
| Bloqueio de login confirmado | ✅ Concluído | Mensagem de erro de login capturada | 2026-06-16 | Carlos Henrique |

## 5. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | Security owner / CEO | Approved offboarding test evidence | 2026-06-16 | This record |


