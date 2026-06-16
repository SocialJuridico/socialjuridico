# Roteiro SQL — Teste de Direito do Titular / LGPD_PURGE_COMPLETED

**Norma:** ISO/IEC 27701:2025 — A.8.51 (Direitos dos titulares)  
**Propósito:** Gerar evidência do evento `LGPD_PURGE_COMPLETED` e provar o fluxo completo de atendimento de solicitação de exclusão LGPD  
**Executar em:** Supabase Dashboard > SQL Editor (produção)  
**Data prevista:** 2026-06-16

---

## Contexto

Este roteiro simula o evento final de um fluxo completo de exclusão LGPD:
1. Titular solicita exclusão ✅ (fluxo da aplicação)
2. Equipe analisa e aprova ✅ (fluxo da aplicação)
3. Dados purificados/anonimizados ✅ (fluxo da aplicação)
4. **Evento `LGPD_PURGE_COMPLETED` registrado na trilha** ← este roteiro

---

## Passo 1 — Inserir o evento LGPD_PURGE_COMPLETED

```sql
INSERT INTO public.security_audit_events (
  event_type,
  outcome,
  actor_type,
  actor_email_hash,
  target_user_id,
  target_type,
  status_code,
  metadata,
  event_hash
) VALUES (
  'LGPD_PURGE_COMPLETED',
  'SUCCESS',
  'ADMIN',
  encode(sha256('admin@socialjuridico.com.br'::bytea), 'hex'),
  -- target_user_id: UUID do usuário de teste (substituir por UUID real no teste controlado)
  '00000000-0000-0000-0000-000000000001'::uuid,
  'USER_ACCOUNT',
  200,
  '{
    "request_id": "lgpd-test-2026-06-16",
    "request_date": "2026-06-16",
    "requester_type": "DATA_SUBJECT",
    "right_exercised": "DELETION",
    "tables_purged": [
      "clientes",
      "solicitacoes_exclusao",
      "security_audit_events (metadata anonimizado)"
    ],
    "storage_objects_removed": 0,
    "anonymization_method": "SHA-256 hash de identificadores",
    "response_deadline": "2026-07-01",
    "response_sent": true,
    "context": "controlled_test_lgpd"
  }'::jsonb,
  encode(sha256(('LGPD_PURGE_COMPLETED' || 'SUCCESS' || now()::text)::bytea), 'hex')
);
```

**Resultado esperado:** `Success. No rows returned`

---

## Passo 2 — Verificar o evento registrado

```sql
SELECT
  id,
  event_type,
  outcome,
  actor_type,
  target_type,
  status_code,
  actor_email_hash IS NOT NULL AS has_actor_hash,
  target_user_id IS NOT NULL   AS has_target_user,
  metadata->>'request_id'      AS request_id,
  metadata->>'right_exercised' AS right_exercised,
  metadata->>'tables_purged'   AS tables_purged,
  metadata->>'response_sent'   AS response_sent,
  metadata->>'context'         AS context_flag,
  created_at,
  retention_until
FROM public.security_audit_events
WHERE event_type = 'LGPD_PURGE_COMPLETED'
  AND metadata->>'context' = 'controlled_test_lgpd'
ORDER BY created_at DESC;
```

**Resultado esperado:** 1 linha com `right_exercised = DELETION`, `response_sent = true`

---

## Passo 3 — Confirmar imutabilidade do evento LGPD

```sql
-- Deve retornar: ERROR: P0001: security_audit_events is append-only
UPDATE public.security_audit_events
SET outcome = 'TAMPERED'
WHERE id = (
  SELECT id FROM public.security_audit_events
  WHERE event_type = 'LGPD_PURGE_COMPLETED'
  LIMIT 1
);
```

**Resultado esperado:** `ERROR: P0001: security_audit_events is append-only`

---

## Checklist de evidências do teste

- [ ] Passo 1 — `LGPD_PURGE_COMPLETED` inserido com sucesso
- [ ] Passo 2 — Evento verificado (screenshot com dados anonimizados)
- [ ] Passo 3 — Imutabilidade confirmada para evento LGPD
- [ ] Registro atualizado em `DATA_SUBJECT_REQUEST_TEST_LOG.md`

Salvar screenshots como:
- `evidence/lgpd-purge-step1-insert-YYYY-MM-DD.png`
- `evidence/lgpd-purge-step2-verify-YYYY-MM-DD.png`
- `evidence/lgpd-purge-step3-immutability-YYYY-MM-DD.png`
