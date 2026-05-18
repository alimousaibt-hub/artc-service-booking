-- Run this in Supabase SQL Editor
-- Fixes ghost record deletion

-- 1. Add DELETE policy if it doesn't exist yet
drop policy if exists "Admins can delete ghost appointments" on public.appointments;

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

-- 2. Add UPDATE policy so the API can null out FK references before deleting
-- (the existing update policy only covers non-ghost records in some configs)
drop policy if exists "Admins can update any appointment" on public.appointments;

create policy "Admins can update any appointment"
  on public.appointments for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
      and p.status = 'active'
    )
  );

-- 3. Change FK constraints to ON DELETE SET NULL so Postgres
--    automatically clears references when a ghost is deleted
--    (belt-and-suspenders alongside the API nulling)
alter table public.appointments
  drop constraint if exists appointments_rescheduled_to_id_fkey;

alter table public.appointments
  add constraint appointments_rescheduled_to_id_fkey
  foreign key (rescheduled_to_id)
  references public.appointments(id)
  on delete set null;

alter table public.appointments
  drop constraint if exists appointments_rescheduled_from_id_fkey;

alter table public.appointments
  add constraint appointments_rescheduled_from_id_fkey
  foreign key (rescheduled_from_id)
  references public.appointments(id)
  on delete set null;
