# Roteiro SQL — Verificacao de Triggers e Coleta de Amostra Anonimizada

**Controle ISO 27001:2022:** A.8.15 — Registro de eventos | A.5.28 — Coleta de evidencias  
**Responsavel pela execucao:** Carlos Henrique  
**Local de execucao:** Supabase Dashboard > SQL Editor (projeto producao)  
**Revisao:** 2026-06-16 v2 — corrigido para schema real da tabela

---

## Status dos passos executados anteriormente

| Passo | Status | Observacao |
|---|---|---|
| Passo 1 — Verificar tabela | ✅ Concluido | `public | security_audit_events` confirmado |
| Passo 2 — Verificar triggers | ✅ Concluido | 2 de 3 triggers visiveis (ver nota abaixo) |
| Passo 3 — Provar imutabilidade | ✅ Concluido | Erro `security_audit_events is append-only` confirmado |
| Passo 4 — Inserir eventos | ✅ Concluido | Eventos de teste inseridos com schema real |
| Passo 5 — Amostra anonimizada | ✅ Concluido | Amostra de 10 eventos coletada e arquivada |


---

## Nota sobre o Passo 2 — Trigger TRUNCATE ausente no resultado

O resultado mostrou apenas 2 triggers (`no_delete`, `no_update`). Isso e **normal** no PostgreSQL:
triggers do tipo `TRUNCATE` (`FOR EACH STATEMENT`) **nao aparecem em `information_schema.triggers`**.
Use a query alternativa abaixo para confirmar os 3 triggers, incluindo o de TRUNCATE:

```sql
SELECT tgname AS trigger_name,
       CASE
         WHEN tgtype & 16 > 0 THEN 'UPDATE'
         WHEN tgtype & 8  > 0 THEN 'DELETE'
         WHEN tgtype & 4  > 0 THEN 'INSERT'
         ELSE 'TRUNCATE'
       END AS event,
       CASE tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing
FROM pg_trigger
WHERE tgrelid = 'public.security_audit_events'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
```

**Resultado esperado (3 linhas):**

| trigger_name | event | timing |
|---|---|---|
| trg_security_audit_events_no_delete | DELETE | BEFORE |
| trg_security_audit_events_no_truncate | TRUNCATE | BEFORE |
| trg_security_audit_events_no_update | UPDATE | BEFORE |

Capture um screenshot e salve como:
`evidence/trigger-step2b-pg_trigger-all-three-YYYY-MM-DD.png`

---

## Passo 4 (corrigido) — Gerar eventos de auditoria controlados

> **Problema anterior:** A coluna se chama `metadata` (nao `details`), e `event_hash` e obrigatorio (NOT NULL).
> Os INSERTs abaixo estao corrigidos para o schema real.

Execute cada bloco separadamente no SQL Editor:

### Evento 1 — Falha de autenticacao (AUTH_FAILURE)

```sql
INSERT INTO public.security_audit_events (
  event_type, outcome, actor_type, actor_email_hash,
  request_ip_hash, status_code, metadata, event_hash
) VALUES (
  'AUTH_FAILURE',
  'FAILURE',
  'USER',
  encode(sha256('test-login-failure@example.com'::bytea), 'hex'),
  encode(sha256('192.168.1.1'::bytea), 'hex'),
  401,
  '{"reason": "invalid_password", "context": "controlled_test_event"}'::jsonb,
  encode(sha256(('AUTH_FAILURE' || 'FAILURE' || now()::text)::bytea), 'hex')
);
```

### Evento 2 — Acao administrativa (ADMIN_ACTION)

```sql
INSERT INTO public.security_audit_events (
  event_type, outcome, actor_type, actor_email_hash,
  request_ip_hash, target_type, status_code, metadata, event_hash
) VALUES (
  'ADMIN_ACTION',
  'SUCCESS',
  'ADMIN',
  encode(sha256('admin@socialjuridico.com.br'::bytea), 'hex'),
  encode(sha256('10.0.0.1'::bytea), 'hex'),
  'USER_PROFILE',
  200,
  '{"action": "approve_oab_verification", "context": "controlled_test_event"}'::jsonb,
  encode(sha256(('ADMIN_ACTION' || 'SUCCESS' || now()::text)::bytea), 'hex')
);
```

### Evento 3 — Purga de dados / LGPD (DATA_PURGE)

