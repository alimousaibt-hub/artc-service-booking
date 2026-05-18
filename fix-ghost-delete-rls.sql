-- Run in Supabase SQL Editor
-- Allows admins and super_admins to delete ghost appointment records

create policy "Admins can delete ghost appointments"
  on public.appointments for delete
  using (
    is_ghost = true
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
      and p.status = 'active'
    )
  );
