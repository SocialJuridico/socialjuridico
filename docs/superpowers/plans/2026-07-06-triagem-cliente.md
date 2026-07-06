# Triagem de Cliente — Índice de Intenção de Fechamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4-question client-side triage modal that produces a 0-100
"closing intent" score (AI-classified, server-side only), then route
published cases into 3 lawyer-facing tabs (Alta/Média/Oráculos) by score
tier. Also lay inert DB groundwork for a future "Oráculos" user type
(law students/graduates without OAB).

**Architecture:** Client answers 4 fixed-choice questions in a modal before
publish; answers travel with the existing `/api/casos` POST; `createCase.js`
calls a new AI classifier (OpenAI structured output, same pattern as
`caseClassifierServer.js`) to compute the score server-side and persists it
on the `casos` row. The lawyer opportunities RPC gains a tier filter +
tier counts; the lawyer dashboard gains 2 tabs and a score badge.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres (RPC + RLS), OpenAI
structured outputs (`openai` SDK, same as existing classifiers), Jest for
unit tests, CSS Modules.

## Global Constraints

- Emergency cases (`useEmergency.js` flow) never go through this triage — do not touch that flow.
- The intent score is NEVER sent from client to server as a number — only the 4 raw answers are. `createCase.js` computes the score itself.
- Client-facing UI never shows the score or tier. Only the lawyer dashboard shows it.
- Tier thresholds: `>= 80` Alta, `60-79` Média, `<= 59` Oráculos, `null` (legacy rows, pre-triage) → **Legado** (its own 4th tab, "Casos sem Triagem" — never silently folded into Alta; user explicitly required this after the first pass hid 50+ existing cases inside the Alta tab).
- The RPC's `p_intent_tier` filter is a no-op when null (no gating needed at the SQL level) — the frontend hook is the only thing that decides when to send it, and it only ever does so for the `platform`/`media`/`oraculos` feeds, never for `emergency`/`radar`.
- Oráculos tab today = same list UI as the other tabs, no extra logic (per explicit user scope cut).
- Oráculos DB groundwork (Task 3) is schema-only: RLS on, revoked from `public/anon/authenticated`, granted only to `service_role`. No route/hook/component may reference these tables yet.
- Follow existing migration conventions in `database/migrations/*.sql` (drop-and-recreate for changed function signatures, `revoke all` + `grant ... to service_role`, `updated_at` trigger pattern from `20260614_lawyer_site_requests.sql`).
- Update `triagemCliente.md`'s "Log de implementação" checklist as each task completes.

---

### Task 1: Migration — intent score columns on `casos`

**Files:**
- Create: `database/migrations/20260706_case_intent_score.sql`

**Interfaces:**
- Produces: columns `casos.intencao_fechamento` (int, nullable), `casos.intencao_respostas` (jsonb), `casos.intencao_meta` (jsonb), `casos.intencao_classificada_em` (timestamptz). Later tasks (5, 6) write to these.

- [ ] **Step 1: Write the migration**

```sql
-- Índice de Intenção de Fechamento: colunas para armazenar o score 0-100
-- calculado a partir das 4 respostas da triagem do cliente (ver
-- triagemCliente.md). Nunca aceito pronto do cliente — sempre calculado no
-- servidor em createCase.js.

alter table public.casos
  add column if not exists intencao_fechamento integer,
  add column if not exists intencao_respostas jsonb not null default '{}'::jsonb,
  add column if not exists intencao_meta jsonb not null default '{}'::jsonb,
  add column if not exists intencao_classificada_em timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'casos_intencao_fechamento_check'
  ) then
    alter table public.casos
      add constraint casos_intencao_fechamento_check
      check (intencao_fechamento is null or (intencao_fechamento >= 0 and intencao_fechamento <= 100));
  end if;
end $$;

create index if not exists idx_casos_intencao_fechamento
  on public.casos (intencao_fechamento);
```

- [ ] **Step 2: Verify the SQL is syntactically self-contained**

Run: `grep -c "alter table" database/migrations/20260706_case_intent_score.sql`
Expected: `1` (one `alter table` block; confirms the file was saved correctly, not truncated)

- [ ] **Step 3: Commit**

```bash
git add database/migrations/20260706_case_intent_score.sql
git commit -m "feat: add closing-intent score columns to casos"
```

---

### Task 2: Migration — `list_lawyer_opportunities` intent tiers + counts

**Files:**
- Create: `database/migrations/20260706_opportunities_intent_tiers.sql`

**Interfaces:**
- Consumes: `casos.intencao_fechamento` (Task 1).
- Produces: `list_lawyer_opportunities(p_lawyer_id, p_search, p_area, p_state, p_page, p_limit, p_emergency, p_intent_tier)` RPC, returning `items[]` (each item now also carries `intencao_fechamento`) plus new top-level keys `count_alta`, `count_media`, `count_oraculo`. Consumed by Task 8 (`opportunityListingServer.js`) and Task 9 (frontend hook).

- [ ] **Step 1: Write the migration**