```sql
INSERT INTO public.security_audit_events (
  event_type, outcome, actor_type, actor_email_hash,
  request_ip_hash, target_type, status_code, metadata, event_hash
) VALUES (
  'DATA_PURGE',
  'SUCCESS',
  'ADMIN',
  encode(sha256('admin@socialjuridico.com.br'::bytea), 'hex'),
  encode(sha256('10.0.0.1'::bytea), 'hex'),
  'USER_ACCOUNT',
  200,
  '{"action": "lgpd_deletion_request", "context": "controlled_test_event"}'::jsonb,
  encode(sha256(('DATA_PURGE' || 'SUCCESS' || now()::text)::bytea), 'hex')
);
```

### Evento 4 — Modificacao de permissao (PERMISSION_CHANGE)

```sql
INSERT INTO public.security_audit_events (
  event_type, outcome, actor_type, actor_email_hash,
  request_ip_hash, target_type, status_code, metadata, event_hash
) VALUES (
  'PERMISSION_CHANGE',
  'SUCCESS',
  'ADMIN',
  encode(sha256('admin@socialjuridico.com.br'::bytea), 'hex'),
  encode(sha256('10.0.0.1'::bytea), 'hex'),
  'USER_ROLE',
  200,
  '{"action": "role_change", "from": "CLIENT", "to": "LAWYER", "context": "controlled_test_event"}'::jsonb,
  encode(sha256(('PERMISSION_CHANGE' || 'SUCCESS' || now()::text)::bytea), 'hex')
);
```

### Evento 5 — Evento de seguranca (SECURITY_EVENT)

```sql
INSERT INTO public.security_audit_events (
  event_type, outcome, actor_type,
  request_ip_hash, status_code, metadata, event_hash
) VALUES (
  'SECURITY_EVENT',
  'DETECTED',
  'SYSTEM',
  encode(sha256('185.220.101.1'::bytea), 'hex'),
  403,
  '{"reason": "multiple_failed_logins", "attempts": 5, "context": "controlled_test_event"}'::jsonb,
  encode(sha256(('SECURITY_EVENT' || 'DETECTED' || now()::text)::bytea), 'hex')
);
```

---

## Passo 5 — Exportar amostra anonimizada

Apos inserir os 5 eventos, execute:

```sql
SELECT
  id,
  event_type,
  outcome,
  status_code,
  actor_type,
  target_type,
  request_ip_hash IS NOT NULL  AS has_ip_hash,
  actor_email_hash IS NOT NULL AS has_actor_email_hash,
  target_email_hash IS NOT NULL AS has_target_email_hash,
  created_at,
  retention_until,
  metadata->>'context' AS context_flag
FROM public.security_audit_events
WHERE metadata->>'context' = 'controlled_test_event'
ORDER BY created_at DESC;
```

**O que confirma:**
- Apenas **hashes** de IP e e-mail — nenhuma PII bruta registrada
- `created_at` e `retention_until` preenchidos automaticamente (90 dias de retencao)
- `context_flag = controlled_test_event` identifica estes como eventos de teste
- 5 tipos distintos de evento cobertos

Capture um screenshot e salve como:
`evidence/anonymized-audit-sample-YYYY-MM-DD.png`

---

## Passo 6 — Confirmar que novos eventos nao podem ser alterados

Execute para confirmar que os eventos recem-inseridos tambem sao imutaveis:

```sql
-- PostgreSQL nao suporta LIMIT em UPDATE — use subquery
UPDATE public.security_audit_events
SET outcome = 'TAMPERED'
WHERE id = (
  SELECT id FROM public.security_audit_events
  WHERE metadata->>'context' = 'controlled_test_event'
  LIMIT 1
);
```

**Resultado esperado:** Mesmo erro `security_audit_events is append-only`

---

## Passo 7 — Atualizar o registro de evidencias

Apos concluir, atualize `SECURITY_AUDIT_MIGRATION_EVIDENCE.md`:
- Mudar status de "Planned" para "Completed" para: Trigger verification e Anonymized sample

---

## Checklist de conclusao

- [x] Passo 1 — Screenshot tabela existente (capturado)
- [x] Passo 2 — Screenshot 2 triggers via information_schema (capturado)
- [x] Passo 2b — 3 triggers via pg_trigger confirmados: DELETE, TRUNCATE, UPDATE (capturado)
- [x] Passo 3 — Screenshot erro de imutabilidade (capturado)
- [x] Passo 4 — 5 eventos inseridos com schema correto (metadata + event_hash)
- [x] Passo 5 — Amostra anonimizada coletada (10 eventos no banco, 5 tipos distintos)
- [x] Passo 6 — Imutabilidade confirmada nos novos eventos (erro append-only com subquery)
- [x] Passo 7 — SECURITY_AUDIT_MIGRATION_EVIDENCE.md atualizado com evidencias reais

**ROTEIRO CONCLUIDO EM 2026-06-16**
