# Security Audit Migration Evidence

**Version:** 2026-06-16  
**Status:** SQL applied in Supabase; trigger verification and anonymized event sample remain part of operating evidence

## Purpose

This file records the evidence required to close the ISO 27001 finding related to the security audit trail migration and anonymized sample collection.

## Step 1 - Apply SQL

Apply the script below in the Supabase SQL editor for the production project:

`docs/compliance/sql/20260616_soc2_security_audit_events.sql`

## Step 2 - Verify table and immutability triggers

Run:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'security_audit_events';
```

Run:

```sql
select trigger_name, event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'security_audit_events'
order by trigger_name;
```

Expected triggers:

- `trg_security_audit_events_no_update`
- `trg_security_audit_events_no_delete`
- `trg_security_audit_events_no_truncate`

## Step 3 - Collect anonymized sample

After a controlled login failure, office login and LGPD test event, run:

```sql
select
  event_type,
  outcome,
  status_code,
  actor_type,
  target_type,
  request_ip_hash is not null as has_ip_hash,
  actor_email_hash is not null as has_actor_email_hash,
  target_email_hash is not null as has_target_email_hash,
  created_at,
  retention_until
from public.security_audit_events
order by created_at desc
limit 20;
```

Attach a screenshot or CSV export to the evidence register. Do not export full emails, raw IP addresses, tokens or passwords.

## Evidence record

| Item | Status | Evidence location | Date | Responsible |
|---|---|---|---|---|
| SQL applied in Supabase | Completed | `docs/compliance/iso27001/evidence/supabase-security-audit-migration-success-2026-06-16.png` | 2026-06-16 | Carlos Henrique |
| Trigger verification captured | Planned | To be captured using the trigger verification query above | 2026-06-16 | Carlos Henrique / Engineering owner |
| Anonymized sample captured | Planned for first production events | Screenshot/CSV without raw PII after controlled audit events exist | 2026-06-16 | Carlos Henrique / Engineering owner |
| Evidence added to register | Completed | `docs/compliance/EVIDENCE_REGISTER.md` | 2026-06-16 | Carlos Henrique |
