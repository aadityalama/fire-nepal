-- Persist Gold & Silver purchase bill image references (JSON array of URLs / data URLs) with portfolio_extensions.
alter table public.portfolio_extensions
  add column if not exists metal_purchase_bill_urls jsonb not null default '[]'::jsonb;
