-- 0006_fix_assert_role_casts.sql — fix assert_role call sites.
-- Root cause: `assert_role(array['OWNER', 'ADMIN'])` is resolved by PostgreSQL
-- as text[] (array constructor defaults to text[]), but assert_role accepts
-- only app_role[]. Every function that called it (adjust_inventory,
-- receive_purchase, void_sale, refund_sale, set_primary_book_image) failed at
-- runtime with "function assert_role(text[]) does not exist".
-- Fix: explicit cast `::app_role[]`. All statements are create or replace (idempotent).

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
