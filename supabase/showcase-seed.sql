-- ArchOps comprehensive showcase dataset
--
-- Run AFTER:
--   1. supabase/schema.sql
--   2. the five demo auth users have been created
--   3. supabase/migrations/002_pilot_features.sql
--
-- Safe to re-run. It replaces only records identified by the DEMO prefixes,
-- deterministic showcase UUIDs, or metadata.seed = 'archops-showcase-v1'.
-- Dates are relative to the run date so the dashboard always looks current.

begin;

do $$
declare
  v_missing text;
begin
  if to_regclass('public.notifications') is null
     or to_regclass('public.departments') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'purchase_requests' and column_name = 'submitted_at'
     ) then
    raise exception 'Missing pilot schema. Run supabase/migrations/002_pilot_features.sql first.';
  end if;

  select string_agg(required.email, ', ' order by required.email)
  into v_missing
  from (
    values
      ('employee@demo.ethix.io'),
      ('finance@demo.ethix.io'),
      ('gm@demo.ethix.io'),
      ('owner@demo.ethix.io'),
      ('admin@demo.ethix.io')
  ) as required(email)
  where not exists (select 1 from profiles p where p.email = required.email);

  if v_missing is not null then
    raise exception 'Create these demo Auth users before seeding: %', v_missing;
  end if;
end $$;

-- Keep the five sign-in identities presentation-ready.
update profiles set role = 'employee', full_name = 'Sara Mekonnen', department = 'Architecture', avatar_initials = 'SM'
where email = 'employee@demo.ethix.io';
update profiles set role = 'finance', full_name = 'Daniel Tesfaye', department = 'Finance', avatar_initials = 'DT'
where email = 'finance@demo.ethix.io';
update profiles set role = 'general_manager', full_name = 'Helen Abebe', department = 'Management', avatar_initials = 'HA'
where email = 'gm@demo.ethix.io';
update profiles set role = 'owner', full_name = 'Yonas Girma', department = 'Executive', avatar_initials = 'YG'
where email = 'owner@demo.ethix.io';
update profiles set role = 'admin', full_name = 'Marta Tadesse', department = 'Operations', avatar_initials = 'MT'
where email = 'admin@demo.ethix.io';

insert into departments (name, is_active) values
  ('Architecture', true),
  ('Interior Design', true),
  ('Engineering', true),
  ('Site Operations', true),
  ('Procurement', true),
  ('Finance', true),
  ('Management', true),
  ('Executive', true),
  ('Operations', true),
  ('Legacy Projects', false)
on conflict (name) do update set is_active = excluded.is_active;

-- Deterministic IDs make the seed easy to refresh without touching client data.
insert into projects (id, name, code, client_name, location, budget, is_active, created_at) values
  ('30000000-0000-4000-8000-000000000001', 'Riverside Corporate Tower', 'DEMO-RCT', 'Riverside Holdings', 'Addis Ababa · Kirkos', 1850000, true, now() - interval '14 months'),
  ('30000000-0000-4000-8000-000000000002', 'Bole Arts & Innovation Centre', 'DEMO-BAI', 'Bole Cultural Trust', 'Addis Ababa · Bole', 1220000, true, now() - interval '11 months'),
  ('30000000-0000-4000-8000-000000000003', 'Entoto Eco Lodge', 'DEMO-EEL', 'Highland Hospitality', 'Addis Ababa · Entoto', 940000, true, now() - interval '9 months'),
  ('30000000-0000-4000-8000-000000000004', 'Kazanchis Workplace Fit-out', 'DEMO-KWF', 'Abyssinia Digital', 'Addis Ababa · Kazanchis', 480000, true, now() - interval '7 months'),
  ('30000000-0000-4000-8000-000000000005', 'Hawassa Lakeside Villas', 'DEMO-HLV', 'Rift Valley Living', 'Hawassa', 1640000, true, now() - interval '6 months'),
  ('30000000-0000-4000-8000-000000000006', 'Mekelle Medical Centre', 'DEMO-MMC', 'Northern Health Group', 'Mekelle', 2100000, true, now() - interval '5 months'),
  ('30000000-0000-4000-8000-000000000007', 'Dire Dawa Civic Hub', 'DEMO-DCH', 'Dire Dawa City Administration', 'Dire Dawa', 1360000, true, now() - interval '4 months'),
  ('30000000-0000-4000-8000-000000000008', 'Unity Headquarters Renovation', 'DEMO-UHR', 'Unity Advisory', 'Addis Ababa · Arada', 390000, false, now() - interval '18 months')
