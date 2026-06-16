# Log Retention Evidence - 2026 Q2

**Status:** Requires external evidence attachment  
**Control:** SOC 2 Security - logging and monitoring  
**Minimum retention target:** 90 days  
**Owner:** Carlos Henrique  

## 1. Retention requirement

Security-relevant logs must be retained for at least 90 days, including:

- Supabase Auth logs.
- Supabase PostgREST/API/database logs.
- Application audit events in `public.security_audit_events`.
- VPS, hosting, Cloudflare or edge logs when applicable.

## 2. Internal evidence already available

| Evidence | Status | Location |
|---|---|---|
| Log retention policy | Completed | `docs/compliance/AUDIT_LOG_RETENTION_POLICY.md` |
| Security audit event table migration | Completed | `docs/compliance/sql/20260616_soc2_security_audit_events.sql` |
| Supabase SQL execution screenshot | Completed | `docs/compliance/iso27001/evidence/supabase-security-audit-migration-success-2026-06-16.png` |

## 3. External evidence to attach

| Source | Evidence expected | Status | Evidence location |
|---|---|---|---|
| Supabase Auth | Screenshot/export showing Auth log availability or retention setting | To attach |  |
| Supabase API/PostgREST | Screenshot/export showing API/database log availability or retention setting | To attach |  |
| Cloudflare or DNS/edge provider | Screenshot/export showing firewall, request or security log retention | To attach if applicable |  |
| VPS/hosting | Screenshot/export showing system/application log retention or backup of logs | To attach if applicable |  |

## 4. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | Security owner / CEO | Approved as retention control plan | 2026-06-16 | This record |

