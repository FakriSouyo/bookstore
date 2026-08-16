-- 0005_sync_functions.sql — sync deployed functions to current migration source.
-- The deployed DB drifted from the migration files (receive_purchase / adjust_inventory call
-- assert_role(text[]) which does not exist), breaking purchase receiving, stock adjustments,
-- void, refund, and set-primary-image. All statements are create or replace (idempotent).
-- Also revokes EXECUTE on record_movement from public so only the security-definer wrappers
-- (adjust_inventory / create_sale / receive_purchase / void_sale / refund_sale) can move stock.

-- record_movement is the internal stock engine: NOT callable by app roles.
revoke execute on function public.record_movement(uuid, int, public.movement_type, public.reference_type, uuid, int, text, uuid) from public, anon, authenticated;

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

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

create or replace function create_purchase(
  p_supplier_id uuid,
  p_invoice_number text,
  p_purchase_date date,
  p_items jsonb,
  p_discount_cents int default 0,
  p_shipping_cents int default 0,
  p_tax_cents int default 0,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_role app_role;
  v_purchase_id uuid;
  v_item jsonb;
  v_book uuid; v_qty int; v_cost int; v_discount int; v_line int;
  v_subtotal int := 0;
  v_total int;
begin
  select role into v_role from profiles where id = v_user;
  if v_role is null or v_role not in ('OWNER', 'ADMIN') then
    raise exception 'AUTHZ_DENIED';
  end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'EMPTY_PURCHASE'; end if;
  if p_discount_cents < 0 or p_shipping_cents < 0 or p_tax_cents < 0 then
    raise exception 'INVALID_TOTAL';
  end if;

  insert into purchases (supplier_id, invoice_number, purchase_date, status,
                         subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents,
                         notes, created_by)
  values (p_supplier_id, p_invoice_number, p_purchase_date, 'DRAFT',
          0, 0, 0, 0, 0, p_notes, v_user)
  returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_book     := (v_item->>'book_id')::uuid;
    v_qty      := (v_item->>'quantity')::int;
    v_cost     := (v_item->>'unit_cost_cents')::int;
    v_discount := coalesce((v_item->>'discount_cents')::int, 0);
    if v_qty <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    if v_cost < 0 or v_discount < 0 then raise exception 'INVALID_PRICE'; end if;
    if not exists (select 1 from books where id = v_book) then raise exception 'BOOK_NOT_FOUND'; end if;
    v_line := v_cost * v_qty - v_discount;
    insert into purchase_items (purchase_id, book_id, quantity_ordered, unit_cost_cents, discount_cents, line_total_cents)
    values (v_purchase_id, v_book, v_qty, v_cost, v_discount, v_line);
    v_subtotal := v_subtotal + v_line;
  end loop;

  v_total := v_subtotal - p_discount_cents + p_shipping_cents + p_tax_cents;
  if v_total < 0 then raise exception 'INVALID_TOTAL'; end if;

  update purchases
     set subtotal_cents = v_subtotal, discount_cents = p_discount_cents,
         shipping_cents = p_shipping_cents, tax_cents = p_tax_cents,
         total_cents = v_total
   where id = v_purchase_id;

  return v_purchase_id;
end $$;

create or replace function revenue_series(p_from date, p_to date)
returns table(day date, revenue_cents bigint, profit_cents bigint, transactions bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then return; end if;
  return query
    select date(s.created_at)::date as day,
           sum(s.total_cents)::bigint,
           (sum(s.total_cents) - sum(cost.cost_cents))::bigint,
           count(*)::bigint
      from sales s
      cross join lateral (
        select coalesce(sum(si.unit_cost_cents * si.quantity), 0) as cost_cents
          from sale_items si where si.sale_id = s.id
      ) cost
     where s.status = 'COMPLETED' and s.created_at::date between p_from and p_to
     group by 1 order by 1;
end $$;

create or replace function top_sellers(p_from date, p_to date, p_limit int default 10)
returns table(book_id uuid, title text, total_qty bigint, revenue_cents bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then return; end if;
  return query
    select si.book_id, max(si.title_snapshot)::text as title,
           sum(si.quantity)::bigint as total_qty,
           sum(si.line_total_cents)::bigint as revenue_cents
      from sale_items si
      join sales s on s.id = si.sale_id
     where s.status = 'COMPLETED' and s.created_at::date between p_from and p_to
     group by si.book_id
     order by total_qty desc
     limit p_limit;
end $$;

create or replace function sales_by_category(p_from date, p_to date)
returns table(category text, revenue_cents bigint)
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then return; end if;
  return query
    select coalesce(c.name, 'Uncategorized')::text as category,
           sum(si.line_total_cents)::bigint as revenue_cents
      from sale_items si
      join sales s on s.id = si.sale_id
      left join books b on b.id = si.book_id
      left join categories c on c.id = b.category_id
     where s.status = 'COMPLETED' and s.created_at::date between p_from and p_to
     group by 1 order by 2 desc;
end $$;
