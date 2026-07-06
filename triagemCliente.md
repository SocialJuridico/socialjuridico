# Triagem de Cliente — Índice de Intenção de Fechamento

Documento de especificação e acompanhamento da implementação da Triagem de
Cliente no Social Jurídico. Baseado no relato `evolucao_qualificacao_cliente_social_juridico.md`,
focado apenas no fluxo de **triagem + distribuição por intenção de fechamento**
(o restante do relato — double opt-in, limite de manifestações, pesquisa de
desfecho, Social Contábil etc. — fica de fora deste escopo).

## 1. Objetivo

Antes de publicar um caso, o cliente responde 4 perguntas rápidas (uma por
vez, em um modal). A partir das respostas, o sistema calcula um **Índice de
Intenção de Fechamento (0–100%)**. Esse índice decide em qual aba o caso
aparece para os advogados. O cliente nunca vê o índice — só o advogado.

Emergências **não** passam por esta triagem (fluxo totalmente separado,
`useEmergency.js` / `EmergencyButton.js`).

## 2. Perguntas da triagem (reaproveitadas do relato, adaptadas)

Fonte única de verdade: `src/lib/clientDashboard/caseIntentQuestions.js`
(usado tanto pelo modal do cliente quanto pelo classificador no servidor).

1. **O que você busca agora?**
   `CONDUZIR` · `ANALISAR` · `URGENCIA` · `INFORMACAO`
2. **Quando pretende dar andamento à situação?**
   `AGORA` · `DIAS` · `AVALIANDO` · `NAO_PRETENDE`
3. **Você já possui um advogado cuidando desta mesma situação?**
   `NAO` · `BUSCANDO_OUTRO` · `CONVERSANDO` · `JA_CONTRATADO`
4. **Se um advogado demonstrar interesse hoje, você está disponível para
   conversar?**
   `HOJE` · `48H` · `DIAS` · `NAO_PRONTO`

## 3. Cálculo do score

`classifyClosingIntent()` (`src/lib/clientDashboard/caseIntentClassifierServer.js`)
chama a OpenAI (mesmo padrão de `caseClassifierServer.js`: schema JSON
estrito, nunca lança exceção) passando as 4 respostas + área/descrição do
caso. Retorna `{ intencaoFechamento: 0-100, meta: { justificativa } }`.

**Fallback determinístico** (sem IA, chave ausente ou erro da API): tabela de
pontos fixa em `computeFallbackIntentScore()`, no mesmo arquivo de perguntas —
somatório das opções escolhidas, já limitado a 0–100 pelo desenho da tabela.

O score é calculado **inteiramente no servidor**, dentro de `createCase.js`,
a partir das respostas enviadas pelo cliente — nunca aceito pronto do
frontend (o cliente só envia as 4 respostas, nunca um número).

## 4. Onde o score fica gravado

Migration `database/migrations/20260706_case_intent_score.sql` adiciona em
`casos`:
- `intencao_fechamento` integer, 0–100, nullable
- `intencao_respostas` jsonb, default `{}`
- `intencao_meta` jsonb, default `{}`
- `intencao_classificada_em` timestamptz

## 5. Distribuição nas abas do advogado

Migration `database/migrations/20260706_opportunities_intent_tiers.sql`
recria `list_lawyer_opportunities` com o parâmetro `p_intent_tier text`
(`'ALTA' | 'MEDIA' | 'ORACULO' | 'LEGADO'`), aplicado apenas quando
`p_emergency = false`:

- `>= 80` → **Casos de Alta Intenção** (renomeação da antiga "Casos da
  plataforma", mesmo valor de aba `platform`)
- `60–79` → **Casos de Média Intenção** (nova aba, valor `media`)
- `<= 59` → **Oráculos Jurídicos** (nova aba, valor `oraculos` — só a listagem
  básica por enquanto, sem nenhuma lógica extra)
- `intencao_fechamento is null` (casos antigos, pré-migration) → **NÃO** entra
  em nenhuma faixa triada. Fica na própria aba **"Casos sem Triagem"** (nova
  aba, valor `legado`) — pedido explícito do cliente pra não sumir os 50+
  casos já publicados antes da triagem existir nem misturá-los com casos já
  triados como Alta Intenção.

A função também devolve `count_alta` / `count_media` / `count_oraculo` /
`count_legado` (sobre o mesmo filtro de busca/área/estado) para popular os
badges das 4 abas sem 4 requisições separadas.

## 6. UI do advogado

- `OpportunityDashboard.jsx` / `useLawyerOpportunities.js`: o feed de
  plataforma tem 3 abas visíveis para advogados (`platform` → "Casos de Alta
  Intenção", `media` → "Casos de Média Intenção", `legado` → "Casos sem
  Triagem"). Emergência e Radar continuam intocados.
- **A aba "Oráculos Jurídicos" (tier `ORACULO`, baixa intenção) NÃO aparece
  neste dashboard.** Este dashboard é exclusivo de advogados (gate por
  `oabVerified`); os Oráculos são um tipo de usuário à parte (estagiários e
  bacharéis sem OAB, ver seção 7), que ainda não tem tela própria. O backend
  já classifica e reserva esses casos no tier `ORACULO` — só falta construir
  a tela dedicada dos Oráculos que vai consumir esse feed (`feed=oraculos`
  na API já existe e funciona, só não tem botão nesta tela).
- `OpportunityCard.jsx`: badge com o percentual exato (ex.: "78% intenção"),
  visível **apenas** nesse dashboard. Casos sem triagem (aba "Casos sem
  Triagem") não têm esse badge — não há score pra mostrar.

## 6.1 Templates de email por intenção de fechamento

`src/lib/emailTemplates.js` — `novoCasoTemplate` e `oportunidadeLocalTemplate`
(as duas usadas em `notifyLawyers()` de `createCase.js` pra avisar advogados
de um caso novo) agora recebem `intencaoFechamento` e mostram um selo colorido
logo abaixo do título do caso:
- `>= 80`: "Alta intenção" (verde)
- `60–79`: "Média intenção" (amarelo)
- `<= 59` (tier ORACULO): **`notifyLawyers()` nem é chamado** — ver seção 6.2.
  O selo continua existindo no template por completude, mas nunca chega a
  ser enviado nesse caso.
- `null` (caso legado sem triagem): selo não aparece, email segue igual

## 6.2 Casos Oráculos não notificam advogados

Casos classificados como ORACULO (0-59%) **não são casos de "baixa
qualidade"** — geralmente são pessoas só tirando dúvidas, não buscando
contratar. Como advogados hoje não têm acesso a esses casos (aba "Oráculos
Jurídicos" nem aparece pra eles, seção 6), `createCase.js` pula a chamada de
`notifyLawyers()` inteira (push + os dois emails) quando
`getIntentTier(intencaoFechamento) === "ORACULO"`. Casos Alta, Média e
Legado continuam notificando normalmente.

Faixas centralizadas em `getIntentTier()` /
`INTENT_TIER_LABELS`(`caseIntentQuestions.js`), mesmos limites da RPC.

## 6.3 Painel administrativo (`/dashboard/admin/casos`)

O painel do admin também reflete a intenção de fechamento, além do que já
está em `list_lawyer_opportunities`:

- `adminCasesRead.js` — `fetchCases()` agora seleciona `intencao_fechamento`;
  cada caso normalizado ganha `intencaoFechamento` (número ou `null`) e
  `intentTier` (via `getIntentTier()`, mesma faixa da RPC). O `summary`
  devolve `countAlta` / `countMedia` / `countOraculo` / `countLegado`.
- `CasesToolbar.js` ganha um filtro "Intenção" (`ALL | ALTA | MEDIA |
  ORACULO | LEGADO`), mesmo padrão dos filtros de Etapa/Privacidade já
  existentes — sem abas, o admin já usa dropdowns.
- `CaseCard.js` mostra um selo com o rótulo da faixa + percentual (quando
  houver score) ao lado dos selos de etapa/privacidade já existentes.
- `CasesSummary.js` ganha uma segunda faixa de cards com a contagem de
  casos em cada faixa (Alta / Média / Oráculos / Sem triagem).

Diferente do dashboard do advogado, aqui o admin enxerga **as 4 faixas**,
incluindo Oráculos — visão administrativa não tem a restrição de acesso
que existe para advogados (seção 6).

## 7. Terreno preparado para os Oráculos (schema apenas, sem lógica/API/UI)

Os "Oráculos Jurídicos" serão, no futuro, **estagiários e bacharéis em
Direito sem OAB** — um tipo de usuário à parte dos advogados. Por pedido
explícito do cliente, hoje só preparamos o banco:

Migration `database/migrations/20260706_oraculo_groundwork.sql`:
- `public.oraculo_profissionais` — cadastro desses profissionais
  (`tipo`: `ESTAGIARIO` | `BACHAREL`; `status`: `PENDENTE` | `ATIVO` |
  `SUSPENSO`; vínculo opcional a `escritorio_id`)
- `public.oraculo_case_interests` — futura tabela de manifestação de
  interesse desses profissionais nos casos da aba Oráculos (mesma forma de
  `case_interests`, mas para `oraculo_profissionais`)

Nenhuma API, rota ou tela usa essas tabelas ainda. RLS habilitado, acesso
revogado de `public/anon/authenticated`, só `service_role` — inertes até a
lógica ser construída.

## 8. Fora de escopo (confirmado com o cliente)

- Double opt-in, limite de manifestações, pesquisa de desfecho, funis
  separados (Oportunidades/Emergência/Radar) — ficam para uma etapa futura.
- Lógica de atribuição/trabalho dos Oráculos — só o schema hoje.
- Social Contábil — roadmap, não entra aqui.

## 9. Log de implementação

- [x] Migration: colunas de intenção em `casos` (`database/migrations/20260706_case_intent_score.sql`)
- [x] Migration: RPC `list_lawyer_opportunities` com tiers + contadores (`database/migrations/20260706_opportunities_intent_tiers.sql`)
- [x] Migration: terreno dos Oráculos (tabelas inertes) (`database/migrations/20260706_oraculo_groundwork.sql`)
- [x] `caseIntentQuestions.js` (perguntas + fallback determinístico) + teste
- [x] `caseIntentClassifierServer.js` (IA + fallback) + teste
- [x] `createCase.js` grava o score ao publicar
- [x] `ClientIntentTriage.js` (modal, uma pergunta por vez)
- [x] `useCaseComposer.js` / `ClientCaseComposer.js` — intercepta o submit
- [x] `OpportunityDashboard.jsx` / `useLawyerOpportunities.js` — 3 abas
- [x] `OpportunityCard.jsx` — badge de intenção pro advogado

**Pendente do lado do usuário:** rodar as 3 migrations acima contra o banco
Supabase real (não são aplicadas automaticamente por este repo).