on conflict (id) do update set
  name = excluded.name, code = excluded.code, client_name = excluded.client_name,
  location = excluded.location, budget = excluded.budget, is_active = excluded.is_active;

insert into vendors (id, name, contact_person, phone, email, services, address, is_active, created_at) values
  ('40000000-0000-4000-8000-000000000001', 'Addis Structural Supply', 'Kebede Alemu', '+251 911 120 101', 'quotes@addisstructural.et', 'Steel, cement and structural materials', 'Akaki Kality, Addis Ababa', true, now() - interval '3 years'),
  ('40000000-0000-4000-8000-000000000002', 'Horizon Electrical Systems', 'Meron Tadesse', '+251 911 120 102', 'sales@horizonelectrical.et', 'Electrical, lighting and backup power', 'Bole, Addis Ababa', true, now() - interval '30 months'),
  ('40000000-0000-4000-8000-000000000003', 'Prime Workspace Interiors', 'Solomon Bekele', '+251 911 120 103', 'orders@primeworkspace.et', 'Furniture, joinery and interior finishes', 'Nifas Silk, Addis Ababa', true, now() - interval '28 months'),
  ('40000000-0000-4000-8000-000000000004', 'Metro Plumbing & Sanitary', 'Ruth Hailu', '+251 911 120 104', 'sales@metroplumbing.et', 'Plumbing, pumps and sanitary ware', 'Merkato, Addis Ababa', true, now() - interval '26 months'),
  ('40000000-0000-4000-8000-000000000005', 'Blue Nile Glassworks', 'Nahom Desta', '+251 911 120 105', 'projects@bluenileglass.et', 'Curtain wall, glazing and aluminium', 'Dukem Industrial Zone', true, now() - interval '24 months'),
  ('40000000-0000-4000-8000-000000000006', 'TerraStone Finishes', 'Liya Assefa', '+251 911 120 106', 'studio@terrastone.et', 'Stone, tile and specialist finishes', 'Megenagna, Addis Ababa', true, now() - interval '22 months'),
  ('40000000-0000-4000-8000-000000000007', 'Apex Safety & Tools', 'Dawit Girma', '+251 911 120 107', 'orders@apexsafety.et', 'PPE, access systems and site tools', 'Gotera, Addis Ababa', true, now() - interval '20 months'),
  ('40000000-0000-4000-8000-000000000008', 'GreenScape Ethiopia', 'Samira Yusuf', '+251 911 120 108', 'design@greenscape.et', 'Landscape materials and irrigation', 'CMC, Addis Ababa', true, now() - interval '18 months'),
  ('40000000-0000-4000-8000-000000000009', 'Elevate Mechanical Solutions', 'Henok Fikru', '+251 911 120 109', 'tenders@elevatemechanical.et', 'HVAC, lifts and mechanical systems', 'Sar Bet, Addis Ababa', true, now() - interval '16 months'),
  ('40000000-0000-4000-8000-000000000010', 'Habesha Concrete Products', 'Betelhem Mulu', '+251 911 120 110', 'dispatch@habeshaconcrete.et', 'Precast, blocks and ready-mix concrete', 'Sendafa', true, now() - interval '14 months'),
  ('40000000-0000-4000-8000-000000000011', 'Orbit Technology & Security', 'Yared Worku', '+251 911 120 111', 'projects@orbitsecurity.et', 'CCTV, access control and networking', 'Kazanchis, Addis Ababa', true, now() - interval '12 months'),
  ('40000000-0000-4000-8000-000000000012', 'Legacy General Trading', 'Mimi Getachew', '+251 911 120 112', 'office@legacytrading.et', 'General building supplies', 'Merkato, Addis Ababa', false, now() - interval '4 years')
