-- ============================================================
-- supabase/migrations/20260710150000_create_oraculo_legal_library.sql
-- ============================================================
-- Biblioteca Jurídica do Oráculo Acadêmico.
--
-- Base legal estruturada, pesquisável e VERSIONADA. Não guarda PDFs nem blobs:
-- a lei é quebrada em unidades (título/capítulo/artigo/…) vinculadas a uma
-- VERSÃO do documento. A versão consultada é preservada historicamente para que
-- uma análise antiga não mude silenciosamente após alteração legislativa.
--
-- Hierarquia:
--   collection (o "livro": CDC, CF/88, …)
--     -> document (ato normativo: Lei nº 8.078/1990)
--        -> document_version (versão importada/publicada, com hash)
--           -> unit (título/capítulo/artigo/parágrafo/inciso; árvore)
--
-- Acesso via service role (supabaseAdmin) no servidor; RLS habilitado.

-- ---------------------------------------------------------------------------
-- 1. Coleções (livros exibidos ao estudante)
-- ---------------------------------------------------------------------------
create table if not exists public.oraculo_legal_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_title text,
  description text,
  -- CONSTITUTIONAL, CIVIL, CIVIL_PROCEDURE, CRIMINAL, CONSUMER, LABOR, TAX, …
  category text not null default 'OTHER',
  jurisdiction text not null default 'FEDERAL',
  -- Identidade editorial própria (theme/accent/symbol/shortTitle). Sem capas de editoras.
  cover_config jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  -- DRAFT, ACTIVE, PAUSED, ARCHIVED
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oraculo_legal_collections_status_check
    check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'))
);

create index if not exists idx_oraculo_legal_collections_status
  on public.oraculo_legal_collections (status, display_order);

-- ---------------------------------------------------------------------------
-- 2. Documentos (atos normativos)
-- ---------------------------------------------------------------------------
create table if not exists public.oraculo_legal_documents (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.oraculo_legal_collections(id) on delete cascade,
  slug text not null,
  -- CONSTITUTION, LAW, COMPLEMENTARY_LAW, DECREE, CODE, …
  document_type text not null default 'LAW',
  number text,
  year integer,
  official_title text not null,
  short_title text,
  ementa text,
  jurisdiction text not null default 'FEDERAL',
  authority text,
  -- Fonte oficial (obrigatória): a IA nunca é fonte da legislação.
  source_name text,
  source_url text,
  source_identifier text,
  source_urn text,
  publication_date date,
  effective_date date,
  -- ACTIVE, REVOKED, PARTIALLY_REVOKED, SUSPENDED, ARCHIVED
  status text not null default 'ACTIVE',
  current_version_id uuid,
  last_source_check_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oraculo_legal_documents_slug_unique unique (collection_id, slug)
);

create index if not exists idx_oraculo_legal_documents_collection
  on public.oraculo_legal_documents (collection_id);

-- ---------------------------------------------------------------------------
-- 3. Versões do documento (versionamento obrigatório)
-- ---------------------------------------------------------------------------
create table if not exists public.oraculo_legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.oraculo_legal_documents(id) on delete cascade,
  version_number integer not null,
  source_hash text,
  raw_content_reference text,
  normalized_content_hash text,
  source_checked_at timestamptz,
  effective_from date,
  effective_until date,
  is_current boolean not null default false,
  -- CANDIDATE, VALIDATING, READY, REJECTED, PUBLISHED, SUPERSEDED
  import_status text not null default 'CANDIDATE',
  created_at timestamptz not null default now(),
  constraint oraculo_legal_versions_unique unique (document_id, version_number),
  constraint oraculo_legal_versions_status_check
    check (import_status in ('CANDIDATE','VALIDATING','READY','REJECTED','PUBLISHED','SUPERSEDED'))
);

-- Só uma versão corrente por documento.
create unique index if not exists uniq_oraculo_legal_current_version
  on public.oraculo_legal_document_versions (document_id)
  where is_current;

