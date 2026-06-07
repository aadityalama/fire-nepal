-- Ensure admin dashboard + cron always have a system_health row for scheduled reminders.
-- Older databases may be missing this row if the admin migration was skipped or partially applied.

insert into public.system_health (id, label, last_status)
values ('scheduled_reminders_cron', 'Scheduled reminder emails cron', 'never')
on conflict (id) do nothing;
