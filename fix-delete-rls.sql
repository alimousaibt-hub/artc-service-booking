-- Run this in Supabase SQL Editor
-- Adds the missing DELETE policy on appointments table
-- (without this, server-side deletes by admins are blocked by RLS)

create policy "Admins can delete ghost appointments"
  on public.appointments for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
      and p.status = 'active'
    )
  );
