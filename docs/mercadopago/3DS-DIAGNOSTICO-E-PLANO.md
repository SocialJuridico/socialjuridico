# Hipótese histórica de 3DS — diagnóstico não confirmado

> Revisão em 07/09/2026: este documento é mantido como histórico, não como orientação de implementação. A afirmação de causa confirmada abaixo foi retirada: os registros consultados comprovam `cc_rejected_high_risk`, mas não o motivo interno que acionou a análise de risco. As instruções sobre `/v1/payments` não podem ser transferidas automaticamente para `/preapproval` ou `/v1/orders`. Não executar a proposta de cobrar a primeira parcela separadamente sem um desenho validado de recorrência e prevenção de duplicidade. Consulte [a investigação atual com evidências de produção](./INVESTIGACAO-2026-09-07.md).

## Hipótese anterior (não comprovada; texto histórico)

Cartões de crédito são recusados (`CC_VAL_433` / `cc_rejected_high_risk`) porque
**nosso checkout não implementa o 3-D Secure 2.0 (3DS)**. PIX funciona porque não
usa cartão; o Link de Pagamento do MP funciona porque tem 3DS embutido.

### Evidência decisiva
O mesmo cartão real que falha no nosso checkout foi **APROVADO** via Link de
Pagamento do MP — e nesse fluxo o titular foi **redirecionado ao banco para
autenticar** (código no app do banco). Esse redirecionamento **é** o challenge 3DS.

### Confirmação na documentação oficial
`/v1/orders` e `/v1/payments` aceitam o campo `three_d_secure_mode`:
- `"not_supported"` (padrão quando omitido): sem 3DS.
- `"optional"`: aplica 3DS quando o emissor pede (recomendado).
- `"mandatory"`: sempre exige 3DS.

Quando o challenge é necessário, a resposta vem com:
```json
{
  "status": "pending",
  "status_detail": "pending_challenge",
  "three_ds_info": {
    "external_resource_url": "https://acs.../browser_Challenges",
    "creq": "eyJ0aHJlZURT..."
  }
}
```
O frontend deve renderizar um iframe com um form `POST` para
`external_resource_url` enviando o input oculto `creq`. Ao terminar, consultar o
status do pagamento (webhook / polling / evento `message` do iframe).

> No `/v1/orders` os campos ficam dentro de
> `transactions.payments[0]` (`status_detail`, `three_ds_info`).

## Estado atual do código (o que falta)

- `src/app/api/checkout/mercadopago/route.js` (avulso, Orders API): **não** envia
  `three_d_secure_mode` no `payment_method`, e não trata `pending_challenge`.
- `src/lib/billing/mercadoPagoRecurring.js` (recorrente, `/preapproval`): mascara
  o erro como CC_VAL_433 sem tratar autenticação.
- Nenhum componente de checkout renderiza o challenge (busca por `3ds`/`challenge`
  no repositório: 0 resultados de código).

## Plano de implementação

1. **Backend avulso** (`route.js` + `client.js`):
   - Adicionar `three_d_secure_mode: "optional"` no `payment_method` do cartão.
   - Detectar `status_detail === "pending_challenge"` no retorno da order e
     devolver ao frontend `{ challenge: { external_resource_url, creq }, paymentId }`
     em vez de tratar como falha.

2. **Frontend** (modais de checkout):
   - Ao receber `challenge`, abrir modal com iframe + form auto-submit (`creq` →
     `external_resource_url`).
   - Escutar `window message` / fazer polling em um endpoint de status até o
     pagamento virar `approved`/`rejected`.

3. **Recorrente** (`/preapproval`): validar com o MP se a assinatura suporta 3DS
   inline. Caminho mais robusto: cobrar a 1ª parcela via `/v1/payments` com
   `three_d_secure_mode: "optional"` (resolvendo o challenge) e então criar a
   assinatura com o cartão já autenticado, OU migrar recorrência para o mesmo
   fluxo de Orders com 3DS.

4. **Requisito de conta:** habilitar o 3DS na aplicação/conta MP
   (Seus negócios → configurações de risco/3DS) — pré-requisito citado na doc.

## Referência
Doc oficial (via Wayback):
https://web.archive.org/web/20241105120505/https://www.mercadopago.com.br/developers/pt/docs/checkout-api/how-tos/integrate-3ds
