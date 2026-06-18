-- Base multi-tenant do Social Juridico Assinatura.
-- Migration aditiva: nao altera as tabelas da plataforma juridica existente.

create table if not exists public.signature_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  status text not null default 'ACTIVE',
  accepted_terms_at timestamptz not null,
  accepted_privacy_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signature_accounts_email_check
    check (char_length(email) between 5 and 320 and email = lower(email)),
  constraint signature_accounts_name_check
    check (char_length(btrim(full_name)) between 3 and 120),
  constraint signature_accounts_status_check
    check (status in ('ACTIVE', 'SUSPENDED', 'CLOSED'))
);

create unique index if not exists uq_signature_accounts_email
  on public.signature_accounts (lower(email));

create table if not exists public.signature_organizations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signature_organizations_name_check
    check (char_length(btrim(name)) between 3 and 120),
  constraint signature_organizations_slug_check
    check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  constraint signature_organizations_status_check
    check (status in ('ACTIVE', 'SUSPENDED', 'CLOSED'))
);

create index if not exists idx_signature_organizations_owner
  on public.signature_organizations (owner_user_id, created_at desc);

create table if not exists public.signature_organization_members (
  organization_id uuid not null references public.signature_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'MEMBER',
  status text not null default 'ACTIVE',
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint signature_members_role_check
    check (role in ('OWNER', 'ADMIN', 'MEMBER')),
  constraint signature_members_status_check
    check (status in ('INVITED', 'ACTIVE', 'REMOVED'))
);

create index if not exists idx_signature_members_user
  on public.signature_organization_members (user_id, status, joined_at desc);

create table if not exists public.signature_subscriptions (
  organization_id uuid primary key references public.signature_organizations(id) on delete cascade,
  plan_code text not null default 'FREE',
  status text not null default 'ACTIVE',
  documents_limit integer,
  certificates_limit integer,
  price_cents integer not null default 0,
  current_period_start date not null default date_trunc('month', now())::date,
  current_period_end date not null default (date_trunc('month', now()) + interval '1 month')::date,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signature_subscriptions_plan_check
    check (plan_code in ('FREE', 'ESSENTIAL', 'PROFESSIONAL', 'BUSINESS', 'UNLIMITED')),
  constraint signature_subscriptions_status_check
    check (status in ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'SUSPENDED')),
  constraint signature_subscriptions_limits_check
    check (
      (plan_code = 'FREE' and documents_limit = 3 and certificates_limit = 0 and price_cents = 0)
      or (plan_code = 'ESSENTIAL' and documents_limit = 10 and certificates_limit = 10 and price_cents = 1000)
      or (plan_code = 'PROFESSIONAL' and documents_limit = 50 and certificates_limit = 50 and price_cents = 4500)
      or (plan_code = 'BUSINESS' and documents_limit = 100 and certificates_limit = 100 and price_cents = 8500)
      or (plan_code = 'UNLIMITED' and documents_limit is null and certificates_limit is null and price_cents = 30000)
    ),
  constraint signature_subscriptions_period_check
    check (current_period_end > current_period_start)
);

create unique index if not exists uq_signature_subscription_provider_id
  on public.signature_subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;

create table if not exists public.signature_usage_periods (
  organization_id uuid not null references public.signature_organizations(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  documents_used integer not null default 0,
  certificates_used integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (organization_id, period_start),
  constraint signature_usage_values_check
    check (documents_used >= 0 and certificates_used >= 0),
  constraint signature_usage_period_check
    check (period_end > period_start)
);

create table if not exists public.signature_envelopes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.signature_organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  document_type text not null default 'OTHER',
  message text,
  status text not null default 'DRAFT',
  verification_code text not null unique,
  expires_at timestamptz,
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint signature_envelopes_title_check
    check (char_length(btrim(title)) between 3 and 180),
  constraint signature_envelopes_type_check
    check (document_type in ('CONTRACT', 'AGREEMENT', 'AUTHORIZATION', 'PROPOSAL', 'OTHER')),
  constraint signature_envelopes_status_check
    check (status in ('DRAFT', 'SENT', 'IN_PROGRESS', 'COMPLETED', 'VOIDED', 'EXPIRED')),
  constraint signature_envelopes_message_check
    check (message is null or char_length(message) <= 2000)
);

create index if not exists idx_signature_envelopes_org_created
  on public.signature_envelopes (organization_id, created_at desc);
create index if not exists idx_signature_envelopes_org_status
  on public.signature_envelopes (organization_id, status, updated_at desc);

