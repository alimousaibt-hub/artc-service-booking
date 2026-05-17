-- ============================================================
-- MIGRATION: Run this in Supabase SQL Editor
-- Adds: profile_id link to service_advisors, day-of-week
-- capacity, seeds all 7 branches and their advisors.
-- ============================================================

-- 1. Add profile_id column (links a user account to an advisor slot)
alter table public.service_advisors
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

-- 2. Add day-of-week capacity overrides per branch
--    (capacity varies Mon-Thu vs Fri vs Sat vs Sun)
create table if not exists public.branch_day_capacity (
  id          uuid primary key default uuid_generate_v4(),
  branch_id   uuid not null references public.branches(id) on delete cascade,
  day_of_week smallint not null, -- 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  capacity    int not null,
  unique(branch_id, day_of_week)
);

alter table public.branch_day_capacity enable row level security;

drop policy if exists "Active users can view day capacity" on public.branch_day_capacity;
drop policy if exists "Admins can manage day capacity" on public.branch_day_capacity;

create policy "Active users can view day capacity"
  on public.branch_day_capacity for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

create policy "Admins can manage day capacity"
  on public.branch_day_capacity for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'super_admin')
    and p.status = 'active'
  ));

-- 3. Add closed_days to branches (array of day_of_week integers)
alter table public.branches
  add column if not exists closed_days integer[] not null default '{}';

-- ============================================================
-- SEED: Remove old placeholder branches and rebuild
-- ============================================================

-- Update existing branches (created by Phase 1 seed) with correct data
update public.branches set name = 'Sharjah',    code = 'SHJ', closed_days = '{0}' where code = 'SHJ';
update public.branches set name = 'RAK',        code = 'RAK', closed_days = '{0}' where code = 'RAK';
update public.branches set name = 'Dubai',      code = 'DXB', closed_days = '{0}' where code = 'DXB';

-- Insert the branches that don't exist yet
insert into public.branches (name, code, closed_days, is_active) values
  ('Deira',    'DEI', '{0}', true),
  ('SZR',      'SZR', '{0}', true),
  ('Mussafah', 'MUS', '{0}', true),
  ('Al Ain',   'AIN', '{0}', true),
  ('Fujairah', 'FUJ', '{5}', true)  -- Fujairah: Friday off
on conflict (code) do update
  set name = excluded.name,
      closed_days = excluded.closed_days,
      is_active = true;

-- ============================================================
-- SEED: Day-of-week capacity per branch
-- 0=Sun (closed for most), 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
-- ============================================================

-- Helper: get branch id by code
-- Sharjah (Mon-Thu:28, Fri:20, Sat:35, Sun:closed)
insert into public.branch_day_capacity (branch_id, day_of_week, capacity)
select id, dow, cap from public.branches b
cross join (values (1,28),(2,28),(3,28),(4,28),(5,20),(6,35)) as t(dow,cap)
where b.code = 'SHJ'
on conflict (branch_id, day_of_week) do update set capacity = excluded.capacity;

-- Deira (Mon-Thu:28, Fri:20, Sat:35, Sun:closed)
insert into public.branch_day_capacity (branch_id, day_of_week, capacity)
select id, dow, cap from public.branches b
cross join (values (1,28),(2,28),(3,28),(4,28),(5,20),(6,35)) as t(dow,cap)
where b.code = 'DEI'
on conflict (branch_id, day_of_week) do update set capacity = excluded.capacity;

-- SZR (Mon-Thu:42, Fri:30, Sat:42, Sun:closed) — midpoint of 40-45
insert into public.branch_day_capacity (branch_id, day_of_week, capacity)
select id, dow, cap from public.branches b
cross join (values (1,42),(2,42),(3,42),(4,42),(5,30),(6,42)) as t(dow,cap)
where b.code = 'SZR'
on conflict (branch_id, day_of_week) do update set capacity = excluded.capacity;

-- Mussafah (Mon-Thu:28, Fri:18, Sat:40, Sun:closed)
insert into public.branch_day_capacity (branch_id, day_of_week, capacity)
select id, dow, cap from public.branches b
cross join (values (1,28),(2,28),(3,28),(4,28),(5,18),(6,40)) as t(dow,cap)
where b.code = 'MUS'
on conflict (branch_id, day_of_week) do update set capacity = excluded.capacity;

-- Al Ain (Mon-Thu:15, Fri:10, Sat:15, Sun:closed)
insert into public.branch_day_capacity (branch_id, day_of_week, capacity)
select id, dow, cap from public.branches b
cross join (values (1,15),(2,15),(3,15),(4,15),(5,10),(6,15)) as t(dow,cap)
where b.code = 'AIN'
on conflict (branch_id, day_of_week) do update set capacity = excluded.capacity;

-- Fujairah (Mon-Thu:5, Sat:3, Sun:5, Fri:closed)
insert into public.branch_day_capacity (branch_id, day_of_week, capacity)
select id, dow, cap from public.branches b
cross join (values (0,5),(1,5),(2,5),(3,5),(4,5),(6,3)) as t(dow,cap)
where b.code = 'FUJ'
on conflict (branch_id, day_of_week) do update set capacity = excluded.capacity;

-- RAK (Mon-Thu:15, Fri:10, Sat:15, Sun:closed)
insert into public.branch_day_capacity (branch_id, day_of_week, capacity)
select id, dow, cap from public.branches b
cross join (values (1,15),(2,15),(3,15),(4,15),(5,10),(6,15)) as t(dow,cap)
where b.code = 'RAK'
on conflict (branch_id, day_of_week) do update set capacity = excluded.capacity;

-- ============================================================
-- SEED: Service Advisors (named, no profile_id yet — linked
-- manually in admin panel once advisor users register)
-- ============================================================

-- Sharjah: Omar, Hamdan
insert into public.service_advisors (branch_id, name, daily_capacity, is_active)
select b.id, adv, 28, true from public.branches b
cross join unnest(array['Omar','Hamdan']) as adv
where b.code = 'SHJ'
on conflict do nothing;

-- Deira: Ramy, Chona, Churchill
insert into public.service_advisors (branch_id, name, daily_capacity, is_active)
select b.id, adv, 28, true from public.branches b
cross join unnest(array['Ramy','Chona','Churchill']) as adv
where b.code = 'DEI'
on conflict do nothing;

-- SZR: Khalid, Ehsan, Michille
insert into public.service_advisors (branch_id, name, daily_capacity, is_active)
select b.id, adv, 42, true from public.branches b
cross join unnest(array['Khalid','Ehsan','Michille']) as adv
where b.code = 'SZR'
on conflict do nothing;

-- Mussafah: Hossam, Dayanand
insert into public.service_advisors (branch_id, name, daily_capacity, is_active)
select b.id, adv, 28, true from public.branches b
cross join unnest(array['Hossam','Dayanand']) as adv
where b.code = 'MUS'
on conflict do nothing;

-- Al Ain: Hammad, Fazil
insert into public.service_advisors (branch_id, name, daily_capacity, is_active)
select b.id, adv, 15, true from public.branches b
cross join unnest(array['Hammad','Fazil']) as adv
where b.code = 'AIN'
on conflict do nothing;

-- Fujairah: Sharif
insert into public.service_advisors (branch_id, name, daily_capacity, is_active)
select b.id, 'Sharif', 5, true from public.branches b
where b.code = 'FUJ'
on conflict do nothing;

-- RAK: Arun, Hanan
insert into public.service_advisors (branch_id, name, daily_capacity, is_active)
select b.id, adv, 15, true from public.branches b
cross join unnest(array['Arun','Hanan']) as adv
where b.code = 'RAK'
on conflict do nothing;