on conflict (id) do update set
  name = excluded.name, contact_person = excluded.contact_person, phone = excluded.phone,
  email = excluded.email, services = excluded.services, address = excluded.address,
  is_active = excluded.is_active;

-- Remove the previous copy of this dataset. Child purchasing rows cascade.
delete from notifications
where link like '/requests/10000000-0000-4000-8000-%'
   or link like '/labor/20000000-0000-4000-8000-%';
delete from audit_events
where metadata ->> 'seed' = 'archops-showcase-v1'
   or entity_id like '10000000-0000-4000-8000-%'
   or entity_id like '20000000-0000-4000-8000-%';
delete from labor_requests
where request_number like 'DEMO-LR-%'
   or id::text like '20000000-0000-4000-8000-%';
delete from purchase_requests
where request_number like 'DEMO-PR-%'
   or id::text like '10000000-0000-4000-8000-%';

-- 84 purchases: a dense current fortnight, six dashboard months, and a full year.
do $$
declare
  i int;
  j int;
  v_id uuid;
  v_project uuid;
  v_requester uuid;
  v_employee uuid;
  v_finance uuid;
  v_gm uuid;
  v_owner uuid;
  v_admin uuid;
  v_status request_status;
  v_department text;
  v_title text;
  v_description text;
  v_created timestamptz;
  v_updated timestamptz;
  v_days_ago int;
  v_estimated numeric(14,2);
  v_approved numeric(14,2);
  v_actual numeric(14,2);
  v_quote numeric(14,2);
  v_required date;
  v_stage approval_stage;
  v_reject_stage int;
  v_actor uuid;
  v_titles text[] := array[
    'Structural steel package', 'Low-energy lighting fixtures', 'Custom reception joinery',
    'Plumbing and sanitary package', 'Curtain-wall glazing panels', 'Natural stone floor finish',
    'Site safety equipment', 'Landscape and irrigation materials', 'HVAC ducting and controls',
    'Precast stair components', 'Access control and CCTV system', 'Concrete and reinforcement batch',
    'Acoustic ceiling system', 'External waterproofing materials', 'Fire detection equipment',
    'Kitchen equipment package', 'Solar backup power system', 'Office workstation furniture',
    'Scaffolding rental extension', 'Wayfinding and site signage', 'Bathroom fixtures and fittings',
    'Paint and protective coatings', 'Data cabling and network racks', 'Roof insulation package'
  ];
  v_descriptions text[] := array[
    'Procurement package issued from the approved construction drawings.',
    'Materials required to keep the next site milestone on programme.',
    'Coordinated supply package following consultant review and quantity verification.',
    'Site team request covering installation, testing and handover requirements.'
  ];
  v_departments text[] := array['Architecture', 'Interior Design', 'Engineering', 'Site Operations', 'Procurement'];
  v_items text[] := array[
    'Primary material', 'Fixings and accessories', 'Delivery and handling', 'Testing and commissioning',
    'Protective equipment', 'Installation consumables'
  ];
  v_units text[] := array['lot', 'set', 'unit', 'm²', 'm', 'day'];