```sql
-- Adiciona o filtro por faixa de intenção de fechamento (Alta/Média/
-- Oráculos) à listagem de oportunidades do advogado, e expõe contadores das
-- 3 faixas para popular os badges das abas sem 3 requisições. Ver
-- triagemCliente.md seção 5.

drop function if exists public.list_lawyer_opportunities(uuid, text, text, text, integer, integer, boolean);

create or replace function public.list_lawyer_opportunities(
  p_lawyer_id uuid,
  p_search text default '',
  p_area text default '',
  p_state text default '',
  p_page integer default 1,
  p_limit integer default 12,
  p_emergency boolean default null,
  p_intent_tier text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_limit integer := least(30, greatest(6, coalesce(p_limit, 12)));
  v_offset integer;
  v_search text := replace(replace(replace(btrim(coalesce(p_search, '')), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');
  v_area text := replace(replace(replace(btrim(coalesce(p_area, '')), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');
  v_state text := upper(btrim(coalesce(p_state, '')));
  v_tier text := nullif(upper(btrim(coalesce(p_intent_tier, ''))), '');
  v_result jsonb;
begin
  if p_lawyer_id is null then
    raise exception using errcode = 'P0001', message = 'Advogado não informado.';
  end if;

  if not exists (select 1 from public.advogados where id = p_lawyer_id) then
    raise exception using errcode = 'P0003', message = 'Perfil de advogado não encontrado.';
  end if;

  v_offset := (v_page - 1) * v_limit;

  with eligible as materialized (
    select
      c.id,
      c.titulo,
      c.descricao,
      c.area_atuacao,
      c.cidade,
      c.estado,
      c.status,
      c.created_at,
      c.anexos,
      c.audio_url,
      c.video_url,
      c.video_link,
      c.prioridade,
      c.tipo_social,
      c.ai_proximos_passos,
      c.ai_meta,
      c.is_emergencia,
      c.risco_vida,
      c.intencao_fechamento,
      case
        when c.intencao_fechamento is null then 'ALTA'
        when c.intencao_fechamento >= 80 then 'ALTA'
        when c.intencao_fechamento >= 60 then 'MEDIA'
        else 'ORACULO'
      end as intent_tier
    from public.casos c
    where c.advogado_id is null
      and c.status in ('ABERTO', 'NEGOCIANDO')
      and (p_emergency is null or coalesce(c.is_emergencia, false) = p_emergency)
      and not exists (
        select 1
        from public.case_interests ci
        where ci.case_id = c.id
          and ci.lawyer_id = p_lawyer_id
      )
  ),
  filtered as materialized (
    select *
    from eligible e
    where (v_state = '' or upper(coalesce(e.estado, '')) = v_state)
      and (
        v_area = ''
        or coalesce(e.area_atuacao, '') ilike '%' || v_area || '%' escape E'\\'
      )
      and (
        v_search = ''
        or coalesce(e.titulo, '') ilike '%' || v_search || '%' escape E'\\'
        or coalesce(e.descricao, '') ilike '%' || v_search || '%' escape E'\\'
        or coalesce(e.area_atuacao, '') ilike '%' || v_search || '%' escape E'\\'
        or coalesce(e.cidade, '') ilike '%' || v_search || '%' escape E'\\'
        or coalesce(e.estado, '') ilike '%' || v_search || '%' escape E'\\'
      )
  ),
  tiered as materialized (
    select *
    from filtered f
    where v_tier is null or f.intent_tier = v_tier
  ),
  paged as (
    select *
    from tiered
    order by
      case when coalesce(is_emergencia, false) then 0 else 1 end,
      case when coalesce(tipo_social, 'NENHUM') <> 'NENHUM' then 0 else 1 end,
      case prioridade when 'URGENTE' then 0 when 'PREFERENCIAL' then 1 else 2 end,
      created_at desc
    offset v_offset
    limit v_limit
  ),
  available_areas as (
    select distinct btrim(area_atuacao) as area
    from eligible
    where nullif(btrim(coalesce(area_atuacao, '')), '') is not null
    order by area
    limit 80
  )
  select jsonb_build_object(
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'titulo', p.titulo,
            'descricao', p.descricao,
            'area_atuacao', p.area_atuacao,
            'cidade', p.cidade,
            'estado', p.estado,
            'status', p.status,
            'created_at', p.created_at,
            'anexos', p.anexos,
            'audio_url', p.audio_url,
            'video_url', p.video_url,
            'video_link', p.video_link,
            'prioridade', p.prioridade,
            'tipo_social', p.tipo_social,
            'ai_proximos_passos', p.ai_proximos_passos,
            'ai_meta', p.ai_meta,
            'is_emergencia', p.is_emergencia,
            'risco_vida', p.risco_vida,
            'intencao_fechamento', p.intencao_fechamento
          )
          order by
            case when coalesce(p.is_emergencia, false) then 0 else 1 end,
            case when coalesce(p.tipo_social, 'NENHUM') <> 'NENHUM' then 0 else 1 end,
            case p.prioridade when 'URGENTE' then 0 when 'PREFERENCIAL' then 1 else 2 end,
            p.created_at desc
        )
        from paged p
      ),
      '[]'::jsonb
    ),
    'total', (select count(*) from tiered),
    'negotiating', (
      select count(*)
      from tiered
      where status = 'NEGOCIANDO'
    ),
    'count_alta', (select count(*) from filtered where intent_tier = 'ALTA'),
    'count_media', (select count(*) from filtered where intent_tier = 'MEDIA'),
    'count_oraculo', (select count(*) from filtered where intent_tier = 'ORACULO'),
    'areas', coalesce(
      (select jsonb_agg(area order by area) from available_areas),
      '[]'::jsonb
    ),
    'page', v_page,
    'limit', v_limit
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.list_lawyer_opportunities(uuid, text, text, text, integer, integer, boolean, text)
  from public, anon, authenticated;
grant execute on function public.list_lawyer_opportunities(uuid, text, text, text, integer, integer, boolean, text)
  to service_role;
```

- [ ] **Step 2: Sanity-check the tier CASE boundaries**

