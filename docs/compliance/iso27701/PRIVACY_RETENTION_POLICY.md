# Política de Retenção e Descarte de Dados Pessoais

**Norma:** ISO/IEC 27701:2025 — A.7.4.7, A.8.4.2 | LGPD Art. 15–16  
**Documento:** SJ-PIMS-RETENTION-001 | **Versão:** 1.0 — 2026-06-16  
**Revisão:** Anual ou após alteração legal relevante

---

## 1. Princípio

Dados pessoais devem ser retidos apenas pelo tempo necessário para cumprir a finalidade que motivou sua coleta, ou enquanto houver obrigação legal. Após esse período, devem ser excluídos de forma segura ou anonimizados de modo irreversível.

---

## 2. Tabela de retenção por categoria

| # | Categoria | Sistema | Retenção mínima | Retenção máxima | Fundamento | Método de descarte |
|---|---|---|---|---|---|---|
| 1 | Conta ativa (identificadores, contato) | Supabase `auth.users`, `clientes`, `advogados` | Vigência da conta | Vigência da conta + 5 anos | LGPD Art. 16, II (obrigação legal) | Exclusão lógica + anonimização irreversível de campos PII |
| 2 | Dados profissionais (advogados) | `advogados` | Vigência do perfil | Vigência do perfil + 5 anos | Registro de atividade profissional | Exclusão via fluxo LGPD |
| 3 | Dados de casos e documentos | Tabelas de caso, Supabase Storage | Duração do caso | Duração do caso + 10 anos | LGPD Art. 16, II; retenção legal para processos | Exclusão ou anonimização conforme solicitação |
| 4 | Dados de pagamento | `transacoes` (referências), Stripe/InfinitePay | 5 anos | 7 anos | Legislação fiscal brasileira (Lei 9.430/96) | Exclusão local; retenção no processador conforme contrato |
| 5 | Solicitações de exclusão LGPD | `solicitacoes_exclusao`, audit logs | Indefinido | Indefinido | LGPD Art. 16, III (exercício regular de direitos) | Nunca descartado — evidência legal permanente |
| 6 | Auditoria de segurança (`security_audit_events`) | Supabase | 90 dias (mínimo) | 1 ano | ISO 27001 A.8.15; evidência de conformidade | Expiração automática via campo `retention_until` |
| 7 | Logs de autenticação | Supabase Auth | 30 dias | 90 dias | Segurança operacional | Rotação automática pelo Supabase |
| 8 | Dados analíticos de cartão digital | Tabela de eventos | 90 dias | 1 ano | Legítimo interesse operacional | Exclusão por rotina automatizada |
| 9 | Dados de notificação extrajudicial | `blindagem_notificacoes` | Indefinido | Indefinido | Evidência legal de citação (Art. 16, II) | Nunca descartado |
| 10 | Dados de vídeo/áudio (Jitsi) | meet.jit.si (externo) | N/A | N/A (não gravado) | Sem retenção por padrão | Não aplicável |
| 11 | Consultas à API de IA | OpenAI API | N/A | N/A (não retido) | Zero data retention na API | Não retido pelo processador |
| 12 | Sessões de escritório | `sj_escritorio_session` | Duração da sessão | Duração da sessão | Necessidade técnica | Expiração automática do cookie/sessão |

---

## 3. Procedimento de descarte

### 3.1 Exclusão por solicitação do titular (LGPD)
1. Titular solicita exclusão via canal oficial da plataforma
2. Equipe valida identidade (prazo: D+1)
3. Análise das tabelas afetadas e obrigações de retenção (D+2)
4. Execução do fluxo de purga: exclusão ou anonimização irreversível de campos PII
5. Registro do evento `LGPD_PURGE_COMPLETED` em `security_audit_events`
6. Resposta ao titular (prazo máximo: 15 dias úteis — LGPD Art. 18, §3)

### 3.2 Exclusão por expiração automática
- Campo `retention_until` em `security_audit_events` controla expiração
- Job de limpeza deve ser agendado para excluir registros com `retention_until < now()`
- Logs de execução do job devem ser mantidos

### 3.3 Anonimização irreversível
Considera-se anonimização irreversível para os fins desta política:
- Substituição de nome, e-mail e telefone por hashes SHA-256
- Remoção de UUID do usuário dos registros históricos
- Truncamento ou substituição de endereços IP

---

## 4. Responsabilidades

| Papel | Responsabilidade |
|---|---|
| Responsável pelo PIMS | Revisar e aprovar esta política anualmente |
| Equipe de engenharia | Implementar e manter mecanismos de expiração automática |
| Suporte / Compliance | Executar fluxos de solicitação LGPD dentro do prazo |

---

## Histórico de versões

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 2026-06-16 | Emissão inicial | 