begin
  select id into v_employee from profiles where email = 'employee@demo.ethix.io';
  select id into v_finance from profiles where email = 'finance@demo.ethix.io';
  select id into v_gm from profiles where email = 'gm@demo.ethix.io';
  select id into v_owner from profiles where email = 'owner@demo.ethix.io';
  select id into v_admin from profiles where email = 'admin@demo.ethix.io';

  for i in 1..84 loop
    v_id := format('10000000-0000-4000-8000-%s', lpad(i::text, 12, '0'))::uuid;
    v_project := format('30000000-0000-4000-8000-%s', lpad((1 + ((i - 1) % 8))::text, 12, '0'))::uuid;
    v_department := v_departments[1 + ((i - 1) % array_length(v_departments, 1))];
    v_title := v_titles[1 + ((i - 1) % array_length(v_titles, 1))];
    v_description := v_descriptions[1 + ((i - 1) % array_length(v_descriptions, 1))];

    -- Keep Sara's employee dashboard rich while still showing activity by every role.
    v_requester := case
      when i % 10 in (0, 1, 2, 3, 4, 5) then v_employee
      when i % 10 = 6 then v_admin
      when i % 10 = 7 then v_finance
      when i % 10 = 8 then v_gm
      else v_owner
    end;

    if i <= 27 then
      v_status := (array[
        'draft', 'quote_received', 'awaiting_finance', 'awaiting_gm', 'awaiting_owner',
        'approved', 'rejected', 'purchased', 'completed'
      ]::request_status[])[1 + ((i - 1) % 9)];
    else
      v_status := (array[
        'completed', 'purchased', 'approved', 'completed', 'rejected',
        'completed', 'purchased', 'completed', 'approved', 'completed'
      ]::request_status[])[1 + ((i - 28) % 10)];
    end if;

    v_days_ago := case
      when i <= 14 then i - 1
      when i <= 24 then 14 + (i - 15)
      else 24 + ((i - 25) * 5)
    end;
    v_created := now() - make_interval(days => v_days_ago, hours => ((i * 5) % 14));
    v_estimated := round((2800 + ((i * 7919) % 88000) + ((i % 4) * 475))::numeric, 2);
    v_approved := case when v_status in ('approved', 'purchased', 'completed') then round(v_estimated * (0.92 + ((i % 6) * 0.012)), 2) else null end;
    v_actual := case when v_status in ('purchased', 'completed') then round(v_approved * (0.94 + ((i % 5) * 0.011)), 2) else null end;
    v_updated := case
      when v_status = 'completed' then least(now() - interval '1 hour', v_created + interval '18 days')
      when v_status = 'purchased' then least(now() - interval '1 hour', v_created + interval '12 days')
      when v_status in ('approved', 'rejected') then least(now() - interval '1 hour', v_created + interval '3 days')
      when v_status in ('awaiting_finance', 'awaiting_gm', 'awaiting_owner') then least(now() - interval '1 hour', v_created + interval '8 hours')
      else v_created
    end;
    v_required := case
      when i <= 27 and v_status not in ('completed', 'purchased', 'approved', 'rejected')
        then current_date + ((i % 17) - 8)
      else (v_created + interval '30 days')::date
    end;

    insert into purchase_requests (
      id, request_number, title, description, project_id, department, requester_id,
      required_date, estimated_amount, approved_amount, actual_amount, justification,
      status, rejection_reason, return_note, submitted_at, created_at, updated_at
    ) values (
      v_id, 'DEMO-PR-' || lpad(i::text, 4, '0'), v_title, v_description, v_project,
      v_department, v_requester, v_required, v_estimated, v_approved, v_actual,
      'Required to protect the programme, specification quality and committed client milestone.',
      v_status,
      case when v_status = 'rejected' then 'Scope and cost need to be aligned with the current project allowance.' end,
      case when v_status = 'quote_received' and i % 2 = 0 then 'Revised quotation received after clarification of quantities.' end,
      case when v_status not in ('draft', 'quote_received') then v_created + interval '2 hours' end,
      v_created, v_updated
    );

    -- Three detailed line items per request.
    for j in 1..3 loop
      insert into purchase_items (
        id, purchase_request_id, name, description, quantity, unit, estimated_unit_price, created_at
      ) values (
        format('11000000-0000-4000-%s-%s', lpad(i::text, 4, '0'), lpad(j::text, 12, '0'))::uuid,
        v_id,
        v_items[1 + ((i + j - 2) % array_length(v_items, 1))],
        case j when 1 then 'Core package item to approved specification.' when 2 then 'Associated accessories and installation allowance.' else 'Logistics, handling and quality checks.' end,
        1 + ((i * j) % 18),
        v_units[1 + ((i + j - 2) % array_length(v_units, 1))],
        round((v_estimated / (6 + ((i + j) % 9)))::numeric, 2),
        v_created
      );
    end loop;

    -- A draft intentionally has no quote. Every later state has three competing bids.
    if v_status <> 'draft' then
      for j in 1..3 loop
        v_quote := round(v_estimated * (case j when 1 then 1.06 when 2 then 0.97 else 1.01 end), 2);
        insert into vendor_quotations (
          id, purchase_request_id, vendor_id, amount, notes, is_selected, valid_until, created_at
        ) values (
          format('12000000-0000-4000-%s-%s', lpad(i::text, 4, '0'), lpad(j::text, 12, '0'))::uuid,
          v_id,
          format('40000000-0000-4000-8000-%s', lpad((1 + ((i + j - 2) % 11))::text, 12, '0'))::uuid,
          v_quote,
          case j when 1 then 'Includes delivery; 50% mobilisation.' when 2 then 'Best evaluated value; delivery in 10 working days.' else 'Includes installation supervision and testing.' end,
          j = 2 and v_status not in ('quote_received', 'awaiting_finance'),
          (v_created + interval '30 days')::date,
          v_created + make_interval(hours => j * 2)
        );
      end loop;
    end if;

    -- Approval history mirrors the stage represented by each request status.
    if v_status = 'awaiting_finance' then
      insert into approvals (purchase_request_id, stage, decision) values (v_id, 'finance', 'pending');
    elsif v_status = 'awaiting_gm' then
      insert into approvals (purchase_request_id, stage, decision, reviewer_id, comments, decided_at)
      values (v_id, 'finance', 'approved', v_finance, 'Budget and quotation comparison verified.', least(now(), v_created + interval '4 hours'));
      insert into approvals (purchase_request_id, stage, decision) values (v_id, 'gm', 'pending');
    elsif v_status = 'awaiting_owner' then
      insert into approvals (purchase_request_id, stage, decision, reviewer_id, comments, decided_at) values
        (v_id, 'finance', 'approved', v_finance, 'Budget and quotation comparison verified.', least(now(), v_created + interval '4 hours')),
        (v_id, 'gm', 'approved', v_gm, 'Operational need and project timing confirmed.', least(now(), v_created + interval '7 hours'));
      insert into approvals (purchase_request_id, stage, decision) values (v_id, 'owner', 'pending');
    elsif v_status in ('approved', 'purchased', 'completed') then
      insert into approvals (purchase_request_id, stage, decision, reviewer_id, comments, decided_at) values
        (v_id, 'finance', 'approved', v_finance, 'Budget and quotation comparison verified.', least(now(), v_created + interval '4 hours')),
        (v_id, 'gm', 'approved', v_gm, 'Operational need and project timing confirmed.', least(now(), v_created + interval '7 hours')),
        (v_id, 'owner', 'approved', v_owner, 'Approved within the project delivery plan.', least(now(), v_created + interval '10 hours'));
    elsif v_status = 'rejected' then
      v_reject_stage := 1 + (i % 3);
      if v_reject_stage > 1 then
        insert into approvals (purchase_request_id, stage, decision, reviewer_id, comments, decided_at)
        values (v_id, 'finance', 'approved', v_finance, 'Budget review completed.', least(now(), v_created + interval '4 hours'));
      end if;
      if v_reject_stage > 2 then
        insert into approvals (purchase_request_id, stage, decision, reviewer_id, comments, decided_at)
        values (v_id, 'gm', 'approved', v_gm, 'Operational review completed.', least(now(), v_created + interval '7 hours'));
      end if;
      v_stage := (array['finance', 'gm', 'owner']::approval_stage[])[v_reject_stage];
      v_actor := case v_stage when 'finance' then v_finance when 'gm' then v_gm else v_owner end;
      insert into approvals (purchase_request_id, stage, decision, reviewer_id, comments, decided_at)
      values (v_id, v_stage, 'rejected', v_actor, 'Revise scope and return within the approved allowance.', least(now(), v_created + interval '10 hours'));
    end if;
  end loop;
