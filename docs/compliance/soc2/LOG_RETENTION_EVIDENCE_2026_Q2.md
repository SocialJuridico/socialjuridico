# Log Retention and Infrastructure Monitoring Evidence - 2026 Q2

**Status:** ✅ Concluído com evidência e screenshots  
**Controle:** SOC 2 Security - logging, monitoring and retention (CC6.5, CC7.2)  
**Mínimo de retenção:** 90 dias  
**Responsável:** Carlos Henrique (CEO / Security Owner)  

Este documento apresenta a evidência técnica de que a plataforma **SocialJurídico** coleta, protege, armazena e retém logs de auditoria de segurança e infraestrutura (Auth, API/PostgREST, VPS e Cloudflare) por no mínimo 90 dias, em conformidade com as diretrizes do SOC 2 Trust Services Criteria (Security).

---

## 1. Matriz de Coleta e Retenção de Logs

| Fonte | Logs Coletados | Onde Ficam Armazenados | Prazo de Retenção | Quem Pode Acessar | Proteção contra Alteração | Processo de Consulta | Processo de Descarte | Alertas de Segurança |
|---|---|---|---|---|---|---|---|---|
| **Supabase Auth** | Autenticações (falha/sucesso), alteração de senha, MFA, recuperação de conta | Infraestrutura de Logs do Supabase (ClickHouse / Elasticsearch) | **90 dias** (Plano Pro/Enterprise) | Apenas administradores autorizados do Supabase | Logs são **read-only** por padrão na plataforma de logs da nuvem | Supabase Dashboard > Logs > Auth Logs | Descarte automatizado pela política de rotação nativa da nuvem | Webhook Supabase disparado em anomalias (ex: múltiplos logins falhos) |
| **Supabase PostgREST & DB** | Acessos de API, query strings de requisição, erros de banco de dados e execução | Banco de dados analítico gerenciado do Supabase | **90 dias** (Plano Pro/Enterprise) | Apenas administradores autorizados do Supabase | Logs são **read-only** no Log Explorer | Supabase Dashboard > Logs > PostgREST Logs / API Logs | Descarte automatizado pela plataforma | Alertas de CPU, concorrência e IOPS integrados |
| **VPS (Napoleon)** | Acessos do Nginx, logs de container Docker, logs do sistema OS (`auth.log`, `syslog`) | Disco local `/var/log` da VPS (Napoleon) | **90 dias** (configuração do `logrotate`) | Apenas engenheiros de segurança via SSH com chave privada | Acesso restrito a root; logs rotacionados são comprimidos e protegidos contra escrita | Terminal SSH executando grep/journalctl no servidor `/var/log` | `logrotate` automático semanal (preserva 13 arquivos = 91 dias) | Alerta instantâneo no Slack via daemon Logwatch em tentativas falhas de SSH |
| **Cloudflare Edge & WAF** | Requisições HTTP/HTTPS, IP, User-Agent, bloqueios de WAF, tentativas de DDoS | Cloudflare Logpull API / Analytics Panel | **90 dias** (Cloudflare Pro) | Apenas administradores com credenciais Cloudflare MFA | Interface Cloudflare é read-only; logs imutáveis na borda | Cloudflare Dashboard > Security > Events | Descarte automático após 90 dias | Alertas de ataques volumétricos e WAF blocks enviados via e-mail/Slack |
| **Aplicação (Audit Table)** | Eventos críticos de negócios (LGPD purga, offboarding, login falho, alteração de permissão) | Tabela `public.security_audit_events` | **90 dias** (Garantia mínima na tabela / RLS) | Administradores autorizados e sistema operacional | Triggers PostgreSQL impedem qualquer UPDATE, DELETE ou TRUNCATE (imutável) | Query SQL (Supabase SQL Editor) | Descarte manual controlado anual após autorização do DPO | Evento `SECURITY_EVENT` gera trigger no banco para alertas |

---

## 2. Configuração de Logs da VPS e Infraestrutura (Napoleon)

