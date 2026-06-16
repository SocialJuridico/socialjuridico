# Change Approval Register - 2026 Q2

**Status:** Registered  
**Control:** SOC 2 Security - change management  
**Owner:** Carlos Henrique  
**Policy:** `docs/compliance/CHANGE_MANAGEMENT.md`

## 1. Approved changes

| Change ID | Date | Type | Summary | Risk | Validation | Approver | Status |
|---|---|---|---|---|---|---|---|
| CHG-2026-06-16-001 | 2026-06-16 | Security / compliance | Created SOC 2, ISO 27001 and ISO 27701 readiness documentation and admin audit evidence flow. | Low | Documentation review and audit page review | Carlos Henrique | Approved |
| CHG-2026-06-16-002 | 2026-06-16 | Database / security | Applied `security_audit_events` SQL migration in Supabase for append-only security audit events. | Medium | Supabase SQL execution success screenshot | Carlos Henrique | Approved |
| CHG-2026-06-16-003 | 2026-06-16 | Privacy / public UI | Added contextual privacy notices for public digital card and extrajudicial notification flows. | Low | Code review and visual review | Carlos Henrique | Approved |

## 2. Release history

| Release | Date | Scope | Evidence | Status |
|---|---|---|---|---|
| Q2-2026 Security Readiness Baseline | 2026-06-16 | SOC 2 Security, ISO 27001 SGSI, ISO 27701 PIMS readiness | `docs/compliance/EVIDENCE_REGISTER.md` | Released internally |

## 3. Rollback notes

Documentation changes can be reverted through version control. Database changes for audit evidence are additive and append-only; rollback is not recommended because the table supports security and audit retention.

## 4. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | CEO / Management representative | Approved | 2026-06-16 | This register |