end $$;

-- 42 labor requests across every stage, with five months of staffing history.
do $$
declare
  i int;
  v_id uuid;
  v_employee uuid;
  v_admin uuid;
  v_gm uuid;
  v_owner uuid;
  v_requester uuid;
  v_project uuid;
  v_status labor_status;
  v_created timestamptz;
  v_days_ago int;
  v_labor text;
  v_location text;
  v_lead text;
  v_labor_types text[] := array['General laborers', 'Electricians', 'Plumbers', 'Carpenters', 'Masons', 'Painters', 'Tile installers', 'Steel fixers', 'HVAC technicians', 'Landscaping crew'];
  v_leads text[] := array['Abel Site Services', 'Rahel Crew Lead', 'Biruk Workforce Team', 'Selam Technical Crew', 'Tesfaye Site Labour'];
begin
  select id into v_employee from profiles where email = 'employee@demo.ethix.io';
  select id into v_admin from profiles where email = 'admin@demo.ethix.io';
  select id into v_gm from profiles where email = 'gm@demo.ethix.io';
  select id into v_owner from profiles where email = 'owner@demo.ethix.io';

  for i in 1..42 loop
    v_id := format('20000000-0000-4000-8000-%s', lpad(i::text, 12, '0'))::uuid;
    v_project := format('30000000-0000-4000-8000-%s', lpad((1 + ((i - 1) % 7))::text, 12, '0'))::uuid;
    v_requester := case when i % 8 in (0, 1, 2, 3, 4) then v_employee when i % 8 = 5 then v_admin when i % 8 = 6 then v_gm else v_owner end;
    v_status := (array['requested', 'reviewed', 'assigned', 'in_progress', 'completed', 'cancelled']::labor_status[])[1 + ((i - 1) % 6)];
    v_days_ago := case when i <= 14 then i - 1 else 14 + ((i - 15) * 5) end;
    v_created := now() - make_interval(days => v_days_ago, hours => ((i * 3) % 12));
    v_labor := v_labor_types[1 + ((i - 1) % array_length(v_labor_types, 1))];
    v_location := (array['Tower A · Level 4', 'Main services yard', 'Villa cluster C', 'North façade work zone', 'Interior fit-out floor', 'Landscape boundary']::text[])[1 + ((i - 1) % 6)];
    v_lead := v_leads[1 + ((i - 1) % array_length(v_leads, 1))];

    insert into labor_requests (
      id, request_number, project_id, requested_by, labor_type, workers_required,
      location, required_at, description, status, assigned_to,
      expected_duration_hours, management_notes, created_at, updated_at
    ) values (
      v_id, 'DEMO-LR-' || lpad(i::text, 4, '0'), v_project, v_requester, v_labor,
      2 + ((i * 3) % 15), v_location,
      case when v_status in ('requested', 'reviewed', 'assigned', 'in_progress') then now() + make_interval(days => 1 + (i % 12)) else v_created + interval '7 days' end,
      'Crew required for the coordinated site work package and milestone handover.',
      v_status,
      case when v_status in ('assigned', 'in_progress', 'completed') then v_lead end,
      (array[8, 16, 24, 40, 80]::numeric[])[1 + ((i - 1) % 5)],
      case
        when v_status = 'requested' then 'Confirm access and supervisor availability.'
        when v_status = 'reviewed' then 'Headcount checked against the two-week look-ahead.'
        when v_status = 'cancelled' then 'Sequence changed after the coordination meeting.'
        else 'Daily toolbox talk and attendance register required.'
      end,
      v_created,
      case when v_status in ('requested', 'reviewed') then v_created else least(now(), v_created + interval '2 days') end
    );
  end loop;