Run: `grep -n ">= 80\|>= 60\|else 'ORACULO'" database/migrations/20260706_opportunities_intent_tiers.sql`
Expected: 3 matches, confirming `>=80`→ALTA, `>=60`→MEDIA (i.e. 60-79), else→ORACULO (i.e. <=59), matching `triagemCliente.md` section 5.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/20260706_opportunities_intent_tiers.sql
git commit -m "feat: add intent-tier filter and tier counts to opportunities RPC"
```

---

### Task 3: Migration — Oráculos groundwork (inert schema only)

**Files:**
- Create: `database/migrations/20260706_oraculo_groundwork.sql`

**Interfaces:**
- Produces: `public.oraculo_profissionais`, `public.oraculo_case_interests` tables. Nothing in the app reads/writes these yet — no other task consumes them.

- [ ] **Step 1: Write the migration**

```sql
-- TERRENO para a futura funcionalidade "Oráculos Jurídicos": estagiários e
-- bacharéis em Direito sem OAB que vão atuar nos casos de baixa intenção de
-- fechamento (ver triagemCliente.md seção 7). Somente schema — nenhuma
-- rota, hook ou tela usa estas tabelas ainda.

create table if not exists public.oraculo_profissionais (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  escritorio_id uuid references public.escritorios(id) on delete set null,
  name text not null,
  email text not null,
  tipo text not null default 'ESTAGIARIO',
  instituicao_ensino text,
  previsao_formatura date,
  status text not null default 'PENDENTE',
  verificado boolean not null default false,
  permissoes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oraculo_profissionais_tipo_check
    check (tipo in ('ESTAGIARIO', 'BACHAREL')),
  constraint oraculo_profissionais_status_check
    check (status in ('PENDENTE', 'ATIVO', 'SUSPENSO')),
  unique (email)
);

create index if not exists idx_oraculo_profissionais_status
  on public.oraculo_profissionais (status);

create table if not exists public.oraculo_case_interests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.casos(id) on delete cascade,
  oraculo_id uuid not null references public.oraculo_profissionais(id) on delete cascade,
  status text not null default 'PENDENTE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oraculo_case_interests_status_check
    check (status in ('PENDENTE', 'EM_ANALISE', 'CONCLUIDO', 'CANCELADO')),
  unique (case_id, oraculo_id)
);

create index if not exists idx_oraculo_case_interests_case
  on public.oraculo_case_interests (case_id, created_at desc);
create index if not exists idx_oraculo_case_interests_oraculo
  on public.oraculo_case_interests (oraculo_id, created_at desc);

alter table public.oraculo_profissionais enable row level security;
alter table public.oraculo_case_interests enable row level security;

revoke all on table public.oraculo_profissionais from public, anon, authenticated;
revoke all on table public.oraculo_case_interests from public, anon, authenticated;

grant select, insert, update on table public.oraculo_profissionais to service_role;
grant select, insert, update on table public.oraculo_case_interests to service_role;

create or replace function public.set_oraculo_profissionais_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_oraculo_profissionais_updated_at on public.oraculo_profissionais;
create trigger trg_oraculo_profissionais_updated_at
before update on public.oraculo_profissionais
for each row
execute function public.set_oraculo_profissionais_updated_at();

drop trigger if exists trg_oraculo_case_interests_updated_at on public.oraculo_case_interests;
create trigger trg_oraculo_case_interests_updated_at
before update on public.oraculo_case_interests
for each row
execute function public.set_oraculo_profissionais_updated_at();
```

- [ ] **Step 2: Confirm no app code references these tables yet (must stay inert)**

Run: `grep -rl "oraculo_profissionais\|oraculo_case_interests" src/`
Expected: no output (empty) — confirms Task 3 is schema-only as required by Global Constraints.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/20260706_oraculo_groundwork.sql
git commit -m "feat: prepare inert schema groundwork for future Oraculos Juridicos"
```

---

### Task 4: Shared triage questions + deterministic fallback scoring

**Files:**
- Create: `src/lib/clientDashboard/caseIntentQuestions.js`
- Test: `src/lib/clientDashboard/__tests__/caseIntentQuestions.test.js`

**Interfaces:**
- Produces: `TRIAGE_QUESTIONS` (array, shape `{ id, question, options: [{ value, label }] }`), `computeFallbackIntentScore(respostas)` where `respostas` is `{ [questionId]: optionValue }`, returning an integer 0-100. Consumed by Task 5 (classifier fallback) and Task 7 (modal UI).

- [ ] **Step 1: Write the failing test**

```javascript
import {
  TRIAGE_QUESTIONS,
  computeFallbackIntentScore,
} from "../caseIntentQuestions";

describe("caseIntentQuestions", () => {
  test("exposes exactly 4 questions with 4 options each", () => {
    expect(TRIAGE_QUESTIONS).toHaveLength(4);
    TRIAGE_QUESTIONS.forEach((question) => {
      expect(question.options).toHaveLength(4);
    });
  });

  test("best-case answers score 100", () => {
    const score = computeFallbackIntentScore({
      objetivo: "CONDUZIR",
      prazo: "AGORA",
      advogadoAtual: "NAO",
      disponibilidade: "HOJE",
    });
    expect(score).toBe(100);
  });

  test("worst-case answers score 0", () => {
    const score = computeFallbackIntentScore({
      objetivo: "INFORMACAO",
      prazo: "NAO_PRETENDE",
      advogadoAtual: "JA_CONTRATADO",
      disponibilidade: "NAO_PRONTO",
    });
    expect(score).toBe(0);
  });

  test("clamps and defaults missing/unknown answers to 0 points", () => {
    const score = computeFallbackIntentScore({ objetivo: "CONDUZIR" });
    expect(score).toBe(30);
    expect(computeFallbackIntentScore(null)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/clientDashboard/__tests__/caseIntentQuestions.test.js`
Expected: FAIL with "Cannot find module '../caseIntentQuestions'"

- [ ] **Step 3: Write the implementation**

