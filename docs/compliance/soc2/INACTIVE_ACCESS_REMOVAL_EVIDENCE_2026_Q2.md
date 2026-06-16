# Inactive Access Removal Evidence - 2026 Q2

**Status:** No inactive administrator recorded in Q2 baseline; evidence required when removal occurs  
**Control:** SOC 2 Security - access removal  
**Owner:** Carlos Henrique  

## 1. Requirement

When a user, administrator, staff member or intern no longer requires access, the removal must be recorded with date, responsible person, affected role and evidence. Sensitive personal data should be minimized in the evidence.

## 2. Q2 baseline result

The 2026-06-16 administrator review recorded two administrators and did not record an inactive administrator requiring removal.

For SOC 2 Type II, this control should continue operating during the observation period. If an inactive user exists, register the removal below and attach a screenshot/export without raw sensitive data.

## 3. Removal record template

| Date | User role | Access removed | Reason | Evidence location | Responsible |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## 4. Recommended application evidence

When the removal is performed inside the Social Juridico platform, capture or export:

- `OFFICE_STAFF_REMOVED` event from `public.security_audit_events`, if applicable.
- Related record from `admin_account_deletion_audit_logs`, if the action is a deletion/purge workflow.
- Screenshot of the admin UI showing the user no longer has access.

Do not attach passwords, tokens, full IP addresses or unnecessary personal data.

## 5. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | Security owner / CEO | Approved current no-inactive-user baseline | 2026-06-16 | This record |