create table if not exists public.signature_documents (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  storage_bucket text not null default 'signature-documents',
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null,
  sha256 text not null,
  page_count integer,
  created_at timestamptz not null default now(),
  constraint signature_documents_bucket_check
    check (storage_bucket = 'signature-documents'),
  constraint signature_documents_mime_check
    check (mime_type = 'application/pdf'),
  constraint signature_documents_size_check
    check (size_bytes between 5 and 15728640),
  constraint signature_documents_hash_check
    check (sha256 ~ '^[a-f0-9]{64}$'),
  constraint signature_documents_path_check
    check (storage_path !~ '(^|/)\.\.(/|$)')
);

create index if not exists idx_signature_documents_envelope
  on public.signature_documents (envelope_id, created_at);

create table if not exists public.signature_recipients (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.signature_envelopes(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'SIGNER',
  signing_order integer not null default 1,
  status text not null default 'PENDING',
  access_token_hash text,
  invited_at timestamptz,
  viewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint signature_recipients_name_check
    check (char_length(btrim(name)) between 2 and 140),
  constraint signature_recipients_email_check
    check (char_length(email) between 5 and 320 and email = lower(email)),
  constraint signature_recipients_role_check
    check (role in ('SIGNER', 'APPROVER', 'COPY')),
  constraint signature_recipients_order_check
    check (signing_order between 1 and 100),
  constraint signature_recipients_status_check
    check (status in ('PENDING', 'INVITED', 'VIEWED', 'COMPLETED', 'DECLINED'))
);

create unique index if not exists uq_signature_recipient_order
  on public.signature_recipients (envelope_id, signing_order, email);
create index if not exists idx_signature_recipients_envelope
  on public.signature_recipients (envelope_id, signing_order);

create table if not exists public.signature_evidence_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.signature_organizations(id) on delete cascade,
  envelope_id uuid references public.signature_envelopes(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  recipient_id uuid references public.signature_recipients(id) on delete set null,
  event_type text not null,
  outcome text not null default 'SUCCESS',
  ip_hash text,
  user_agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint signature_evidence_event_check
    check (event_type in ('DRAFT_CREATED', 'DOCUMENT_UPLOADED', 'ENVELOPE_SENT', 'INVITATION_DELIVERED', 'DOCUMENT_VIEWED', 'OTP_SENT', 'IDENTITY_CONFIRMED', 'DOCUMENT_SIGNED', 'ENVELOPE_COMPLETED', 'ENVELOPE_VOIDED')),
  constraint signature_evidence_outcome_check
    check (outcome in ('SUCCESS', 'FAILURE', 'BLOCKED')),
  constraint signature_evidence_payload_check
    check (jsonb_typeof(payload) = 'object')
);

create index if not exists idx_signature_evidence_envelope_created
  on public.signature_evidence_events (envelope_id, created_at);

create table if not exists public.signature_account_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.signature_organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  outcome text not null default 'SUCCESS',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint signature_account_audit_action_check
    check (action in ('ACCOUNT_PROVISIONED', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'PLAN_CHANGED', 'ACCOUNT_SUSPENDED')),
  constraint signature_account_audit_outcome_check
    check (outcome in ('SUCCESS', 'FAILURE', 'BLOCKED')),
  constraint signature_account_audit_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_signature_account_audit_org_created
  on public.signature_account_audit_logs (organization_id, created_at desc);

alter table public.signature_accounts enable row level security;
alter table public.signature_organizations enable row level security;
alter table public.signature_organization_members enable row level security;
alter table public.signature_subscriptions enable row level security;
alter table public.signature_usage_periods enable row level security;
alter table public.signature_envelopes enable row level security;
alter table public.signature_documents enable row level security;
alter table public.signature_recipients enable row level security;
alter table public.signature_evidence_events enable row level security;
alter table public.signature_account_audit_logs enable row level security;

revoke all on table public.signature_accounts from anon, authenticated;
revoke all on table public.signature_organizations from anon, authenticated;
revoke all on table public.signature_organization_members from anon, authenticated;
revoke all on table public.signature_subscriptions from anon, authenticated;
revoke all on table public.signature_usage_periods from anon, authenticated;
revoke all on table public.signature_envelopes from anon, authenticated;
revoke all on table public.signature_documents from anon, authenticated;
revoke all on table public.signature_recipients from anon, authenticated;
revoke all on table public.signature_evidence_events from anon, authenticated;
revoke all on table public.signature_account_audit_logs from anon, authenticated;

grant select on table public.signature_accounts to authenticated;
grant select on table public.signature_organizations to authenticated;
grant select on table public.signature_organization_members to authenticated;
grant select on table public.signature_subscriptions to authenticated;
grant select on table public.signature_usage_periods to authenticated;
grant select on table public.signature_envelopes to authenticated;
grant select on table public.signature_documents to authenticated;
grant select on table public.signature_recipients to authenticated;
grant select, insert, update, delete on table public.signature_accounts to service_role;
grant select, insert, update, delete on table public.signature_organizations to service_role;
grant select, insert, update, delete on table public.signature_organization_members to service_role;
grant select, insert, update, delete on table public.signature_subscriptions to service_role;
grant select, insert, update, delete on table public.signature_usage_periods to service_role;
grant select, insert, update, delete on table public.signature_envelopes to service_role;
grant select, insert, update, delete on table public.signature_documents to service_role;
grant select, insert, update, delete on table public.signature_recipients to service_role;
grant select, insert on table public.signature_evidence_events to service_role;
grant select, insert on table public.signature_account_audit_logs to service_role;

drop policy if exists signature_accounts_read_self on public.signature_accounts;
create policy signature_accounts_read_self
  on public.signature_accounts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists signature_members_read_self on public.signature_organization_members;
create policy signature_members_read_self
  on public.signature_organization_members for select to authenticated
  using (user_id = auth.uid());

drop policy if exists signature_organizations_read_member on public.signature_organizations;
create policy signature_organizations_read_member
  on public.signature_organizations for select to authenticated
  using (
    exists (
      select 1
      from public.signature_organization_members member
      where member.organization_id = signature_organizations.id
        and member.user_id = auth.uid()
        and member.status = 'ACTIVE'
    )
  );

drop policy if exists signature_subscriptions_read_member on public.signature_subscriptions;
create policy signature_subscriptions_read_member
  on public.signature_subscriptions for select to authenticated
  using (
    exists (
      select 1
      from public.signature_organization_members member
      where member.organization_id = signature_subscriptions.organization_id
        and member.user_id = auth.uid()
        and member.status = 'ACTIVE'
    )
  );

drop policy if exists signature_usage_read_member on public.signature_usage_periods;
create policy signature_usage_read_member
  on public.signature_usage_periods for select to authenticated
  using (
    exists (
      select 1
      from public.signature_organization_members member
      where member.organization_id = signature_usage_periods.organization_id
        and member.user_id = auth.uid()
        and member.status = 'ACTIVE'
    )
  );

drop policy if exists signature_envelopes_read_member on public.signature_envelopes;
create policy signature_envelopes_read_member
  on public.signature_envelopes for select to authenticated
  using (
    exists (
      select 1 from public.signature_organization_members member
      where member.organization_id = signature_envelopes.organization_id
        and member.user_id = auth.uid() and member.status = 'ACTIVE'
    )
  );

drop policy if exists signature_documents_read_member on public.signature_documents;
create policy signature_documents_read_member
  on public.signature_documents for select to authenticated
  using (
    exists (
      select 1
      from public.signature_envelopes envelope
      join public.signature_organization_members member
        on member.organization_id = envelope.organization_id
      where envelope.id = signature_documents.envelope_id
        and member.user_id = auth.uid() and member.status = 'ACTIVE'
    )
  );

drop policy if exists signature_recipients_read_member on public.signature_recipients;
create policy signature_recipients_read_member
  on public.signature_recipients for select to authenticated
  using (
    exists (
      select 1
      from public.signature_envelopes envelope
      join public.signature_organization_members member
        on member.organization_id = envelope.organization_id
      where envelope.id = signature_recipients.envelope_id
        and member.user_id = auth.uid() and member.status = 'ACTIVE'
    )
  );

create or replace function public.touch_signature_saas_updated_at()
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

revoke all on function public.touch_signature_saas_updated_at() from public;

drop trigger if exists trg_touch_signature_accounts on public.signature_accounts;
create trigger trg_touch_signature_accounts before update on public.signature_accounts
for each row execute function public.touch_signature_saas_updated_at();

drop trigger if exists trg_touch_signature_organizations on public.signature_organizations;
create trigger trg_touch_signature_organizations before update on public.signature_organizations
for each row execute function public.touch_signature_saas_updated_at();

drop trigger if exists trg_touch_signature_subscriptions on public.signature_subscriptions;
create trigger trg_touch_signature_subscriptions before update on public.signature_subscriptions
for each row execute function public.touch_signature_saas_updated_at();

drop trigger if exists trg_touch_signature_usage on public.signature_usage_periods;
create trigger trg_touch_signature_usage before update on public.signature_usage_periods
for each row execute function public.touch_signature_saas_updated_at();

drop trigger if exists trg_touch_signature_envelopes on public.signature_envelopes;
create trigger trg_touch_signature_envelopes before update on public.signature_envelopes
for each row execute function public.touch_signature_saas_updated_at();

create or replace function public.prevent_signature_account_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'signature_account_audit_logs is append-only';
end;
$$;

revoke all on function public.prevent_signature_account_audit_mutation() from public;

drop trigger if exists trg_prevent_signature_account_audit_mutation
  on public.signature_account_audit_logs;
create trigger trg_prevent_signature_account_audit_mutation
before update or delete or truncate on public.signature_account_audit_logs
for each statement execute function public.prevent_signature_account_audit_mutation();

drop trigger if exists trg_prevent_signature_evidence_mutation
  on public.signature_evidence_events;
drop trigger if exists trg_prevent_signature_evidence_truncate
  on public.signature_evidence_events;

create or replace function public.prevent_signature_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' 
     and old.id = new.id 
     and old.organization_id = new.organization_id 
     and old.actor_user_id is not distinct from new.actor_user_id
     and old.recipient_id is not distinct from new.recipient_id
     and old.event_type = new.event_type
     and old.outcome = new.outcome
     and old.ip_hash is not distinct from new.ip_hash
     and old.user_agent is not distinct from new.user_agent
     and old.payload = new.payload
     and old.created_at = new.created_at
     and old.envelope_id is not null 
     and new.envelope_id is null then
    return new;
  end if;

  raise exception 'signature_evidence_events is append-only';
end;
$$;

revoke all on function public.prevent_signature_evidence_mutation() from public;

create trigger trg_prevent_signature_evidence_mutation
before update or delete on public.signature_evidence_events
for each row execute function public.prevent_signature_evidence_mutation();

create or replace function public.prevent_signature_evidence_truncate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'signature_evidence_events is append-only';
end;
$$;

revoke all on function public.prevent_signature_evidence_truncate() from public;

create trigger trg_prevent_signature_evidence_truncate
before truncate on public.signature_evidence_events
for each statement execute function public.prevent_signature_evidence_truncate();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signature-documents',
  'signature-documents',
  false,
  15728640,
  array['application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.provision_signature_account(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_organization_id uuid;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month')::date;
  v_slug text;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'invalid signature account user';
  end if;

  if char_length(btrim(coalesce(p_full_name, ''))) < 3 then
    raise exception 'invalid signature account name';
  end if;

  insert into public.signature_accounts (
    user_id, email, full_name, phone, accepted_terms_at, accepted_privacy_at
  ) values (
    p_user_id, lower(btrim(p_email)), btrim(p_full_name), nullif(btrim(p_phone), ''), now(), now()
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        phone = coalesce(excluded.phone, public.signature_accounts.phone),
        updated_at = now();

  select member.organization_id
    into v_organization_id
    from public.signature_organization_members member
   where member.user_id = p_user_id
     and member.status = 'ACTIVE'
   order by member.joined_at
   limit 1;

  if v_organization_id is null then
    v_slug := 'conta-' || replace(left(p_user_id::text, 13), '-', '');

    insert into public.signature_organizations (owner_user_id, name, slug)
    values (p_user_id, btrim(p_full_name), v_slug)
    returning id into v_organization_id;

    insert into public.signature_organization_members (organization_id, user_id, role)
    values (v_organization_id, p_user_id, 'OWNER');

    insert into public.signature_subscriptions (
      organization_id, plan_code, documents_limit, certificates_limit,
      price_cents, current_period_start, current_period_end
    ) values (
      v_organization_id, 'FREE', 3, 0, 0, v_period_start, v_period_end
    );

    insert into public.signature_usage_periods (
      organization_id, period_start, period_end
    ) values (v_organization_id, v_period_start, v_period_end);

    insert into public.signature_account_audit_logs (
      organization_id, actor_user_id, action, metadata
    ) values (
      v_organization_id,
      p_user_id,
      'ACCOUNT_PROVISIONED',
      jsonb_build_object('plan_code', 'FREE', 'documents_limit', 3)
    );
  end if;

  return v_organization_id;
end;
$$;

revoke all on function public.provision_signature_account(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.provision_signature_account(uuid, text, text, text) to service_role;

comment on function public.provision_signature_account(uuid, text, text, text) is
  'Provisiona de forma idempotente a conta, organizacao e plano gratuito do produto de assinatura.';
