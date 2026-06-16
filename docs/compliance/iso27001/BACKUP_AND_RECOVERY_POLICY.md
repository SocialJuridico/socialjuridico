# Backup and Recovery Policy

**Versao:** 2026-06-16

## 1. Objetivo

Definir controles minimos para proteger dados e restaurar a operacao em caso de falha, erro humano, incidente de seguranca ou indisponibilidade de fornecedor.

## 2. Ativos cobertos

- Banco de dados Supabase/PostgreSQL.
- Arquivos/documentos armazenados.
- Codigo-fonte.
- Variaveis de ambiente e configuracoes criticas.
- Documentacao de compliance.

## 3. Objetivos iniciais

| Item | Meta inicial |
|---|---|
| RPO | Ate 24 horas para dados transacionais, salvo limitacao do provedor |
| RTO | Ate 24 horas para restauracao operacional inicial |
| Teste de restore | Semestral |
| Revisao de backup | Trimestral |

## 4. Diretrizes

- Confirmar backups automaticos do provedor de banco.
- Manter codigo-fonte em repositorio versionado.
- Documentar variaveis criticas sem expor valores secretos.
- Testar restauracao periodicamente.
- Registrar resultados no `EVIDENCE_REGISTER.md`.

## 5. Procedimento de restore

1. Identificar incidente e ponto de restauracao.
2. Preservar evidencias antes de sobrescrever dados.
3. Acionar restore do provedor.
4. Validar login, dashboards, APIs criticas e dados amostrais.
5. Registrar tempo real de recuperacao.
6. Abrir acao corretiva se RTO/RPO forem excedidos.

## 6. Pendencias

- Confirmar plano Supabase e politica efetiva de backup.
- Documentar local de snapshots.
- Criar checklist de restore em ambiente controlado.

