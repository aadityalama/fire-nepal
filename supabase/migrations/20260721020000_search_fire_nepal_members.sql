-- Peer lending borrower search: authenticated members may look up other
-- public.user_profiles by FIRE Nepal ID (exact/partial) or full name (partial).
-- SECURITY DEFINER bypasses self-only RLS while returning only public card fields.

create or replace function public.search_fire_nepal_members(
  p_query text,
  p_exclude_user_id uuid default auth.uid(),
  p_limit integer default 12
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  q text := btrim(coalesce(p_query, ''));
  lim integer := greatest(1, least(coalesce(p_limit, 12), 24));
  result jsonb;
begin
  if q = '' or char_length(q) < 2 then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.rank_score desc, row_data.full_name asc), '[]'::jsonb)
  into result
  from (
    select
      up.id,
      up.fire_nepal_id,
      up.full_name,
      up.avatar_url,
      up.country,
      up.country_of_work,
      up.membership_plan,
      up.membership_start,
      up.membership_expiry,
      up.membership_suspended_at,
      up.membership_archived_at,
      up.risk_profile,
      up.created_at,
      case
        when up.fire_nepal_id is not null and lower(up.fire_nepal_id) = lower(q) then 100
        when up.fire_nepal_id is not null and up.fire_nepal_id ilike q || '%' then 90
        when up.fire_nepal_id is not null and up.fire_nepal_id ilike '%' || q || '%' then 80
        when up.full_name is not null and lower(up.full_name) = lower(q) then 70
        when up.full_name is not null and up.full_name ilike q || '%' then 60
        else 40
      end as rank_score
    from public.user_profiles up
    where (p_exclude_user_id is null or up.id <> p_exclude_user_id)
      and up.fire_nepal_id is not null
      and btrim(up.fire_nepal_id) <> ''
      and (
        up.fire_nepal_id ilike '%' || q || '%'
        or coalesce(up.full_name, '') ilike '%' || q || '%'
      )
    order by rank_score desc, up.full_name asc nulls last
    limit lim
  ) row_data;

  return result;
end;
$$;

comment on function public.search_fire_nepal_members(text, uuid, integer) is
  'Search public.user_profiles by FIRE Nepal ID or full name for peer lending borrower connect.';

revoke all on function public.search_fire_nepal_members(text, uuid, integer) from public;
grant execute on function public.search_fire_nepal_members(text, uuid, integer) to authenticated, service_role;

-- Helpful for name/id ilike lookups (FIRE ID already has a unique index).
create index if not exists user_profiles_full_name_ilike_idx
  on public.user_profiles (lower(full_name));

notify pgrst, 'reload schema';
