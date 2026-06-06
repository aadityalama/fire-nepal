-- FIRE Nepal: manual membership payments (Khalti / eSewa / Global IME QR) + proof uploads.

-- ---------------------------------------------------------------------------
-- membership_requests
-- ---------------------------------------------------------------------------
create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  plan text not null check (plan in ('premium', 'elite')),
  payment_method text not null check (payment_method in ('khalti_qr', 'esewa_qr', 'global_ime_qr')),
  -- Object path inside storage bucket `membership_payment_proofs` (not a public URL).
  proof_storage_path text not null,
  reference text,
  submitted_at timestamptz not null default now (),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

create index if not exists membership_requests_user_idx on public.membership_requests (user_id);
create index if not exists membership_requests_status_submitted_idx on public.membership_requests (status, submitted_at desc);

alter table public.membership_requests enable row level security;

create policy "membership_requests_select_own" on public.membership_requests for select using (auth.uid () = user_id);

create policy "membership_requests_insert_own" on public.membership_requests for insert with check (auth.uid () = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for payment screenshots (private; app issues signed URLs)
-- ---------------------------------------------------------------------------
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
