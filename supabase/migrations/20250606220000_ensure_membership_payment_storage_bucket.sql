-- Idempotent: ensure membership payment proof bucket + object policies.
-- Use when a project applied table-only SQL or skipped the storage section of an earlier migration.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'membership_payment_proofs',
  'membership_payment_proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "membership_payment_proofs_insert_own" on storage.objects;

create policy "membership_payment_proofs_insert_own" on storage.objects for insert to authenticated with check (
  bucket_id = 'membership_payment_proofs'
  and (storage.foldername (name))[1] = auth.uid ()::text
);

drop policy if exists "membership_payment_proofs_select_own" on storage.objects;

create policy "membership_payment_proofs_select_own" on storage.objects for select to authenticated using (
  bucket_id = 'membership_payment_proofs'
  and (storage.foldername (name))[1] = auth.uid ()::text
);

drop policy if exists "membership_payment_proofs_delete_own" on storage.objects;

create policy "membership_payment_proofs_delete_own" on storage.objects for delete to authenticated using (
  bucket_id = 'membership_payment_proofs'
  and (storage.foldername (name))[1] = auth.uid ()::text
);
