-- FIRE Biz: invoicing, QR payments, expenses, purchase orders, VAT

-- ---------------------------------------------------------------------------
-- business_profiles — payment & VAT settings
-- ---------------------------------------------------------------------------
alter table public.business_profiles
  add column if not exists default_vat_rate numeric(5, 2) not null default 13,
  add column if not exists vat_registered boolean not null default false,
  add column if not exists esewa_merchant_id text,
  add column if not exists khalti_merchant_id text,
  add column if not exists esewa_qr_url text,
  add column if not exists khalti_qr_url text;

-- ---------------------------------------------------------------------------
-- sales — payment method, VAT invoice
-- ---------------------------------------------------------------------------
alter table public.sales
  add column if not exists payment_method text not null default 'cash'
    check (payment_method in ('cash', 'bank', 'esewa', 'khalti', 'other')),
  add column if not exists vat_rate numeric(5, 2) not null default 13,
  add column if not exists is_tax_invoice boolean not null default false;

-- ---------------------------------------------------------------------------
-- expense_categories
-- ---------------------------------------------------------------------------
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  name text not null,
  color text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_categories_user_idx on public.expense_categories (user_id);

-- ---------------------------------------------------------------------------
-- transactions — expense category link
-- ---------------------------------------------------------------------------
alter table public.transactions
  add column if not exists expense_category_id uuid references public.expense_categories (id) on delete set null;

create index if not exists transactions_expense_category_idx on public.transactions (expense_category_id);

-- ---------------------------------------------------------------------------
-- purchase_orders
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  po_number text,
  order_date date not null default current_date,
  expected_date date,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'partial', 'received', 'cancelled')),
  subtotal numeric(18, 2) not null default 0,
  tax_amount numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null default 0,
  line_items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_orders_user_date_idx on public.purchase_orders (user_id, order_date desc);
create index if not exists purchase_orders_supplier_idx on public.purchase_orders (supplier_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers for new tables
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array['expense_categories', 'purchase_orders']
  loop
    execute format('drop trigger if exists fire_biz_updated_at on public.%I', tbl);
    execute format(
      'create trigger fire_biz_updated_at before update on public.%I for each row execute function public.fire_biz_set_updated_at()',
      tbl
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.expense_categories enable row level security;
alter table public.purchase_orders enable row level security;

do $$
declare
  biz_table text;
begin
  foreach biz_table in array array['expense_categories', 'purchase_orders']
  loop
    execute format('drop policy if exists fire_biz_select on public.%I', biz_table);
    execute format('drop policy if exists fire_biz_insert on public.%I', biz_table);
    execute format('drop policy if exists fire_biz_update on public.%I', biz_table);
    execute format('drop policy if exists fire_biz_delete on public.%I', biz_table);

    execute format(
      'create policy fire_biz_select on public.%I for select to authenticated using (auth.uid() = user_id)',
      biz_table
    );
    execute format(
      'create policy fire_biz_insert on public.%I for insert to authenticated with check (auth.uid() = user_id)',
      biz_table
    );
    execute format(
      'create policy fire_biz_update on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      biz_table
    );
    execute format(
      'create policy fire_biz_delete on public.%I for delete to authenticated using (auth.uid() = user_id)',
      biz_table
    );
  end loop;
end $$;

notify pgrst, 'reload schema';
