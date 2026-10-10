-- =====================================================================
-- Bổ sung cho trang quản trị
-- - Hoàn / trừ tồn kho tự động khi đơn chuyển sang / ra khỏi trạng thái "cancelled"
--   (áp dụng cho cả khách tự hủy lẫn nhân viên hủy trong trang quản trị)
-- =====================================================================

create or replace function public.restock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.products pr set stock = pr.stock + i.qty, sold = greatest(pr.sold - i.qty, 0)
    from public.order_items i where i.order_id = new.id and pr.id = i.product_id;
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    update public.products pr set stock = greatest(pr.stock - i.qty, 0), sold = pr.sold + i.qty
    from public.order_items i where i.order_id = new.id and pr.id = i.product_id;
  end if;
  return new;
end $$;

create trigger orders_restock after update of status on public.orders
  for each row execute function public.restock_on_cancel();

-- cancel_order không tự hoàn kho nữa (trigger ở trên đảm nhiệm)
create or replace function public.cancel_order(p_code text, p_phone text) returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare o public.orders;
begin
  update public.orders set status = 'cancelled'
  where code = upper(trim(p_code)) and phone = public.normalize_phone(p_phone) and status = 'pending'
  returning * into o;
  if not found then raise exception 'Không thể hủy đơn hàng này' using errcode = 'P0001'; end if;
  return public.order_json(o);
end $$;

revoke execute on function public.restock_on_cancel() from public, anon, authenticated;
grant execute on function public.cancel_order(text, text) to anon, authenticated;
