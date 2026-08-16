-- 0001_init.sql — Full schema for the Bookstore Management & POS system.
-- Source of truth: skills/bookstore-database/SKILL.md
-- Conventions: uuid PKs, money in integer cents (_cents), enums for statuses,
-- books.stock maintained ONLY by record_movement.

create extension if not exists pg_trgm;

-- ============ ENUMS ============
create type app_role as enum ('OWNER', 'ADMIN', 'CASHIER');
create type book_status as enum ('ACTIVE', 'INACTIVE', 'ARCHIVED');
create type purchase_status as enum ('DRAFT', 'ORDERED', 'RECEIVED', 'COMPLETED', 'CANCELLED');
create type sale_status as enum ('COMPLETED', 'VOIDED', 'REFUNDED', 'PARTIALLY_REFUNDED');
create type payment_method as enum ('CASH', 'CARD', 'TRANSFER', 'MOBILE_MONEY', 'OTHER');
create type payment_status as enum ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED');
create type movement_type as enum
  ('PURCHASE', 'SALE', 'RETURN_IN', 'RETURN_OUT', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS', 'CORRECTION');
create type reference_type as enum
  ('PURCHASE_ITEM', 'SALE_ITEM', 'ADJUSTMENT', 'RETURN', 'CORRECTION');
create type expense_category as enum ('RENT', 'ELECTRICITY', 'INTERNET', 'SALARY', 'TRANSPORTATION', 'OTHER');

-- ============ PROFILES ============
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        app_role not null default 'CASHIER',
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============ CATALOG ============
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (name)
);

create table publishers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  country     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table suppliers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  contact_person text,
  phone          text,
  email          text,
  address        text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table books (
  id                   uuid primary key default gen_random_uuid(),
  isbn                 text,
  barcode              text,
  title                text not null,
  slug                 text not null unique,
  author               text not null default '',
  description          text,
  category_id          uuid references categories(id) on delete restrict,
  publisher_id         uuid references publishers(id) on delete restrict,
  publication_year     int,
  edition              text,
  language             text not null default 'English',
  purchase_price_cents int not null default 0 check (purchase_price_cents >= 0),
  selling_price_cents  int not null default 0 check (selling_price_cents >= 0),
  stock                int not null default 0 check (stock >= 0),
  minimum_stock        int not null default 0 check (minimum_stock >= 0),
  location             text,
  status               book_status not null default 'ACTIVE',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint books_unique_isbn unique (isbn)
);

create unique index books_barcode_unique on books (barcode) where barcode is not null;

create table book_images (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid not null references books(id) on delete cascade,
  storage_path  text not null,
  url           text not null,
  is_primary    boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  unique (storage_path)
);

create unique index book_images_one_primary on book_images (book_id) where is_primary;

-- ============ PURCHASES ============
create table purchases (
  id              uuid primary key default gen_random_uuid(),
  supplier_id     uuid not null references suppliers(id) on delete restrict,
  invoice_number  text not null unique,
  purchase_date   date not null default current_date,
  status          purchase_status not null default 'DRAFT',
  subtotal_cents  int not null default 0 check (subtotal_cents >= 0),
  discount_cents  int not null default 0 check (discount_cents >= 0),
  shipping_cents  int not null default 0 check (shipping_cents >= 0),
  tax_cents       int not null default 0 check (tax_cents >= 0),
  total_cents     int not null default 0 check (total_cents >= 0),
  payment_status  payment_status not null default 'PENDING',
  notes           text,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint purchases_total_ok
    check (subtotal_cents + shipping_cents + tax_cents - discount_cents = total_cents)
);

create table purchase_items (
  id                uuid primary key default gen_random_uuid(),
  purchase_id       uuid not null references purchases(id) on delete cascade,
  book_id           uuid not null references books(id) on delete restrict,
  quantity_ordered  int not null check (quantity_ordered > 0),
  quantity_received int not null default 0
                     check (quantity_received >= 0 and quantity_received <= quantity_ordered),
  unit_cost_cents   int not null check (unit_cost_cents >= 0),
  discount_cents    int not null default 0 check (discount_cents >= 0),
  line_total_cents  int not null check (line_total_cents >= 0),
  unique (purchase_id, book_id)
);

-- ============ SALES ============
create sequence sale_invoice_seq;

