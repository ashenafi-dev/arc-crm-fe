-- ARC CRM / Architecture Ops schema
-- Run this in Supabase SQL Editor (Project > SQL Editor > New query).
-- Safe to re-run: drops everything first, then recreates from scratch.

-- Drop --------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

drop table if exists audit_events cascade;
drop table if exists labor_requests cascade;
drop table if exists approvals cascade;
drop table if exists vendor_quotations cascade;
drop table if exists purchase_items cascade;
drop table if exists purchase_requests cascade;
drop table if exists vendors cascade;
drop table if exists projects cascade;
drop table if exists profiles cascade;

drop type if exists labor_status cascade;
drop type if exists approval_decision cascade;
drop type if exists approval_stage cascade;
drop type if exists request_status cascade;
drop type if exists user_role cascade;

-- Create --------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- "role" is a reserved word for type/function names in Postgres (fine as a
-- column name, not as a type name) — hence user_role instead of role here.
create type user_role as enum ('employee', 'finance', 'general_manager', 'owner', 'admin');
create type request_status as enum (
  'draft', 'quote_received', 'awaiting_finance', 'awaiting_gm',
  'awaiting_owner', 'approved', 'rejected', 'purchased', 'completed'
);
create type approval_stage as enum ('finance', 'gm', 'owner');
create type approval_decision as enum ('pending', 'approved', 'rejected');
create type labor_status as enum ('requested', 'reviewed', 'assigned', 'in_progress', 'completed', 'cancelled');

-- Profiles ---------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default 'New User',
  role user_role not null default 'employee',
  department text,
  avatar_initials text not null default 'NA',
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'full_name', new.email), 2))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Projects / Vendors ------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  client_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  services text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Purchase requests ---------------------------------------------------------
create table purchase_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text unique not null,
  title text not null,
  description text not null default '',
  project_id uuid not null references projects(id),
  department text not null,
  requester_id uuid not null references profiles(id),
  required_date date,
  estimated_amount numeric(14,2) not null default 0,
  approved_amount numeric(14,2),
  actual_amount numeric(14,2),
  justification text not null default '',
  status request_status not null default 'draft',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references purchase_requests(id) on delete cascade,
  name text not null,
  quantity numeric(12,2) not null default 1,
  unit text not null default 'unit',
  estimated_unit_price numeric(12,2)
);

create table vendor_quotations (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references purchase_requests(id) on delete cascade,
  vendor_id uuid not null references vendors(id),
  amount numeric(14,2) not null,
  notes text,
  is_selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table approvals (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references purchase_requests(id) on delete cascade,
  stage approval_stage not null,
  decision approval_decision not null default 'pending',
  reviewer_id uuid references profiles(id),
  comments text,
  decided_at timestamptz
);

-- Labor requests ------------------------------------------------------------
create table labor_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text unique not null,
  project_id uuid not null references projects(id),
  requested_by uuid not null references profiles(id),
  labor_type text not null,
  workers_required int not null default 1,
  location text not null,
  required_at timestamptz not null,
  description text not null default '',
  status labor_status not null default 'requested',
  assigned_to text,
  created_at timestamptz not null default now()
);

-- Audit -----------------------------------------------------------------
create table audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  description text not null,
  created_at timestamptz not null default now()
);

-- RLS: demo-level (any authenticated user can read/write). Tighten per-role
-- before this ever handles real client data.
alter table profiles enable row level security;
alter table projects enable row level security;
alter table vendors enable row level security;
alter table purchase_requests enable row level security;
alter table purchase_items enable row level security;
alter table vendor_quotations enable row level security;
alter table approvals enable row level security;
alter table labor_requests enable row level security;
alter table audit_events enable row level security;

create policy "authenticated read" on profiles for select using (auth.role() = 'authenticated');
create policy "authenticated read" on projects for select using (auth.role() = 'authenticated');
create policy "authenticated write" on projects for all using (auth.role() = 'authenticated');
create policy "authenticated read" on vendors for select using (auth.role() = 'authenticated');
create policy "authenticated write" on vendors for all using (auth.role() = 'authenticated');
create policy "authenticated read" on purchase_requests for select using (auth.role() = 'authenticated');
create policy "authenticated write" on purchase_requests for all using (auth.role() = 'authenticated');
create policy "authenticated read" on purchase_items for select using (auth.role() = 'authenticated');
create policy "authenticated write" on purchase_items for all using (auth.role() = 'authenticated');
create policy "authenticated read" on vendor_quotations for select using (auth.role() = 'authenticated');
create policy "authenticated write" on vendor_quotations for all using (auth.role() = 'authenticated');
create policy "authenticated read" on approvals for select using (auth.role() = 'authenticated');
create policy "authenticated write" on approvals for all using (auth.role() = 'authenticated');
create policy "authenticated read" on labor_requests for select using (auth.role() = 'authenticated');
create policy "authenticated write" on labor_requests for all using (auth.role() = 'authenticated');
create policy "authenticated read" on audit_events for select using (auth.role() = 'authenticated');
create policy "authenticated write" on audit_events for insert with check (auth.role() = 'authenticated');
