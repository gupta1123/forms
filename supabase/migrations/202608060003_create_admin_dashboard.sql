-- Admin-only access for the Industrial Summit dashboard.
-- Attendee registration stays public, but dashboard access requires both a
-- valid Supabase Auth session and membership in summit_admins.

create table public.summit_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null or char_length(trim(display_name)) between 1 and 100
  ),
  created_at timestamptz not null default now()
);

alter table public.summit_admins enable row level security;

revoke all on table public.summit_admins from anon, authenticated;

create function public.is_summit_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.summit_admins as admins
    where admins.user_id = (select auth.uid())
  );
$$;

create function public.get_summit_admin_dashboard(p_limit integer default 500)
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
  v_awaiting_payment bigint;
  v_collected_paise bigint;
  v_expected_paise bigint;
  v_rows jsonb;
begin
  if not public.is_summit_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select
    count(*),
    count(*) filter (where redeem_code_id is not null),
    count(*) filter (where status = 'paid'),
    count(*) filter (where status in ('details_submitted', 'payment_pending')),
    coalesce(sum(amount_due_paise) filter (where status = 'paid'), 0),
    coalesce(sum(amount_due_paise) filter (where status <> 'cancelled'), 0)
  into
    v_total_registrations,
    v_redeem_code_registrations,
    v_paid_registrations,
    v_awaiting_payment,
    v_collected_paise,
    v_expected_paise
  from public.summit_applications;

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
      applications.created_at,
      applications.updated_at
    from public.summit_applications as applications
    join public.summit_plans as plans on plans.id = applications.plan_id
    left join public.summit_redeem_codes as redeem_codes
      on redeem_codes.id = applications.redeem_code_id
    order by applications.created_at desc
    limit v_limit
  ) as registrations;

  return jsonb_build_object(
    'generated_at', now(),
    'source', 'public.summit_applications',
    'metrics', jsonb_build_object(
      'total_registrations', v_total_registrations,
      'redeem_code_registrations', v_redeem_code_registrations,
      'paid_registrations', v_paid_registrations,
      'awaiting_payment', v_awaiting_payment,
      'collected_paise', v_collected_paise,
      'expected_paise', v_expected_paise
    ),
    'registrations', v_rows
  );
end;
$$;

-- Dashboard setup helper. It is intentionally not granted to browser roles and
-- can only be run by a database owner from the SQL Editor.
create function public.add_summit_admin_by_email(
  p_email text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select users.id
  into v_user_id
  from auth.users as users
  where lower(users.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'Create this user in Authentication > Users first'
      using errcode = 'P0001';
  end if;

  insert into public.summit_admins (user_id, display_name)
  values (v_user_id, nullif(trim(p_display_name), ''))
  on conflict (user_id) do update
  set display_name = excluded.display_name;

  return v_user_id;
end;
$$;

revoke all on function public.is_summit_admin() from public;
revoke all on function public.get_summit_admin_dashboard(integer) from public;
revoke all on function public.add_summit_admin_by_email(text, text) from public;

grant execute on function public.is_summit_admin() to authenticated;
grant execute on function public.get_summit_admin_dashboard(integer) to authenticated;