-- ---------------------------------------------------------------------------
-- 4. Unidades legais (estrutura da norma; árvore) + Full Text Search
-- ---------------------------------------------------------------------------
create table if not exists public.oraculo_legal_units (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references public.oraculo_legal_document_versions(id) on delete cascade,
  parent_unit_id uuid references public.oraculo_legal_units(id) on delete cascade,
  -- PREAMBLE, TITLE, BOOK, PART, CHAPTER, SECTION, SUBSECTION, ARTICLE,
  -- PARAGRAPH, SOLE_PARAGRAPH, ITEM, SUBITEM, LETTER, ANNEX, OTHER
  unit_type text not null default 'ARTICLE',
  -- Rótulo curto exibível: "Art. 14", "§ 1º", "III", "TÍTULO I".
  label text,
  number text,
  heading text,
  content text,
  normalized_content text,
  -- Caminho hierárquico legível: "titulo-1/capitulo-4/artigo-14".
  hierarchy_path text,
  display_order integer not null default 0,
  search_vector tsvector generated always as (
    to_tsvector(
      'portuguese',
      coalesce(label, '') || ' ' ||
      coalesce(heading, '') || ' ' ||
      coalesce(content, '')
    )
  ) stored,
  created_at timestamptz not null default now()
);

create index if not exists idx_oraculo_legal_units_version
  on public.oraculo_legal_units (document_version_id, display_order);
create index if not exists idx_oraculo_legal_units_parent
  on public.oraculo_legal_units (parent_unit_id);
create index if not exists idx_oraculo_legal_units_search
  on public.oraculo_legal_units using gin (search_vector);
-- Busca direta por número de artigo ("art 14 cdc").
create index if not exists idx_oraculo_legal_units_number
  on public.oraculo_legal_units (document_version_id, unit_type, number);

-- ---------------------------------------------------------------------------
-- 5. Apelidos da coleção (busca tolera linguagem do aluno: "CDC", "CF/88")
-- ---------------------------------------------------------------------------
create table if not exists public.oraculo_legal_collection_aliases (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.oraculo_legal_collections(id) on delete cascade,
  alias text not null,
  -- Alias sem acentos/pontuação, minúsculo, para casamento.
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  constraint oraculo_legal_alias_unique unique (collection_id, normalized_alias)
);

create index if not exists idx_oraculo_legal_alias_norm
  on public.oraculo_legal_collection_aliases (normalized_alias);