```javascript
export const TRIAGE_QUESTIONS = [
  {
    id: "objetivo",
    question: "O que você busca agora?",
    options: [
      {
        value: "CONDUZIR",
        label: "Quero encontrar um advogado para conduzir minha situação.",
        points: 30,
      },
      {
        value: "ANALISAR",
        label: "Quero que um advogado analise meu caso antes de decidir.",
        points: 20,
      },
      {
        value: "URGENCIA",
        label: "Preciso de atendimento com urgência.",
        points: 25,
      },
      {
        value: "INFORMACAO",
        label: "Estou apenas buscando informações sobre meus direitos.",
        points: 0,
      },
    ],
  },
  {
    id: "prazo",
    question: "Quando pretende dar andamento à situação?",
    options: [
      { value: "AGORA", label: "Quero resolver isso agora.", points: 25 },
      { value: "DIAS", label: "Nos próximos dias.", points: 15 },
      {
        value: "AVALIANDO",
        label: "Ainda estou avaliando o que fazer.",
        points: 5,
      },
      {
        value: "NAO_PRETENDE",
        label: "Não pretendo contratar um advogado neste momento.",
        points: 0,
      },
    ],
  },
  {
    id: "advogadoAtual",
    question: "Você já possui um advogado cuidando desta mesma situação?",
    options: [
      { value: "NAO", label: "Não.", points: 20 },
      {
        value: "BUSCANDO_OUTRO",
        label: "Sim, mas estou buscando outro profissional.",
        points: 15,
      },
      {
        value: "CONVERSANDO",
        label: "Estou conversando com um advogado, mas ainda não contratei.",
        points: 8,
      },
      {
        value: "JA_CONTRATADO",
        label: "Sim, já tenho advogado contratado.",
        points: 0,
      },
    ],
  },
  {
    id: "disponibilidade",
    question:
      "Se um advogado demonstrar interesse hoje, você está disponível para conversar?",
    options: [
      { value: "HOJE", label: "Sim, posso conversar hoje.", points: 25 },
      { value: "48H", label: "Sim, nas próximas 48 horas.", points: 18 },
      { value: "DIAS", label: "Somente nos próximos dias.", points: 8 },
      {
        value: "NAO_PRONTO",
        label: "Ainda não estou pronto para conversar.",
        points: 0,
      },
    ],
  },
];

export function computeFallbackIntentScore(respostas) {
  const answers = respostas && typeof respostas === "object" ? respostas : {};

  const total = TRIAGE_QUESTIONS.reduce((sum, question) => {
    const chosen = answers[question.id];
    const option = question.options.find((item) => item.value === chosen);
    return sum + (option ? option.points : 0);
  }, 0);

  return Math.max(0, Math.min(100, total));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/clientDashboard/__tests__/caseIntentQuestions.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/clientDashboard/caseIntentQuestions.js src/lib/clientDashboard/__tests__/caseIntentQuestions.test.js
git commit -m "feat: add shared triage questions and deterministic fallback score"
```

---

### Task 5: AI classifier — `classifyClosingIntent`

**Files:**
- Create: `src/lib/clientDashboard/caseIntentClassifierServer.js`
- Test: `src/lib/clientDashboard/__tests__/caseIntentClassifierServer.test.js`

**Interfaces:**
- Consumes: `TRIAGE_QUESTIONS`, `computeFallbackIntentScore` from `caseIntentQuestions.js` (Task 4).
- Produces: `async function classifyClosingIntent({ respostas, area, descricao })` returning `{ intencaoFechamento: number, meta: { justificativa: string, classifierError: string|null } }`. Consumed by Task 6 (`createCase.js`).

- [ ] **Step 1: Write the failing test**

`next/jest` loads `.env.local`, which has a real `OPENAI_API_KEY` in this
project — so the test must isolate the module (`jest.resetModules()` +
dynamic `require`) to exercise the no-key fallback path deterministically,
instead of relying on the ambient environment or hitting the real API.

```javascript
describe("classifyClosingIntent", () => {
  const baseParams = {
    respostas: {
      objetivo: "INFORMACAO",
      prazo: "NAO_PRETENDE",
      advogadoAtual: "JA_CONTRATADO",
      disponibilidade: "NAO_PRONTO",
    },
    area: "Trabalhista",
    descricao: "Relato de teste.",
  };

  test("falls back to the deterministic score when OPENAI_API_KEY is absent", async () => {
    jest.resetModules();
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const { classifyClosingIntent } = require("../caseIntentClassifierServer");
      const result = await classifyClosingIntent(baseParams);

      expect(result).toEqual({
        intencaoFechamento: 0,
        meta: { justificativa: "", classifierError: "AI_UNAVAILABLE" },
      });
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
      jest.resetModules();
    }
  });

  test("never throws even with empty answers", async () => {
    jest.resetModules();
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const { classifyClosingIntent } = require("../caseIntentClassifierServer");
      await expect(
        classifyClosingIntent({ respostas: {}, area: "", descricao: "" }),
      ).resolves.toEqual(
        expect.objectContaining({ intencaoFechamento: 0 }),
      );
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
      jest.resetModules();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/clientDashboard/__tests__/caseIntentClassifierServer.test.js`
Expected: FAIL with "Cannot find module '../caseIntentClassifierServer'"

- [ ] **Step 3: Write the implementation**

```javascript
import OpenAI from "openai";

import {
  TRIAGE_QUESTIONS,
  computeFallbackIntentScore,
} from "./caseIntentQuestions";

const CLASSIFY_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null;

const INTENT_SCHEMA = {
  name: "intencao_fechamento_socialjuridico",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["intencaoFechamento", "justificativa"],
    properties: {
      intencaoFechamento: { type: "integer", minimum: 0, maximum: 100 },
      justificativa: { type: "string" },
    },
  },
};

function clampText(value, max) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function describeAnswers(respostas) {
  const answers = respostas && typeof respostas === "object" ? respostas : {};

  return TRIAGE_QUESTIONS.map((question) => {
    const chosen = answers[question.id];
    const option = question.options.find((item) => item.value === chosen);
    return `- ${question.question}\n  Resposta: ${
      option ? option.label : "Não respondida"
    }`;
  }).join("\n");
}

function buildPrompt({ respostas, area, descricao }) {
  return `Você é um analista de qualificação de leads jurídicos do SocialJurídico.