create table sales (
  id                    uuid primary key default gen_random_uuid(),
  invoice_number        text not null unique
                        default ('INV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('sale_invoice_seq')::text, 4, '0')),
  cashier_id            uuid not null references profiles(id),
  status                sale_status not null default 'COMPLETED',
  subtotal_cents        int not null check (subtotal_cents >= 0),
  discount_cents        int not null default 0 check (discount_cents >= 0),
  tax_cents             int not null default 0 check (tax_cents >= 0),
  total_cents           int not null check (total_cents >= 0),
  tendered_cents        int not null default 0 check (tendered_cents >= 0),
  change_cents          int not null default 0 check (change_cents >= 0),
  payment_method        payment_method not null default 'CASH',
  notes                 text,
  void_reason           text,
  voided_by             uuid references profiles(id),
  voided_at             timestamptz,
  refunded_amount_cents int not null default 0 check (refunded_amount_cents >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint sales_total_ok check (subtotal_cents + tax_cents - discount_cents = total_cents),
  constraint sales_change_ok check (change_cents = tendered_cents - total_cents)
);

create table sale_items (
  id               uuid primary key default gen_random_uuid(),
  sale_id          uuid not null references sales(id) on delete cascade,
  book_id          uuid not null references books(id) on delete restrict,
  quantity         int not null check (quantity > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  unit_cost_cents  int not null check (unit_cost_cents >= 0),
  discount_cents   int not null default 0 check (discount_cents >= 0),
  line_total_cents int not null check (line_total_cents >= 0),
  title_snapshot   text not null,
  isbn_snapshot    text,
  created_at       timestamptz not null default now(),
  unique (sale_id, book_id)
);

create table payments (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references sales(id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  method       payment_method not null,
  reference    text,
  created_by   uuid not null references profiles(id),
  created_at   timestamptz not null default now()
);

-- ============ INVENTORY ============
create table stock_movements (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references books(id) on delete restrict,
  quantity        int not null check (quantity <> 0),
  movement_type   movement_type not null,
  reference_type  reference_type,
  reference_id    uuid,
  previous_stock  int not null,
  new_stock       int not null,
  unit_cost_cents int,
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now()
);

-- ============ OPERATIONS ============
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  category     expense_category not null,
  amount_cents int not null check (amount_cents > 0),
  expense_date date not null default current_date,
  description  text,
  created_by   uuid not null references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id),
  action      text not null,
  entity_type text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table store_settings (
  id                   int primary key check (id = 1),
  store_name           text not null default 'My Bookstore',
  store_address        text,
  store_phone          text,
  receipt_footer       text,
  receipt_width        text not null default '80' check (receipt_width in ('58', '80')),
  currency             text not null default 'IDR',
  allow_negative_stock boolean not null default false,
  max_discount_percent int not null default 100 check (max_discount_percent between 0 and 100),
  tax_rate_bps         int not null default 0 check (tax_rate_bps between 0 and 10000),
  updated_by           uuid references profiles(id),
  updated_at           timestamptz not null default now()
);

insert into store_settings (id) values (1) on conflict do nothing;

create table daily_cash_sessions (
  id                   uuid primary key default gen_random_uuid(),
  cashier_id           uuid not null references profiles(id),
  opened_at            timestamptz not null default now(),
  opened_balance_cents int not null default 0,
  closed_at            timestamptz,
  closed_balance_cents int,
  expected_cents       int,
  variance_cents       int,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ============ INDEXES ============
create index books_category_idx on books (category_id);
create index books_publisher_idx on books (publisher_id);
create index books_status_idx on books (status);
create index books_title_idx on books (title);
create index books_search_idx on books using gin (title gin_trgm_ops, author gin_trgm_ops);

create index purchase_items_purchase_idx on purchase_items (purchase_id);
create index purchase_items_book_idx on purchase_items (book_id);
create index purchases_supplier_idx on purchases (supplier_id);
create index purchases_status_idx on purchases (status);
create index purchases_date_idx on purchases (purchase_date);

create index sales_created_idx on sales (created_at desc);
create index sales_status_idx on sales (status);
create index sales_cashier_idx on sales (cashier_id);
create index sale_items_sale_idx on sale_items (sale_id);
create index sale_items_book_idx on sale_items (book_id);
create index payments_sale_idx on payments (sale_id);

create index movements_book_created_idx on stock_movements (book_id, created_at desc);
create index movements_ref_idx on stock_movements (reference_type, reference_id);
create index movements_created_idx on stock_movements (created_at desc);
create index movements_type_idx on stock_movements (movement_type);

create index expenses_date_idx on expenses (expense_date);
create index expenses_category_idx on expenses (category);
create index audit_created_idx on audit_logs (created_at desc);
create index audit_entity_idx on audit_logs (entity_type, entity_id);
create index book_images_book_idx on book_images (book_id);

-- ============ TRIGGERS ============
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','categories','publishers','suppliers','books',
                          'purchases','sales','expenses','store_settings','daily_cash_sessions']
  loop
    execute format('create trigger trg_%s_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ============ AUTHZ HELPERS (used by RPCs and RLS) ============
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('OWNER', 'ADMIN'));
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'OWNER');
$$;

create or replace function assert_role(p_roles app_role[]) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_role app_role;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role is null or not (v_role = any (p_roles)) then
    raise exception 'AUTHZ_DENIED';
  end if;
end $$;

-- ============ STOCK ENGINE ============
-- The ONLY place books.stock is written. Locks the book row, enforces the
-- negative-stock rule, writes the movement and cached stock atomically.
create or replace function record_movement(
  p_book_id uuid, p_quantity int, p_movement_type movement_type,
  p_ref_type reference_type default null, p_ref_id uuid default null,
  p_unit_cost_cents int default null, p_notes text default null,
  p_created_by uuid default auth.uid()
) returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prev int;
  v_new  int;
  v_allow_neg boolean;
begin
  select stock into v_prev from books where id = p_book_id for update;
  if not found then
    raise exception 'BOOK_NOT_FOUND';
  end if;

  v_new := v_prev + p_quantity;
  select allow_negative_stock into v_allow_neg from store_settings where id = 1;
  if v_new < 0 and coalesce(v_allow_neg, false) = false then
    raise exception 'NEGATIVE_STOCK book=% quantity=% current=%', p_book_id, p_quantity, v_prev;
  end if;

  update books set stock = v_new, updated_at = now() where id = p_book_id;
  insert into stock_movements
    (book_id, quantity, movement_type, reference_type, reference_id,
     previous_stock, new_stock, unit_cost_cents, notes, created_by)
  values
    (p_book_id, p_quantity, p_movement_type, p_ref_type, p_ref_id,
     v_prev, v_new, p_unit_cost_cents, p_notes, p_created_by);

  return v_new;
end $$;

-- Public adjustment (inventory page) — OWNER/ADMIN only.
create or replace function adjust_inventory(
  p_book_id uuid, p_quantity int, p_movement_type movement_type,
  p_notes text default null
) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform assert_role(array['OWNER', 'ADMIN']::app_role[]);
  return record_movement(p_book_id, p_quantity, p_movement_type,
                         'ADJUSTMENT', null, null, p_notes);
end $$;

-- POS checkout — prices recomputed from the DB; client input is never trusted.
create or replace function create_sale(
  p_items jsonb,
  p_payment_method payment_method default 'CASH',
  p_tendered_cents int default 0,
  p_discount_cents int default 0,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_cashier uuid := auth.uid();
  v_role app_role;
  v_sale_id uuid;
  v_item jsonb;
  v_book uuid; v_qty int;
  v_price int; v_cost int; v_stock int; v_line int;
  v_title text; v_isbn text;
  v_subtotal int := 0; v_total int;
  v_max_discount_pct int;
begin
  select role into v_role from profiles where id = v_cashier;
  if v_role is null or v_role not in ('OWNER', 'ADMIN', 'CASHIER') then
    raise exception 'AUTHZ_DENIED';
  end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_CART'; end if;

  select coalesce(max_discount_percent, 100) into v_max_discount_pct from store_settings where id = 1;

  -- lock all books first, ordered by id to avoid deadlocks
  for v_item in select * from jsonb_array_elements(p_items) order by (value->>'book_id')
  loop
    v_book := (v_item->>'book_id')::uuid;
    perform 1 from books where id = v_book for update;
  end loop;

  insert into sales (cashier_id, subtotal_cents, discount_cents, total_cents,
                     tendered_cents, change_cents, payment_method, notes)
  values (v_cashier, 0, 0, 0, 0, 0, p_payment_method, p_notes)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_book := (v_item->>'book_id')::uuid;
    v_qty  := (v_item->>'quantity')::int;
    if v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;

    select selling_price_cents, purchase_price_cents, stock, title, isbn
      into v_price, v_cost, v_stock, v_title, v_isbn
      from books where id = v_book;
    if v_stock < v_qty then raise exception 'INSUFFICIENT_STOCK book=%', v_book; end if;

    v_line := v_price * v_qty;
    insert into sale_items (sale_id, book_id, quantity, unit_price_cents, unit_cost_cents,
                            discount_cents, line_total_cents, title_snapshot, isbn_snapshot)
    values (v_sale_id, v_book, v_qty, v_price, v_cost, 0, v_line, v_title, v_isbn);

    v_subtotal := v_subtotal + v_line;
    perform record_movement(v_book, -v_qty, 'SALE', 'SALE_ITEM', v_sale_id, v_cost, null, v_cashier);
  end loop;

  if p_discount_cents < 0 or p_discount_cents > (v_subtotal * v_max_discount_pct / 100) then
    raise exception 'DISCOUNT_EXCEEDS_LIMIT';
  end if;
  v_total := v_subtotal - p_discount_cents;
  if p_tendered_cents < v_total then raise exception 'TENDERED_BELOW_TOTAL'; end if;

  update sales set subtotal_cents = v_subtotal, discount_cents = p_discount_cents,
                   total_cents = v_total, tendered_cents = p_tendered_cents,
                   change_cents = p_tendered_cents - v_total
   where id = v_sale_id;

  insert into payments (sale_id, amount_cents, method, created_by)
  values (v_sale_id, v_total, p_payment_method, v_cashier);

  return v_sale_id;
end $$;

-- Purchase receiving — stock increases ONLY here (never at creation/ordering).
create or replace function receive_purchase(p_purchase_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_item record;
  v_status purchase_status;
begin
  perform assert_role(array['OWNER', 'ADMIN']::app_role[]);
  select status into v_status from purchases where id = p_purchase_id for update;
  if v_status not in ('ORDERED', 'DRAFT') then
    raise exception 'PURCHASE_NOT_RECEIVABLE';
  end if;

  for v_item in select * from purchase_items where purchase_id = p_purchase_id
  loop
    perform record_movement(v_item.book_id, v_item.quantity_ordered - v_item.quantity_received,
                            'PURCHASE', 'PURCHASE_ITEM', p_purchase_id,
                            v_item.unit_cost_cents, 'Purchase receive');
    update purchase_items set quantity_received = quantity_ordered where id = v_item.id;
  end loop;

  update purchases set status = 'RECEIVED', updated_at = now() where id = p_purchase_id;
end $$;

-- Void — reverses stock with RETURN_IN movements; historical rows are updated, never deleted.
create or replace function void_sale(p_sale_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_item record;
begin
  perform assert_role(array['OWNER', 'ADMIN']::app_role[]);
  if not exists (select 1 from sales where id = p_sale_id and status = 'COMPLETED') then
    raise exception 'SALE_NOT_VOIDABLE';
  end if;
  for v_item in select * from sale_items where sale_id = p_sale_id
  loop
    perform record_movement(v_item.book_id, v_item.quantity, 'RETURN_IN',
                            'SALE_ITEM', p_sale_id, v_item.unit_cost_cents, 'Void: ' || p_reason);
  end loop;
  update sales set status = 'VOIDED', void_reason = p_reason,
                   voided_by = auth.uid(), voided_at = now()
   where id = p_sale_id;
end $$;

-- Refund (full or partial) — RETURN_IN for returned quantities, refund payment row.
create or replace function refund_sale(
  p_sale_id uuid, p_items jsonb, p_amount_cents int, p_reason text
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_status sale_status;
  v_total int;
  v_refunded int;
  v_item jsonb;
  v_book uuid; v_qty int;
  v_sold int;
  v_cost int;
begin
  perform assert_role(array['OWNER', 'ADMIN']::app_role[]);
  select status, total_cents, refunded_amount_cents
    into v_status, v_total, v_refunded
    from sales where id = p_sale_id for update;
  if v_status not in ('COMPLETED', 'PARTIALLY_REFUNDED') then
    raise exception 'SALE_NOT_REFUNDABLE';
  end if;
  if p_amount_cents <= 0 then raise exception 'INVALID_REFUND_AMOUNT'; end if;
  if v_refunded + p_amount_cents > v_total then raise exception 'REFUND_EXCEEDS_TOTAL'; end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_book := (v_item->>'book_id')::uuid;
    v_qty  := (v_item->>'quantity')::int;
    if v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select coalesce(sum(quantity), 0) into v_sold from sale_items
      where sale_id = p_sale_id and book_id = v_book;
    if v_qty > v_sold then raise exception 'REFUND_EXCEEDS_SOLD'; end if;
    select unit_cost_cents into v_cost from sale_items
      where sale_id = p_sale_id and book_id = v_book limit 1;
    perform record_movement(v_book, v_qty, 'RETURN_IN', 'SALE_ITEM', p_sale_id,
                            v_cost, 'Refund: ' || p_reason);
  end loop;

  insert into payments (sale_id, amount_cents, method, reference, created_by)
  values (p_sale_id, p_amount_cents, 'OTHER', 'REFUND', auth.uid());

  if v_refunded + p_amount_cents >= v_total then
    update sales set status = 'REFUNDED', refunded_amount_cents = v_refunded + p_amount_cents
     where id = p_sale_id;
  else
    update sales set status = 'PARTIALLY_REFUNDED', refunded_amount_cents = v_refunded + p_amount_cents
     where id = p_sale_id;
  end if;
end $$;

-- Swap the primary cover atomically (bookstore-image-upload).
create or replace function set_primary_book_image(p_book_id uuid, p_image_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform assert_role(array['OWNER', 'ADMIN']::app_role[]);
  if not exists (select 1 from book_images where id = p_image_id and book_id = p_book_id) then
    raise exception 'IMAGE_NOT_FOUND';
  end if;
  update book_images set is_primary = false where book_id = p_book_id;
  update book_images set is_primary = true where id = p_image_id;
end $$;

-- ============ VIEWS ============
create view v_daily_sales as
select date(s.created_at) as day,
       count(*) as transactions,
       sum(s.total_cents) as revenue_cents,
       sum(s.total_cents) - sum(cost.cost_cents) as profit_cents
  from sales s
  cross join lateral (
    select coalesce(sum(si.unit_cost_cents * si.quantity), 0) as cost_cents
      from sale_items si where si.sale_id = s.id
  ) cost
 where s.status = 'COMPLETED'
 group by 1;

create view v_inventory_value as
select b.id, b.title, b.stock,
       b.stock * b.purchase_price_cents as stock_value_cents
  from books b where b.status = 'ACTIVE';

-- ============ DASHBOARD KPIs (single aggregate call) ============
create or replace function dashboard_kpis(p_from timestamptz, p_to timestamptz)
returns table (
  revenue_cents bigint, transactions bigint, items_sold bigint,
  profit_cents bigint, purchases_cents bigint, stock_value_cents bigint,
  low_stock_count bigint, out_of_stock_count bigint
)
language sql stable security definer set search_path = public, pg_temp as $$
  select
    coalesce(sum(total_cents), 0)::bigint,
    count(*)::bigint,
    coalesce((select sum(quantity) from sale_items si join sales s2 on s2.id = si.sale_id
              where s2.status = 'COMPLETED' and s2.created_at >= p_from and s2.created_at < p_to), 0)::bigint,
    coalesce(sum(total_cents) - (select coalesce(sum(si.unit_cost_cents * si.quantity), 0)
        from sale_items si join sales s3 on s3.id = si.sale_id
        where s3.status = 'COMPLETED' and s3.created_at >= p_from and s3.created_at < p_to), 0)::bigint,
    coalesce((select sum(total_cents) from purchases
              where status = 'RECEIVED' and created_at >= p_from and created_at < p_to), 0)::bigint,
    coalesce((select sum(stock * purchase_price_cents) from books where status = 'ACTIVE'), 0)::bigint,
    (select count(*) from books where status = 'ACTIVE' and stock <= minimum_stock)::bigint,
    (select count(*) from books where status = 'ACTIVE' and stock = 0)::bigint
  from sales
  where status = 'COMPLETED' and created_at >= p_from and created_at < p_to;
$$;