-- ---------------------------------------------------------------------------
-- 6. Consultas recentes (dedup temporal feito na aplicação)
-- ---------------------------------------------------------------------------
create table if not exists public.oraculo_legal_unit_views (
  id uuid primary key default gen_random_uuid(),
  oraculo_id uuid not null references public.oraculo_profissionais(id) on delete cascade,
  student_program_link_id uuid,
  legal_unit_id uuid references public.oraculo_legal_units(id) on delete set null,
  document_version_id uuid,
  legal_collection_id uuid,
  analysis_id uuid,
  -- Snapshots leves para exibir o histórico mesmo se a unidade mudar.
  label_snapshot text,
  document_title_snapshot text,
  collection_slug_snapshot text,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_oraculo_legal_views_oraculo
  on public.oraculo_legal_unit_views (oraculo_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- 7. Caderno Jurídico (dispositivos salvos pelo aluno)
-- ---------------------------------------------------------------------------
create table if not exists public.oraculo_legal_saved_items (
  id uuid primary key default gen_random_uuid(),
  oraculo_id uuid not null references public.oraculo_profissionais(id) on delete cascade,
  student_program_link_id uuid,
  legal_collection_id uuid,
  legal_document_id uuid,
  document_version_id uuid,
  legal_unit_id uuid references public.oraculo_legal_units(id) on delete set null,
  title_snapshot text,
  content_snapshot text,
  source_name_snapshot text,
  collection_slug_snapshot text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oraculo_legal_saved_oraculo
  on public.oraculo_legal_saved_items (oraculo_id, created_at desc);
-- Evita salvar o mesmo dispositivo (mesma versão) duas vezes.
create unique index if not exists uniq_oraculo_legal_saved
  on public.oraculo_legal_saved_items (oraculo_id, document_version_id, legal_unit_id)
  where legal_unit_id is not null;

-- ---------------------------------------------------------------------------
-- 8. Verificações de fonte (sincronização; base para o Admin/importador)
-- ---------------------------------------------------------------------------
create table if not exists public.oraculo_legal_source_checks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.oraculo_legal_documents(id) on delete cascade,
  source_url text,
  checked_at timestamptz not null default now(),
  http_status integer,
  content_hash text,
  change_detected boolean not null default false,
  candidate_version_id uuid,
  -- UNCHANGED, CHANGE_DETECTED, IMPORT_CREATED, FAILED, IGNORED
  check_status text not null default 'UNCHANGED',
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_oraculo_legal_source_checks_doc
  on public.oraculo_legal_source_checks (document_id, checked_at desc);

-- ---------------------------------------------------------------------------
-- 9. RLS (acesso via service role no servidor)
-- ---------------------------------------------------------------------------
alter table public.oraculo_legal_collections enable row level security;
alter table public.oraculo_legal_documents enable row level security;
alter table public.oraculo_legal_document_versions enable row level security;
alter table public.oraculo_legal_units enable row level security;
alter table public.oraculo_legal_collection_aliases enable row level security;
alter table public.oraculo_legal_unit_views enable row level security;
alter table public.oraculo_legal_saved_items enable row level security;
alter table public.oraculo_legal_source_checks enable row level security;

-- ============================================================
-- supabase/migrations/20260710160000_extend_analise_fontes_legal.sql
-- ============================================================
-- Vincula fontes da Mesa de Análise a dispositivos da Biblioteca Jurídica.
--
-- Reaproveita a tabela existente oraculo_analise_fontes (não duplica estrutura):
--   - origin_type = 'MANUAL' mantém a fonte de texto livre já existente.
--   - origin_type = 'LIBRARY' guarda o VÍNCULO + SNAPSHOT do dispositivo legal
--     consultado, para que a análise fique presa à versão usada no momento.
--
-- Uma atualização legislativa futura NÃO altera a fonte já registrada: o
-- relatório acadêmico permanece historicamente consistente.

alter table public.oraculo_analise_fontes
  add column if not exists origin_type text not null default 'MANUAL',
  add column if not exists legal_collection_id uuid,
  add column if not exists legal_document_id uuid,
  add column if not exists document_version_id uuid,
  add column if not exists legal_unit_id uuid,
  add column if not exists label_snapshot text,
  add column if not exists content_snapshot text,
  add column if not exists document_title_snapshot text,
  add column if not exists source_name_snapshot text,
  add column if not exists source_url_snapshot text,
  add column if not exists collection_slug_snapshot text,
  add column if not exists consulted_at timestamptz,
  add column if not exists added_at timestamptz not null default now(),
  add column if not exists removed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'oraculo_analise_fontes_origin_check'
  ) then
    alter table public.oraculo_analise_fontes
      add constraint oraculo_analise_fontes_origin_check
      check (origin_type in ('MANUAL', 'LIBRARY'));
  end if;
end $$;

-- Não permitir a mesma fonte legal ativa (mesma versão + dispositivo) duas vezes
-- na mesma análise. Fontes removidas (removed_at) não bloqueiam nova associação.
create unique index if not exists uniq_oraculo_analise_fonte_legal
  on public.oraculo_analise_fontes (analise_id, document_version_id, legal_unit_id)
  where legal_unit_id is not null and removed_at is null;

create index if not exists idx_oraculo_analise_fontes_active
  on public.oraculo_analise_fontes (analise_id)
  where removed_at is null;

-- ============================================================
-- supabase/migrations/20260710170000_seed_legal_library_mvp.sql
-- ============================================================
-- Seed inicial da Biblioteca Jurídica (MANUAL_STRUCTURED_IMPORT).
--
-- Importa MANUALMENTE, de forma estruturada, poucos códigos com trechos reais e
-- fonte oficial (Planalto). Não é o importador automático — é o fallback
-- previsto na especificação para validar leitor + busca + snapshot antes de
-- ingerir normas inteiras. As 15 coleções são criadas (metadados); apenas
-- CF/88, Código Civil e CDC recebem conteúdo (status ACTIVE); as demais ficam
-- DRAFT ("em breve") até importação.
--
-- Idempotente: coleções via ON CONFLICT; conteúdo só é semeado se ainda não
-- existir o documento correspondente.

-- ---------------------------------------------------------------------------
-- Coleções (livros)
-- ---------------------------------------------------------------------------
insert into public.oraculo_legal_collections
  (slug, title, short_title, description, category, jurisdiction, cover_config, display_order, status)
values
  ('constituicao-federal', 'Constituição Federal', 'CF/88',
    'Norma fundamental da República Federativa do Brasil.',
    'CONSTITUTIONAL', 'FEDERAL',
    '{"theme":"CONSTITUTIONAL","accent":"GOLD","symbol":"SCALE","shortTitle":"CF/88"}'::jsonb, 10, 'ACTIVE'),
  ('codigo-civil', 'Código Civil', 'CC',
    'Relações civis entre particulares: pessoas, bens, obrigações, contratos e responsabilidade.',
    'CIVIL', 'FEDERAL',
    '{"theme":"CIVIL","accent":"EMERALD","symbol":"BOOK","shortTitle":"CC"}'::jsonb, 20, 'ACTIVE'),
  ('codigo-defesa-consumidor', 'Código de Defesa do Consumidor', 'CDC',
    'Proteção e defesa do consumidor nas relações de consumo.',
    'CONSUMER', 'FEDERAL',
    '{"theme":"CONSUMER","accent":"AMBER","symbol":"SHIELD","shortTitle":"CDC"}'::jsonb, 30, 'ACTIVE'),
  ('codigo-processo-civil', 'Código de Processo Civil', 'CPC',
    'Normas do processo civil brasileiro.',
    'CIVIL_PROCEDURE', 'FEDERAL',
    '{"theme":"CIVIL_PROCEDURE","accent":"TEAL","symbol":"GAVEL","shortTitle":"CPC"}'::jsonb, 40, 'DRAFT'),
  ('codigo-penal', 'Código Penal', 'CP',
    'Crimes e penas na legislação brasileira.',
    'CRIMINAL', 'FEDERAL',
    '{"theme":"CRIMINAL","accent":"CRIMSON","symbol":"GAVEL","shortTitle":"CP"}'::jsonb, 50, 'DRAFT'),
  ('codigo-processo-penal', 'Código de Processo Penal', 'CPP',
    'Normas do processo penal brasileiro.',
    'CRIMINAL_PROCEDURE', 'FEDERAL',
    '{"theme":"CRIMINAL_PROCEDURE","accent":"CRIMSON","symbol":"GAVEL","shortTitle":"CPP"}'::jsonb, 60, 'DRAFT'),
  ('consolidacao-leis-trabalho', 'Consolidação das Leis do Trabalho', 'CLT',
    'Normas de proteção ao trabalho e relações de emprego.',
    'LABOR', 'FEDERAL',
    '{"theme":"LABOR","accent":"INDIGO","symbol":"BOOK","shortTitle":"CLT"}'::jsonb, 70, 'DRAFT'),
  ('codigo-tributario-nacional', 'Código Tributário Nacional', 'CTN',
    'Normas gerais de direito tributário.',
    'TAX', 'FEDERAL',
    '{"theme":"TAX","accent":"SLATE","symbol":"SCALE","shortTitle":"CTN"}'::jsonb, 80, 'DRAFT'),
  ('estatuto-crianca-adolescente', 'Estatuto da Criança e do Adolescente', 'ECA',
    'Proteção integral à criança e ao adolescente.',
    'CHILDREN_AND_YOUTH', 'FEDERAL',
    '{"theme":"CHILDREN_AND_YOUTH","accent":"SKY","symbol":"SHIELD","shortTitle":"ECA"}'::jsonb, 90, 'DRAFT'),
  ('estatuto-pessoa-idosa', 'Estatuto da Pessoa Idosa', null,
    'Direitos e proteção da pessoa idosa.',
    'ELDERLY', 'FEDERAL',
    '{"theme":"ELDERLY","accent":"ROSE","symbol":"SHIELD","shortTitle":"Idosa"}'::jsonb, 100, 'DRAFT'),
  ('lei-maria-da-penha', 'Lei Maria da Penha', null,
    'Proteção da mulher contra a violência doméstica e familiar.',
    'WOMEN_PROTECTION', 'FEDERAL',
    '{"theme":"WOMEN_PROTECTION","accent":"PURPLE","symbol":"SHIELD","shortTitle":"MP"}'::jsonb, 110, 'DRAFT'),
  ('lei-de-locacoes', 'Lei de Locações', null,
    'Locação de imóveis urbanos.',
    'REAL_ESTATE', 'FEDERAL',
    '{"theme":"REAL_ESTATE","accent":"STONE","symbol":"BOOK","shortTitle":"Loc"}'::jsonb, 120, 'DRAFT'),
  ('lei-geral-protecao-dados', 'Lei Geral de Proteção de Dados', 'LGPD',
    'Tratamento de dados pessoais e proteção da privacidade.',
    'DATA_PROTECTION', 'FEDERAL',
    '{"theme":"DATA_PROTECTION","accent":"CYAN","symbol":"SHIELD","shortTitle":"LGPD"}'::jsonb, 130, 'DRAFT'),
  ('estatuto-advocacia-oab', 'Estatuto da Advocacia e da OAB', null,
    'Exercício da advocacia e a Ordem dos Advogados do Brasil.',
    'LEGAL_PROFESSION', 'FEDERAL',
    '{"theme":"LEGAL_PROFESSION","accent":"GOLD","symbol":"SCALE","shortTitle":"OAB"}'::jsonb, 140, 'DRAFT'),
  ('lei-juizados-especiais', 'Lei dos Juizados Especiais', null,
    'Juizados Especiais Cíveis e Criminais.',
    'SMALL_CLAIMS', 'FEDERAL',
    '{"theme":"SMALL_CLAIMS","accent":"TEAL","symbol":"GAVEL","shortTitle":"JE"}'::jsonb, 150, 'DRAFT')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Apelidos (busca tolera linguagem do aluno)
-- ---------------------------------------------------------------------------
insert into public.oraculo_legal_collection_aliases (collection_id, alias, normalized_alias)
select c.id, v.alias, v.norm
from (values
  ('constituicao-federal', 'CF', 'cf'),
  ('constituicao-federal', 'CF/88', 'cf 88'),
  ('constituicao-federal', 'CF88', 'cf88'),
  ('constituicao-federal', 'Constituição', 'constituicao'),
  ('constituicao-federal', 'Constituição Federal', 'constituicao federal'),
  ('codigo-civil', 'CC', 'cc'),
  ('codigo-civil', 'Código Civil', 'codigo civil'),
  ('codigo-defesa-consumidor', 'CDC', 'cdc'),
  ('codigo-defesa-consumidor', 'Código de Defesa do Consumidor', 'codigo de defesa do consumidor'),
  ('codigo-defesa-consumidor', 'Código do Consumidor', 'codigo do consumidor'),
  ('codigo-processo-civil', 'CPC', 'cpc'),
  ('codigo-processo-civil', 'Código de Processo Civil', 'codigo de processo civil'),
  ('codigo-penal', 'CP', 'cp'),
  ('codigo-penal', 'Código Penal', 'codigo penal'),
  ('codigo-processo-penal', 'CPP', 'cpp'),
  ('codigo-processo-penal', 'Código de Processo Penal', 'codigo de processo penal'),
  ('consolidacao-leis-trabalho', 'CLT', 'clt'),
  ('codigo-tributario-nacional', 'CTN', 'ctn'),
  ('estatuto-crianca-adolescente', 'ECA', 'eca'),
  ('estatuto-pessoa-idosa', 'Estatuto do Idoso', 'estatuto do idoso'),
  ('lei-maria-da-penha', 'Maria da Penha', 'maria da penha'),
  ('lei-de-locacoes', 'Lei do Inquilinato', 'lei do inquilinato'),
  ('lei-geral-protecao-dados', 'LGPD', 'lgpd'),
  ('estatuto-advocacia-oab', 'Estatuto da OAB', 'estatuto da oab'),
  ('lei-juizados-especiais', 'Juizados Especiais', 'juizados especiais')
) as v(slug, alias, norm)
join public.oraculo_legal_collections c on c.slug = v.slug
on conflict (collection_id, normalized_alias) do nothing;

-- ---------------------------------------------------------------------------
-- Conteúdo real (CF/88, Código Civil, CDC)
-- ---------------------------------------------------------------------------
do $$
declare
  v_col uuid;
  v_doc uuid;
  v_ver uuid;
  v_t1 uuid;
  v_t2 uuid;
  v_ch uuid;
begin
  -- ===================== CDC =====================
  select id into v_col from public.oraculo_legal_collections
    where slug = 'codigo-defesa-consumidor';
  if v_col is not null and not exists (
    select 1 from public.oraculo_legal_documents where collection_id = v_col
  ) then
    insert into public.oraculo_legal_documents
      (collection_id, slug, document_type, number, year, official_title, short_title,
       ementa, jurisdiction, authority, source_name, source_url, source_identifier,
       publication_date, effective_date, status, last_source_check_at)
    values
      (v_col, 'lei-8078-1990', 'LAW', '8.078', 1990,
       'Lei nº 8.078, de 11 de setembro de 1990', 'Código de Defesa do Consumidor',
       'Dispõe sobre a proteção do consumidor e dá outras providências.',
       'FEDERAL', 'Congresso Nacional', 'Planalto',
       'http://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm',
       'Lei nº 8.078/1990', date '1990-09-11', date '1990-09-11', 'ACTIVE', now())
    returning id into v_doc;

    insert into public.oraculo_legal_document_versions
      (document_id, version_number, source_checked_at, effective_from, is_current, import_status)
    values (v_doc, 1, now(), date '1990-09-11', true, 'PUBLISHED')
    returning id into v_ver;

    update public.oraculo_legal_documents set current_version_id = v_ver where id = v_doc;

    -- Capítulo III — Direitos Básicos
    insert into public.oraculo_legal_units
      (document_version_id, unit_type, label, heading, hierarchy_path, display_order)
    values (v_ver, 'CHAPTER', 'CAPÍTULO III', 'Dos Direitos Básicos do Consumidor',
            'capitulo-3', 10)
    returning id into v_ch;
    insert into public.oraculo_legal_units
      (document_version_id, parent_unit_id, unit_type, label, number, hierarchy_path, display_order, content)
    values (v_ver, v_ch, 'ARTICLE', 'Art. 6º', '6', 'capitulo-3/artigo-6', 11,
      'São direitos básicos do consumidor:
VI - a efetiva prevenção e reparação de danos patrimoniais e morais, individuais, coletivos e difusos;
VIII - a facilitação da defesa de seus direitos, inclusive com a inversão do ônus da prova, a seu favor, no processo civil, quando, a critério do juiz, for verossímil a alegação ou quando for ele hipossuficiente, segundo as regras ordinárias de experiências;');

    -- Capítulo IV — Qualidade / Reparação de Danos (Art. 14)
    insert into public.oraculo_legal_units
      (document_version_id, unit_type, label, heading, hierarchy_path, display_order)
    values (v_ver, 'CHAPTER', 'CAPÍTULO IV',
            'Da Qualidade de Produtos e Serviços, da Prevenção e da Reparação dos Danos',
            'capitulo-4', 20)
    returning id into v_ch;
    insert into public.oraculo_legal_units
      (document_version_id, parent_unit_id, unit_type, label, number, hierarchy_path, display_order, content)
    values (v_ver, v_ch, 'ARTICLE', 'Art. 14', '14', 'capitulo-4/artigo-14', 21,
      'O fornecedor de serviços responde, independentemente da existência de culpa, pela reparação dos danos causados aos consumidores por defeitos relativos à prestação dos serviços, bem como por informações insuficientes ou inadequadas sobre sua fruição e riscos.
§ 1º O serviço é defeituoso quando não fornece a segurança que o consumidor dele pode esperar, levando-se em consideração as circunstâncias relevantes, entre as quais:
I - o modo de seu fornecimento;
II - o resultado e os riscos que razoavelmente dele se esperam;
III - a época em que foi fornecido.
§ 3º O fornecedor de serviços só não será responsabilizado quando provar:
I - que, tendo prestado o serviço, o defeito inexiste;
II - a culpa exclusiva do consumidor ou de terceiro.
§ 4º A responsabilidade pessoal dos profissionais liberais será apurada mediante a verificação de culpa.');

    -- Cobrança de dívidas (Art. 42)
    insert into public.oraculo_legal_units
      (document_version_id, unit_type, label, heading, hierarchy_path, display_order)
    values (v_ver, 'SECTION', 'CAPÍTULO V — Seção V', 'Da Cobrança de Dívidas',
            'capitulo-5/secao-5', 30)
    returning id into v_ch;
    insert into public.oraculo_legal_units
      (document_version_id, parent_unit_id, unit_type, label, number, hierarchy_path, display_order, content)
    values (v_ver, v_ch, 'ARTICLE', 'Art. 42', '42', 'capitulo-5/secao-5/artigo-42', 31,
      'Na cobrança de débitos, o consumidor inadimplente não será exposto a ridículo, nem será submetido a qualquer tipo de constrangimento ou ameaça.
Parágrafo único. O consumidor cobrado em quantia indevida tem direito à repetição do indébito, por valor igual ao dobro do que pagou em excesso, acrescido de correção monetária e juros legais, salvo hipótese de engano justificável.');
  end if;

  -- ===================== CONSTITUIÇÃO FEDERAL =====================
  select id into v_col from public.oraculo_legal_collections
    where slug = 'constituicao-federal';
  if v_col is not null and not exists (
    select 1 from public.oraculo_legal_documents where collection_id = v_col
  ) then
    insert into public.oraculo_legal_documents
      (collection_id, slug, document_type, number, year, official_title, short_title,
       jurisdiction, authority, source_name, source_url, source_identifier,
       publication_date, effective_date, status, last_source_check_at)
    values
      (v_col, 'crfb-1988', 'CONSTITUTION', null, 1988,
       'Constituição da República Federativa do Brasil de 1988', 'CF/88',
       'FEDERAL', 'Assembleia Nacional Constituinte', 'Planalto',
       'http://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm',
       'CRFB/1988', date '1988-10-05', date '1988-10-05', 'ACTIVE', now())
    returning id into v_doc;

    insert into public.oraculo_legal_document_versions
      (document_id, version_number, source_checked_at, effective_from, is_current, import_status)
    values (v_doc, 1, now(), date '1988-10-05', true, 'PUBLISHED')
    returning id into v_ver;

    update public.oraculo_legal_documents set current_version_id = v_ver where id = v_doc;

    -- Título I — Princípios Fundamentais
    insert into public.oraculo_legal_units
      (document_version_id, unit_type, label, heading, hierarchy_path, display_order)
    values (v_ver, 'TITLE', 'TÍTULO I', 'Dos Princípios Fundamentais', 'titulo-1', 10)
    returning id into v_t1;
    insert into public.oraculo_legal_units
      (document_version_id, parent_unit_id, unit_type, label, number, hierarchy_path, display_order, content)
    values (v_ver, v_t1, 'ARTICLE', 'Art. 1º', '1', 'titulo-1/artigo-1', 11,
      'A República Federativa do Brasil, formada pela união indissolúvel dos Estados e Municípios e do Distrito Federal, constitui-se em Estado Democrático de Direito e tem como fundamentos:
I - a soberania;
II - a cidadania;
III - a dignidade da pessoa humana;
IV - os valores sociais do trabalho e da livre iniciativa;
V - o pluralismo político.
Parágrafo único. Todo o poder emana do povo, que o exerce por meio de representantes eleitos ou diretamente, nos termos desta Constituição.');

    -- Título II — Direitos e Garantias Fundamentais / Cap. I / Art. 5º
    insert into public.oraculo_legal_units
      (document_version_id, unit_type, label, heading, hierarchy_path, display_order)
    values (v_ver, 'TITLE', 'TÍTULO II', 'Dos Direitos e Garantias Fundamentais', 'titulo-2', 20)
    returning id into v_t2;
    insert into public.oraculo_legal_units
      (document_version_id, parent_unit_id, unit_type, label, heading, hierarchy_path, display_order)
    values (v_ver, v_t2, 'CHAPTER', 'CAPÍTULO I', 'Dos Direitos e Deveres Individuais e Coletivos',
            'titulo-2/capitulo-1', 21)
    returning id into v_ch;
    insert into public.oraculo_legal_units
      (document_version_id, parent_unit_id, unit_type, label, number, hierarchy_path, display_order, content)
    values (v_ver, v_ch, 'ARTICLE', 'Art. 5º', '5', 'titulo-2/capitulo-1/artigo-5', 22,
      'Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade, nos termos seguintes:
III - ninguém será submetido a tortura nem a tratamento desumano ou degradante;
X - são invioláveis a intimidade, a vida privada, a honra e a imagem das pessoas, assegurado o direito a indenização pelo dano material ou moral decorrente de sua violação;
XXXII - o Estado promoverá, na forma da lei, a defesa do consumidor;
LXXIV - o Estado prestará assistência jurídica integral e gratuita aos que comprovarem insuficiência de recursos;');
  end if;

  -- ===================== CÓDIGO CIVIL =====================
  select id into v_col from public.oraculo_legal_collections
    where slug = 'codigo-civil';
  if v_col is not null and not exists (
    select 1 from public.oraculo_legal_documents where collection_id = v_col
  ) then
    insert into public.oraculo_legal_documents
      (collection_id, slug, document_type, number, year, official_title, short_title,
       ementa, jurisdiction, authority, source_name, source_url, source_identifier,
       publication_date, effective_date, status, last_source_check_at)
    values
      (v_col, 'lei-10406-2002', 'CODE', '10.406', 2002,
       'Lei nº 10.406, de 10 de janeiro de 2002', 'Código Civil',
       'Institui o Código Civil.', 'FEDERAL', 'Congresso Nacional', 'Planalto',
       'http://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
       'Lei nº 10.406/2002', date '2002-01-10', date '2003-01-11', 'ACTIVE', now())
    returning id into v_doc;

    insert into public.oraculo_legal_document_versions
      (document_id, version_number, source_checked_at, effective_from, is_current, import_status)
    values (v_doc, 1, now(), date '2003-01-11', true, 'PUBLISHED')
    returning id into v_ver;

    update public.oraculo_legal_documents set current_version_id = v_ver where id = v_doc;

    insert into public.oraculo_legal_units
      (document_version_id, unit_type, label, heading, hierarchy_path, display_order)
    values (v_ver, 'TITLE', 'TÍTULO III', 'Dos Atos Ilícitos', 'titulo-3', 10)
    returning id into v_t1;
    insert into public.oraculo_legal_units
      (document_version_id, parent_unit_id, unit_type, label, number, hierarchy_path, display_order, content)
    values
      (v_ver, v_t1, 'ARTICLE', 'Art. 186', '186', 'titulo-3/artigo-186', 11,
       'Aquele que, por ação ou omissão voluntária, negligência ou imprudência, violar direito e causar dano a outrem, ainda que exclusivamente moral, comete ato ilícito.'),
      (v_ver, v_t1, 'ARTICLE', 'Art. 187', '187', 'titulo-3/artigo-187', 12,
       'Também comete ato ilícito o titular de um direito que, ao exercê-lo, excede manifestamente os limites impostos pelo seu fim econômico ou social, pela boa-fé ou pelos bons costumes.');

    insert into public.oraculo_legal_units
      (document_version_id, unit_type, label, heading, hierarchy_path, display_order)
    values (v_ver, 'TITLE', 'TÍTULO IX', 'Da Responsabilidade Civil', 'titulo-9', 20)
    returning id into v_t2;
    insert into public.oraculo_legal_units
      (document_version_id, parent_unit_id, unit_type, label, number, hierarchy_path, display_order, content)
    values (v_ver, v_t2, 'ARTICLE', 'Art. 927', '927', 'titulo-9/artigo-927', 21,
      'Aquele que, por ato ilícito (arts. 186 e 187), causar dano a outrem, fica obrigado a repará-lo.
Parágrafo único. Haverá obrigação de reparar o dano, independentemente de culpa, nos casos especificados em lei, ou quando a atividade normalmente desenvolvida pelo autor do dano implicar, por sua natureza, risco para os direitos de outrem.');
  end if;
end $$;