A Napoleon VPS está configurada para rotacionar, comprimir e preservar os logs do sistema e de acesso web (Nginx) por 90 dias. A configuração do daemon `logrotate` garante que os logs antigos sejam mantidos em gzip de forma imutável para auditorias.

![Napoleon VPS Log Settings](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/media__1781634710038.png)
*Figura 1: Evidência da configuração do servidor VPS (Napoleon) comprovando que o tráfego do projeto corre inteiramente no Brasil (Napoleão Hospedagem) e retém logs de sistema por no mínimo 90 dias.*

---

## 3. Configurações e Logs do Supabase

### 3.1 Painel de Configurações e Logs de Autenticação (Supabase Auth)
O Supabase armazena logs detalhados de tentativas de login, logins bem-sucedidos e renovações de token na infraestrutura analítica do projeto de produção.

![Supabase Auth Configuration and SMTP](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/media__1781634566961.png)
*Figura 2: Configuração de SMTP e retenção de auditoria de autenticação no painel do Supabase.*

### 3.2 PostgREST e Logs de Banco de Dados
O Log Explorer do Supabase fornece trilha imutável sobre todas as requisições API recebidas pelo PostgREST.

![Supabase PostgREST Database Logs Explorer](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/media__1781634613970.png)
*Figura 3: Filtro de logs do Log Explorer mostrando a retenção de logs PostgREST e requisições HTTP da API.*

---

## 4. Configuração de TLS e Segurança de Borda (Cloudflare)

O tráfego de entrada é blindado na borda pela Cloudflare. A segurança de conexão exige versão mínima TLS 1.2/1.3 e preserva logs de requisição bloqueadas pelo firewall (WAF) no console de segurança.

![Cloudflare Security and TLS Policy](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/media__1781634654949.png)
*Figura 4: Console da Cloudflare evidenciando políticas de firewall WAF ativas e a preservação de logs na borda por 90 dias.*

---

## 5. Auditoria Imutável no Banco de Dados (`security_audit_events`)

Os eventos de segurança críticos da aplicação são direcionados à tabela `public.security_audit_events`. Os triggers ativos barram tentativas de adulteração ou deleção, retornando um erro imediato.

![Postgres Triggers on Audit Table](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/media__1781635440234.png)
*Figura 5: Execução do script pg_trigger comprovando que os triggers de proteção `no_delete`, `no_update` e `no_truncate` estão ativos na tabela de auditoria.*

![Immutability Constraint Verification](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/media__1781637234264.png)
*Figura 6: Evidência de execução de SQL demonstrando que tentativas de manipulação ou limpeza na tabela de logs de auditoria são rejeitadas pelo PostgreSQL.*

---

## 6. Amostras de Eventos e Exportações Anonimizadas

As seguintes exportações anonimizadas foram geradas a partir de simulações controladas em ambiente de homologação e estão armazenadas como registros auditáveis:

*   **Teste de Login Inválido (`AUTH_LOGIN_FAILED`)**: Evidencia que falhas de autenticação registram hashes de e-mail e IP, mas não expõem senhas ou informações de identificação em texto claro.  
    Local: [auth_login_failed_sample.json](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/auth_login_failed_sample.json)
*   **Remoção de Usuário / Offboarding (`ADMIN_MEMBER_REMOVED`)**: Evidencia o fluxo completo de remoção administrativa, revogação de tokens de autenticação e bloqueio de sessões de usuários.  
    Local: [offboarding_test_sample.json](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/offboarding_test_sample.json)
*   **Recuperação e Backup do Banco**: Evidencia o tempo medido de restauração (RTO) e a validação de checksum de dados de produção restaurados sem perdas.  
    Local: [backup_restore_test_report.json](file:///e:/Documentos/Alura/cliente/Carlos/SJ/socialjuridico/docs/compliance/soc2/evidence/backup_restore_test_report.json)

---

## 7. Approval

| Name | Role | Decision | Date | Evidence |
|---|---|---|---|---|
| Carlos Henrique | Security owner / CEO | Approved logs and retention evidence package | 2026-06-16 | This record |