end $$;

-- Replace trigger-generated, run-time-stamped activity with coherent historical timelines.
delete from notifications
where link like '/requests/10000000-0000-4000-8000-%'
   or link like '/labor/20000000-0000-4000-8000-%';
delete from audit_events
where entity_id like '10000000-0000-4000-8000-%'
   or entity_id like '20000000-0000-4000-8000-%';

-- Purchase audit trails. Recent records intentionally fill the 12-day activity heatmap.
insert into audit_events (actor_id, action, entity_type, entity_id, description, metadata, created_at)
select r.requester_id, 'created', 'purchase_request', r.id::text,
       'Created "' || r.title || '" for ' || r.department || '.',
       jsonb_build_object('seed', 'archops-showcase-v1', 'request_number', r.request_number), r.created_at
from purchase_requests r where r.request_number like 'DEMO-PR-%';

insert into audit_events (actor_id, action, entity_type, entity_id, description, metadata, created_at)
select r.requester_id, 'submitted', 'purchase_request', r.id::text,
       'Submitted "' || r.title || '" for Finance review.',
       jsonb_build_object('seed', 'archops-showcase-v1', 'estimated_amount', r.estimated_amount),
       least(now(), r.created_at + interval '2 hours')
from purchase_requests r
where r.request_number like 'DEMO-PR-%' and r.status not in ('draft', 'quote_received');

