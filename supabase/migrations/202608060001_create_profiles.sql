-- Store the form response for each authenticated user.
-- Email and passwords remain managed by Supabase Auth.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 100),
  phone text check (phone is null or char_length(trim(phone)) between 7 and 30),
  date_of_birth date,
  city text check (city is null or char_length(trim(city)) <= 100),
  occupation text check (occupation is null or char_length(trim(occupation)) <= 100),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Basic form details submitted by authenticated users.';

alter table public.profiles enable row level security;

create policy "users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- The browser client needs only these operations. Profile deletion is not granted.
revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profile_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

