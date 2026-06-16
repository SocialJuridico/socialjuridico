# Information Security Risk Register

**Versao:** 2026-06-16

| ID | Risco | Ativo/processo | Prob. | Impacto | Inerente | Tratamento | Controle/Evidencia | Residual | Status |
|---|---|---|---:|---:|---:|---|---|---:|---|
| R-001 | Exposicao excessiva em API publica | `/api/advogados` | 3 | 3 | 9 | Mitigar | DTO publico em `src/app/api/advogados/route.js` | 4 | Mitigado inicial |
| R-002 | Scanner identifica cifras TLS fracas CBC | Cloudflare/TLS | 3 | 2 | 6 | Aceitar/mitigar | Minimum TLS ajustado; controle fino depende do plano Cloudflare | 4 | Monitorar |
| R-003 | Acesso indevido a areas privadas | Middleware/Auth | 3 | 5 | 15 | Mitigar | `middleware.js`, validacoes por perfil, Supabase Auth | 6 | Em monitoramento |
| R-004 | Exposicao de dados sensiveis em logs | APIs e webhooks | 3 | 4 | 12 | Mitigar | Revisao de logs recomendada | 8 | Aberto |
| R-005 | Falha de fornecedor critico | Supabase/Cloudflare/Stripe | 2 | 4 | 8 | Transferir/mitigar | Inventario de fornecedores; plano de continuidade pendente | 6 | Aberto |
| R-006 | Uso excessivo de dados em IA | OpenAI/rotas IA | 3 | 4 | 12 | Mitigar | Minimizacao por fluxo e politica de IA a formalizar | 8 | Aberto |
| R-007 | Credenciais ou tokens expostos | Ambientes e repositorio | 2 | 5 | 10 | Mitigar | Politica de segredos e revisao de `.env` | 6 | Aberto |
| R-008 | Falha em backup/restauracao | Supabase/arquivos | 2 | 5 | 10 | Mitigar | Politica de backup criada; teste pendente | 6 | Aberto |
| R-009 | Mudanca emergencial sem rastreabilidade | Deploy/release | 3 | 3 | 9 | Mitigar | `CHANGE_MANAGEMENT.md` | 5 | Parcial |
| R-010 | Incidente sem resposta coordenada | Operacao | 2 | 5 | 10 | Mitigar | `INCIDENT_RESPONSE.md` | 5 | Parcial |

## Revisao

Este registro deve ser atualizado quando:

- novo fornecedor critico for adicionado;
- novo modulo com dados sensiveis entrar em producao;
- auditoria ou scanner apontar achado relevante;
- incidente ocorrer;
- mudanca de infraestrutura alterar o perfil de risco.

