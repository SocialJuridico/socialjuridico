# Login Failure Audit Test - 2026 Q2

**Status:** Ready for controlled evidence capture  
**Control:** SOC 2 Security - authentication audit logging  
**Owner:** Carlos Henrique  
**System:** Social Juridico authentication flows and `public.security_audit_events`

## 1. Objective

Confirm that failed login attempts generate immutable audit events without storing raw passwords, raw IP addresses or sensitive tokens.

## 2. Test procedure

1. Open the login page in a controlled test session.
2. Attempt login with a known invalid credential or invalid password.
3. Confirm the application returns a controlled failure message.
4. Query `public.security_audit_events` for the latest failed authentication event.
5. Export only anonymized fields.

## 3. Evidence query

```sql
select
  event_type,
  outcome,
  status_code,
  actor_type,
  actor_email_hash is not null as has_actor_email_hash,
  request_ip_hash is not null as has_ip_hash,
  created_at,
  retention_until
from public.security_audit_events
where event_type in (
  'AUTH_LOGIN_FAILED',
  'OFFICE_LOGIN_FAILED',
  'AUTH_LOGIN_BLOCKED_EMAIL_NOT_CONFIRMED',
  'AUTH_LOGIN_BLOCKED_OFFICE_MEMBER',
  'AUTH_LOGIN_BLOCKED_OAB'
)
order by created_at desc
limit 10;
```

## 4. Evidence record

| Item | Status | Evidence location | Date | Responsible |
|---|---|---|---|---|
| Controlled failed login performed | To attach |  | 2026-06-16 | Carlos Henrique |
| Anonymized event sample captured | To attach |  | 2026-06-16 | Carlos Henrique |
| Raw passwords/tokens absent from evidence | Required |  | 2026-06-16 | Carlos Henrique |

## 5. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | Security owner / CEO | Approved test procedure | 2026-06-16 | This record |

