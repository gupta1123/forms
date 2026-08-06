-- Razorpay payment records and server-only payment state transitions.
-- Browser roles cannot read or write these tables. The Next.js backend uses a
-- Supabase secret key and Razorpay credentials to perform privileged work.

alter table public.summit_applications
  add column paid_at timestamptz,
  add column redeem_counted_at timestamptz;

create table public.summit_payment_orders (
  id bigint generated always as identity primary key,
  application_id bigint not null references public.summit_applications (id) on delete cascade,
  provider text not null default 'razorpay' check (provider = 'razorpay'),
  key_mode text not null check (key_mode in ('test', 'live')),
  provider_order_id text,
  receipt text not null check (char_length(receipt) between 1 and 40),
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'initializing' check (
    status in ('initializing', 'created', 'attempted', 'paid', 'creation_failed')
  ),
  attempts integer not null default 0 check (attempts >= 0),
  provider_created_at timestamptz,
  last_error_code text,
  last_error_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, key_mode),
  unique (provider, key_mode, receipt),
  unique (provider, provider_order_id)
);

create table public.summit_payment_attempts (
  id bigint generated always as identity primary key,
  payment_order_id bigint not null references public.summit_payment_orders (id) on delete cascade,
  provider_payment_id text not null unique,
  status text not null check (
    status in ('created', 'authorized', 'captured', 'refunded', 'failed')
  ),
  amount_paise integer not null check (amount_paise > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  method text,
  signature_verified_at timestamptz,
  captured_at timestamptz,
  error_code text,
  error_description text,
  error_source text,
  error_step text,
  error_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.summit_payment_webhook_events (
  id bigint generated always as identity primary key,
  provider_event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  processing_status text not null default 'received' check (
    processing_status in ('received', 'processed', 'ignored', 'failed')
  ),
  processing_attempts integer not null default 0 check (processing_attempts >= 0),
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index summit_payment_orders_application_id_idx
  on public.summit_payment_orders (application_id);

create index summit_payment_orders_pending_idx
  on public.summit_payment_orders (created_at desc)
  where status in ('initializing', 'created', 'attempted');

create index summit_payment_attempts_payment_order_id_idx
  on public.summit_payment_attempts (payment_order_id);

create index summit_payment_attempts_status_created_at_idx
  on public.summit_payment_attempts (status, created_at desc);

create index summit_payment_webhook_events_pending_idx
  on public.summit_payment_webhook_events (received_at)
  where processing_status in ('received', 'failed');

alter table public.summit_payment_orders enable row level security;
alter table public.summit_payment_attempts enable row level security;
alter table public.summit_payment_webhook_events enable row level security;

revoke all on table public.summit_payment_orders from anon, authenticated;
revoke all on table public.summit_payment_attempts from anon, authenticated;
revoke all on table public.summit_payment_webhook_events from anon, authenticated;
revoke all on sequence public.summit_payment_orders_id_seq from anon, authenticated;
revoke all on sequence public.summit_payment_attempts_id_seq from anon, authenticated;
revoke all on sequence public.summit_payment_webhook_events_id_seq from anon, authenticated;

create trigger set_summit_payment_orders_updated_at
before update on public.summit_payment_orders
for each row execute function public.set_summit_updated_at();

create trigger set_summit_payment_attempts_updated_at
before update on public.summit_payment_attempts
for each row execute function public.set_summit_updated_at();

-- The server calls this after independently verifying the Checkout signature
-- and fetching the payment from Razorpay, or after validating a webhook.
create function public.record_summit_payment_result(
  p_application_id bigint,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_payment_status text,
  p_amount_paise integer,
  p_currency text,
  p_method text default null,
  p_signature_verified boolean default false,
  p_error_code text default null,
  p_error_description text default null,
  p_error_source text default null,
  p_error_step text default null,
  p_error_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.summit_applications%rowtype;
  v_order public.summit_payment_orders%rowtype;
begin
  if p_payment_status not in ('created', 'authorized', 'captured', 'refunded', 'failed') then
    raise exception 'Unsupported payment status' using errcode = '22023';
  end if;

  select *
  into v_application
  from public.summit_applications
  where id = p_application_id
  for update;

  if v_application.id is null then
    raise exception 'Registration not found' using errcode = 'P0001';
  end if;

  select *
  into v_order
  from public.summit_payment_orders
  where application_id = p_application_id
    and provider = 'razorpay'
    and provider_order_id = p_provider_order_id
  for update;

  if v_order.id is null then
    raise exception 'Payment order not found' using errcode = 'P0001';
  end if;

  if p_amount_paise <> v_order.amount_paise
    or upper(p_currency) <> v_order.currency
    or v_order.amount_paise <> v_application.amount_due_paise then
    raise exception 'Payment amount does not match the registration'
      using errcode = '22023';
  end if;

  insert into public.summit_payment_attempts as existing_attempt (
    payment_order_id,
    provider_payment_id,
    status,
    amount_paise,
    currency,
    method,
    signature_verified_at,
    captured_at,
    error_code,
    error_description,
    error_source,
    error_step,
    error_reason
  )
  values (
    v_order.id,
    p_provider_payment_id,
    p_payment_status,
    p_amount_paise,
    upper(p_currency),
    nullif(trim(p_method), ''),
    case when p_signature_verified then now() else null end,
    case when p_payment_status = 'captured' then now() else null end,
    nullif(p_error_code, ''),
    nullif(p_error_description, ''),
    nullif(p_error_source, ''),
    nullif(p_error_step, ''),
    nullif(p_error_reason, '')
  )
  on conflict (provider_payment_id) do update
  set
    status = excluded.status,
    method = coalesce(excluded.method, existing_attempt.method),
    signature_verified_at = coalesce(
      existing_attempt.signature_verified_at,
      excluded.signature_verified_at
    ),
    captured_at = coalesce(
      existing_attempt.captured_at,
      excluded.captured_at
    ),
    error_code = excluded.error_code,
    error_description = excluded.error_description,
    error_source = excluded.error_source,
    error_step = excluded.error_step,
    error_reason = excluded.error_reason
  where existing_attempt.payment_order_id = excluded.payment_order_id;

  update public.summit_payment_orders
  set
    status = case
      when p_payment_status = 'captured' then 'paid'
      when p_payment_status in ('created', 'authorized', 'failed') then 'attempted'
      else status
    end,
    attempts = greatest(attempts, 1),
    last_error_code = nullif(p_error_code, ''),
    last_error_description = nullif(p_error_description, '')
  where id = v_order.id;

  if p_payment_status = 'captured' then
    update public.summit_applications
    set
      status = 'paid',
      paid_at = coalesce(paid_at, now())
    where id = v_application.id;

    if v_application.redeem_code_id is not null
      and v_application.redeem_counted_at is null then
      update public.summit_redeem_codes
      set redemption_count = redemption_count + 1
      where id = v_application.redeem_code_id;

      update public.summit_applications
      set redeem_counted_at = now()
      where id = v_application.id
        and redeem_counted_at is null;
    end if;
  elsif v_application.status = 'details_submitted' then
    update public.summit_applications
    set status = 'payment_pending'
    where id = v_application.id;
  end if;

  return jsonb_build_object(
    'application_id', v_application.id,
    'payment_order_id', v_order.id,
    'payment_status', p_payment_status,
    'registration_status', case
      when p_payment_status = 'captured' then 'paid'
      else 'payment_pending'
    end
  );
end;
$$;

-- A price cannot change after a provider order has been reserved. This keeps
-- the browser's displayed total, the local payment order, and Razorpay equal.
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
  v_redeem_code_id bigint;
  v_discount_amount integer;
begin
  if char_length(trim(p_code)) not between 3 and 40 then
    raise exception 'Invalid redeem code' using errcode = '22023';
  end if;

  select a.id, a.plan_id, a.original_amount_paise, a.status
  into v_application_id, v_plan_id, v_original_amount, v_status
  from public.summit_applications as a
  where a.checkout_token = p_checkout_token
  for update;

  if v_application_id is null then
    raise exception 'Registration not found' using errcode = 'P0001';
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

revoke all on function public.record_summit_payment_result(bigint, text, text, text, integer, text, text, boolean, text, text, text, text, text) from public;
grant execute on function public.record_summit_payment_result(bigint, text, text, text, integer, text, text, boolean, text, text, text, text, text) to service_role;

-- Extend the protected operations dashboard with provider reconciliation data.
create or replace function public.get_summit_admin_dashboard(p_limit integer default 500)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_total_registrations bigint;
  v_redeem_code_registrations bigint;
  v_paid_registrations bigint;
  v_live_paid_registrations bigint;
  v_test_paid_registrations bigint;
  v_awaiting_payment bigint;
  v_collected_paise bigint;
  v_test_collected_paise bigint;
  v_expected_paise bigint;
  v_rows jsonb;
begin
  if not public.is_summit_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select
    count(*),
    count(*) filter (where applications.redeem_code_id is not null),
    count(*) filter (where applications.status = 'paid'),
    count(*) filter (where applications.status = 'paid' and paid_orders.key_mode = 'live'),
    count(*) filter (where applications.status = 'paid' and paid_orders.key_mode = 'test'),
    count(*) filter (where applications.status in ('details_submitted', 'payment_pending')),
    coalesce(sum(applications.amount_due_paise) filter (
      where applications.status = 'paid' and paid_orders.key_mode = 'live'
    ), 0),
    coalesce(sum(applications.amount_due_paise) filter (
      where applications.status = 'paid' and paid_orders.key_mode = 'test'
    ), 0),
    coalesce(sum(applications.amount_due_paise) filter (
      where applications.status <> 'cancelled'
    ), 0)
  into
    v_total_registrations,
    v_redeem_code_registrations,
    v_paid_registrations,
    v_live_paid_registrations,
    v_test_paid_registrations,
    v_awaiting_payment,
    v_collected_paise,
    v_test_collected_paise,
    v_expected_paise
  from public.summit_applications as applications
  left join lateral (
    select payment_orders.key_mode
    from public.summit_payment_orders as payment_orders
    where payment_orders.application_id = applications.id
      and payment_orders.status = 'paid'
    order by payment_orders.created_at desc
    limit 1
  ) as paid_orders on true;

  select coalesce(
    jsonb_agg(to_jsonb(registrations) order by registrations.created_at desc),
    '[]'::jsonb
  )
  into v_rows
  from (
    select
      applications.id as application_id,
      applications.first_name,
      applications.last_name,
      applications.phone,
      applications.email,
      applications.industry,
      applications.profession,
      applications.designation,
      applications.place,
      applications.summit_expectations,
      plans.name as plan_name,
      redeem_codes.code_normalized as redeem_code,
      applications.original_amount_paise,
      applications.amount_due_paise,
      applications.original_amount_paise - applications.amount_due_paise
        as discount_amount_paise,
      applications.status as payment_status,
      payment_orders.key_mode as payment_mode,
      payment_orders.provider_order_id as razorpay_order_id,
      payment_attempts.provider_payment_id as razorpay_payment_id,
      payment_attempts.status as provider_payment_status,
      payment_attempts.method as payment_method,
      applications.paid_at,
      applications.created_at,
      applications.updated_at
    from public.summit_applications as applications
    join public.summit_plans as plans on plans.id = applications.plan_id
    left join public.summit_redeem_codes as redeem_codes
      on redeem_codes.id = applications.redeem_code_id
    left join lateral (
      select payment_orders.*
      from public.summit_payment_orders as payment_orders
      where payment_orders.application_id = applications.id
      order by payment_orders.created_at desc
      limit 1
    ) as payment_orders on true
    left join lateral (
      select payment_attempts.*
      from public.summit_payment_attempts as payment_attempts
      where payment_attempts.payment_order_id = payment_orders.id
      order by payment_attempts.updated_at desc
      limit 1
    ) as payment_attempts on true
    order by applications.created_at desc
    limit v_limit
  ) as registrations;

  return jsonb_build_object(
    'generated_at', now(),
    'source', 'public.summit_applications + Razorpay payment records',
    'metrics', jsonb_build_object(
      'total_registrations', v_total_registrations,
      'redeem_code_registrations', v_redeem_code_registrations,
      'paid_registrations', v_paid_registrations,
      'live_paid_registrations', v_live_paid_registrations,
      'test_paid_registrations', v_test_paid_registrations,
      'awaiting_payment', v_awaiting_payment,
      'collected_paise', v_collected_paise,
      'test_collected_paise', v_test_collected_paise,
      'expected_paise', v_expected_paise
    ),
    'registrations', v_rows
  );
end;
$$;
