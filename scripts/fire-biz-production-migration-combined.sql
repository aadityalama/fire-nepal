-- FIRE Biz: business management module (Karobar-inspired workflow)
-- Tables: business_profiles, customers, suppliers, sales, purchases,
-- inventory_items, transactions, credit_reminders

-- ---------------------------------------------------------------------------
-- business_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null default 'My Business',
  business_type text,
  pan_vat text,
  address text,
  phone text,
  email text,
  fiscal_year_start_month smallint not null default 4 check (fiscal_year_start_month between 1 and 12),
  currency text not null default 'NPR',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_profiles_user_idx on public.business_profiles (user_id);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  name text not null,
  phone text,
  email text,
  address text,
  opening_balance numeric(18, 2) not null default 0,
  balance numeric(18, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_user_idx on public.customers (user_id);
create index if not exists customers_business_profile_idx on public.customers (business_profile_id);

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  name text not null,
  phone text,
  email text,
  address text,
  opening_balance numeric(18, 2) not null default 0,
  balance numeric(18, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_user_idx on public.suppliers (user_id);
create index if not exists suppliers_business_profile_idx on public.suppliers (business_profile_id);

-- ---------------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  invoice_number text,
  sale_date date not null default current_date,
  subtotal numeric(18, 2) not null default 0,
  tax_amount numeric(18, 2) not null default 0,
  discount_amount numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null default 0,
  amount_paid numeric(18, 2) not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'partial', 'unpaid')),
  line_items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_user_date_idx on public.sales (user_id, sale_date desc);
create index if not exists sales_customer_idx on public.sales (customer_id);

-- ---------------------------------------------------------------------------
-- purchases
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  bill_number text,
  purchase_date date not null default current_date,
  subtotal numeric(18, 2) not null default 0,
  tax_amount numeric(18, 2) not null default 0,
  discount_amount numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null default 0,
  amount_paid numeric(18, 2) not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'partial', 'unpaid')),
  line_items jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_user_date_idx on public.purchases (user_id, purchase_date desc);
create index if not exists purchases_supplier_idx on public.purchases (supplier_id);

-- ---------------------------------------------------------------------------
-- inventory_items
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  sku text,
  name text not null,
  category text,
  unit text not null default 'pcs',
  quantity numeric(18, 3) not null default 0,
  cost_price numeric(18, 2) not null default 0,
  selling_price numeric(18, 2) not null default 0,
  reorder_level numeric(18, 3) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_user_idx on public.inventory_items (user_id);
create index if not exists inventory_items_business_profile_idx on public.inventory_items (business_profile_id);

-- ---------------------------------------------------------------------------
-- transactions (cash & bank ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  transaction_type text not null check (
    transaction_type in ('income', 'expense', 'transfer', 'payment_received', 'payment_made')
  ),
  amount numeric(18, 2) not null default 0,
  account_type text not null default 'cash' check (account_type in ('cash', 'bank')),
  account_name text,
  reference_type text check (reference_type in ('sale', 'purchase', 'expense', 'other')),
  reference_id uuid,
  party_name text,
  transaction_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, transaction_date desc);

-- ---------------------------------------------------------------------------
-- credit_reminders
-- ---------------------------------------------------------------------------
create table if not exists public.credit_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  party_type text not null check (party_type in ('customer', 'supplier')),
  party_id uuid,
  party_name text not null,
  amount_due numeric(18, 2) not null default 0,
  due_date date not null,
  reminder_type text not null check (reminder_type in ('receivable', 'payable')),
  is_resolved boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credit_reminders_user_due_idx on public.credit_reminders (user_id, due_date);
create index if not exists credit_reminders_unresolved_idx on public.credit_reminders (user_id) where not is_resolved;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.fire_biz_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'business_profiles',
    'customers',
    'suppliers',
    'sales',
    'purchases',
    'inventory_items',
    'transactions',
    'credit_reminders'
  ]
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
alter table public.business_profiles enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;
alter table public.inventory_items enable row level security;
alter table public.transactions enable row level security;
alter table public.credit_reminders enable row level security;

do $$
declare
  biz_table text;
begin
  foreach biz_table in array array[
    'business_profiles',
    'customers',
    'suppliers',
    'sales',
    'purchases',
    'inventory_items',
    'transactions',
    'credit_reminders'
  ]
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
