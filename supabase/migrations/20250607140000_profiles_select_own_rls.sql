-- Ensure authenticated users can read their own profiles row (required for GET /api/membership/entitlement).
-- If RLS is enabled without a SELECT policy, PostgREST returns zero rows and plan_type falls back to "free"
-- while subscriptions (with its own policy) can still be visible.

alter table if exists public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid () = id);

notify pgrst, 'reload schema';