Com base nas respostas de triagem do cliente e no resumo do caso, calcule um
ÍNDICE DE INTENÇÃO DE FECHAMENTO de 0 a 100, representando a probabilidade de
este cliente efetivamente avançar e contratar um advogado — NÃO é uma
garantia de pagamento, é uma leitura das intenções declaradas.

REGRAS:
1. Priorize o que o cliente declarou explicitamente nas respostas abaixo.
2. Cliente que só busca informação, que já tem advogado contratado, ou que
   não pretende contratar agora deve pontuar baixo (abaixo de 40).
3. Cliente que quer conduzir a situação agora, sem advogado, disponível para
   conversar imediatamente, deve pontuar alto (80 ou mais).
4. Responda somente no schema solicitado. justificativa deve ter 1 a 2
   frases objetivas.

RESPOSTAS DA TRIAGEM:
${describeAnswers(respostas)}

ÁREA JURÍDICA: ${area || "não informada"}
RESUMO DO CASO: ${clampText(descricao, 2000) || "não informado"}`;
}

function fallbackResult(respostas, classifierError = null) {
  return {
    intencaoFechamento: computeFallbackIntentScore(respostas),
    meta: {
      justificativa: "",
      classifierError,
    },
  };
}

/**
 * Classifica a intenção de fechamento (0-100) a partir das respostas da
 * triagem do cliente. Nunca lança: em qualquer falha retorna o score
 * determinístico calculado por computeFallbackIntentScore.
 *
 * @param {object} params
 * @param {object} params.respostas mapa { questionId: optionValue }
 * @param {string} [params.area]
 * @param {string} [params.descricao]
 */
export async function classifyClosingIntent({ respostas, area, descricao }) {
  if (!openai) return fallbackResult(respostas, "AI_UNAVAILABLE");

  try {
    const completion = await openai.chat.completions.create({
      model: CLASSIFY_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Você responde somente JSON válido para qualificação de leads jurídicos. Seja objetivo e conservador.",
        },
        { role: "user", content: buildPrompt({ respostas, area, descricao }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: INTENT_SCHEMA,
      },
    });

    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
    } catch {
      parsed = {};
    }

    const score = Number(parsed.intencaoFechamento);
    if (!Number.isFinite(score)) {
      return fallbackResult(respostas, "AI_INVALID_RESPONSE");
    }

    return {
      intencaoFechamento: Math.max(0, Math.min(100, Math.round(score))),
      meta: {
        justificativa: clampText(parsed.justificativa, 500),
        classifierError: null,
      },
    };
  } catch (error) {
    console.error("[CasoIA/IntençãoFechamento] Falha não fatal:", {
      status: error?.status,
      message: error?.message,
    });
    return fallbackResult(respostas, "AI_REQUEST_FAILED");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/clientDashboard/__tests__/caseIntentClassifierServer.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/clientDashboard/caseIntentClassifierServer.js src/lib/clientDashboard/__tests__/caseIntentClassifierServer.test.js
git commit -m "feat: add AI closing-intent classifier with deterministic fallback"
```

---

### Task 6: Wire the classifier into `createCase.js`

**Files:**
- Modify: `src/app/api/casos/createCase.js`

