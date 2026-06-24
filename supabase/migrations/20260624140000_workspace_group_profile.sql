-- Group / company profile for roommate settlement branding (one row per workspace).

alter table public.workspaces
  add column if not exists company_type text,
  add column if not exists description text,
  add column if not exists logo_url text;

comment on column public.workspaces.company_type is 'Optional company or dorm type shown on group profile.';
comment on column public.workspaces.description is 'Optional group description for Members page profile card.';
comment on column public.workspaces.logo_url is 'Group logo or photo URL (or data URL) for settlement exports.';

notify pgrst, 'reload schema';
