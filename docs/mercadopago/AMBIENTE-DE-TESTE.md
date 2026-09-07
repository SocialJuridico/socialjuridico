# Mercado Pago — Ambiente de teste (sandbox)

Objetivo: testar cartao/3DS SEM usar credenciais de producao nem cartoes reais.

## 1. Ativar o modo teste no `.env`

Ja deixei preparado na secao MERCADO PAGO do `.env`:

```
MERCADOPAGO_SANDBOX=true
MERCADOPAGO_ACCESS_TOKEN=TEST-COLE_AQUI_O_ACCESS_TOKEN_DE_TESTE
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-COLE_AQUI_A_PUBLIC_KEY_DE_TESTE
```

As linhas de producao (APP_USR-...) ficaram comentadas logo abaixo, guardadas.

## 2. Onde pegar as credenciais de TESTE

Painel: https://www.mercadopago.com.br/developers/panel/app
1. Entre na sua aplicacao (a mesma app `2517973041625563`).
2. Menu lateral -> **Credenciais de teste**.
3. Copie:
   - **Public Key** (comeca com `TEST-....`) -> vai em `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
   - **Access Token** (comeca com `TEST-....`) -> vai em `MERCADOPAGO_ACCESS_TOKEN`

> Importante: Public Key e Access Token de teste sao do MESMO app. Nao misture
> teste com producao (foi o erro que gerou `bin_not_found` antes).

## 3. Criar usuario de teste (comprador)

Painel -> sua app -> **Contas de teste** -> criar 1 comprador (Brasil).
Guarde email/senha do comprador. O nosso backend ja gera automaticamente um
email `buyer-<id>@testuser.com` quando SANDBOX=true, entao para o fluxo do site
nem precisa logar como o comprador — basta usar os cartoes de teste abaixo.

## 4. Cartoes de teste (use estes no checkout)

Nome do titular controla o resultado da autorizacao:
- `APRO` = aprovado
- `OTHE` = recusado por erro geral
- `CONT` = pendente

| Bandeira    | Numero              | CVV | Validade |
|-------------|---------------------|-----|----------|
| Mastercard  | 5031 4332 1540 6351 | 123 | 11/30    |
| Visa        | 4235 6477 2802 5682 | 123 | 11/30    |
| Amex        | 3753 651535 56885   | 1234| 11/30    |
| Elo (debito)| 5067 7667 8388 8311 | 123 | 11/30    |

CPF de teste: `12345678909`
Titular: use `APRO` para simular aprovado (ex.: nome do titular = `APRO`).

## 5. Como testar o 3DS (challenge)

No ambiente de teste do MP, ao usar `three_d_secure_mode: "optional"` com um
cartao de teste, o MP retorna `status_detail: "pending_challenge"` e um
`three_ds_info` apontando para uma pagina de challenge SIMULADA (onde da pra
escolher aprovar/negar). E assim que validamos a UI do challenge sem banco real.

## 6. Depois de preencher o `.env`

1. `MERCADOPAGO_SANDBOX=true` (ja esta).
2. Rebuild/redeploy para embutir a `NEXT_PUBLIC_...` de teste (chave publica e
   embutida no build — precisa rebuildar, nao basta reiniciar).
3. Testar o checkout de cartao no site.

## 7. Voltar para producao (quando terminar)

1. Comentar as 2 linhas `TEST-...`.
2. Descomentar as 2 linhas `APP_USR-...` (producao).
3. `MERCADOPAGO_SANDBOX=false`.
4. Rebuild/redeploy.

## Referencia
Cartoes de teste (doc oficial):
https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/test-cards
