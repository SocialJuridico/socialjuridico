create table if not exists public.admin_document_signatures (
  id uuid primary key default gen_random_uuid(),
  document_id text not null,
  document_title text not null,
  document_category text not null,
  document_path text not null,
  document_hash text not null,
  document_hash_algorithm text not null default 'SHA-256',
  document_modified_at timestamptz null,
  signature_hash text not null unique,
  signature_payload jsonb not null default '{}'::jsonb,
  signature_statement text not null,
  verification_code text not null unique,
  signer_admin_id uuid not null,
  signer_name text not null,
  signer_email_hash text null,
  signer_role text null,
  request_ip_hash text null,
  user_agent_hash text null,
  signed_at timestamptz not null default now(),
  status text not null default 'SIGNED',
  created_at timestamptz not null default now()
);

comment on table public.admin_document_signatures is
  'Administrative electronic signatures for internal governance documents. Append-only legal evidence trail.';

create index if not exists idx_admin_document_signatures_document_id
  on public.admin_document_signatures (document_id, signed_at desc);

create index if not exists idx_admin_document_signatures_signer
  on public.admin_document_signatures (signer_admin_id, signed_at desc);

create index if not exists idx_admin_document_signatures_verification
  on public.admin_document_signatures (verification_code);

alter table public.admin_document_signatures enable row level security;

revoke all on public.admin_document_signatures from anon;
revoke all on public.admin_document_signatures from authenticated;
grant select, insert on public.admin_document_signatures to service_role;

create or replace function public.prevent_admin_document_signatures_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_document_signatures is append-only';
end;
$$;

drop trigger if exists trg_admin_document_signatures_no_update on public.admin_document_signatures;
create trigger trg_admin_document_signatures_no_update
  before update on public.admin_document_signatures
  for each row execute function public.prevent_admin_document_signatures_mutation();

drop trigger if exists trg_admin_document_signatures_no_delete on public.admin_document_signatures;
create trigger trg_admin_document_signatures_no_delete
  before delete on public.admin_document_signatures
  for each row execute function public.prevent_admin_document_signatures_mutation();

drop trigger if exists trg_admin_document_signatures_no_truncate on public.admin_document_signatures;
create trigger trg_admin_document_signatures_no_truncate
  before truncate on public.admin_document_signatures
  for each statement execute function public.prevent_admin_document_signatures_mutation();
