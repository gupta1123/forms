drop function if exists public.save_summit_corporate_application(text, text, text, integer, uuid);

create function public.save_summit_corporate_application(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_company_name text,
  p_attendee_count integer,
  p_checkout_token uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id bigint;
  v_price_paise integer;
  v_total_paise integer;
  v_checkout_token uuid;
begin
  if char_length(trim(p_first_name)) not between 1 and 80 then
    raise exception 'Invalid first name' using errcode = '22023';
  end if;
  if char_length(trim(p_last_name)) not between 1 and 80 then
    raise exception 'Invalid last name' using errcode = '22023';
  end if;
  if char_length(trim(p_phone)) not between 7 and 30
    or trim(p_phone) !~ '^[0-9+() .-]+$' then
    raise exception 'Invalid phone number' using errcode = '22023';
  end if;
  if char_length(trim(p_company_name)) not between 1 and 120 then
    raise exception 'Invalid company name' using errcode = '22023';
  end if;
  if p_attendee_count is null or p_attendee_count < 2 then
    raise exception 'Corporate registration requires at least two attendees' using errcode = '22023';
  end if;

  select id, price_paise
  into v_plan_id, v_price_paise
  from public.summit_plans
  where slug = 'investment-summit-pass' and active = true;

  if v_plan_id is null then
    raise exception 'The summit plan is not available' using errcode = 'P0001';
  end if;
  if p_attendee_count > 2147483647 / v_price_paise then
    raise exception 'The attendee count is too large for online checkout' using errcode = '22023';
  end if;
  v_total_paise := v_price_paise * p_attendee_count;

  if p_checkout_token is not null then
    update public.summit_applications
    set
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      phone = trim(p_phone),
      email = null,
      industry = 'Corporate registration',
      profession = trim(p_company_name),
      designation = 'Corporate contact',
      place = 'Not provided',
      summit_expectations = null,
      company_name = trim(p_company_name),
      attendee_count = p_attendee_count,
      original_amount_paise = v_total_paise,
      amount_due_paise = v_total_paise,
      redeem_code_id = null
    where checkout_token = p_checkout_token
      and registration_type = 'corporate'
      and status = 'details_submitted'
    returning checkout_token into v_checkout_token;
  end if;

  if v_checkout_token is null then
    insert into public.summit_applications (
      first_name, last_name, phone, email, industry, profession, designation,
      place, summit_expectations, plan_id, original_amount_paise,
      amount_due_paise, registration_type, company_name, attendee_count
    )
    values (
      trim(p_first_name), trim(p_last_name), trim(p_phone), null,
      'Corporate registration', trim(p_company_name), 'Corporate contact',
      'Not provided', null, v_plan_id, v_total_paise, v_total_paise,
      'corporate', trim(p_company_name), p_attendee_count
    )
    returning checkout_token into v_checkout_token;
  end if;

  return v_checkout_token;
end;
$$;

revoke all on function public.save_summit_corporate_application(text, text, text, text, integer, uuid) from public;
grant execute on function public.save_summit_corporate_application(text, text, text, text, integer, uuid) to anon, authenticated;

create or replace function public.get_summit_checkout(p_checkout_token uuid)
returns table (
  attendee_name text,
  plan_name text,
  plan_description text,
  original_amount_paise integer,
  amount_due_paise integer,
  discount_amount_paise integer,
  has_redeem_code boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    concat_ws(' ', a.first_name, a.last_name),
    p.name,
    p.description,
    a.original_amount_paise,
    a.amount_due_paise,
    a.original_amount_paise - a.amount_due_paise,
    a.redeem_code_id is not null
  from public.summit_applications as a
  join public.summit_plans as p on p.id = a.plan_id
  where a.checkout_token = p_checkout_token
  limit 1;
$$;
