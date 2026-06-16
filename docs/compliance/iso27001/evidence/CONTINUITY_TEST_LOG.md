# Continuity and Recovery Test Log — Registro de Teste de Continuidade

**Controle ISO 27001:2022:** A.5.29 — SI durante disrupcao | A.5.30 — Prontidao de TIC  
**Frequencia:** Semestral  
**Proprietario:** Carlos Henrique

---

## Cenarios de disrupcao mapeados

| ID | Cenario | Probabilidade | Impacto | RTO estimado | RPO estimado |
|---|---|---|---|---|---|
| DC-001 | Indisponibilidade do Supabase (banco) | Baixa | Critico | 4 horas | 1 hora (backup PITR) |
| DC-002 | Indisponibilidade do Cloudflare (CDN/DNS) | Muito baixa | Alto | 2 horas | N/A |
| DC-003 | Indisponibilidade do Resend (e-mail) | Baixa | Medio | 24 horas | N/A |
| DC-004 | Vazamento de credenciais de ambiente | Media | Critico | 2 horas (rotacao) | N/A |
| DC-005 | Comprometimento do repositorio | Muito baixa | Alto | 4 horas | Ultimo commit |

**RTO** = Recovery Time Objective (tempo maximo aceitavel para retomar o servico)  
**RPO** = Recovery Point Objective (perda maxima aceitavel de dados)

---

## Historico de testes

### Teste tabletop — 2026-06-16

**Cenario:** DC-001 — Indisponibilidade do Supabase  
**Metodo:** Walkthrough mental / tabletop  
**Participantes:** Carlos Henrique, Saulo Pavanello

#### Passos verificados

| Passo | Acao | Responsavel | Resultado |
|---|---|---|---|
| 1 | Detectar indisponibilidade via monitoramento Supabase Status Page | Carlos Henrique | Confirmado — URL: status.supabase.com |
| 2 | Notificar usuarios via banner na plataforma (se possivel) | Carlos Henrique | Processo informal — a automatizar |
| 3 | Aguardar resolucao pelo Supabase (SLA) | — | SLA de 99.9% verificado |
| 4 | Se prolongado (> 4h): comunicar usuarios e parceiros | Carlos Henrique | Processo a documentar |
| 5 | Apos retorno: verificar integridade dos dados | Engenheiro | Confirmado via painel Supabase |

#### Lacunas identificadas

| Lacuna | Acao | Prazo |
|---|---|---|
| Sem pagina de status propria da plataforma | Criar pagina de status ou integrar Statuspage.io | 2026-09-30 |
| Sem comunicacao automatizada de incidente aos usuarios | Implementar notificacao via OneSignal em caso de falha | 2026-09-30 |

---

## Proxima revisao

**Data prevista:** 2026-12-16  
**Responsavel:** Carlos Henrique
