# Recusas de cartão — investigação de 07/09/2026

## Conclusão e limites

Foi confirmado em consultas somente de leitura à API de produção que os pagamentos recusados encontrados em 06 e 07/09 têm `status_detail=cc_rejected_high_risk`. Isso confirma a classificação de risco informada pelo Mercado Pago, mas não revela os fatores internos que provocaram essa classificação. Não existe evidência suficiente para declarar falta de 3DS, bloqueio da conta, erro de banco ou ausência de CPF como causa raiz.

Não foi localizada nesta pesquisa uma definição oficial pública que permita traduzir `CC_VAL_433` em uma causa única. O código recebido na criação da assinatura e o motivo do pagamento gerado devem ser correlacionados pelos registros da mesma tentativa; não são códigos universalmente intercambiáveis.

O checkout transparente ainda não foi reativado. Não houve nova cobrança, cancelamento, alteração de credenciais, deploy nem mudança no painel do Mercado Pago durante esta investigação.

## Evidências consultadas

Fonte: `GET /v1/payments/search`, com `range=date_created`, início `2026-09-06T00:00:00.000-03:00`, fim `2026-09-07T23:59:59.999-03:00`, limite 100. Consulta HTTP 200; `paging.total=25`, 25 resultados retornados até o momento da consulta. Todos com `live_mode=true`.

- 22 recusas, todas `cc_rejected_high_risk`.
- 2 aprovações Pix.
- 1 aprovação por cartão.
- Há tentativas com referências de diagnóstico e repetições. Esses números não representam 25 clientes distintos nem exclusivamente compras comerciais.

Quatro objetos foram confirmados individualmente por `GET /v1/payments/{id}`, todos com HTTP 200. Horários abaixo convertidos para São Paulo (UTC−03):

| Pagamento | Data e hora | Valor | Resultado | Canal confirmado pela API |
| --- | --- | --- | --- | --- |
| 177642313982 | 06/09 18:25:04 | R$ 39,99 | `cc_rejected_high_risk` | `SUBSCRIPTIONS` / `recurring` |
| 176680769991 | 06/09 18:27:20 | R$ 39,99 | `cc_rejected_high_risk` | `SUBSCRIPTIONS` / `recurring` |
| 177678683400 | 06/09 23:03:19 | R$ 1,00 | `approved` / `accredited` | `CHECKOUT` / `payment_link` |
| 176798366731 | 07/09 14:06:02 | R$ 5,00 | `cc_rejected_high_risk` | `SUBSCRIPTIONS` / `recurring` |

As primeiras duas recusas consultadas são Visa e Mastercard, com emissores distintos. A vinculação nominal aos dois clientes mencionados pelo responsável ainda depende dos horários/IDs que ele possui; não foram coletados nomes, documentos ou dados de cartão.

O pagamento aprovado é efetivamente Link de Pagamento. Os quatro objetos consultados não retornaram `three_ds_info`; a ausência desse campo não prova presença nem ausência de autenticação em cada fluxo. Também não é possível inferir os dados enviados originalmente apenas de campos ausentes na resposta da API.

## O que o código explica

Revisão local baseada em `9a77f77`, antes das correções deste trabalho; o commit instalado na VPS não foi verificado.

1. **A assinatura permanece em `/preapproval`.** `HostedCheckoutModal.jsx` inicia o fluxo sem token; `mercadoPagoRecurring.js` gera `status=pending`, e `mercadoPagoRecurringServer.js` devolve o `init_point`. Com token, o mesmo serviço gera `status=authorized`. Isso é assinatura com autorização hospedada. A criação de preferências em `/checkout/preferences` é usada para produtos não recorrentes. Trocar a interface e o tipo declarado da aplicação não substituiu a API de assinaturas no código.
2. **O HTTP 422 pode ser produzido pelo site.** `src/lib/mercadopago/client.js` converte respostas 4xx do provedor para 422. O status original fica em `providerStatus`. Portanto, o 422 do navegador isoladamente não identifica o tipo de rejeição do Mercado Pago.
3. **Não há envio explícito de `X-meli-session-id`.** O cliente HTTP não encaminha Device ID. A documentação de assinaturas recomenda essa informação. É uma lacuna a corrigir e verificar no fluxo transparente, não uma causa raiz demonstrada nem uma promessa de aprovação. O SDK pode coletar sinais próprios; coleta pelo SDK e encaminhamento pelo backend são verificações distintas.
4. **Retentativa insegura encontrada.** A reconciliação marcava a tentativa como rejeitada inclusive se a consulta ao provedor falhasse. Também aceitava busca vazia ou um pagamento recusado como suficiente, mesmo podendo existir uma assinatura autorizada. Isso podia liberar nova tentativa sem confirmação segura.
5. **Outros pontos pendentes antes da reativação:** escolha de ambiente por hostname difere da seleção das credenciais; sandbox pode cair em credencial de produção se a chave de teste faltar; o modal consulta `/status?reference=...`, mas essa rota exige `paymentId`, `orderId` ou `subscriptionId`; o erro de criação não devolve a referência preservada. Esses pontos não foram tratados como causa das recusas históricas.