insert into audit_events (actor_id, action, entity_type, entity_id, description, metadata, created_at)
select a.reviewer_id,
       case when a.decision = 'rejected' then 'rejected' else 'approved_' || a.stage::text end,
       'purchase_request', r.id::text,
       case when a.decision = 'rejected'
         then initcap(a.stage::text) || ' rejected "' || r.title || '".'
         else initcap(a.stage::text) || ' approved "' || r.title || '".' end,
       jsonb_build_object('seed', 'archops-showcase-v1', 'stage', a.stage, 'decision', a.decision),
       coalesce(a.decided_at, least(now(), r.created_at + interval '4 hours'))
from approvals a join purchase_requests r on r.id = a.purchase_request_id
where r.request_number like 'DEMO-PR-%' and a.decision <> 'pending';

insert into audit_events (actor_id, action, entity_type, entity_id, description, metadata, created_at)
select f.id, 'purchased', 'purchase_request', r.id::text,
       'Recorded purchase of "' || r.title || '" for $' || to_char(r.actual_amount, 'FM999,999,999.00') || '.',
       jsonb_build_object('seed', 'archops-showcase-v1', 'actual_amount', r.actual_amount),
       least(now(), r.created_at + interval '12 days')
from purchase_requests r cross join lateral (select id from profiles where email = 'finance@demo.ethix.io') f
where r.request_number like 'DEMO-PR-%' and r.status in ('purchased', 'completed');

insert into audit_events (actor_id, action, entity_type, entity_id, description, metadata, created_at)
select a.id, 'completed', 'purchase_request', r.id::text,
       'Delivery confirmed and "' || r.title || '" closed.',
       jsonb_build_object('seed', 'archops-showcase-v1'),
       least(now(), r.updated_at)
from purchase_requests r cross join lateral (select id from profiles where email = 'admin@demo.ethix.io') a
where r.request_number like 'DEMO-PR-%' and r.status = 'completed';

-- Labor timelines used by the detail screen and the global audit log.
insert into audit_events (actor_id, action, entity_type, entity_id, description, metadata, created_at)
select l.requested_by, 'labor_requested', 'labor_request', l.id::text,
       'Requested ' || l.workers_required || ' ' || l.labor_type || ' at ' || l.location || '.',
       jsonb_build_object('seed', 'archops-showcase-v1', 'status', 'requested'), l.created_at
