-- 0002_rls.sql — Row Level Security + Storage policies.
-- Source of truth: skills/bookstore-security/SKILL.md
-- Helpers is_admin()/is_owner() are defined in 0001_init.sql (security definer,
-- so they avoid RLS recursion in policies).

alter table profiles            enable row level security;
alter table categories          enable row level security;
alter table publishers          enable row level security;
alter table suppliers           enable row level security;
alter table books               enable row level security;
alter table book_images         enable row level security;
alter table purchases           enable row level security;
alter table purchase_items      enable row level security;
alter table sales               enable row level security;
alter table sale_items          enable row level security;
alter table payments            enable row level security;
alter table stock_movements     enable row level security;
alter table expenses            enable row level security;
alter table audit_logs          enable row level security;
alter table store_settings      enable row level security;
alter table daily_cash_sessions enable row level security;

-- ============ PROFILES ============
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- users may update their own full_name/phone; admins manage role/is_active
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
create policy profiles_update_admin on profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- no insert/delete policies: rows are created by the handle_new_user trigger

-- ============ CATALOG ============
create policy catalog_select on categories for select to authenticated using (true);
create policy catalog_insert on categories for insert to authenticated with check (public.is_admin());
create policy catalog_update on categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy catalog_delete on categories for delete to authenticated using (public.is_admin());

create policy publishers_select on publishers for select to authenticated using (true);
create policy publishers_insert on publishers for insert to authenticated with check (public.is_admin());
create policy publishers_update on publishers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy publishers_delete on publishers for delete to authenticated using (public.is_admin());

create policy suppliers_select on suppliers for select to authenticated using (true);
create policy suppliers_insert on suppliers for insert to authenticated with check (public.is_admin());
create policy suppliers_update on suppliers for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy suppliers_delete on suppliers for delete to authenticated using (public.is_admin());

-- ============ BOOKS ============
create policy books_select on books for select to authenticated using (true);
create policy books_insert on books for insert to authenticated with check (public.is_admin());
create policy books_update on books for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- no delete policy: books are archived, never deleted via the API

create policy book_images_select on book_images for select to authenticated using (true);
create policy book_images_insert on book_images for insert to authenticated with check (public.is_admin());
create policy book_images_update on book_images for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy book_images_delete on book_images for delete to authenticated using (public.is_admin());

-- ============ PURCHASES ============
create policy purchases_select on purchases for select to authenticated using (public.is_admin());
create policy purchases_insert on purchases for insert to authenticated with check (public.is_admin());
create policy purchases_update on purchases for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy purchase_items_select on purchase_items for select to authenticated using (public.is_admin());
create policy purchase_items_insert on purchase_items for insert to authenticated with check (public.is_admin());
create policy purchase_items_update on purchase_items for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============ SALES ============
-- cashier sees own rows; admins see all. No direct writes — only via RPCs.
create policy sales_select on sales for select to authenticated
  using (cashier_id = auth.uid() or public.is_admin());

create policy sale_items_select on sale_items for select to authenticated
  using (exists (select 1 from sales s where s.id = sale_items.sale_id
                 and (s.cashier_id = auth.uid() or public.is_admin())));

create policy payments_select on payments for select to authenticated
  using (exists (select 1 from sales s where s.id = payments.sale_id
                 and (s.cashier_id = auth.uid() or public.is_admin())));

-- ============ INVENTORY ============
create policy movements_select on stock_movements for select to authenticated using (true);
-- no insert/update/delete policies: movements are written only by RPCs

-- ============ EXPENSES ============
create policy expenses_select on expenses for select to authenticated using (public.is_admin());
create policy expenses_insert on expenses for insert to authenticated with check (public.is_admin());
create policy expenses_update on expenses for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy expenses_delete on expenses for delete to authenticated using (public.is_admin());

-- ============ AUDIT LOGS ============
-- SELECT: OWNER only. INSERT: any authenticated staff (append-only; the log is
-- the accountability trail — see bookstore-security for the tradeoff).
-- No update/delete policies.
create policy audit_select_owner on audit_logs for select to authenticated
  using (public.is_owner());
create policy audit_insert_staff on audit_logs for insert to authenticated
  with check (true);

-- ============ STORE SETTINGS ============
-- Single row; staff read (receipts need store name/width), only OWNER updates.
create policy settings_select on store_settings for select to authenticated using (true);
create policy settings_update_owner on store_settings for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ============ DAILY CASH SESSIONS ============
create policy sessions_select on daily_cash_sessions for select to authenticated
  using (cashier_id = auth.uid() or public.is_admin());
create policy sessions_insert on daily_cash_sessions for insert to authenticated
  with check (public.is_admin());
create policy sessions_update on daily_cash_sessions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============ STORAGE (book-covers) ============
-- Public bucket for CDN reads; writes are OWNER/ADMIN only and constrained to
-- books/{book_id}/ paths (bookstore-image-upload / bookstore-security).
insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

create policy covers_write_admins on storage.objects for insert to authenticated
  with check (
    bucket_id = 'book-covers'
    and public.is_admin()
    and (storage.foldername(name))[1] = 'books'
  );

create policy covers_update_admins on storage.objects for update to authenticated
  using (bucket_id = 'book-covers' and public.is_admin());

create policy covers_delete_admins on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers' and public.is_admin());
