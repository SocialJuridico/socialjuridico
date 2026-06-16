# ISO/IEC 27701 PIMS Readiness

## Purpose

This folder extends the ISO/IEC 27001 ISMS kit with a Privacy Information Management System (PIMS) readiness package for Social Juridico.

ISO/IEC 27701 should be treated as a privacy extension to ISO/IEC 27001. The platform must not claim ISO/IEC 27701 certification until ISO/IEC 27001 is certified and an independent certification audit includes the PIMS scope.

## Current PIMS scope

- Public website and marketplace flows.
- Lawyer, client, office and administrator dashboards.
- Supabase Auth and application database records that contain personal data.
- LGPD deletion request workflow.
- Security audit events that store hashed identifiers.
- Public digital cards / Link na Bio and their contextual privacy notice.
- Extrajudicial notification access links used for legal citation evidence.
- Vendors that process personal data on behalf of Social Juridico.

## Document set

- `PIMS_SCOPE.md`: privacy management scope and assumptions.
- `PII_INVENTORY.md`: personal data inventory.
- `PRIVACY_ROLES_AND_RESPONSIBILITIES.md`: controller/processor roles.
- `DATA_SUBJECT_RIGHTS_PROCEDURE.md`: LGPD data subject request procedure.
- `PRIVACY_INCIDENT_PROCEDURE.md`: privacy breach handling procedure.
- `PIMS_STATEMENT_OF_APPLICABILITY.md`: initial PIMS SoA.

## Readiness status

Status: documented initial readiness.

The system has technical controls for LGPD deletion audit and security audit events, but the following items still require operating evidence:

- Approved privacy policy and privacy governance owner.
- Full PII inventory review.
- Evidence of processor/vendor privacy clauses.
- Monthly sample of data subject request handling.
- Privacy incident tabletop test.
- Formal management review including privacy risks.
