# Backup and Restore Evidence - 2026 Q2

**Status:** Documented; provider and restore-test evidence required  
**Control:** SOC 2 Security / Availability support control  
**Policy:** `docs/compliance/iso27001/BACKUP_AND_RECOVERY_POLICY.md`  
**Owner:** Carlos Henrique  

## 1. Objective

Document backup and recovery expectations for the Social Juridico platform and retain proof that provider backup settings and restoration procedures are known and periodically tested.

## 2. Backup scope

| Asset | Backup owner | Evidence expected |
|---|---|---|
| Supabase database | Supabase / Social Juridico | Screenshot/export of backup plan, point-in-time recovery or scheduled backup availability |
| Supabase Storage buckets | Supabase / Social Juridico | Screenshot/export of bucket backup/export approach or retention procedure |
| Application source code | Social Juridico / version control | Git history, branch/release records |
| Environment variables and secrets | Social Juridico | Secure vault/provider evidence without exposing secret values |
| VPS/hosting logs if applicable | Hosting provider / Social Juridico | Retention setting or log archive evidence |

## 3. Restore procedure

1. Identify the incident and required recovery point.
2. Confirm affected assets and data scope.
3. Restore in a safe/staging environment where possible.
4. Validate login, dashboards, APIs, documents and sample business workflows.
5. Record the result, time required and any data loss.

## 4. Evidence record

| Item | Status | Evidence location | Date | Responsible |
|---|---|---|---|---|
| Backup policy exists | Completed | `docs/compliance/iso27001/BACKUP_AND_RECOVERY_POLICY.md` | 2026-06-16 | Carlos Henrique |
| Supabase backup setting captured | To attach |  | 2026-06-16 | Carlos Henrique |
| Restore simulation/test captured | To attach |  | 2026-06-16 | Carlos Henrique |
| RTO/RPO reviewed | Planned |  | 2026-06-16 | Carlos Henrique |

## 5. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | Security owner / CEO | Approved backup documentation baseline | 2026-06-16 | This record |

