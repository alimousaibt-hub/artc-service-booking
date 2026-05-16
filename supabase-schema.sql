-- ============================================================
-- ARTC Service Centre Booking System — Full Database Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('super_admin', 'admin', 'crm_agent', 'advisor');
create type user_status as enum ('pending', 'active', 'suspended');
create type appointment_status as enum ('booked', 'confirmed', 'completed', 'no_show', 'cancelled', 'rescheduled');
create type notification_type as enum ('appointment_cancelled', 'appointment_rescheduled', 'advisor_removed', 'new_booking');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text,
  role            user_role not null default 'crm_agent',
  status          user_status not null default 'pending',
  subscription_expires_at timestamptz,
  approved_at     timestamptz,
  approved_by     uuid references public.profiles(id),
  avatar_url      text,
  phone           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles RLS
create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'super_admin')
    and p.status = 'active'
  ));

create policy "Admins can update profiles"
  on public.profiles for update
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'super_admin')
    and p.status = 'active'
  ));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- BRANCHES
-- ============================================================

create table public.branches (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  code        text not null unique,   -- e.g. "RAK", "DXB"
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.branches enable row level security;

create policy "Active users can view branches"
  on public.branches for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

create policy "Admins can manage branches"
  on public.branches for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'super_admin')
    and p.status = 'active'
  ));

-- ============================================================
-- SERVICE ADVISORS
-- ============================================================

create table public.service_advisors (
  id              uuid primary key default uuid_generate_v4(),
  branch_id       uuid not null references public.branches(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  daily_capacity  int not null default 10,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.service_advisors enable row level security;

create policy "Active users can view advisors"
  on public.service_advisors for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

create policy "Admins can manage advisors"
  on public.service_advisors for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'super_admin')
    and p.status = 'active'
  ));

create trigger service_advisors_updated_at
  before update on public.service_advisors
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- HOLIDAYS (per branch)
-- ============================================================

create table public.holidays (
  id          uuid primary key default uuid_generate_v4(),
  branch_id   uuid references public.branches(id) on delete cascade,  -- null = all branches
  date        date not null,
  name        text not null,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

alter table public.holidays enable row level security;

create policy "Active users can view holidays"
  on public.holidays for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

create policy "Admins can manage holidays"
  on public.holidays for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'super_admin')
    and p.status = 'active'
  ));

-- ============================================================
-- CAPACITY OVERRIDES (per advisor per date)
-- ============================================================

create table public.capacity_overrides (
  id              uuid primary key default uuid_generate_v4(),
  advisor_id      uuid not null references public.service_advisors(id) on delete cascade,
  date            date not null,
  capacity        int not null,
  reason          text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique(advisor_id, date)
);

alter table public.capacity_overrides enable row level security;

create policy "Active users can view capacity overrides"
  on public.capacity_overrides for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

create policy "Admins can manage capacity overrides"
  on public.capacity_overrides for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('admin', 'super_admin')
    and p.status = 'active'
  ));

-- ============================================================
-- APPOINTMENTS
-- ============================================================

create table public.appointments (
  id                  uuid primary key default uuid_generate_v4(),

  -- Customer info
  customer_name       text not null,
  customer_phone      text,
  plate_number        text,

  -- Scheduling
  branch_id           uuid not null references public.branches(id),
  advisor_id          uuid not null references public.service_advisors(id),
  appointment_date    date not null,
  time_slot           text,                    -- e.g. "09:00"

  -- Status
  status              appointment_status not null default 'booked',

  -- Ghost / audit fields
  is_ghost            boolean not null default false,  -- true for cancelled/rescheduled references
  ghost_reason        text,                    -- 'cancelled' | 'rescheduled'
  rescheduled_to_id   uuid references public.appointments(id),  -- if rescheduled, points to new appt
  rescheduled_from_id uuid references public.appointments(id),  -- new appt points back to original
  reschedule_reason   text,
  cancel_reason       text,

  -- Tracking
  booked_by           uuid not null references public.profiles(id),
  confirmed_by        uuid references public.profiles(id),
  confirmed_at        timestamptz,
  completed_at        timestamptz,
  no_showed_at        timestamptz,
  cancelled_at        timestamptz,
  cancelled_by        uuid references public.profiles(id),
  rescheduled_at      timestamptz,
  rescheduled_by      uuid references public.profiles(id),

  -- Notes
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.appointments enable row level security;

create policy "Active users can view appointments"
  on public.appointments for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

create policy "CRM agents and above can create appointments"
  on public.appointments for insert
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('crm_agent', 'admin', 'super_admin')
    and p.status = 'active'
  ));

create policy "CRM agents and above can update appointments"
  on public.appointments for update
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
    and p.role in ('crm_agent', 'advisor', 'admin', 'super_admin')
    and p.status = 'active'
  ));

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- APPOINTMENT EDIT LOG
-- ============================================================

create table public.appointment_edits (
  id              uuid primary key default uuid_generate_v4(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  edited_by       uuid not null references public.profiles(id),
  field_changed   text not null,  -- 'customer_name' | 'customer_phone' | 'plate_number'
  old_value       text,
  new_value       text,
  created_at      timestamptz not null default now()
);

alter table public.appointment_edits enable row level security;

create policy "Active users can view edit logs"
  on public.appointment_edits for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

create policy "Active users can insert edit logs"
  on public.appointment_edits for insert
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

-- ============================================================
-- NO-SHOW DATABASE
-- ============================================================

create table public.no_shows (
  id              uuid primary key default uuid_generate_v4(),
  appointment_id  uuid not null references public.appointments(id),
  customer_name   text not null,
  customer_phone  text,
  plate_number    text,
  branch_id       uuid references public.branches(id),
  no_show_date    date not null,
  marked_by       uuid references public.profiles(id),
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.no_shows enable row level security;

create policy "Active users can view no-shows"
  on public.no_shows for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

create policy "Active users can insert no-shows"
  on public.no_shows for insert
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table public.notifications (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  type            notification_type not null,
  title           text not null,
  body            text,
  appointment_id  uuid references public.appointments(id),
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "System can insert notifications"
  on public.notifications for insert
  with check (true);

-- Enable realtime for notifications
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.appointments;

-- ============================================================
-- SEED: Default super admin (update the email)
-- ============================================================

-- After signup, run this to promote your account to super_admin:
-- UPDATE public.profiles
-- SET role = 'super_admin', status = 'active', subscription_expires_at = '2099-12-31'
-- WHERE email = 'your.email@example.com';

-- ============================================================
-- SEED: Sample branches
-- ============================================================

insert into public.branches (name, code) values
  ('Ras Al Khaimah', 'RAK'),
  ('Dubai', 'DXB'),
  ('Sharjah', 'SHJ')
on conflict do nothing;
