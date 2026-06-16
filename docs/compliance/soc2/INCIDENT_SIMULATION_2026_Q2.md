# Incident Simulation Record - 2026 Q2

**Status:** Tabletop simulation executed  
**Control:** SOC 2 Security - incident response  
**Policy:** `docs/compliance/INCIDENT_RESPONSE.md`  
**Date:** 2026-06-16  
**Owner:** Carlos Henrique  

## 1. Scenario

Simulated incident: repeated failed login attempts against administrative or privileged access routes, with no confirmed account compromise.

## 2. Classification

| Field | Value |
|---|---|
| Severity | SEV-4 Low |
| Systems affected | Authentication, admin dashboard, audit log |
| Data exposure | None simulated |
| Customer impact | None simulated |
| Legal/LGPD notification | Not required for this simulation |

## 3. Response walkthrough

| Step | Expected action | Result |
|---|---|---|
| Detection | Identify failed login pattern in application/Supabase logs | Procedure reviewed |
| Triage | Confirm whether failed attempts indicate abuse or user error | Procedure reviewed |
| Containment | Block source, reset affected credentials, enforce MFA where applicable | Procedure reviewed |
| Evidence preservation | Export anonymized audit events and provider logs | Procedure reviewed |
| Recovery | Confirm successful login flow remains available for legitimate users | Procedure reviewed |
| Post-incident | Register action items and update controls | Completed |

## 4. Action items

| Action | Owner | Due date | Status |
|---|---|---|---|
| Capture a real anonymized failed-login event sample after the controlled test | Carlos Henrique | 2026-06-16 | Open |
| Attach Supabase/Auth log screenshot or export | Carlos Henrique | 2026-06-16 | Open |
| Keep this simulation as Q2 incident-response evidence | Carlos Henrique | 2026-06-16 | Completed |

## 5. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | Security owner / CEO | Approved tabletop result | 2026-06-16 | This record |

