create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  actor_id uuid null,
  actor_type text null,
  actor_email_hash text null,
  target_user_id uuid null,
  target_type text null,
  target_email_hash text null,
  request_ip_hash text null,
  user_agent text null,
  outcome text not null default 'SUCCESS',
  status_code integer null,
  metadata jsonb not null default '{}'::jsonb,
  retention_until timestamptz not null default (now() + interval '90 days'),
  event_hash text not null
);

comment on table public.security_audit_events is
  'SOC 2 / ISO 27001 append-only security audit trail. Keep records for at least 90 days.';

create index if not exists idx_security_audit_events_created_at
  on public.security_audit_events (created_at desc);

create index if not exists idx_security_audit_events_type_created_at
  on public.security_audit_events (event_type, created_at desc);

create index if not exists idx_security_audit_events_actor_id
  on public.security_audit_events (actor_id)
  where actor_id is not null;

create index if not exists idx_security_audit_events_target_user_id
  on public.security_audit_events (target_user_id)
  where target_user_id is not null;

alter table public.security_audit_events enable row level security;

revoke all on public.security_audit_events from anon;
revoke all on public.security_audit_events from authenticated;
grant select, insert on public.security_audit_events to service_role;

create or replace function public.prevent_security_audit_events_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'security_audit_events is append-only';
end;
$$;

drop trigger if exists trg_security_audit_events_no_update on public.security_audit_events;
create trigger trg_security_audit_events_no_update
  before update on public.security_audit_events
  for each row execute function public.prevent_security_audit_events_mutation();

drop trigger if exists trg_security_audit_events_no_delete on public.security_audit_events;
create trigger trg_security_audit_events_no_delete
  before delete on public.security_audit_events
  for each row execute function public.prevent_security_audit_events_mutation();

drop trigger if exists trg_security_audit_events_no_truncate on public.security_audit_events;
create trigger trg_security_audit_events_no_truncate
  before truncate on public.security_audit_events
  for each statement execute function public.prevent_security_audit_events_mutation();
