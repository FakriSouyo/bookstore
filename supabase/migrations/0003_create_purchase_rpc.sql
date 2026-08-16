-- 0003_create_purchase_rpc.sql — atomic purchase creation (bookstore-purchases).
-- Purchase + items insert atomically; stock is NOT affected (only receiving does).
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
