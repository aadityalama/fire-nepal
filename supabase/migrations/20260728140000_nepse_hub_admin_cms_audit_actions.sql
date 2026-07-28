-- Expand NEPSE Hub Admin audit actions for visual CMS (create/delete/restore record, undo).
-- Idempotent: drops and recreates the action check constraint.

alter table public.nepse_hub_admin_audit_log
  drop constraint if exists nepse_hub_admin_audit_log_action_check;

alter table public.nepse_hub_admin_audit_log
  add constraint nepse_hub_admin_audit_log_action_check
  check (
    action in (
      'set',
      'restore_field',
      'restore_company',
      'create_record',
      'delete_record',
      'restore_record',
      'undo',
      'set_fields'
    )
  );

notify pgrst, 'reload schema';
