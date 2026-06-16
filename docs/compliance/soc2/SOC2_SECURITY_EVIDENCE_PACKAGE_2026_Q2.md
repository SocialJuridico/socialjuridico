# SOC 2 Security Evidence Package - 2026 Q2

**Status:** In operation with external evidence collection plan  
**Framework:** SOC 2 Trust Services Criteria - Security  
**Period:** 2026-06-16 readiness baseline  
**Owner:** Carlos Henrique  
**Scope:** Social Juridico platform, admin dashboard, authentication, audit logs, change management and operational security evidence.

## 1. Summary

This package consolidates the SOC 2 Security evidence required for investor due diligence and future independent SOC 2 assessment.

The system already has documented controls for authentication audit logging, administrative access, change management, incident response and backup governance. External evidence from Supabase, Cloudflare, VPS or other providers must be attached as recurring proof where the control depends on third-party dashboards.

## 2. Evidence index

| Evidence | File | Status |
|---|---|---|
| 90-day log retention | `LOG_RETENTION_EVIDENCE_2026_Q2.md` | Requires external screenshots/exports |
| Login failure audit event | `LOGIN_FAILURE_TEST_2026_Q2.md` | Ready for controlled test evidence |
| Release history and change approvals | `CHANGE_APPROVAL_REGISTER_2026_Q2.md` | Registered for Q2 baseline |
| Simulated incident record | `INCIDENT_SIMULATION_2026_Q2.md` | Executed as tabletop simulation |
| Quarterly administrator review | `ADMIN_ACCESS_REVIEW_2026_Q2.md` | Executed and registered |
| Inactive user access removal | `INACTIVE_ACCESS_REMOVAL_EVIDENCE_2026_Q2.md` | Requires real inactive-user evidence or no-inactive-user attestation |
| Backup and restoration documentation | `BACKUP_RESTORE_EVIDENCE_2026_Q2.md` | Documented; restore test evidence required |
| Security audit event SQL | `../iso27001/SECURITY_AUDIT_MIGRATION_EVIDENCE.md` | SQL execution evidence captured |

## 3. SOC 2 position

Social Juridico may describe this as a SOC 2 Security readiness evidence package. It must not be described as an issued SOC 2 report until an independent CPA/auditor completes the SOC 2 engagement and issues the formal report.

