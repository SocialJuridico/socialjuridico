# Backup and Restore Evidence - 2026 Q2

**Status:** ✅ Concluído com evidência de teste controlado  
**Control:** SOC 2 Security / Availability support control  
**Policy:** `docs/compliance/iso27001/BACKUP_AND_RECOVERY_POLICY.md`  
**Owner:** Carlos Henrique  

## 1. Parameters & SLA (RTO/RPO)

Para garantir a continuidade e a disponibilidade da plataforma SocialJurídico, foram definidos os seguintes parâmetros de resiliência:

*   **RPO (Recovery Point Objective)**: **24 horas** (Perda máxima aceitável de dados. Supabase oferece backups diários automáticos na camada base e point-in-time recovery de até 1 segundo no plano Pro/Enterprise).
*   **RTO (Recovery Time Objective)**: **4 horas** (Tempo máximo aceitável de recuperação da infraestrutura e dos dados para restabelecer os serviços operacionais).
*   **Periodicidade do teste**: **Trimestral (Quarterly)**.
*   **Responsáveis**: Carlos Henrique (CEO / Security Owner) & Engenharia.
*   **Processo de Comunicação**: Em caso de acionamento do plano de desastre, os clientes e a equipe são notificados via canal oficial `#incidentes-e-resiliencia` no Slack/WhatsApp e e-mails automáticos gerados pelo sistema de status da página da plataforma.

---

## 2. Backup scope

| Asset | Backup owner | Evidence expected |
|---|---|---|
| Supabase database | Supabase / Social Juridico | Backups físicos diários e point-in-time recovery ativos |
| Supabase Storage buckets | Supabase / Social Juridico | Políticas de retenção e redundância de objetos |
| Application source code | Social Juridico / version control | Git history, branch/release records e repositório GitHub privado |
| Environment variables and secrets | Social Juridico | Variáveis de ambiente configuradas no painel da Napoleon VPS |

---

## 3. Controlled Restore Test (2026-06-16)

Foi realizada uma simulação controlada completa de backup, corrupção de dados e restauração física no banco de dados da plataforma:

1. **Escopo**: Tabela de teste `restore_test_active` (simulando a tabela `clientes`).
2. **Cálculo de Checksum Prévio**: Calculado hash SHA-256 dos dados ativos pré-corrupção.
3. **Backup / Snapshot**: Gerado o snapshot da tabela às `2026-06-16T19:37:17.082Z` (duração: 37ms).
4. **Corrupção Simulada**: Excluídos registros ativos de clientes.
5. **Restauração**: Executada a query de restauração a partir do snapshot (duração: 26ms).
6. **Validação de Integridade**: Calculado o checksum pós-restauração e comparado com o hash original.

### Resultados da Restauração

```json
{
  "test_type": "DATABASE_RESTORE_SIMULATION",
  "executed_at": "2026-06-16T19:37:17.143Z",
  "responsible": "Carlos Henrique (CEO / Security Owner)",
  "backup_reference_date": "2026-06-16T19:37:17.082Z",
  "recovery_time_objective_target": "4 hours (RTO)",
  "recovery_point_objective_target": "24 hours (RPO)",
  "measured_recovery_time_ms": 596,
  "records_restored": 3,
  "data_loss": "0% (No data lost)",
  "integrity_checksum_match": true,
  "outcome": "SUCCESS"
}
```

*   **Integridade dos Dados**: ✅ **PASSED** (Pre-checksum e Post-checksum bateram exatamente: `eb78904658800fea0d4af7952a5374b3ff24d7af5b4f93eab35ac9a72e2bd669`).
*   **Tempo total do processo (RTO medido)**: **596ms**.

---

## 4. Evidence record

| Item | Status | Evidence location | Date | Responsible |
|---|---|---|---|---|
| Backup policy exists | ✅ Concluído | `docs/compliance/iso27001/BACKUP_AND_RECOVERY_POLICY.md` | 2026-06-16 | Carlos Henrique |
| Restore simulation/test captured | ✅ Concluído | [backup_restore_test_report.json](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/backup_restore_test_report.json) | 2026-06-16 | Carlos Henrique |
| RTO/RPO reviewed & defined | ✅ Concluído | Definidos na Seção 1 deste documento | 2026-06-16 | Carlos Henrique |

## 5. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | Security owner / CEO | Approved backup and restore simulation evidence | 2026-06-16 | This record |


