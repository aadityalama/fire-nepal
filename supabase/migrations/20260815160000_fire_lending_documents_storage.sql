-- Private Storage bucket for FIRE Nepal peer-loan supporting documents.
-- Objects are keyed as: {user_id}/{loan_id}/{file_id}.{ext}
-- Access is mediated by authenticated API routes (service-role upload + signed URLs).
-- Never expose objects via a public bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fire_lending_documents',
  'fire_lending_documents',
  false,
  8388608,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
