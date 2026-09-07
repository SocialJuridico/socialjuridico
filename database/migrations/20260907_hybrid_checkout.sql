-- New checkout only. Existing Mercado Pago subscriptions remain untouched.
create table if not exists public.billing_checkouts (
  id uuid primary key,
  advogado_id uuid not null references public.advogados(id),
  method text not null check (method in ('card','pix')),
  product jsonb not null,
  payer_email text not null,
  previous_subscription_id text,
  provider_id text unique,
  subscription_id text unique,
  status text not null default 'creating',
  coupon_id uuid,
  coupon_token uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists billing_one_open_plan
  on public.billing_checkouts(advogado_id)
  where product->>'type' = 'PRO_SUBSCRIPTION' and status in ('creating','pending');
create index if not exists billing_checkouts_owner on public.billing_checkouts(advogado_id);
create table if not exists public.billing_receipts (
  provider_key text primary key,
  checkout_id uuid not null references public.billing_checkouts(id),
  amount_cents integer not null check(amount_cents > 0),
  created_at timestamptz not null default now()
);
create index if not exists billing_receipts_checkout on public.billing_receipts(checkout_id);
alter table public.billing_checkouts enable row level security;
alter table public.billing_receipts enable row level security;
revoke all on public.billing_checkouts, public.billing_receipts from anon, authenticated;
grant select, insert, update, delete on public.billing_checkouts, public.billing_receipts to service_role;

-- Recheck plan eligibility under the same profile lock used by fulfillment.
-- This closes the race between an earlier HTTP profile read and a paid checkout.
create or replace function public.validate_hybrid_plan_insert() returns trigger
language plpgsql security invoker set search_path=public as $$
declare a public.advogados%rowtype;
begin
  if new.product->>'type'='PRO_SUBSCRIPTION' then
    select * into strict a from public.advogados where id=new.advogado_id for update;
    if coalesce(a.subscription_status,'') not in ('CANCELED','CANCELLED','UNPAID','BLOCKED') then
      if a.plan_type=new.product->>'planType' or (a.plan_type='PRO' and new.product->>'planType'='START') then
        raise exception 'PLAN_ALREADY_ACTIVE';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.validate_hybrid_plan_insert() from public,anon,authenticated;
grant execute on function public.validate_hybrid_plan_insert() to service_role;
drop trigger if exists validate_hybrid_plan_insert on public.billing_checkouts;
create trigger validate_hybrid_plan_insert before insert on public.billing_checkouts
for each row execute function public.validate_hybrid_plan_insert();

-- Invoker privilege: only the backend service role can execute this function.
-- Receipt, balance, plan and transaction are committed or rolled back together.
create or replace function public.fulfill_hybrid_checkout(
  p_checkout_id uuid, p_provider_key text, p_amount_cents integer,
  p_first_charge boolean, p_subscription_id text default null,
  p_period_end timestamptz default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  c public.billing_checkouts%rowtype;
  a public.advogados%rowtype;
  p jsonb;
  expected integer;
  expiry timestamptz;
begin
  select * into c from public.billing_checkouts where id=p_checkout_id for update;
  if not found then raise exception 'CHECKOUT_NOT_FOUND'; end if;
  if exists(select 1 from public.billing_receipts where provider_key=p_provider_key and checkout_id=c.id) then
    return jsonb_build_object('approved',true,'duplicate',true);
  end if;
  p := c.product;
  if not (p->>'recurring')::boolean and c.status='paid' then
    raise exception 'SECOND_PAYMENT_FOR_ONE_TIME_CHECKOUT';
  end if;
  expected := case when (p->>'recurring')::boolean and not p_first_charge
    then (p->>'renewalPriceInCents')::integer else (p->>'priceInCents')::integer end;
  if expected is null or expected<>p_amount_cents then raise exception 'AMOUNT_MISMATCH'; end if;
  if (p->>'recurring')::boolean and (p_subscription_id is null or p_period_end is null) then
    raise exception 'SUBSCRIPTION_REQUIRED';
  end if;
  if c.subscription_id is not null and c.subscription_id is distinct from p_subscription_id then
    raise exception 'SUBSCRIPTION_MISMATCH';
  end if;
  select * into strict a from public.advogados where id=c.advogado_id for update;
  insert into public.billing_receipts(provider_key,checkout_id,amount_cents)
    values(p_provider_key,c.id,p_amount_cents);
  if p->>'type'='JURIS_PURCHASE' then
    update public.advogados set balance=coalesce(balance,0)+(p->>'jurisAmount')::integer where id=a.id;
  elsif p->>'type'='AI_CREDITS_PURCHASE' then
    update public.advogados set saldo_creditos_ia_extensao=coalesce(saldo_creditos_ia_extensao,0)+(p->>'aiCreditsAmount')::integer where id=a.id;
  elsif p->>'type'='PRO_SUBSCRIPTION' then
    if (p->>'recurring')::boolean then
      expiry := p_period_end;
    else
      expiry := now() + make_interval(days => (p->>'expirationDays')::integer);
    end if;
    -- Old/out-of-order renewals must not replace a newer subscription or plan.
    if a.stripe_subscription_id is not null and a.stripe_subscription_id is distinct from p_subscription_id
       and a.stripe_subscription_id is distinct from c.previous_subscription_id then
      raise exception 'NEWER_SUBSCRIPTION_EXISTS';
    end if;
    if a.plan_type=p->>'planType' and nullif(a.premium_expires_at,'') is not null then
      expiry := greatest(expiry,a.premium_expires_at::timestamptz);
    end if;
    update public.advogados set plan_type=p->>'planType',plan_billing_cycle=p->>'billingCycle',
      is_premium=true,premium_expires_at=expiry::text,
      balance=coalesce(balance,0)+(p->>'jurisAmount')::integer,
      subscription_status='ACTIVE',stripe_subscription_id=p_subscription_id,
      promo_start_used=true,promo_pro_used=true
      where id=a.id;
  else raise exception 'UNKNOWN_PRODUCT'; end if;
  insert into public.transacoes(advogado_id,tipo,valor,moeda,status,juris_amount,stripe_session_id,cupom_id)
    values(a.id,p->>'type',p_amount_cents/100.0,'BRL','succeeded',
      coalesce((p->>'jurisAmount')::integer,0),p_provider_key,case when p_first_charge then c.coupon_id else null end);
  update public.billing_checkouts set status='paid',subscription_id=p_subscription_id where id=c.id;
  return jsonb_build_object('approved',true,'duplicate',false);
end;
$$;
revoke all on function public.fulfill_hybrid_checkout(uuid,text,integer,boolean,text,timestamptz) from public,anon,authenticated;
grant execute on function public.fulfill_hybrid_checkout(uuid,text,integer,boolean,text,timestamptz) to service_role;
notify pgrst, 'reload schema';
