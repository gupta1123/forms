-- Link-only Industrial Summit registrations. These entries are deliberately
-- separate from the paid summit_applications flow and never create payments or
-- confirmation emails. The form writes through the server-only Supabase key;
-- administrators read entries only after the app verifies summit admin access.

create table public.summit_private_registrations (
  id bigint generated always as identity primary key,
  submission_token uuid not null default gen_random_uuid() unique,
  first_name text not null check (char_length(trim(first_name)) between 1 and 80),
  last_name text not null check (char_length(trim(last_name)) between 1 and 80),
  phone text not null check (char_length(trim(phone)) between 7 and 30),
  email text not null check (char_length(trim(email)) between 3 and 320),
  industry text not null check (char_length(trim(industry)) between 1 and 120),
  profession text not null check (char_length(trim(profession)) between 1 and 120),
  designation text not null check (char_length(trim(designation)) between 1 and 120),
  place text not null check (char_length(trim(place)) between 1 and 120),
  participation_purpose text not null check (
    char_length(trim(participation_purpose)) between 1 and 180
  ),
  summit_expectations text check (
    summit_expectations is null or char_length(trim(summit_expectations)) <= 1200
  ),
  source text not null default 'private_link' check (source = 'private_link'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index summit_private_registrations_created_at_idx
  on public.summit_private_registrations (created_at desc);

create index summit_private_registrations_email_idx
  on public.summit_private_registrations (lower(email));

create index summit_private_registrations_phone_idx
  on public.summit_private_registrations (phone);

alter table public.summit_private_registrations enable row level security;

revoke all on table public.summit_private_registrations from anon, authenticated;
revoke all on sequence public.summit_private_registrations_id_seq from anon, authenticated;

grant select, insert on table public.summit_private_registrations to service_role;
grant usage, select on sequence public.summit_private_registrations_id_seq to service_role;

create trigger set_summit_private_registrations_updated_at
before update on public.summit_private_registrations
for each row execute function public.set_summit_updated_at();
