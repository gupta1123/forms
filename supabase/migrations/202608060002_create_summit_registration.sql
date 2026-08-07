-- Public registration flow for the Industrial Summit.
-- Tables have no direct anon/authenticated access. All public access is through
-- narrowly scoped security-definer functions that validate a random checkout token.

create table public.summit_plans (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  description text,
  price_paise integer not null check (price_paise > 0),
  gst_included boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.summit_redeem_codes (
  id bigint generated always as identity primary key,
  plan_id bigint not null references public.summit_plans (id) on delete cascade,
  code_normalized text not null unique,
  discount_paise integer not null check (discount_paise > 0),
  active boolean not null default true,
  valid_from timestamptz,
  valid_until timestamptz,
  redemption_limit integer check (redemption_limit is null or redemption_limit > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table public.summit_applications (
  id bigint generated always as identity primary key,
  checkout_token uuid not null default gen_random_uuid() unique,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 80),
  phone text not null check (char_length(trim(phone)) between 7 and 30),
  email text not null check (char_length(trim(email)) between 3 and 320),
  industry text not null check (char_length(trim(industry)) between 1 and 120),
  profession text not null check (char_length(trim(profession)) between 1 and 120),
  designation text not null check (char_length(trim(designation)) between 1 and 120),
  place text not null check (char_length(trim(place)) between 1 and 120),
  summit_expectations text check (
    summit_expectations is null or char_length(trim(summit_expectations)) <= 2000
  ),
  plan_id bigint not null references public.summit_plans (id),
  redeem_code_id bigint references public.summit_redeem_codes (id) on delete set null,
  original_amount_paise integer not null check (original_amount_paise > 0),
  amount_due_paise integer not null check (
    amount_due_paise >= 0 and amount_due_paise <= original_amount_paise
  ),
  status text not null default 'details_submitted' check (
    status in ('details_submitted', 'payment_pending', 'paid', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index summit_redeem_codes_plan_id_idx
  on public.summit_redeem_codes (plan_id);

create index summit_applications_plan_id_idx
  on public.summit_applications (plan_id);

create index summit_applications_redeem_code_id_idx
  on public.summit_applications (redeem_code_id)
  where redeem_code_id is not null;

create index summit_applications_email_idx
  on public.summit_applications (email);

create index summit_applications_created_at_idx
  on public.summit_applications (created_at desc);

alter table public.summit_plans enable row level security;
alter table public.summit_redeem_codes enable row level security;
alter table public.summit_applications enable row level security;

-- No direct table access is needed from either browser-facing role.
revoke all on table public.summit_plans from anon, authenticated;
revoke all on table public.summit_redeem_codes from anon, authenticated;
revoke all on table public.summit_applications from anon, authenticated;
revoke all on sequence public.summit_plans_id_seq from anon, authenticated;
revoke all on sequence public.summit_redeem_codes_id_seq from anon, authenticated;
revoke all on sequence public.summit_applications_id_seq from anon, authenticated;

create function public.set_summit_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_summit_plans_updated_at
before update on public.summit_plans
for each row execute function public.set_summit_updated_at();

create trigger set_summit_redeem_codes_updated_at
before update on public.summit_redeem_codes
for each row execute function public.set_summit_updated_at();

create trigger set_summit_applications_updated_at
before update on public.summit_applications
for each row execute function public.set_summit_updated_at();

insert into public.summit_plans (
  slug,
  name,
  description,
  price_paise,
  gst_included,
  active
)
values (
  'investment-summit-pass',
  'Industrial Summit Pass',
  'Registration for the Industrial Summit.',
  299900,
  true,
  true
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  price_paise = excluded.price_paise,
  gst_included = excluded.gst_included,
  active = excluded.active;

-- Initial testing/launch code: SUMMIT600 (₹600 off, ₹2,399 payable).
insert into public.summit_redeem_codes (
  plan_id,
  code_normalized,
  discount_paise,
  active
)
select
  id,
  'SUMMIT600',
  60000,
  true
from public.summit_plans
where slug = 'investment-summit-pass'
on conflict (code_normalized) do update
set
  plan_id = excluded.plan_id,
  discount_paise = excluded.discount_paise,
  active = excluded.active;

create function public.save_summit_application(
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
  if char_length(trim(p_industry)) not between 1 and 120 then
    raise exception 'Invalid industry' using errcode = '22023';
  end if;
  if char_length(trim(p_profession)) not between 1 and 120 then
    raise exception 'Invalid profession' using errcode = '22023';
  end if;
  if char_length(trim(p_designation)) not between 1 and 120 then
    raise exception 'Invalid designation' using errcode = '22023';
  end if;
  if char_length(trim(p_place)) not between 1 and 120 then
    raise exception 'Invalid place' using errcode = '22023';
  end if;
  if p_summit_expectations is not null
    and char_length(trim(p_summit_expectations)) > 2000 then
    raise exception 'Summit expectations are too long' using errcode = '22023';
  end if;

  select id, price_paise
  into v_plan_id, v_price_paise
  from public.summit_plans
  where slug = 'investment-summit-pass' and active = true;

  if v_plan_id is null then
    raise exception 'The summit plan is not available' using errcode = 'P0001';
  end if;

  if p_checkout_token is not null then
    update public.summit_applications
    set
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      phone = trim(p_phone),
      email = lower(trim(p_email)),
      industry = trim(p_industry),
      profession = trim(p_profession),
      designation = trim(p_designation),
      place = trim(p_place),
      summit_expectations = nullif(trim(p_summit_expectations), '')
    where checkout_token = p_checkout_token
    returning checkout_token into v_checkout_token;
  end if;

  if v_checkout_token is null then
    insert into public.summit_applications (
      first_name,
      last_name,
      phone,
      email,
      industry,
      profession,
      designation,
      place,
      summit_expectations,
      plan_id,
      original_amount_paise,
      amount_due_paise
    )
    values (
      trim(p_first_name),
      trim(p_last_name),
      trim(p_phone),
      lower(trim(p_email)),
      trim(p_industry),
      trim(p_profession),
      trim(p_designation),
      trim(p_place),
      nullif(trim(p_summit_expectations), ''),
      v_plan_id,
      v_price_paise,
      v_price_paise
    )
    returning checkout_token into v_checkout_token;
  end if;

  return v_checkout_token;
end;
$$;

create function public.get_summit_registration(p_checkout_token uuid)
returns table (
  first_name text,
  last_name text,
  phone text,
  email text,
  industry text,
  profession text,
  designation text,
  place text,
  summit_expectations text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.first_name,
    a.last_name,
    a.phone,
    a.email,
    a.industry,
    a.profession,
    a.designation,
    a.place,
    a.summit_expectations
  from public.summit_applications as a
  where a.checkout_token = p_checkout_token
  limit 1;
$$;

create function public.get_summit_checkout(p_checkout_token uuid)
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

create function public.apply_summit_redeem_code(
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
  v_redeem_code_id bigint;
  v_discount_amount integer;
begin
  if char_length(trim(p_code)) not between 3 and 40 then
    raise exception 'Invalid redeem code' using errcode = '22023';
  end if;

  select a.id, a.plan_id, a.original_amount_paise
  into v_application_id, v_plan_id, v_original_amount
  from public.summit_applications as a
  where a.checkout_token = p_checkout_token
  for update;

  if v_application_id is null then
    raise exception 'Registration not found' using errcode = 'P0001';
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
  set
    redeem_code_id = v_redeem_code_id,
    amount_due_paise = greatest(v_original_amount - v_discount_amount, 0)
  where id = v_application_id;

  return query
  select
    v_original_amount,
    least(v_discount_amount, v_original_amount),
    greatest(v_original_amount - v_discount_amount, 0);
end;
$$;

revoke all on function public.set_summit_updated_at() from public;
revoke all on function public.save_summit_application(text, text, text, text, text, text, text, text, text, uuid) from public;
revoke all on function public.get_summit_registration(uuid) from public;
revoke all on function public.get_summit_checkout(uuid) from public;
revoke all on function public.apply_summit_redeem_code(uuid, text) from public;

grant execute on function public.save_summit_application(text, text, text, text, text, text, text, text, text, uuid) to anon, authenticated;
grant execute on function public.get_summit_registration(uuid) to anon, authenticated;
grant execute on function public.get_summit_checkout(uuid) to anon, authenticated;
grant execute on function public.apply_summit_redeem_code(uuid, text) to anon, authenticated;
