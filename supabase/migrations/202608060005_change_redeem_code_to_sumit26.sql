-- Make SUMIT26 the only active launch redeem code while preserving any
-- registrations and paid redemption counts linked to the previous code.

do $$
declare
  v_plan_id bigint;
  v_target_code_id bigint;
  v_previous_code_id bigint;
begin
  select id
  into v_plan_id
  from public.summit_plans
  where slug = 'investment-summit-pass'
  for update;

  if v_plan_id is null then
    raise exception 'Investment Summit plan not found';
  end if;

  insert into public.summit_redeem_codes (
    plan_id,
    code_normalized,
    discount_paise,
    active
  )
  values (
    v_plan_id,
    'SUMIT26',
    60000,
    true
  )
  on conflict (code_normalized) do update
  set
    plan_id = excluded.plan_id,
    discount_paise = excluded.discount_paise,
    active = true
  returning id into v_target_code_id;

  select id
  into v_previous_code_id
  from public.summit_redeem_codes
  where code_normalized = 'SUMMIT600'
    and id <> v_target_code_id
  for update;

  if v_previous_code_id is not null then
    update public.summit_applications
    set redeem_code_id = v_target_code_id
    where redeem_code_id = v_previous_code_id;

    delete from public.summit_redeem_codes
    where id = v_previous_code_id;
  end if;

  update public.summit_redeem_codes
  set active = (id = v_target_code_id)
  where plan_id = v_plan_id;

  update public.summit_redeem_codes as redeem_codes
  set redemption_count = (
    select count(*)::integer
    from public.summit_applications as applications
    where applications.redeem_code_id = redeem_codes.id
      and applications.redeem_counted_at is not null
  )
  where redeem_codes.id = v_target_code_id;
end;
$$;

-- Registration reads and writes are performed only by trusted Next.js server
-- code. Browser-facing roles retain no direct function execution privileges.
revoke execute on function public.save_summit_application(text, text, text, text, text, text, text, text, text, uuid) from anon, authenticated;
revoke execute on function public.get_summit_registration(uuid) from anon, authenticated;
revoke execute on function public.get_summit_checkout(uuid) from anon, authenticated;
revoke execute on function public.apply_summit_redeem_code(uuid, text) from anon, authenticated;

grant execute on function public.save_summit_application(text, text, text, text, text, text, text, text, text, uuid) to service_role;
grant execute on function public.get_summit_registration(uuid) to service_role;
grant execute on function public.get_summit_checkout(uuid) to service_role;
grant execute on function public.apply_summit_redeem_code(uuid, text) to service_role;
