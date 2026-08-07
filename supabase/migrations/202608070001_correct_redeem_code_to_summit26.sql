-- Correct the launch redeem code from SUMIT26 to SUMMIT26 without breaking
-- registrations that already reference the original row.

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
    raise exception 'Industrial Summit plan not found';
  end if;

  select id
  into v_target_code_id
  from public.summit_redeem_codes
  where code_normalized = 'SUMMIT26'
  for update;

  select id
  into v_previous_code_id
  from public.summit_redeem_codes
  where code_normalized = 'SUMIT26'
  for update;

  if v_target_code_id is null and v_previous_code_id is not null then
    update public.summit_redeem_codes
    set
      code_normalized = 'SUMMIT26',
      plan_id = v_plan_id,
      discount_paise = 60000,
      active = true
    where id = v_previous_code_id
    returning id into v_target_code_id;
  elsif v_target_code_id is null then
    insert into public.summit_redeem_codes (
      plan_id,
      code_normalized,
      discount_paise,
      active
    )
    values (
      v_plan_id,
      'SUMMIT26',
      60000,
      true
    )
    on conflict (code_normalized) do update
    set
      plan_id = excluded.plan_id,
      discount_paise = excluded.discount_paise,
      active = true
    returning id into v_target_code_id;
  end if;

  if v_previous_code_id is not null and v_previous_code_id <> v_target_code_id then
    update public.summit_applications
    set redeem_code_id = v_target_code_id
    where redeem_code_id = v_previous_code_id;

    delete from public.summit_redeem_codes
    where id = v_previous_code_id;
  end if;

  update public.summit_redeem_codes
  set
    plan_id = v_plan_id,
    discount_paise = 60000,
    active = (id = v_target_code_id)
  where plan_id = v_plan_id or id = v_target_code_id;

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
