-- Transactional outbox for payment-confirmation emails. A payment status
-- transition enqueues one delivery; browser roles cannot access the queue.

create table public.summit_email_deliveries (
  id bigint generated always as identity primary key,
  application_id bigint not null references public.summit_applications (id) on delete cascade,
  email_type text not null default 'payment_confirmation' check (
    email_type = 'payment_confirmation'
  ),
  recipient_email text not null check (char_length(recipient_email) between 3 and 320),
  status text not null default 'pending' check (
    status in ('pending', 'sending', 'sent', 'failed')
  ),
  processing_attempts integer not null default 0 check (processing_attempts >= 0),
  provider_message_id text,
  last_error text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, email_type)
);

create index summit_email_deliveries_pending_idx
  on public.summit_email_deliveries (created_at)
  where status in ('pending', 'failed');

alter table public.summit_email_deliveries enable row level security;

revoke all on table public.summit_email_deliveries from anon, authenticated;
revoke all on sequence public.summit_email_deliveries_id_seq from anon, authenticated;

create trigger set_summit_email_deliveries_updated_at
before update on public.summit_email_deliveries
for each row execute function public.set_summit_updated_at();

create function public.enqueue_summit_payment_confirmation_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    insert into public.summit_email_deliveries (
      application_id,
      recipient_email
    )
    values (
      new.id,
      new.email
    )
    on conflict (application_id, email_type) do nothing;
  end if;

  return new;
end;
$$;

create trigger enqueue_summit_payment_confirmation_email
after update of status on public.summit_applications
for each row execute function public.enqueue_summit_payment_confirmation_email();

create function public.claim_summit_payment_confirmation_email(
  p_application_id bigint
)
returns table (
  delivery_id bigint,
  recipient_email text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.summit_email_deliveries as deliveries
  set
    status = 'sending',
    processing_attempts = processing_attempts + 1,
    claimed_at = now(),
    last_error = null
  where deliveries.application_id = p_application_id
    and deliveries.email_type = 'payment_confirmation'
    and (
      deliveries.status in ('pending', 'failed')
      or (
        deliveries.status = 'sending'
        and deliveries.claimed_at < now() - interval '15 minutes'
      )
    )
    and exists (
      select 1
      from public.summit_applications as applications
      where applications.id = deliveries.application_id
        and applications.status = 'paid'
    )
  returning deliveries.id, deliveries.recipient_email;
end;
$$;

revoke all on function public.enqueue_summit_payment_confirmation_email() from public;
revoke all on function public.claim_summit_payment_confirmation_email(bigint) from public;
grant execute on function public.claim_summit_payment_confirmation_email(bigint) to service_role;

