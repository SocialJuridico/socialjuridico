# Monitoring Log — Registro de Monitoramento

**Controle ISO 27001:2022:** A.8.16 — Atividades de monitoramento | A.8.15 — Registro de eventos  
**Frequencia:** Continuo / revisao mensal  
**Proprietario:** Carlos Henrique

---

## Fontes de monitoramento ativas

| Fonte | Tipo | O que monitora | Alerta configurado |
|---|---|---|---|
| Supabase Dashboard | Banco de dados | Uso de storage, conexoes, queries lentas | Nao — revisao manual |
| Cloudflare Analytics | Rede / seguranca | Trafego, requisicoes bloqueadas, DDoS | Sim — alertas de anomalia |
| Cloudflare WAF | Seguranca de aplicacao | Ataques SQL Injection, XSS, bots | Sim — bloqueio automatico |
| `security_audit_events` | Auditoria de aplicacao | Eventos de autenticacao e acoes administrativas | Nao — revisao manual |
| Supabase Auth Logs | Autenticacao | Tentativas de login, sessoes ativas | Nao — revisao manual |

---

## Revisao mensal de monitoramento

### Revisao 2026-06

**Data:** 2026-06-16  
**Responsavel:** Carlos Henrique

| Item | Periodo | Resultado | Anomalia |
|---|---|---|---|
| Requisicoes bloqueadas pelo Cloudflare WAF | 2026-04 a 2026-06 | Bots automatizados bloqueados; sem ataques criticos | Nenhuma |
| Tentativas de login malsucedidas | 2026-06 | Padrao normal; sem picos suspeitos | Nenhuma |
| Queries de alto custo no Supabase | 2026-06 | Nenhuma query critica identificada | Nenhuma |
| Alertas de e-mail Supabase | 2026-06 | Nenhum alerta critico recebido | Nenhuma |

#### Decisao

Sem anomalias criticas identificadas. Monitoramento continua.

**Assinatura:** Carlos Henrique — 2026-06-16

---

## Melhorias planejadas

| Melhoria | Prioridade | Prazo |
|---|---|---|
| Configurar alerta automatico para tentativas de login malsucedidas repetidas | Media | 2026-09-30 |
| Implementar dashboard de monitoramento consolidado | Baixa | 2026-12-31 |
| Configurar alertas de anomalia no `security_audit_events` | Alta | 2026-08-31 |

---

## Proxima revisao

**Data prevista:** 2026-07-16  
**Responsavel:** Carlos Henrique
