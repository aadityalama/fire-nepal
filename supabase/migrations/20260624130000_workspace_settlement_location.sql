-- Roommate settlement reports: company + room metadata per authenticated workspace.

alter table public.workspaces
  add column if not exists company_name text,
  add column if not exists room_number text;

comment on column public.workspaces.company_name is 'Employer or dorm company shown on roommate settlement exports.';
comment on column public.workspaces.room_number is 'Room number badge and header for roommate settlement exports.';

notify pgrst, 'reload schema';
