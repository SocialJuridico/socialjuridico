# Login Failure Audit Test - 2026 Q2

**Status:** ✅ Concluído com evidência  
**Control:** SOC 2 Security - authentication audit logging  
**Owner:** Carlos Henrique  
**System:** Social Juridico authentication flows and `public.security_audit_events`

## 1. Objective

Confirm that failed login attempts generate immutable audit events without storing raw passwords, raw IP addresses or sensitive tokens.

## 2. Test procedure

1. Open the login page in a controlled test session or run the programmatic test runner.
2. Attempt login with a known invalid credential or invalid password.
3. Confirm the application returns a controlled failure message.
4. Query `public.security_audit_events` for the latest failed authentication event.
5. Export only anonymized fields.

## 3. Evidence query results (Database)

```json
{
  "id": "fdc77c4d-ebd8-4308-81bc-ca01072707e6",
  "created_at": "2026-06-16T19:29:48.297+00:00",
  "event_type": "AUTH_LOGIN_FAILED",
  "actor_id": null,
  "actor_type": "UNKNOWN",
  "actor_email_hash": "6b0b60817bcb1b3fa6aa1237d5dc55ac3df57268ce03cc814a10c13dca925234",
  "target_user_id": null,
  "target_type": "USER_ACCOUNT",
  "target_email_hash": "6b0b60817bcb1b3fa6aa1237d5dc55ac3df57268ce03cc814a10c13dca925234",
  "request_ip_hash": "1e331bae134abe70596b1f0973e6fbe1aacc0261a4ebf220ca11b6c6fdd605f7",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SOC2-Test-Agent",
  "outcome": "FAILURE",
  "status_code": 401,
  "metadata": {
    "context": "controlled_test_login_failed",
    "reason_code": "INVALID_CREDENTIALS"
  },
  "retention_until": "2026-09-14T19:29:48.298+00:00",
  "event_hash": "18147b84f1f6b4091541390d3b6c955eeecb5140898ed133f865dda1a1e93cee"
}
```

## 4. Evidence record

| Item | Status | Evidence location | Date | Responsible |
|---|---|---|---|---|
| Controlled failed login performed | ✅ Executado | Simulado via `scratch/test_failed_login.mjs` | 2026-06-16 | Carlos Henrique |
| Anonymized event sample captured | ✅ Gravado | [auth_login_failed_sample.json](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/auth_login_failed_sample.json) | 2026-06-16 | Carlos Henrique |
| Raw passwords/tokens absent from evidence | ✅ Confirmado | Nenhuma senha ou token de sessão é armazenado no log | 2026-06-16 | Carlos Henrique |

## 5. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | Security owner / CEO | Approved test procedure and evidence | 2026-06-16 | This record |


