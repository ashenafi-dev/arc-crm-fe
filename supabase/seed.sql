-- Run this AFTER creating the 5 demo users in
-- Supabase Studio > Authentication > Users > Add user:
--   employee@demo.ethix.io
--   finance@demo.ethix.io
--   gm@demo.ethix.io
--   owner@demo.ethix.io
--   admin@demo.ethix.io
-- (any password, e.g. Demo!2026) — auto email confirm on, or confirm manually.
-- The on_auth_user_created trigger creates their profiles automatically for
-- NEW signups. If you re-ran schema.sql (which drops/recreates `profiles`)
-- after those users already existed in auth.users, backfill here first:
insert into profiles (id, email, avatar_initials)
select id, email, upper(left(email, 2))
from auth.users
on conflict (id) do nothing;

update profiles set role = 'employee', full_name = 'Sara Mekonnen', department = 'Architecture', avatar_initials = 'SM' where email = 'employee@demo.ethix.io';
update profiles set role = 'finance', full_name = 'Daniel Tesfaye', department = 'Finance', avatar_initials = 'DT' where email = 'finance@demo.ethix.io';
update profiles set role = 'general_manager', full_name = 'Helen Abebe', department = 'Management', avatar_initials = 'HA' where email = 'gm@demo.ethix.io';
update profiles set role = 'owner', full_name = 'Yonas Girma', department = 'Executive', avatar_initials = 'YG' where email = 'owner@demo.ethix.io';
update profiles set role = 'admin', full_name = 'Admin User', department = 'Operations', avatar_initials = 'AU' where email = 'admin@demo.ethix.io';

insert into projects (name, code, client_name) values
  ('Riverside Office Renovation', 'PRJ-001', 'Riverside Holdings'),
  ('Bole Residential Complex', 'PRJ-002', 'Bole Developers'),
  ('City Center Interior Upgrade', 'PRJ-003', 'City Center Group');

insert into vendors (name, contact_person, phone, email, services) values
  ('Addis Construction Supply', 'Kebede Alemu', '+251911000111', 'sales@addisconstruction.et', 'Building materials'),
  ('Horizon Electrical', 'Meron Tadesse', '+251911000222', 'info@horizonelectrical.et', 'Electrical supplies'),
  ('Prime Office Furniture', 'Solomon Bekele', '+251911000333', 'orders@primefurniture.et', 'Office furniture'),
  ('Metro Plumbing Materials', 'Ruth Hailu', '+251911000444', 'sales@metroplumbing.et', 'Plumbing materials');

-- Sample purchase requests referencing the seeded demo users
with p as (select id, code from projects),
     u as (select id, email from profiles)
insert into purchase_requests (request_number, title, description, project_id, department, requester_id, estimated_amount, justification, status)
select 'PR-2026-0001', 'Structural steel beams', 'Steel beams for phase 2 framing', p.id, 'Architecture', u.id, 185000, 'Required for phase 2 structural work', 'awaiting_finance'::request_status
from p, u where p.code = 'PRJ-001' and u.email = 'employee@demo.ethix.io'
union all
select 'PR-2026-0002', 'Site safety equipment', 'Helmets, harnesses, signage', p.id, 'Architecture', u.id, 42000, 'Mandatory site safety compliance', 'awaiting_finance'::request_status
from p, u where p.code = 'PRJ-002' and u.email = 'employee@demo.ethix.io'
union all
select 'PR-2026-0003', 'Interior lighting fixtures', 'LED fixtures for common areas', p.id, 'Architecture', u.id, 76500, 'Interior fit-out phase', 'awaiting_gm'::request_status
from p, u where p.code = 'PRJ-003' and u.email = 'employee@demo.ethix.io'
union all
select 'PR-2026-0004', 'Plumbing materials batch 3', 'Pipes and fittings restock', p.id, 'Architecture', u.id, 31200, 'Ongoing plumbing installation', 'awaiting_owner'::request_status
from p, u where p.code = 'PRJ-001' and u.email = 'employee@demo.ethix.io'
union all
select 'PR-2026-0005', 'Office furniture - reception', 'Reception desk and seating', p.id, 'Operations', u.id, 58900, 'New reception area furnishing', 'approved'::request_status
from p, u where p.code = 'PRJ-003' and u.email = 'employee@demo.ethix.io'
union all
select 'PR-2026-0006', 'Landscaping materials', 'Soil, plants, irrigation parts', p.id, 'Architecture', u.id, 24800, 'Exterior landscaping phase', 'completed'::request_status
from p, u where p.code = 'PRJ-002' and u.email = 'employee@demo.ethix.io'
union all
select 'PR-2026-0007', 'Generator maintenance parts', 'Replacement parts for backup generator', p.id, 'Operations', u.id, 15600, 'Scheduled maintenance', 'completed'::request_status
from p, u where p.code = 'PRJ-001' and u.email = 'employee@demo.ethix.io'
union all
select 'PR-2026-0008', 'Decorative stone cladding', 'Facade cladding material', p.id, 'Architecture', u.id, 112000, 'Exceeded approved budget threshold', 'rejected'::request_status
from p, u where p.code = 'PRJ-003' and u.email = 'employee@demo.ethix.io'
union all
select 'PR-2026-0009', 'HVAC ducting materials', 'Ducting for third floor', p.id, 'Architecture', u.id, 67300, 'HVAC rollout phase 3', 'completed'::request_status
from p, u where p.code = 'PRJ-001' and u.email = 'employee@demo.ethix.io';

-- Approval rows matching each request's stage
insert into approvals (purchase_request_id, stage, decision)
select id, 'finance'::approval_stage, 'pending'::approval_decision from purchase_requests where request_number in ('PR-2026-0001','PR-2026-0002');
insert into approvals (purchase_request_id, stage, decision)
select id, 'gm'::approval_stage, 'pending'::approval_decision from purchase_requests where request_number = 'PR-2026-0003';
insert into approvals (purchase_request_id, stage, decision)
select id, 'owner'::approval_stage, 'pending'::approval_decision from purchase_requests where request_number = 'PR-2026-0004';

-- Labor requests
with p as (select id, code from projects), u as (select id, email from profiles)
insert into labor_requests (request_number, project_id, requested_by, labor_type, workers_required, location, required_at, description, status)
select 'LR-2026-0001', p.id, u.id, 'Electricians', 4, 'Riverside Site - Block A', now() + interval '3 days', 'Wiring installation for floors 2-3', 'assigned'::labor_status
from p, u where p.code = 'PRJ-001' and u.email = 'employee@demo.ethix.io'
union all
select 'LR-2026-0002', p.id, u.id, 'General laborers', 8, 'Bole Site', now() + interval '5 days', 'Site cleanup and material handling', 'reviewed'::labor_status
from p, u where p.code = 'PRJ-002' and u.email = 'employee@demo.ethix.io'
union all
select 'LR-2026-0003', p.id, u.id, 'Plumbers', 3, 'City Center Site', now() + interval '1 day', 'Bathroom fixture installation', 'in_progress'::labor_status
from p, u where p.code = 'PRJ-003' and u.email = 'employee@demo.ethix.io';
