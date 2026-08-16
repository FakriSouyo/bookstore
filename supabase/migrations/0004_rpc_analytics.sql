-- 0004_rpc_analytics.sql — aggregation RPCs for dashboard/reports
-- (skills/bookstore-reports/SKILL.md). All guarded to ADMIN/OWNER so
-- cashiers cannot read profit data through the API.

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
