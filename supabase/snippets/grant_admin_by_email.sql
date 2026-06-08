-- Run in Supabase Dashboard → SQL Editor (project that backs www.firenepal.com).
-- Replace the email with the account you use to sign in.

-- Preview: auth user id for that email
select id, email, created_at
from auth.users
where lower(email) = lower('you@example.com');

-- Grant admin (idempotent)
insert into public.admin_users (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('you@example.com')
on conflict (user_id) do update set role = excluded.role;

-- Confirm
select au.user_id, au.role, u.email
from public.admin_users au
join auth.users u on u.id = au.user_id
where lower(u.email) = lower('you@example.com');
