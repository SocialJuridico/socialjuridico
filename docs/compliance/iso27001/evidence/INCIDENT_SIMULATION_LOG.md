# Incident Simulation Log — Registro de Simulacao de Incidente

**Controle ISO 27001:2022:** A.5.24 — Planejamento para gestao de incidentes | A.5.26 — Resposta a incidentes  
**Frequencia:** Semestral  
**Proprietario:** Carlos Henrique

---

## Simulacao 2026-Q2 — 2026-06-16

**Tipo de incidente simulado:** Acesso nao autorizado a dados de usuarios (hipotetico)  
**Data da simulacao:** 2026-06-16  
**Participantes:** Carlos Henrique (CEO / responsavel pela SI), Saulo Pavanello (Engenheiro de Software)  
**Metodo:** Walkthrough tabletop — nao foram executadas acoes em producao

---

### Cenario simulado

> Um usuario reporta que conseguiu visualizar dados de outro usuario ao manipular o ID na URL do dashboard. O incidente e classificado como **acesso indevido a dados pessoais** com potencial impacto sob LGPD.

---

### Passos executados no walkthrough

| Passo | Acao | Responsavel | Tempo estimado |
|---|---|---|---|
| 1 | Deteccao: usuario reporta anomalia via e-mail de suporte | Qualquer colaborador | — |
| 2 | Triagem: responsavel pela SI avalia gravidade (Critico/Alto/Medio/Baixo) | Carlos Henrique | 15 min |
| 3 | Contencao: desativar conta comprometida se necessario; bloquear endpoint via Cloudflare | Carlos Henrique | 30 min |
| 4 | Investigacao: revisar logs em `security_audit_events` para identificar extensao do acesso | Carlos Henrique / Engenheiro | 2h |
| 5 | Notificacao interna: registrar incidente e acionar equipe tecnica | Carlos Henrique | 30 min |
| 6 | Comunicacao ao usuario afetado (se dados pessoais expostos) | Carlos Henrique | 24h apos confirmacao |
| 7 | Notificacao ANPD (se vazamento de dados pessoais, prazo de 72h) | Carlos Henrique | 72h apos ciencia |
| 8 | Correcao: aplicar patch e testar | Engenheiro | Variavel |
| 9 | Acao corretiva: registrar em `CORRECTIVE_ACTION_REGISTER.md` | Carlos Henrique | 48h apos resolucao |
| 10 | Licoes aprendidas: reuniao post-mortem | Equipe | 1 semana apos resolucao |

---

### Lacunas identificadas na simulacao

| Lacuna | Prioridade | Acao corretiva | Prazo |
|---|---|---|---|
| Canal de relato de incidentes nao formalizado | Media | Definir e-mail ou form dedicado em `INCIDENT_RESPONSE.md` | 2026-08-31 |
| Procedimento de notificacao ANPD nao detalhado | Alta | Detalhar formulario e prazo em INCIDENT_RESPONSE.md | 2026-07-31 |

---

### Resultado da simulacao

A equipe demonstrou capacidade de executar os passos principais de contencao e investigacao. As lacunas identificadas serao tratadas como acoes corretivas.

**Aprovado por:** Carlos Henrique — 2026-06-16

---

## Proxima simulacao

**Data prevista:** 2026-12-16  
**Cenario sugerido:** Simulacao de vazamento de dados via fornecedor terceiro (ex: incidente hipotetico no Supabase)
