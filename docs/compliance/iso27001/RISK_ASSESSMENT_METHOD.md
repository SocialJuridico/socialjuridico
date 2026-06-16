# Information Security Risk Assessment Method

**Versao:** 2026-06-16  
**Aplicacao:** SGSI Social Juridico

## 1. Objetivo

Definir metodologia simples e repetivel para identificar, avaliar, tratar e monitorar riscos de seguranca da informacao.

## 2. Escala de probabilidade

| Valor | Nivel | Criterio |
|---:|---|---|
| 1 | Rara | Nao esperado, sem historico conhecido. |
| 2 | Baixa | Possivel, mas improvavel no ciclo atual. |
| 3 | Media | Pode ocorrer em condicoes normais. |
| 4 | Alta | Provavel, com sinais ou exposicao relevante. |
| 5 | Quase certa | Esperada ou recorrente. |

## 3. Escala de impacto

| Valor | Nivel | Criterio |
|---:|---|---|
| 1 | Baixo | Impacto interno pequeno e reversivel. |
| 2 | Moderado | Afeta usuario, mas sem dados sensiveis. |
| 3 | Relevante | Afeta dados pessoais, disponibilidade ou confianca. |
| 4 | Alto | Afeta dados juridicos, pagamentos ou operacao critica. |
| 5 | Critico | Vazamento sensivel amplo, indisponibilidade severa ou dano legal relevante. |

## 4. Calculo

`Risco inerente = probabilidade x impacto`

Classificacao:

| Pontuacao | Nivel |
|---:|---|
| 1-4 | Baixo |
| 5-9 | Medio |
| 10-16 | Alto |
| 17-25 | Critico |

## 5. Tratamento

Opcoes:

- Mitigar: implementar controle.
- Transferir: usar seguro, contrato ou fornecedor especializado.
- Aceitar: registrar justificativa.
- Evitar: remover processo, ativo ou exposicao.

## 6. Risco residual

Apos definir tratamento, calcular:

`Risco residual = probabilidade residual x impacto residual`

Riscos residuais altos ou criticos exigem aprovacao da administracao.

## 7. Revisao

- Mensal para riscos altos/criticos.
- Trimestral para riscos medios.
- Semestral para riscos baixos.
- Imediata apos incidente relevante ou mudanca estrutural.

