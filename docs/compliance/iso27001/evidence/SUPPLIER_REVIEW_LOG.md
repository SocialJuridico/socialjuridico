# Supplier Review Log — Revisao de Fornecedores

**Controle ISO 27001:2022:** A.5.19 — SI nas relacoes com fornecedores | A.5.22 — Monitoramento de fornecedores  
**Frequencia:** Anual  
**Proprietario:** Carlos Henrique

---

## Inventario de fornecedores criticos

| Fornecedor | Servico | Dados processados | Certificacoes / SLAs | Contrato |
|---|---|---|---|---|
| Supabase | Banco de dados PostgreSQL, autenticacao, storage | Dados de usuarios, advogados, clientes, casos juridicos | SOC 2 Type II (planejado), GDPR | Termos de servico aceitos |
| Cloudflare | CDN, DNS, WAF, protecao DDoS | Trafego de rede (sem acesso a dados de usuarios) | SOC 2 Type II, ISO 27001 | Termos de servico aceitos |
| Stripe | Processamento de pagamentos | Dados de cartao e transacoes (tokenizado) | PCI DSS Level 1 | Termos de servico aceitos |
| Resend | Servico de e-mail transacional | Enderecos de e-mail, conteudo de notificacoes | SOC 2 planejado | Termos de servico aceitos |
| OpenAI | API de inteligencia artificial | Consultas enviadas (sem dados brutos de PII obrigatorio) | SOC 2 Type II | Termos de servico aceitos |
| Vercel / Servidor VPS | Hospedagem da aplicacao | Codigo da aplicacao, logs de acesso | — | Contrato de servico |

---

## Revisao 2026-Q2 — 2026-06-16

**Responsavel:** Carlos Henrique  
**Data:** 2026-06-16

| Fornecedor | Disponibilidade nos ultimos 90 dias | Incidentes conhecidos | Renovacao de SLA | Acao |
|---|---|---|---|---|
| Supabase | > 99.9% | Nenhum | Ativo | Manter — avaliar upgrade para Pro |
| Cloudflare | > 99.99% | Nenhum | Ativo | Manter |
| Stripe | > 99.99% | Nenhum | Ativo | Manter |
| Resend | > 99.5% | Nenhum | Ativo | Manter — monitorar entregabilidade |
| OpenAI | > 99% | Intermitencias pontuais | Ativo | Manter — implementar retry logic |
| VPS | Verificado | Nenhum | Ativo | Manter |

#### Achados

Todos os fornecedores criticos estao operacionais e sem incidentes relevantes no periodo.

#### Decisao

Relacoes com todos os fornecedores mantidas. Proxima revisao anual agendada para 2027-06.

**Assinatura eletronica:** Carlos Henrique — 2026-06-16

---

## Proxima revisao

**Data prevista:** 2027-06-16  
**Responsavel:** Carlos Henrique