## Correção local aplicada e verificação

`mercadoPagoRecurringServer.js` agora preserva o bloqueio se houver erro de consulta, busca incompleta/vazia, assinatura ainda ativa, pagamento aprovado/pendente ou falha de persistência. Só libera a tentativa quando encontra assinaturas em estado terminal, buscas completas e pagamentos compatíveis com encerramento, e confirma a atualização condicional no banco. Erros arbitrários do provedor deixaram de ser impressos nesse trecho.

Consequência intencional: casos sem evidência conclusiva exigem reconciliação operacional. Não se deve apagar a tentativa ou marcar como rejeitada apenas para desbloquear a compra. Não se trata ainda de uma solução completa de concorrência/idempotência para requisições simultâneas.

Foram adicionados testes de regressão e o mapeamento de imports `@/` na configuração utilizada por `npm test`. Resultado: **25 testes aprovados em duas suítes**. Os testes da reconciliação usam serviços simulados; não houve alteração de transações reais para testar. A correção não foi publicada e não foi apresentada como solução para `high_risk`.

## Como concluir a investigação e voltar ao transparente

1. Encaminhar ao suporte técnico os IDs acima, aplicação/conta identificadas no painel, horário e `x-request-id` do erro original de `/preapproval`, se disponível. Solicitar análise da validação inicial de cartão e da classificação de risco no canal Assinaturas. Os fatores internos não podem ser recuperados por dedução a partir do erro genérico.
2. Confirmar no ambiente realmente publicado a aplicação/conta das duas credenciais, modo produção, versão do código e ausência de identidade de teste. Sandbox aprovado valida o funcionamento simulado, não a aprovação do comprador em produção.
3. Preparar a coleta e o encaminhamento de Device ID conforme a documentação do produto, resolver a consulta de tentativas e validar idempotência/concorrência. Registrar somente IDs, códigos e indicadores de presença, nunca cartão, token, documento ou payload bruto.
4. Validar com o Mercado Pago como 3DS se aplica especificamente ao produto de assinaturas contratado. Não adicionar `three_d_secure_mode` por analogia de outra API, nem criar cobrança avulsa e assinatura automaticamente para contornar a falha.
5. Testar criação, falha, timeout, consulta, webhook, primeira cobrança e ativação sem duplicidade em ambiente de teste. Depois, realizar uma compra real controlada e autorizada, verificando aprovação efetiva, vínculo da assinatura, benefícios e valor/ciclo da renovação. Evitar séries de tentativas repetidas como método de investigação.
6. Reativar gradualmente após essas verificações. Nenhum checkout pode garantir aprovação de todos os cartões; o critério é uma integração correta, observável e sem cobranças duplicadas, com as recusas explicáveis pelo provedor.

## Texto para o suporte técnico (não enviado)

Solicitamos análise técnica das recusas de produção do Social Jurídico em 06 e 07/09/2026. Na criação de assinaturas, o site recebeu `CC_VAL_433`. Consultamos os pagamentos 177642313982 (06/09 18:25:04 BRT, R$ 39,99) e 176680769991 (06/09 18:27:20 BRT, R$ 39,99): ambos apresentam `cc_rejected_high_risk`, `point_of_interaction.type=SUBSCRIPTIONS` e `business_info.sub_unit=recurring`. A tentativa 176798366731 (07/09 14:06:02 BRT, R$ 5,00) tem a mesma classificação. Em contrapartida, 177678683400 (06/09 23:03:19 BRT, R$ 1,00) foi aprovado no canal `payment_link`.

Precisamos confirmar a relação entre a falha de validação inicial e esses pagamentos, se há restrição aplicável à conta/aplicação no canal Assinaturas e quais requisitos técnicos verificáveis faltam na integração. Solicitamos orientação específica sobre sinais de dispositivo e eventual autenticação 3DS em `/preapproval`. Não estamos solicitando desativação do antifraude. Favor fornecer protocolo e encaminhar os IDs para análise técnica, evitando orientar novas tentativas sucessivas sem diagnóstico.

## Referências oficiais consultadas

- [Motivos de recusa e classificação de risco](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/how-tos/improve-payment-approval/reasons-for-rejection).
- [Assinatura pendente e conclusão por link](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments).
- [Assinatura autorizada e retentativas de parcelas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments).
- [Recomendações para assinaturas e Device ID](https://www.mercadopago.com.br/developers/en/docs/subscriptions/how-tos/improve-payment-approval/recommendations).
- [3DS na Payments API — escopo diferente de `/preapproval`](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/how-tos/integrate-3ds).
