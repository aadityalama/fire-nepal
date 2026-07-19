-- Private Storage bucket for Real Estate document vault + gallery uploads.
-- Objects are keyed as: {user_id}/{property_id}/{file_id}.{ext}
-- Access is mediated by authenticated API routes (service-role upload + signed URLs).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio_real_estate',
  'portfolio_real_estate',
  false,
  8388608,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
