# Checkout do Social Jurídico: cartão Stripe e Pix Mercado Pago

Implementação de 07/09/2026. Código preparado localmente; publicação ainda não executada.

## Comportamento

- Planos mensais e anuais: cartão, assinatura automática na Stripe.
- Planos avulsos, Juris e consultas de IA: cartão Stripe ou Pix Mercado Pago.
- Formulário Stripe incorporado ao site (`EmbeddedCheckout`), sem Checkout PRO do Mercado Pago. O banco ainda pode exigir autenticação.
- Pix com QR Code e Copia e Cola, validade de uma hora e confirmação consultada no servidor.
- O backend determina produto, preço, elegibilidade e descontos. O cliente não escolhe IDs de preço arbitrários nem valores de cobrança.
- A confirmação só libera benefícios após buscar o objeto no provedor e verificar valor, moeda e vínculo. Banco registra recibo, benefícios e transação atomicamente.
- IDs da tentativa e dos provedores são preservados nas retentativas. Não há criação de pagamento ao simplesmente abrir o modal.
- Novos cartões não podem chegar ao antigo endpoint Mercado Pago: ele responde 410 pedindo recarga. Webhooks e consultas legados continuam disponíveis.
- Assinaturas antigas não são migradas automaticamente. Cancelamento identifica `sub_` (Stripe) e `mp_` (Mercado Pago). Upgrade só encerra a assinatura anterior após pagamento confirmado.
- Tentativas antigas inconclusivas continuam exigindo reconciliação; não são apagadas para liberar outra assinatura.

## Preços e ambiente

Variáveis utilizadas: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`, `NEXT_PUBLIC_PRICE_JURIS_10`, `NEXT_PUBLIC_PRICE_JURIS_20`, `NEXT_PUBLIC_PRICE_JURIS_50`, `NEXT_PUBLIC_PRICE_PRO_MONTHLY`. Credenciais Mercado Pago existentes continuam no servidor para Pix.

Verificação somente de leitura na Stripe confirmou Juris 10/20/50 a R$ 9,90 / R$ 16,90 / R$ 39,90. O preço PRO informado no ambiente está em R$ 69,90; o responsável determinou manter **R$ 150,00/mês do catálogo**. O backend usa o produto associado àquele preço e cria o item com o valor correto de R$ 150,00, sem alterar preços antigos na Stripe. START/anual/avulso/IA usam preços calculados no servidor, sem exigir novas variáveis.

Promoções do primeiro mês usam desconto Stripe de uma única fatura. A renovação conserva o valor do catálogo ou o desconto OAB/RS. Pix não é apresentado como assinatura automática.

## Banco

Migração `database/migrations/20260907_hybrid_checkout.sql` aplicada no projeto configurado em `.env`. Novas tabelas `billing_checkouts` e `billing_receipts`, com RLS e acesso somente `service_role`. A função `fulfill_hybrid_checkout` é `SECURITY INVOKER` e não pode ser chamada por `anon` ou `authenticated`.

Os testes SQL usaram tabelas temporárias isoladas e rollback, sem modificar clientes ou pagamentos reais. Testaram entrega única, duplicata, segunda cobrança avulsa, promoção inicial, renovação, duplicata fora de ordem e divergência de valor. Foram conferidas as permissões da função e RLS após aplicar a migração.

## Publicação e webhook pendentes

Não foi localizado webhook do Social Jurídico na conta Stripe consultada; existem endpoints de outro site e eles não foram alterados. A presença de `STRIPE_WEBHOOK_SECRET` no arquivo não comprova que ele pertence ao endpoint deste projeto.

1. Publicar o código e manter as variáveis no ambiente do servidor.
2. Cadastrar endpoint exclusivo **https://socialjuridico.com.br/api/webhook/stripe**, versão `2026-02-25.clover`, com:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `invoice.paid`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
3. Salvar o segredo desse endpoint em `STRIPE_WEBHOOK_SECRET` no servidor e reiniciar o serviço. Não reutilizar o segredo de webhook de outro site.
4. O utilitário `node scripts/billing/configure-stripe-webhook.cjs` apenas confere a configuração. Com `--create`, cadastra o endpoint ausente e atualiza o `.env` local sem imprimir o segredo. Não foi executada a criação durante a implementação.
5. Manter no Mercado Pago o webhook existente `/api/webhook/mercadopago` com tópico `order` e segredo correto. Continuar os tópicos necessários às assinaturas antigas.
6. Confirmar uma compra autorizada de cartão e uma de Pix, seus respectivos webhooks, ativação única e primeira renovação em ambiente de teste. Nenhuma cobrança real foi criada durante a implementação.

As credenciais disponíveis são de produção. Testes automatizados usaram provedores simulados e assinatura criptográfica de webhook de teste; não houve validação de aprovação bancária real.

## Verificação local

62 testes em oito suítes passaram, incluindo interface, preços/descontos, confirmação Pix, confirmação de fatura e assinatura do webhook. Análise estática dos arquivos modificados passou. Compilação de produção passou (há um aviso preexistente de rastreamento de arquivos em `caseClassifierServer.js`).

Comandos reproduzíveis:

```text
node node_modules/jest/bin/jest.js --config jest.config.js --runInBand --runTestsByPath src/components/TransparentCheckout/HybridCheckoutModal.test.jsx src/lib/billing/hybridPayment.test.js src/lib/billing/hybridCheckoutServer.test.js src/app/api/webhook/stripe/route.test.js src/lib/billing/mercadoPagoRecurring.test.js src/lib/billing/mercadoPagoRecurringServer.test.js
node scripts/billing/verify-hybrid-db.cjs
node node_modules/next/dist/bin/next build
```

## Valores confirmados em 07/09/2026

START: mensal R$ 40,99; avulso R$ 49,90; anual R$ 431,88. PRO: mensal R$ 150,00; avulso R$ 210,00; anual R$ 1.440,00 (R$ 120,00/mês). OAB/RS aplica 10% no START e 15% no PRO, inclusive avulsos: R$ 44,91 e R$ 178,50, respectivamente. A regra existente de não acumular cupom e OAB/RS permanece, escolhendo a melhor condição.

Juris: 10 por R$ 9,90; 20 por R$ 16,90; 50 por R$ 39,90. Todos oferecem cartão Stripe e Pix Mercado Pago.

## Correções dos modais e tentativas anteriores

O checkout híbrido agora consulta a reconciliação das assinaturas antigas, liberando apenas registros com encerramento confirmado pelo provedor e pagamentos em estado terminal. Falhas ou consultas inconclusivas preservam o bloqueio. A interface oferece verificar a tentativa anterior sem consultar um checkout inexistente.

A configuração local verificada tinha chave secreta live e pública test. A validação impede criar sessões com essa combinação; substituir NEXT_PUBLIC_STRIPE_PUBLIC_KEY pela chave pública live da mesma conta e reiniciar/republicar. Não houve alteração das credenciais nem consulta das tentativas reais nesta correção, conforme escolha do usuário.

CSS próprio do modal híbrido: seleção de método, campo Pix, QR Code, mensagens, foco e largura do formulário Stripe. Testes de interface usam respostas simuladas, sem cobranças.
