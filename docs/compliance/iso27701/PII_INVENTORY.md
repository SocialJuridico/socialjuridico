# PII Inventory

| Data category | Data subjects | Purpose | Main location | Retention note | Protection |
|---|---|---|---|---|---|
| Account identifiers | Clients, lawyers, office staff, admins | Authentication and account management | Supabase Auth, app tables | Account lifecycle plus legal/audit retention | Auth controls, RLS/service role boundaries |
| Contact data | Clients, lawyers, office staff | Communication, support, matching and notifications | `clientes`, `advogados`, `escritorios` | Until account deletion or legal retention applies | Role-based access |
| Professional data | Lawyers | OAB validation, marketplace profile and trust | `advogados` | While profile is active or retained by legal need | Profile minimization in public API |
| Case data | Clients, lawyers | Legal service workflow | Case and message tables | According to platform retention and legal hold | Private dashboards and audit controls |
| Payment data | Customers | Billing and subscription management | Stripe, transaction tables | Contractual and fiscal retention | Vendor controls and limited local storage |
| Deletion request data | Clients, lawyers | LGPD rights management | `solicitacoes_exclusao` and audit logs | Restricted legal/audit retention | Append-only audit trail |
| Security audit data | All users | SOC 2/ISO evidence and incident response | `security_audit_events` | Minimum 90 days | Hashed email/IP, append-only controls |
| Public card analytics | Public visitors, lawyers | Security, aggregated metrics and abuse prevention for Link na Bio / digital card | Digital card event table | Operational analytics retention | IP hash, user-agent, referrer domain and contextual privacy notice |
| Extrajudicial notification access data | Notification recipients | Legal citation evidence, chain of custody and document access traceability | `blindagem_notificacoes` | Legal/audit retention | Timestamp, IP/User-Agent evidence, SHA-512 document hash and explicit purpose notice |
| Office session data | Office administrators and members | Multi-tenant access governance for enterprise workspaces | `sj_escritorio_session` and signature cookie | Session lifetime | HMAC-signed cookie, HTTP-only, same-site and secure in production |

## Review cadence

- Review quarterly or after a material feature launch.
- Record changes in `docs/compliance/EVIDENCE_REGISTER.md`.
