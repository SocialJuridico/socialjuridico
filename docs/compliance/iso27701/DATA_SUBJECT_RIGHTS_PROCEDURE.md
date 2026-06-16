# Data Subject Rights Procedure

## Supported rights

The platform must support intake, review and evidence for LGPD rights requests, including:

- Access or confirmation of processing.
- Correction of incomplete or outdated data.
- Deletion or anonymization where legally possible.
- Portability/export when applicable.
- Information about sharing and processors.

## Workflow

1. Receive request through authenticated channel or support.
2. Confirm identity and role of the requester.
3. Classify request type and legal basis.
4. Search affected systems and vendors.
5. Execute approved action.
6. Record evidence and decision rationale.
7. Notify requester of outcome.

## Deletion workflow

Deletion requests must use the LGPD request workflow and must generate immutable audit events:

- `admin_account_deletion_audit_logs` for LGPD workflow decisions.
- `security_audit_events` with `LGPD_PURGE_COMPLETED` or `LGPD_PURGE_FAILED` for SOC 2/ISO evidence.

## SLA

- Acknowledge request as soon as operationally feasible.
- Track deadline according to applicable law and internal privacy policy.
- Escalate complex or legally sensitive requests to the privacy owner.