from labor_requests l where l.request_number like 'DEMO-LR-%';

insert into audit_events (actor_id, action, entity_type, entity_id, description, metadata, created_at)
select gm.id, 'labor_' || step.status, 'labor_request', l.id::text,
       l.labor_type || ' crew moved to ' || replace(step.status, '_', ' ') || '.',
       jsonb_build_object('seed', 'archops-showcase-v1', 'status', step.status),
       least(now(), l.created_at + make_interval(hours => step.hours_after))
from labor_requests l
cross join lateral (select id from profiles where email = 'gm@demo.ethix.io') gm
cross join lateral (
  values ('reviewed', 4, 2), ('assigned', 10, 3), ('in_progress', 24, 4), ('completed', 72, 5)
) as step(status, hours_after, rank)
where l.request_number like 'DEMO-LR-%'
  and step.rank <= case l.status when 'reviewed' then 2 when 'assigned' then 3 when 'in_progress' then 4 when 'completed' then 5 else 1 end;

insert into audit_events (actor_id, action, entity_type, entity_id, description, metadata, created_at)
select gm.id, 'labor_cancelled', 'labor_request', l.id::text,
       l.labor_type || ' crew request cancelled after programme resequencing.',
       jsonb_build_object('seed', 'archops-showcase-v1', 'status', 'cancelled'),
       least(now(), l.created_at + interval '6 hours')
from labor_requests l cross join lateral (select id from profiles where email = 'gm@demo.ethix.io') gm
where l.request_number like 'DEMO-LR-%' and l.status = 'cancelled';

-- Five useful notifications per account. Some are read so the bell feels lived-in.
insert into notifications (user_id, kind, title, body, link, is_read, created_at)
select p.id,
       case
         when p.role = 'finance' then 'review'
         when p.role in ('general_manager', 'owner') then case when g.n <= 3 then 'review' else 'system' end
         when p.role = 'employee' then case g.n when 1 then 'approved' when 2 then 'returned' when 3 then 'labor' else 'system' end
         else case when g.n <= 2 then 'labor' else 'system' end
       end,
       case p.role
         when 'finance' then 'Purchase request awaiting Finance review'
         when 'general_manager' then 'Operational sign-off is ready'
         when 'owner' then 'Final approval requires your decision'
         when 'employee' then 'Update on your project request'
         else 'ArchOps operations update'
       end,
       case g.n
         when 1 then 'A priority request is ready for action today.'
         when 2 then 'The project team added a new quotation comparison.'
         when 3 then 'A site milestone changed since your last visit.'
         when 4 then 'A completed purchase was closed within budget.'
         else 'Your weekly operations summary is ready.'
       end,
       '/requests/' || format('10000000-0000-4000-8000-%s', lpad((2 + g.n)::text, 12, '0')),
       g.n >= 4,
       now() - make_interval(hours => g.n * 7)
from profiles p cross join generate_series(1, 5) as g(n)
where p.email in (
  'employee@demo.ethix.io', 'finance@demo.ethix.io', 'gm@demo.ethix.io',
  'owner@demo.ethix.io', 'admin@demo.ethix.io'
);

commit;

-- Expected headline totals: 84 purchases, 252 items, 243 quotations,
-- 42 labor requests, 8 showcase projects and 12 showcase vendors.
select 'purchase requests' as dataset, count(*) as rows from purchase_requests where request_number like 'DEMO-PR-%'
union all select 'purchase items', count(*) from purchase_items i join purchase_requests r on r.id = i.purchase_request_id where r.request_number like 'DEMO-PR-%'
union all select 'vendor quotations', count(*) from vendor_quotations q join purchase_requests r on r.id = q.purchase_request_id where r.request_number like 'DEMO-PR-%'
union all select 'labor requests', count(*) from labor_requests where request_number like 'DEMO-LR-%'
union all select 'audit events', count(*) from audit_events where metadata ->> 'seed' = 'archops-showcase-v1'
order by dataset;
