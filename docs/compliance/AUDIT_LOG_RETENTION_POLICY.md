# Audit Log Retention and Immutability Policy

## Purpose

Social Juridico keeps security and privacy audit evidence for SOC 2 and ISO/IEC 27001 readiness. The minimum retention window is 90 days for application audit events, Supabase Auth/PostgREST logs, and VPS or edge infrastructure logs.

## Required sources

- Supabase Auth logs: authentication success, authentication failure, password recovery, MFA and identity-provider events when available.
- Supabase PostgREST logs: API access, response status, database error and administrative access telemetry.
- VPS or hosting logs: reverse proxy, container runtime, deployment, operating system security and application process logs.
- Application audit table: `public.security_audit_events`, used for immutable product-level events.
- LGPD deletion audit table: `public.admin_account_deletion_audit_logs`, used for privacy deletion request workflow evidence.

## Application audit events

The application writes security-sensitive events to `public.security_audit_events`.

Required event families:

- `AUTH_LOGIN_FAILED`: failed login attempt.
- `AUTH_LOGIN_BLOCKED_EMAIL_NOT_CONFIRMED`: login blocked because the email is not confirmed.
- `AUTH_LOGIN_BLOCKED_OFFICE_MEMBER`: office member tried to use the individual login flow.
- `AUTH_LOGIN_BLOCKED_OAB`: lawyer login blocked by OAB verification status.
- `AUTH_LOGIN_SUCCESS`: successful authentication.
- `OFFICE_LOGIN_FAILED`: failed enterprise/office login attempt.
- `OFFICE_LOGIN_SUCCESS`: successful enterprise/office authentication.
- `OFFICE_STAFF_CREATED`: office staff member or intern created.
- `OFFICE_STAFF_UPDATED`: staff permissions, OAB allocation, AI lock or Juris transfer changed.
- `OFFICE_STAFF_REMOVED`: lawyer, staff member or intern profile removed by an administrator.
- `LGPD_PURGE_COMPLETED`: data purge request completed.
- `LGPD_PURGE_FAILED`: data purge processing failed.

The table stores only hashes for email and IP values. Raw passwords, tokens, full emails and raw IP addresses must never be written to audit logs.

## Immutability

`public.security_audit_events` is append-only. The SQL evidence/deploy script `docs/compliance/sql/20260616_soc2_security_audit_events.sql` enables RLS, revokes direct user access, grants insert/select only to the service role and installs database triggers that block update, delete and truncate attempts.

## Retention

- Minimum retention: 90 days.
- Security logs may be retained for longer when required by legal hold, incident response or customer contract.
- Deletion of audit records before 90 days is prohibited.
- Any purge after the retention period must be approved by the security owner and must not remove records under active investigation.

## Infrastructure operations

The engineering owner must configure the production environment so that:

- Supabase Auth and PostgREST logs are exportable for at least 90 days.
- VPS or hosting logs are collected centrally and retained for at least 90 days.
- Log storage access is restricted to authorized administrators.
- A monthly evidence snapshot is saved in the evidence register with date, responsible person, source and retention proof.

## Evidence checklist

- Screenshot or export proving Supabase Auth logs are available.
- Screenshot or export proving Supabase PostgREST/API logs are available.
- Screenshot or export proving VPS/hosting logs are retained for at least 90 days.
- SQL evidence showing `security_audit_events` exists and mutation triggers are active.
- Sample rows for login failure, staff creation/update, administrative removal and LGPD purge completion.