**Interfaces:**
- Consumes: `classifyClosingIntent` (Task 5).
- Consumes: `body.intencao_respostas` (raw answers object sent by Task 8's frontend change) — read the same way `body.titulo` etc. are already read.
- Produces: `casos.intencao_fechamento` / `intencao_respostas` / `intencao_meta` / `intencao_classificada_em` populated on every insert.

- [ ] **Step 1: Add the import**

In `src/app/api/casos/createCase.js`, add alongside the existing
`classifyCase` import (near line 11):

```javascript
import { classifyCase } from "@/lib/clientDashboard/caseClassifierServer";
import { classifyClosingIntent } from "@/lib/clientDashboard/caseIntentClassifierServer";
```

- [ ] **Step 2: Read the raw triage answers from the request body**

Find this block (around line 163):

```javascript
    const uploadIds = Array.isArray(body?.upload_ids)
      ? body.upload_ids.slice(0, 7)
      : [];
```

Add right after it:

```javascript
    const triageAnswers =
      body?.intencao_respostas && typeof body.intencao_respostas === "object"
        ? body.intencao_respostas
        : {};
```

- [ ] **Step 3: Call the classifier alongside the existing classification**

Find this block (around line 212-219):

```javascript
    // Classificação social/prioridade por IA (transcreve áudio/vídeo, classifica
    // o relato). Nunca lança: em falha retorna NORMAL/NENHUM sem bloquear a publicação.
    const classification = await classifyCase({
      db: access.db,
      descricao: description,
      area,
      tickets: resolvedUploads.tickets,
    });
```

Add right after it:

```javascript
    // Índice de Intenção de Fechamento (0-100), calculado só a partir das
    // respostas da triagem do cliente — nunca aceito pronto do frontend.
    // Nunca lança: em falha retorna o score determinístico de fallback.
    const intentClassification = await classifyClosingIntent({
      respostas: triageAnswers,
      area,
      descricao: description,
    });
```

- [ ] **Step 4: Persist the score on insert**

Find the `payload` object (around line 236-255) and add the 4 new fields
right after `ai_classified_at: createdAt,`:

```javascript
      ai_classified_at: createdAt,
      intencao_fechamento: intentClassification.intencaoFechamento,
      intencao_respostas: triageAnswers,
      intencao_meta: intentClassification.meta,
      intencao_classificada_em: createdAt,
      status: "ABERTO",
```

- [ ] **Step 5: Verify the route still builds**

Run: `npx next build 2>&1 | tail -30`
Expected: build completes with no new type/reference errors mentioning `createCase.js` or `caseIntentClassifierServer`.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/casos/createCase.js
git commit -m "feat: compute and persist closing-intent score on case creation"
```

---

### Task 7: Client triage modal — `ClientIntentTriage.js`

**Files:**
- Create: `src/app/dashboard/cliente/components/ClientIntentTriage.js`
- Modify: `src/app/dashboard/cliente/ClientDashboard.module.css` (append triage classes)

**Interfaces:**
- Consumes: `TRIAGE_QUESTIONS` from `caseIntentQuestions.js` (Task 4).
- Produces: `<ClientIntentTriage open submitting onCancel onComplete />` where `onComplete(respostas)` fires once all 4 questions are answered and the user confirms; `respostas` is `{ [questionId]: optionValue }`. Consumed by Task 8 (`ClientCaseComposer.js`).

- [ ] **Step 1: Write the component**

```javascript
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";

import { TRIAGE_QUESTIONS } from "@/lib/clientDashboard/caseIntentQuestions";
import styles from "../ClientDashboard.module.css";

export default function ClientIntentTriage({
  open,
  submitting,
  onCancel,
  onComplete,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      setAnswers({});
    }
  }, [open]);

  if (!open) return null;

  const question = TRIAGE_QUESTIONS[stepIndex];
  const isLastStep = stepIndex === TRIAGE_QUESTIONS.length - 1;
  const selectedValue = answers[question.id];

  function selectOption(value) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (!selectedValue) return;
    if (isLastStep) {
      onComplete(answers);
      return;
    }
    setStepIndex((current) => current + 1);
  }

  return (
    <div className={styles.modalOverlay} role="presentation">
      <section
        className={styles.mediumModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="triage-question-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>Antes de publicar</span>
            <h2 id="triage-question-title">{question.question}</h2>
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onCancel}
            disabled={submitting}
            aria-label="Cancelar publicação"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.triageProgress} aria-hidden="true">
          {TRIAGE_QUESTIONS.map((item, index) => (
            <span
              key={item.id}
              className={`${styles.triageDot} ${
                index <= stepIndex ? styles.triageDotActive : ""
              }`}
            />
          ))}
        </div>

        <div className={styles.triageOptions} role="radiogroup">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selectedValue === option.value}
              className={`${styles.triageOption} ${
                selectedValue === option.value ? styles.triageOptionSelected : ""
              }`}
              onClick={() => selectOption(option.value)}
              disabled={submitting}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className={styles.triageActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={goBack}
            disabled={stepIndex === 0 || submitting}
          >
            <ArrowLeft size={15} aria-hidden="true" /> Voltar
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={goNext}
            disabled={!selectedValue || submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={15} className={styles.spinner} aria-hidden="true" />
                Publicando...
              </>
            ) : isLastStep ? (
              "Publicar solicitação"
            ) : (
              "Próxima"
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Append the triage CSS classes**

At the end of `src/app/dashboard/cliente/ClientDashboard.module.css`, add:

```css
.triageProgress {
  display: flex;
  gap: 6px;
  margin: 4px 0 18px;
}

.triageDot {
  height: 5px;
  flex: 1;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.triageDotActive {
  background: #d4af37;
}

.triageOptions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.triageOption {
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.025);
  text-align: left;
  font-size: 0.9rem;
  line-height: 1.4;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.triageOption:hover:not(:disabled) {
  border-color: rgba(212, 175, 55, 0.3);
}

.triageOptionSelected {
  border-color: #d4af37;
  background: rgba(212, 175, 55, 0.1);
  color: #fff;
}

.triageActions {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
```

- [ ] **Step 3: Verify the file builds**

Run: `npx next build 2>&1 | tail -30`
Expected: no errors referencing `ClientIntentTriage.js` (CSS module class names resolve since they're appended to the existing file already imported by other components in the same folder).

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/cliente/components/ClientIntentTriage.js src/app/dashboard/cliente/ClientDashboard.module.css
git commit -m "feat: add client-facing intent triage modal"
```

---

### Task 8: Wire the triage modal into the publish flow

**Files:**
- Modify: `src/app/dashboard/cliente/useCaseComposer.js`
- Modify: `src/app/dashboard/cliente/components/ClientCaseComposer.js`

**Interfaces:**
- Consumes: `ClientIntentTriage` (Task 7).
- Modifies `submit`'s signature from `submit(event)` to `submit(event, triagemRespostas)` — Task 6 already reads `body.intencao_respostas` expecting this shape.

- [ ] **Step 1: Extend `submit` to accept and forward the triage answers**

In `src/app/dashboard/cliente/useCaseComposer.js`, change the `submit`
callback signature (currently `async (event) => {`, around line 431) to:

```javascript
  const submit = useCallback(
    async (event, triagemRespostas) => {
      event?.preventDefault?.();
```

Then in the `fetch("/api/casos", ...)` body (around line 460), add the new
field right after `video_link`:

```javascript
            video_link: form.videoLink || null,
            intencao_respostas: triagemRespostas || null,
```

- [ ] **Step 2: Run the existing test suite for regressions**

Run: `npx jest src/lib/clientDashboard --silent`
Expected: PASS (Tasks 4/5 tests still green; confirms no import cycle broke)

- [ ] **Step 3: Intercept the form submit in `ClientCaseComposer.js` to open the modal first**

In `src/app/dashboard/cliente/components/ClientCaseComposer.js`, add the
import and local state near the top of the component (after the existing
`useRef` imports, around line 3):

```javascript
import { useEffect, useRef, useState } from "react";
```

and inside `export default function ClientCaseComposer({ composer, onCancel }) {`
(replacing the current two `useRef` lines):

```javascript
  const attachmentsRef = useRef(null);
  const videoRef = useRef(null);
  const [triageOpen, setTriageOpen] = useState(false);

  useEffect(() => {
    if (composer.success) setTriageOpen(false);
  }, [composer.success]);

  function handleFormSubmit(event) {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    setTriageOpen(true);
  }

  function handleTriageComplete(respostas) {
    composer.submit(undefined, respostas);
  }
```

- [ ] **Step 4: Point the form at the new handler and render the modal**

Change the form tag (around line 206) from:

```javascript
    <form className={styles.composerCard} onSubmit={composer.submit}>
```

to:

```javascript
    <form className={styles.composerCard} onSubmit={handleFormSubmit}>
```

Then, right before the closing `</form>` tag is fine, but simplest is to add
the modal as a sibling right after the `</form>` closing tag — change the
component's final return so it wraps both in a fragment:

```javascript
  return (
    <>
      <form className={styles.composerCard} onSubmit={handleFormSubmit}>
        {/* ...existing form contents unchanged... */}
      </form>

      <ClientIntentTriage
        open={triageOpen}
        submitting={composer.submitting}
        onCancel={() => {
          if (!composer.submitting) setTriageOpen(false);
        }}
        onComplete={handleTriageComplete}
      />
    </>
  );
```

And add the import at the top of the file with the other local imports:

```javascript
import ClientIntentTriage from "./ClientIntentTriage";
```

- [ ] **Step 5: Verify the build**

Run: `npx next build 2>&1 | tail -30`
Expected: no errors referencing `ClientCaseComposer.js` or `useCaseComposer.js`.

- [ ] **Step 6: Manual verification path (documented, not automated — no e2e harness in this repo)**

Run: `npm run dev`, then in a browser: log in as a client, go to
`/dashboard/cliente`, start a new case, fill area/cidade/estado, click
"Publicar solicitação" → confirm the triage modal opens with question 1 of
4, confirm "Voltar" is disabled on question 1, confirm the final button
reads "Publicar solicitação" and publishing succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/dashboard/cliente/useCaseComposer.js src/app/dashboard/cliente/components/ClientCaseComposer.js
git commit -m "feat: gate case publication behind the intent triage modal"
```

---

### Task 9: Lawyer dashboard — 3 tabs + tier counts

**Files:**
- Modify: `src/lib/lawyerOpportunities/opportunityListingServer.js`
- Modify: `src/app/dashboard/advogado/oportunidade/useLawyerOpportunities.js`
- Modify: `src/app/dashboard/advogado/oportunidade/components/OpportunityDashboard.jsx`

**Interfaces:**
- Consumes: `list_lawyer_opportunities`'s new `p_intent_tier` param and `count_alta`/`count_media`/`count_oraculo` response fields (Task 2).
- Produces: `controller.activeFeed` now also accepts `"media"` and `"oraculos"`; `controller.tierCounts = { alta, media, oraculo }`; `item.intencaoFechamento` on each serialized case. Consumed by Task 10 (`OpportunityCard.jsx`).

- [ ] **Step 1: Expose the intent score and tier counts from the listing server**

In `src/lib/lawyerOpportunities/opportunityListingServer.js`, add
`intencaoFechamento` to `serializeCase` (inside the returned object, right
after `isEmergency`, around line 109):

```javascript
    isEmergency: item.is_emergencia === true,
    intencaoFechamento:
      item.intencao_fechamento === null || item.intencao_fechamento === undefined
        ? null
        : Number(item.intencao_fechamento),
```

Then in `listLawyerOpportunities`, add the `p_intent_tier` param to the RPC
call (around line 181-192):

```javascript
    // platform|media|oraculos map to the RPC's intent tiers; emergency/radar
    // feeds never send a tier (p_emergency already scopes them out).
    const feedParam = searchParams.get("feed");
    const intentTier =
      feedParam === "media"
        ? "MEDIA"
        : feedParam === "oraculos"
          ? "ORACULO"
          : feedParam === "platform"
            ? "ALTA"
            : null;

    const { data: result, error } = await access.db.rpc(
      "list_lawyer_opportunities",
      {
        p_lawyer_id: access.user.id,
        p_search: search,
        p_area: area,
        p_state: state,
        p_page: page,
        p_limit: limit,
        p_emergency: emergency,
        p_intent_tier: intentTier,
      },
    );
```

Finally, add the tier counts to the returned JSON (inside the `summary`
object, around line 224-227):

```javascript
      summary: {
        available: total,
        negotiating: Number(result?.negotiating || 0),
        countAlta: Number(result?.count_alta || 0),
        countMedia: Number(result?.count_media || 0),
        countOraculo: Number(result?.count_oraculo || 0),
      },
```

- [ ] **Step 2: Add `media`/`oraculos` feed values to the hook**

In `src/app/dashboard/advogado/oportunidade/useLawyerOpportunities.js`,
change the `params` construction in `loadOpportunities` (around line 70-74)
from:

```javascript
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
        emergency: activeFeed === "emergency" ? "true" : "false",
      });
```

to:

```javascript
      const isPlatformFeed = ["platform", "media", "oraculos"].includes(
        activeFeed,
      );
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
        emergency: activeFeed === "emergency" ? "true" : "false",
      });
      if (isPlatformFeed) params.set("feed", activeFeed);
```

Then track tier counts. Add a new state near `summary` (around line 42):

```javascript
  const [summary, setSummary] = useState({ available: 0, negotiating: 0 });
  const [tierCounts, setTierCounts] = useState({ alta: 0, media: 0, oraculo: 0 });
```

And in `loadOpportunities`, right after `setSummary(data.summary || { available: 0, negotiating: 0 });`
(around line 99), add:

```javascript
      setSummary(data.summary || { available: 0, negotiating: 0 });
      setTierCounts({
        alta: data.summary?.countAlta || 0,
        media: data.summary?.countMedia || 0,
        oraculo: data.summary?.countOraculo || 0,
      });
```

Finally, expose `tierCounts` in the hook's return object (around line 302-330,
alongside `summary,`):

```javascript
    summary,
    tierCounts,
```

- [ ] **Step 2b: Render the two new tabs**

In `src/app/dashboard/advogado/oportunidade/components/OpportunityDashboard.jsx`,
change the "Casos da plataforma" tab button (around line 135-148) label to
"Casos de Alta Intenção" and its count to the new tier count:

```javascript
          <button
            type="button"
            className={`${styles.feedTab} ${
              controller.activeFeed === "platform" ? styles.feedTabActive : ""
            }`}
            onClick={() => controller.setActiveFeed("platform")}
            aria-pressed={controller.activeFeed === "platform"}
          >
            <BriefcaseBusiness size={17} aria-hidden="true" />
            Casos de Alta Intenção
            <span className={styles.tabCount}>
              {controller.tierCounts.alta || 0}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.feedTab} ${
              controller.activeFeed === "media" ? styles.feedTabActive : ""
            }`}
            onClick={() => controller.setActiveFeed("media")}
            aria-pressed={controller.activeFeed === "media"}
          >
            <BriefcaseBusiness size={17} aria-hidden="true" />
            Casos de Média Intenção
            <span className={styles.tabCount}>
              {controller.tierCounts.media || 0}
            </span>
          </button>
          <button
            type="button"
            className={`${styles.feedTab} ${
              controller.activeFeed === "oraculos" ? styles.feedTabActive : ""
            }`}
            onClick={() => controller.setActiveFeed("oraculos")}
            aria-pressed={controller.activeFeed === "oraculos"}
          >
            <BriefcaseBusiness size={17} aria-hidden="true" />
            Oráculos Jurídicos
            <span className={styles.tabCount}>
              {controller.tierCounts.oraculo || 0}
            </span>
          </button>
```

Then render `PlatformOpportunities` for all 3 feed values (around line
216-222) — change:

```javascript
            {controller.activeFeed === "radar" ? (
              <RadarPanel />
            ) : controller.activeFeed === "emergency" ? (
              <EmergencyOpportunities controller={controller} />
            ) : (
              <PlatformOpportunities controller={controller} />
            )}
```

This already falls through to `PlatformOpportunities` for `platform`,
`media`, and `oraculos` (any value that isn't `radar`/`emergency`) — no
change needed here, since the hook's `loadOpportunities` now branches on
`activeFeed` already. Leave this block as-is; it was already correct once
Task 9 Step 2 is done.

- [ ] **Step 3: Verify the build**

Run: `npx next build 2>&1 | tail -30`
Expected: no errors referencing `OpportunityDashboard.jsx`, `useLawyerOpportunities.js`, or `opportunityListingServer.js`.

- [ ] **Step 4: Manual verification path (documented, not automated)**

Run: `npm run dev`, log in as an OAB-verified lawyer, go to
`/dashboard/advogado/oportunidade` → confirm 3 tabs read "Casos de Alta
Intenção" / "Casos de Média Intenção" / "Oráculos Jurídicos" with badge
counts, and switching tabs changes the listed cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lawyerOpportunities/opportunityListingServer.js src/app/dashboard/advogado/oportunidade/useLawyerOpportunities.js src/app/dashboard/advogado/oportunidade/components/OpportunityDashboard.jsx
git commit -m "feat: split lawyer platform feed into Alta/Media/Oraculos intent tabs"
```

---

### Task 10: Intent score badge on `OpportunityCard.jsx`

**Files:**
- Modify: `src/app/dashboard/advogado/oportunidade/components/OpportunityCard.jsx`
- Modify: `src/app/dashboard/advogado/oportunidade/Oportunidade.module.css` (append badge classes)

**Interfaces:**
- Consumes: `item.intencaoFechamento` (Task 9, `serializeCase`).

- [ ] **Step 1: Add the badge to the card**

In `src/app/dashboard/advogado/oportunidade/components/OpportunityCard.jsx`,
inside the `.badges` block (around line 46-77), add right before the
closing `</div>` of `.badges`:

```javascript
          {Number.isFinite(item.intencaoFechamento) && (
            <span className={styles.intentBadge}>
              {item.intencaoFechamento}% intenção
            </span>
          )}
        </div>
```

(replacing the existing closing `</div>` of that block with the snippet
above, which now includes it).

- [ ] **Step 2: Append the badge CSS**

At the end of `src/app/dashboard/advogado/oportunidade/Oportunidade.module.css`,
add:

```css
.intentBadge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.63rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  background: rgba(74, 222, 128, 0.12);
  color: #86efac;
  border: 1px solid rgba(74, 222, 128, 0.3);
}
```

- [ ] **Step 3: Verify the build**

Run: `npx next build 2>&1 | tail -30`
Expected: no errors referencing `OpportunityCard.jsx`.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/advogado/oportunidade/components/OpportunityCard.jsx src/app/dashboard/advogado/oportunidade/Oportunidade.module.css
git commit -m "feat: show closing-intent score badge to lawyers on opportunity cards"
```

---

### Task 11: Close out documentation

**Files:**
- Modify: `triagemCliente.md`

- [ ] **Step 1: Check off every item in the "Log de implementação" list**

Change every `- [ ]` to `- [x]` in the "Log de implementação" section of
`triagemCliente.md` (all 10 items, now that Tasks 1-10 are done).

- [ ] **Step 2: Commit**

```bash
git add triagemCliente.md
git commit -m "docs: mark triagem de cliente implementation complete"
```
