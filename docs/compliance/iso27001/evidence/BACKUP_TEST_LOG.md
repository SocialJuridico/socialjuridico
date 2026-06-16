# Backup and Recovery Test Log — Registro de Testes de Backup e Restauracao

**Controle ISO 27001:2022:** A.8.13 — Backup de informacoes | A.5.30 — Prontidao de TIC  
**Frequencia:** Semestral (ou apos mudanca relevante de infraestrutura)  
**Proprietario:** Carlos Henrique

---

## Configuracao atual de backup

| Componente | Tipo de backup | Frequencia | Retencao | Responsavel |
|---|---|---|---|---|
| Supabase PostgreSQL | Automatico (Point-in-time recovery) | Continuo | 7 dias (plano Free) / 30 dias (plano Pro) | Supabase |
| Arquivos de codigo-fonte | Repositorio Git | A cada commit | Ilimitado (controle de versao) | Carlos Henrique |
| Variaveis de ambiente | Copia manual segura | Quando alterado | Indefinido | Carlos Henrique |
| Documentos de compliance | Git + copia local | A cada revisao | Ilimitado | Carlos Henrique |

---

## Historico de testes de restauracao

### Teste planejado — 2026-Q3

| Campo | Valor |
|---|---|
| Data prevista | 2026-07-31 |
| Responsavel | Carlos Henrique |
| Objetivo | Verificar restauracao de backup do Supabase para ponto no tempo |
| Procedimento | 1. Acessar Supabase Dashboard > Backups; 2. Selecionar ponto de restauracao; 3. Validar integridade dos dados restaurados |
| Evidencia esperada | Screenshot do processo de restauracao e confirmacao de dados |
| Status | Planejado |

---

## Politica de backup relacionada

`BACKUP_AND_RECOVERY_POLICY.md`

---

## Observacoes

O plano atual do Supabase fornece backup automatico. Para ampliacao da retencao e PITR granular, upgrade para plano Pro deve ser avaliado antes de 2026-12-31.

---

**Proximo teste agendado:** 2026-07-31  
**Responsavel:** Carlos Henrique
