-- "Quer Investir Quanto?" aceita de R$ 0,01 a R$ 10.000.000.000,00.
-- Em centavos o teto (1e12) não cabe em integer, então recibos e a RPC da
-- promoção passam a usar bigint.
alter table public.billing_receipts alter column amount_cents type bigint;

drop function if exists public.fulfill_promo_invest_checkout(uuid,text,integer);
create or replace function public.fulfill_promo_invest_checkout(
  p_checkout_id uuid, p_provider_key text, p_amount_cents bigint
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  c public.billing_checkouts%rowtype;
  a public.advogados%rowtype;
  p jsonb;
  base timestamptz;
  expiry timestamptz;
begin
  select * into c from public.billing_checkouts where id=p_checkout_id for update;
  if not found then raise exception 'CHECKOUT_NOT_FOUND'; end if;
  if exists(select 1 from public.billing_receipts where provider_key=p_provider_key and checkout_id=c.id) then
    return jsonb_build_object('approved',true,'duplicate',true);
  end if;
  p := c.product;
  if p->>'type' <> 'PROMO_INVEST' then raise exception 'UNKNOWN_PRODUCT'; end if;
  if c.status='paid' then raise exception 'SECOND_PAYMENT_FOR_ONE_TIME_CHECKOUT'; end if;
  if (p->>'priceInCents')::bigint is distinct from p_amount_cents then raise exception 'AMOUNT_MISMATCH'; end if;

  select * into strict a from public.advogados where id=c.advogado_id for update;
  insert into public.billing_receipts(provider_key,checkout_id,amount_cents)
    values(p_provider_key,c.id,p_amount_cents);

  -- A renovação soma 30 dias ao PRO ainda vigente, sem perder dias já pagos.
  base := now();
  if a.plan_type='PRO' and nullif(a.premium_expires_at,'') is not null
     and a.premium_expires_at::timestamptz > base then
    base := a.premium_expires_at::timestamptz;
  end if;
  expiry := base + make_interval(days => (p->>'expirationDays')::integer);

  update public.advogados set plan_type='PRO',plan_billing_cycle='AVULSO',
    is_premium=true,premium_expires_at=expiry::text,
    balance=coalesce(balance,0)+(p->>'jurisAmount')::integer,
    subscription_status='ACTIVE',promo_start_used=true,promo_pro_used=true
    where id=a.id;

  insert into public.transacoes(advogado_id,tipo,valor,moeda,status,juris_amount,stripe_session_id)
    values(a.id,'PROMO_INVEST',p_amount_cents/100.0,'BRL','succeeded',
      coalesce((p->>'jurisAmount')::integer,0),p_provider_key);
  update public.billing_checkouts set status='paid' where id=c.id;
  return jsonb_build_object('approved',true,'duplicate',false,'expiresAt',expiry);
end;
$$;
revoke all on function public.fulfill_promo_invest_checkout(uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.fulfill_promo_invest_checkout(uuid,text,bigint) to service_role;
notify pgrst, 'reload schema';
