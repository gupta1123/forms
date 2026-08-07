-- Keep existing production plan records aligned with the current event name.
update public.summit_plans
set
  name = 'Industrial Summit Pass',
  description = 'Registration for the Industrial Summit.'
where name = 'Investment Summit Pass';
