-- After DDL, PostgREST must reload or the Data API may still return
-- "relation public.scheduled_reminders does not exist" until the cache refreshes.
notify pgrst, 'reload schema';
