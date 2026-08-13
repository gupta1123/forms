-- Add a separate corporate registration path while preserving all existing
-- individual registrations and prices.

alter table public.summit_applications
  add column registration_type text not null default 'individual',
  add column company_name text,
  add column attendee_count integer not null default 1;

alter table public.summit_applications
  alter column email drop not null;

alter table public.summit_applications
  add constraint summit_applications_registration_type_check
    check (registration_type in ('individual', 'corporate')),
  add constraint summit_applications_company_name_check
    check (company_name is null or char_length(trim(company_name)) between 1 and 120),
  add constraint summit_applications_attendee_count_check
    check (
      (registration_type = 'individual' and attendee_count = 1 and company_name is null)
      or
      (registration_type = 'corporate' and attendee_count >= 2 and company_name is not null and redeem_code_id is null)
    );

create index summit_applications_registration_type_idx
  on public.summit_applications (registration_type, created_at desc);

create or replace function public.save_summit_application(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text,
  p_industry text,
  p_profession text,
  p_designation text,
  p_place text,
  p_summit_expectations text default null,
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
  if char_length(trim(p_email)) not between 3 and 320
    or trim(p_email) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Invalid email address' using errcode = '22023';
  end if;
  if char_length(trim(p_industry)) not between 1 and 120
    or char_length(trim(p_profession)) not between 1 and 120
    or char_length(trim(p_designation)) not between 1 and 120
    or char_length(trim(p_place)) not between 1 and 120 then
    raise exception 'Invalid registration details' using errcode = '22023';
  end if;
  if p_summit_expectations is not null
    and char_length(trim(p_summit_expectations)) > 2000 then
    raise exception 'Summit expectations are too long' using errcode = '22023';
  end if;

  select id, price_paise into v_plan_id, v_price_paise
  from public.summit_plans
  where slug = 'investment-summit-pass' and active = true;

  if v_plan_id is null then
    raise exception 'The summit plan is not available' using errcode = 'P0001';
  end if;

  if p_checkout_token is not null then
    update public.summit_applications
    set first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        phone = trim(p_phone),
        email = lower(trim(p_email)),
        industry = trim(p_industry),
        profession = trim(p_profession),
        designation = trim(p_designation),
        place = trim(p_place),
        summit_expectations = nullif(trim(p_summit_expectations), '')
    where checkout_token = p_checkout_token
      and registration_type = 'individual'
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
      trim(p_first_name), trim(p_last_name), trim(p_phone), lower(trim(p_email)),
      trim(p_industry), trim(p_profession), trim(p_designation), trim(p_place),
      nullif(trim(p_summit_expectations), ''), v_plan_id, v_price_paise,
      v_price_paise, 'individual', null, 1
    )
    returning checkout_token into v_checkout_token;
  end if;

  return v_checkout_token;
end;
$$;

create or replace function public.save_summit_corporate_application(
  p_contact_name text,
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
  if char_length(trim(p_contact_name)) not between 1 and 160 then
    raise exception 'Invalid contact name' using errcode = '22023';
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
      first_name = trim(p_contact_name),
      last_name = 'Corporate',
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
      trim(p_contact_name), 'Corporate', trim(p_phone), null,
      'Corporate registration', trim(p_company_name), 'Corporate contact',
      'Not provided', null, v_plan_id, v_total_paise, v_total_paise,
      'corporate', trim(p_company_name), p_attendee_count
    )
    returning checkout_token into v_checkout_token;
  end if;

  return v_checkout_token;
end;
$$;

revoke all on function public.save_summit_corporate_application(text, text, text, integer, uuid) from public;
grant execute on function public.save_summit_corporate_application(text, text, text, integer, uuid) to anon, authenticated;

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
    case when a.registration_type = 'corporate'
      then a.first_name
      else concat_ws(' ', a.first_name, a.last_name)
    end,
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

create or replace function public.apply_summit_redeem_code(
  p_checkout_token uuid,
  p_code text
)
returns table (
  original_amount_paise integer,
  discount_amount_paise integer,
  amount_due_paise integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application_id bigint;
  v_plan_id bigint;
  v_original_amount integer;
  v_status text;
  v_registration_type text;
  v_redeem_code_id bigint;
  v_discount_amount integer;
begin
  if char_length(trim(p_code)) not between 3 and 40 then
    raise exception 'Invalid redeem code' using errcode = '22023';
  end if;

  select a.id, a.plan_id, a.original_amount_paise, a.status, a.registration_type
  into v_application_id, v_plan_id, v_original_amount, v_status, v_registration_type
  from public.summit_applications as a
  where a.checkout_token = p_checkout_token
  for update;

  if v_application_id is null then
    raise exception 'Registration not found' using errcode = 'P0001';
  end if;
  if v_registration_type <> 'individual' then
    raise exception 'Redeem codes do not apply to corporate registrations' using errcode = '22023';
  end if;
  if v_status <> 'details_submitted'
    or exists (
      select 1 from public.summit_payment_orders as payment_orders
      where payment_orders.application_id = v_application_id
    ) then
    raise exception 'Pricing is locked after payment starts' using errcode = 'P0001';
  end if;

  select rc.id, rc.discount_paise
  into v_redeem_code_id, v_discount_amount
  from public.summit_redeem_codes as rc
  where rc.code_normalized = upper(trim(p_code))
    and rc.plan_id = v_plan_id
    and rc.active = true
    and (rc.valid_from is null or rc.valid_from <= now())
    and (rc.valid_until is null or rc.valid_until > now())
    and (rc.redemption_limit is null or rc.redemption_count < rc.redemption_limit)
  limit 1;

  if v_redeem_code_id is null then
    raise exception 'Invalid or expired redeem code' using errcode = '22023';
  end if;

  update public.summit_applications
  set redeem_code_id = v_redeem_code_id,
      amount_due_paise = greatest(v_original_amount - v_discount_amount, 0)
  where id = v_application_id;

  return query select v_original_amount,
    least(v_discount_amount, v_original_amount),
    greatest(v_original_amount - v_discount_amount, 0);
end;
$$;

create or replace function public.enqueue_summit_payment_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid'
    and old.status is distinct from 'paid'
    and new.email is not null then
    insert into public.summit_email_deliveries (application_id, recipient_email)
    values (new.id, new.email)
    on conflict (application_id, email_type) do nothing;
  end if;
  return new;
end;
$$;
