# Trust Services Criteria Controls Matrix (SOC 2) - 2026 Q2

**Versão:** 2026-06-16  
**Escopo:** Trust Services Criteria (TSC) - Security (Criterion Principal)  
**Status:** ✅ Operacional com evidências coletadas  

Esta matriz mapeia os controles operacionais da plataforma **SocialJurídico** aos critérios aplicáveis da AICPA para a auditoria SOC 2 Security.

---

## Matriz de Controles SOC 2

| ID | Critério SOC 2 (CC) | Controle Interno | Responsável | Frequência | Evidência de Conformidade | Status |
|---|---|---|---|---|---|---|
| **SOC-SEC-01** | **Acesso Lógico**<br>(CC6.1, CC6.2, CC6.3) | **MFA e Revisão de Acessos**:<br>- Autenticação multifator ativada para todas as contas administrativas no Supabase, GitHub e Cloudflare.<br>- Revisão trimestral ativa dos privilégios de acesso e contas de administradores. | Segurança | Trimestral | [Revisão de Administradores Q2](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/ADMIN_ACCESS_REVIEW_2026_Q2.md)<br>[Logs de Autenticação Supabase](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/LOG_RETENTION_EVIDENCE_2026_Q2.md) | ✅ Operacional |
| **SOC-SEC-02** | **Acesso Lógico**<br>(CC6.1, CC6.3) | **Offboarding e Remoção de Acesso**:<br>- Desativação imediata de credenciais de usuários e administradores desligados.<br>- Invalidação de sessões de Auth ativas e tokens JWT em tempo de execução.<br>- Trilha de auditoria da remoção de perfil. | Segurança | Por evento | [Evidência de Desligamento Controlado](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/INACTIVE_ACCESS_REMOVAL_EVIDENCE_2026_Q2.md)<br>[Amostra de Evento JSON](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/offboarding_test_sample.json) | ✅ Operacional |
| **SOC-SEC-03** | **Mudanças**<br>(CC8.1) | **Aprovação de Deploy**:<br>- Controle de versão Git via GitHub.<br>- Pull Requests exigem revisão técnica de código e aprovação prévia antes do merge em `main`. | Engenharia | Por release | [Registro de Mudanças e Aprovações Q2](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/CHANGE_APPROVAL_REGISTER_2026_Q2.md)<br>[Pull Requests do Repositório GitHub](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/CHANGE_APPROVAL_REGISTER_2026_Q2.md#4-approval) | ✅ Operacional |
| **SOC-SEC-04** | **Incidentes**<br>(CC7.3, CC7.4) | **Plano e Simulação de Incidentes**:<br>- Procedimento operacional para classificação de severidade e incidentes ativo.<br>- Simulação de segurança executada em mesa com a equipe para validar tempo de resposta. | Segurança | Semestral | [Simulação de Incidente Q2](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/INCIDENT_SIMULATION_2026_Q2.md)<br>[Políticas de Incidente da Empresa](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/INCIDENT_RESPONSE.md) | ✅ Operacional |
| **SOC-SEC-05** | **Logs e Monitoramento**<br>(CC7.2) | **Retenção de Logs**:<br>- Coleta e guarda centralizada de logs de autenticação (Supabase Auth), API (PostgREST), servidor VPS (Napoleon) e Cloudflare Edge por no mínimo 90 dias.<br>- Trilha imutável de logs de banco contra escrita ou exclusão. | Segurança | Contínuo | [Relatório e Prints de Retenção de Logs](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/LOG_RETENTION_EVIDENCE_2026_Q2.md)<br>[Configuração de Logrotate da VPS Napoleon](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/media__1781634710038.png)<br>[Triggers do PostgreSQL pg_trigger](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/media__1781635440234.png) | ✅ Operacional |
| **SOC-SEC-06** | **Fornecedores**<br>(CC9.2) | **Revisão de Terceiros e Operadores**:<br>- Avaliação anual de conformidade de privacidade e segurança dos fornecedores críticos.<br>- Mapeamento de acordos de processamento de dados (DPAs) e localização de armazenamento. | Privacidade / DPO | Anual | [Registro de Privacidade de Fornecedores](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/iso27701/VENDOR_PRIVACY_REGISTER.md)<br>[Inventário Geral de Ativos e Fornecedores](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/VENDOR_AND_ASSET_REGISTER.md) | ✅ Operacional |
| **SOC-SEC-07** | **Backups & Disponibilidade**<br>(CC6.5) | **Backup e Restauração**:<br>- Backups lógicos/físicos automáticos diários ativados no Supabase.<br>- Testes de restauração controlados trimestrais para aferir RTO e certificar integridade via checksum SHA-256. | Infraestrutura | Trimestral | [Evidência do Teste de Restauração](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/BACKUP_RESTORE_EVIDENCE_2026_Q2.md)<br>[Relatório de Backup JSON](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/backup_restore_test_report.json) | ✅ Operacional |

---

## Descrição dos Status de Controle

*   **Operacional**: O controle está ativo, as evidências necessárias para o período atual foram geradas e validadas por testes práticos ou de mesa.
*   **Parcial**: O controle existe e é executado, mas necessita de refinamento metodológico ou ferramentas adicionais de monitoramento.
*   **Planejado**: O controle foi definido conceitualmente no sistema de gestão de segurança, mas ainda não possui histórico operacional ou implementação concluída.
