-- Pilot features migration
-- Additive and safe to re-run on top of schema.sql + seed.sql. Nothing is dropped
-- except policies/functions/triggers that this file recreates.
-- Run the whole file in Supabase > SQL Editor.
--
-- Adds: attachments (if missing), departments, extra columns (budget, location,
-- duration, notes...), server-side request numbers, notifications (auto-created
-- by triggers), workflow RPCs with role checks + no self-approval, role-based
-- row level security, and a private 10 MB attachments bucket.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Attachments (folds in add-attachments.sql)
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  create type attachment_type as enum ('quotation', 'invoice', 'receipt', 'delivery', 'photo', 'other');
exception when duplicate_object then null; end $$;

create table if not exists purchase_attachments (
  id uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references purchase_requests(id) on delete cascade,
  attachment_type attachment_type not null default 'other',
  file_path text not null,
  file_url text not null,
  file_name text not null,
  description text,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);
alter table purchase_attachments add column if not exists file_size bigint;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Departments + new columns
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Seed from the department names already in use
insert into departments (name)
select distinct department from (
  select department from profiles where department is not null and department <> ''
  union select department from purchase_requests where department is not null and department <> ''
) d
on conflict (name) do nothing;

alter table projects add column if not exists location text;
alter table projects add column if not exists budget numeric(14,2);

alter table vendors add column if not exists address text;

alter table purchase_items add column if not exists description text;
alter table purchase_items add column if not exists created_at timestamptz not null default now();

alter table vendor_quotations add column if not exists valid_until date;

alter table purchase_requests add column if not exists return_note text;
alter table purchase_requests add column if not exists submitted_at timestamptz;

alter table labor_requests add column if not exists expected_duration_hours numeric(8,2);
alter table labor_requests add column if not exists management_notes text;
alter table labor_requests add column if not exists updated_at timestamptz not null default now();

alter table audit_events add column if not exists metadata jsonb not null default '{}'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Server-generated request numbers (PR-2026-0013, LR-2026-0004)
-- ─────────────────────────────────────────────────────────────────────────────
create sequence if not exists purchase_request_number_seq;
create sequence if not exists labor_request_number_seq;

select setval('purchase_request_number_seq', greatest(1, coalesce((
  select max(nullif(regexp_replace(request_number, '^.*-', ''), '')::int) from purchase_requests
  where request_number ~ '-[0-9]+$'), 0)), true);
select setval('labor_request_number_seq', greatest(1, coalesce((
  select max(nullif(regexp_replace(request_number, '^.*-', ''), '')::int) from labor_requests
  where request_number ~ '-[0-9]+$'), 0)), true);

alter table purchase_requests alter column request_number
  set default 'PR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('purchase_request_number_seq')::text, 4, '0');
alter table labor_requests alter column request_number
  set default 'LR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('labor_request_number_seq')::text, 4, '0');

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Notifications
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null default 'system', -- review | approved | rejected | returned | purchased | labor | reminder | system
  title text not null,
  body text not null default '',
  link text not null default '/dashboard',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Helpers
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.my_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.has_role(roles user_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = any(roles) from profiles where id = auth.uid()), false)
$$;

create or replace function public.can_view_purchase(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from purchase_requests r
    left join profiles me on me.id = auth.uid()
    where r.id = p_request_id
      and (
        me.role in ('finance', 'general_manager', 'owner', 'admin')
        or r.requester_id = auth.uid()
        or (me.department is not null and r.department = me.department)
      )
  )
$$;

create or replace function public.notify_user(p_user uuid, p_kind text, p_title text, p_body text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into notifications (user_id, kind, title, body, link) values (p_user, p_kind, p_title, coalesce(p_body, ''), coalesce(p_link, '/dashboard'));
end $$;

create or replace function public.notify_role(p_role user_role, p_kind text, p_title text, p_body text, p_link text, p_except uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, title, body, link)
  select id, p_kind, p_title, coalesce(p_body, ''), coalesce(p_link, '/dashboard')
  from profiles where role = p_role and id is distinct from p_except;
end $$;

create or replace function public.log_audit(p_action text, p_entity_type text, p_entity_id uuid, p_description text, p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into audit_events (actor_id, action, entity_type, entity_id, description, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id::text, p_description, coalesce(p_metadata, '{}'::jsonb));
end $$;

-- Status may only change through the workflow functions below
create or replace function public.guard_purchase_status()
returns trigger language plpgsql as $$
begin
  -- auth.uid() is null for the SQL editor / service role, which may fix data directly
  if new.status is distinct from old.status and auth.uid() is not null and coalesce(current_setting('app.workflow', true), '') <> 'on' then
    raise exception 'Status changes must go through the approval workflow';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists purchase_status_guard on purchase_requests;
create trigger purchase_status_guard before update on purchase_requests
  for each row execute function guard_purchase_status();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Purchase workflow RPCs (atomic, role-checked, audited)
--    Called from src/lib/workflow.ts via supabase.rpc(...)
-- ─────────────────────────────────────────────────────────────────────────────

-- Draft / Quote Received -> Awaiting Finance
create or replace function public.submit_purchase_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r purchase_requests; me profiles;
begin
  select * into me from profiles where id = auth.uid();
  select * into r from purchase_requests where id = p_request_id for update;
  if r.id is null then raise exception 'Request not found'; end if;
  if r.requester_id <> auth.uid() and me.role <> 'admin' then raise exception 'Only the requester can submit this request'; end if;
  if r.status not in ('draft', 'quote_received') then raise exception 'This request has already been submitted'; end if;
  if not exists (select 1 from vendor_quotations where purchase_request_id = r.id) then
    raise exception 'Add at least one vendor quotation before submitting';
  end if;

  perform set_config('app.workflow', 'on', true);
  update purchase_requests set status = 'awaiting_finance', submitted_at = now(), return_note = null, rejection_reason = null where id = r.id;

  -- Fresh approval chain (a returned request starts over)
  delete from approvals where purchase_request_id = r.id;
  insert into approvals (purchase_request_id, stage, decision) values (r.id, 'finance', 'pending');

  perform log_audit('purchase_submitted', 'purchase_request', r.id, me.full_name || ' submitted "' || r.title || '" for Finance review.');
end $$;

-- Approve / reject / return at the current stage
create or replace function public.decide_purchase_request(p_request_id uuid, p_decision text, p_comment text default null, p_approved_amount numeric default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  r purchase_requests; me profiles;
  v_stage approval_stage; v_next request_status; v_label text;
begin
  select * into me from profiles where id = auth.uid();
  select * into r from purchase_requests where id = p_request_id for update;
  if r.id is null then raise exception 'Request not found'; end if;

  v_stage := case r.status when 'awaiting_finance' then 'finance'::approval_stage when 'awaiting_gm' then 'gm'::approval_stage when 'awaiting_owner' then 'owner'::approval_stage end;
  if v_stage is null then raise exception 'This request is not waiting on an approval'; end if;

  if not ((v_stage = 'finance' and me.role = 'finance') or (v_stage = 'gm' and me.role = 'general_manager') or (v_stage = 'owner' and me.role = 'owner')) then
    raise exception 'It is not your turn to review this request';
  end if;
  if r.requester_id = auth.uid() then raise exception 'You cannot approve your own request'; end if;
  if p_decision in ('reject', 'return') and coalesce(trim(p_comment), '') = '' then raise exception 'Add a reason'; end if;

  v_label := case v_stage when 'finance' then 'Finance' when 'gm' then 'General Manager' else 'Owner' end;
  perform set_config('app.workflow', 'on', true);

  if p_decision = 'approve' then
    update approvals set decision = 'approved', reviewer_id = auth.uid(), comments = nullif(trim(p_comment), ''), decided_at = now()
      where purchase_request_id = r.id and stage = v_stage;
    v_next := case v_stage when 'finance' then 'awaiting_gm'::request_status when 'gm' then 'awaiting_owner'::request_status else 'approved'::request_status end;
    if v_next <> 'approved' then
      insert into approvals (purchase_request_id, stage, decision)
        values (r.id, case v_stage when 'finance' then 'gm'::approval_stage else 'owner'::approval_stage end, 'pending');
    end if;
    update purchase_requests set status = v_next,
      approved_amount = coalesce(p_approved_amount, approved_amount, case when v_next = 'approved' then estimated_amount end)
      where id = r.id;
    perform log_audit(v_stage || '_approved', 'purchase_request', r.id, v_label || ' approved "' || r.title || '".',
      jsonb_build_object('approved_amount', p_approved_amount));

  elsif p_decision = 'reject' then
    update approvals set decision = 'rejected', reviewer_id = auth.uid(), comments = p_comment, decided_at = now()
      where purchase_request_id = r.id and stage = v_stage;
    update purchase_requests set status = 'rejected', rejection_reason = p_comment where id = r.id;
    perform log_audit('rejected', 'purchase_request', r.id, v_label || ' rejected "' || r.title || '": ' || p_comment);

  elsif p_decision = 'return' then
    delete from approvals where purchase_request_id = r.id;
    update purchase_requests set status = 'quote_received', return_note = p_comment where id = r.id;
    perform log_audit('returned', 'purchase_request', r.id, v_label || ' sent "' || r.title || '" back for changes: ' || p_comment);

  else
    raise exception 'Unknown decision %', p_decision;
  end if;
end $$;

-- Approved -> Purchased
create or replace function public.record_purchase(p_request_id uuid, p_actual_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare r purchase_requests;
begin
  if not has_role(array['finance', 'owner', 'admin']::user_role[]) then raise exception 'Only Finance, the Owner or an admin can record purchases'; end if;
  select * into r from purchase_requests where id = p_request_id for update;
  if r.status <> 'approved' then raise exception 'Only approved requests can be purchased'; end if;
  if coalesce(p_actual_amount, 0) <= 0 then raise exception 'Enter the amount paid'; end if;
  perform set_config('app.workflow', 'on', true);
  update purchase_requests set status = 'purchased', actual_amount = p_actual_amount where id = r.id;
  perform log_audit('purchased', 'purchase_request', r.id, 'Purchase of "' || r.title || '" recorded at ' || to_char(p_actual_amount, 'FM999,999,999.00') || '.',
    jsonb_build_object('actual_amount', p_actual_amount));
end $$;

-- Purchased -> Completed
create or replace function public.complete_purchase_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r purchase_requests;
begin
  select * into r from purchase_requests where id = p_request_id for update;
  if not (has_role(array['finance', 'owner', 'admin']::user_role[]) or r.requester_id = auth.uid()) then raise exception 'You cannot complete this request'; end if;
  if r.status <> 'purchased' then raise exception 'Only purchased requests can be completed'; end if;
  perform set_config('app.workflow', 'on', true);
  update purchase_requests set status = 'completed' where id = r.id;
  perform log_audit('completed', 'purchase_request', r.id, '"' || r.title || '" was delivered and marked complete.');
end $$;

-- A quote on a draft moves it to Quote Received
create or replace function public.on_quotation_added()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.workflow', 'on', true);
  update purchase_requests set status = 'quote_received' where id = new.purchase_request_id and status = 'draft';
  perform set_config('app.workflow', '', true);
  return new;
end $$;

drop trigger if exists quotation_added on vendor_quotations;
create trigger quotation_added after insert on vendor_quotations
  for each row execute function on_quotation_added();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Notification triggers
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.on_purchase_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_link text := '/requests/' || new.id; v_amt text := '$' || to_char(coalesce(new.approved_amount, new.estimated_amount), 'FM999,999,999');
begin
  if new.status is not distinct from old.status then return new; end if;

  case new.status
    when 'awaiting_finance' then
      perform notify_role('finance', 'review', new.title || ' needs Finance review', v_amt || ' for ' || new.department || '.', v_link, new.requester_id);
      perform notify_user(new.requester_id, 'system', new.title || ' was submitted', 'It is now waiting on Finance.', v_link);
    when 'awaiting_gm' then
      perform notify_role('general_manager', 'review', new.title || ' needs your sign-off', 'Finance approved ' || v_amt || '.', v_link, new.requester_id);
      perform notify_user(new.requester_id, 'approved', 'Finance approved ' || new.title, 'It is now waiting on the General Manager.', v_link);
    when 'awaiting_owner' then
      perform notify_role('owner', 'review', new.title || ' awaits final approval', 'Finance and the GM signed off on ' || v_amt || '.', v_link, new.requester_id);
      perform notify_user(new.requester_id, 'approved', 'The GM approved ' || new.title, 'It is now waiting on the Owner.', v_link);
    when 'approved' then
      perform notify_user(new.requester_id, 'approved', new.title || ' is fully approved', v_amt || ' approved. Ready to purchase.', v_link);
      perform notify_role('finance', 'purchased', new.title || ' is ready to purchase', v_amt || ' approved by the Owner.', v_link, new.requester_id);
    when 'rejected' then
      perform notify_user(new.requester_id, 'rejected', new.title || ' was rejected', coalesce(new.rejection_reason, ''), v_link);
    when 'draft', 'quote_received' then
      if new.return_note is not null and old.status in ('awaiting_finance', 'awaiting_gm', 'awaiting_owner') then
        perform notify_user(new.requester_id, 'returned', new.title || ' was sent back', new.return_note, v_link);
      end if;
    when 'purchased' then
      perform notify_user(new.requester_id, 'purchased', new.title || ' was purchased', 'Paid $' || to_char(new.actual_amount, 'FM999,999,999') || '.', v_link);
    when 'completed' then
      perform notify_user(new.requester_id, 'approved', new.title || ' is complete', 'Delivered and closed out.', v_link);
      perform notify_role('owner', 'system', new.title || ' was completed', 'Final cost $' || to_char(coalesce(new.actual_amount, 0), 'FM999,999,999') || '.', v_link, new.requester_id);
    else null;
  end case;
  return new;
end $$;

drop trigger if exists purchase_status_notify on purchase_requests;
create trigger purchase_status_notify after update of status on purchase_requests
  for each row execute function on_purchase_status_change();

create or replace function public.on_labor_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_link text := '/labor/' || new.id;
begin
  if tg_op = 'INSERT' then
    perform notify_role('general_manager', 'labor', new.labor_type || ' crew requested', new.workers_required || ' workers at ' || new.location || '.', v_link, new.requested_by);
    perform notify_role('admin', 'labor', new.labor_type || ' crew requested', new.workers_required || ' workers at ' || new.location || '.', v_link, new.requested_by);
    perform log_audit('labor_requested', 'labor_request', new.id, 'Requested ' || new.workers_required || ' ' || new.labor_type || ' at ' || new.location || '.');
  elsif new.status is distinct from old.status then
    perform notify_user(new.requested_by, 'labor', new.labor_type || ' crew is ' || replace(new.status::text, '_', ' '),
      coalesce('Crew lead: ' || new.assigned_to, new.location), v_link);
    perform log_audit('labor_' || new.status::text, 'labor_request', new.id, new.labor_type || ' crew moved to ' || replace(new.status::text, '_', ' ') || '.');
  elsif new.assigned_to is distinct from old.assigned_to and new.assigned_to is not null then
    perform notify_user(new.requested_by, 'labor', new.assigned_to || ' will lead your ' || new.labor_type || ' crew', new.location, v_link);
    perform log_audit('labor_assigned', 'labor_request', new.id, new.assigned_to || ' assigned to the ' || new.labor_type || ' crew.');
  end if;
  return new;
end $$;

drop trigger if exists labor_notify_insert on labor_requests;
create trigger labor_notify_insert after insert on labor_requests
  for each row execute function on_labor_change();
drop trigger if exists labor_notify_update on labor_requests;
create trigger labor_notify_update after update on labor_requests
  for each row execute function on_labor_change();

-- Reminder sweep for stalled approvals. Schedule it with pg_cron (see README
-- notes in the migration message) or call it manually: select send_pending_reminders(48);
create or replace function public.send_pending_reminders(p_hours int default 48)
returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select pr.* from purchase_requests pr
    where pr.status in ('awaiting_finance', 'awaiting_gm', 'awaiting_owner')
      and pr.updated_at < now() - make_interval(hours => p_hours)
      and not exists (select 1 from notifications x where x.kind = 'reminder' and x.link = '/requests/' || pr.id and x.created_at > now() - make_interval(hours => p_hours))
  loop
    perform notify_role(case r.status when 'awaiting_finance' then 'finance'::user_role when 'awaiting_gm' then 'general_manager'::user_role else 'owner'::user_role end,
      'reminder', 'Reminder: ' || r.title || ' is still waiting', 'Pending for over ' || p_hours || ' hours.', '/requests/' || r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Stop users from changing their own role
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not has_role(array['admin']::user_role[]) then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end $$;

drop trigger if exists profile_role_guard on profiles;
create trigger profile_role_guard before update on profiles
  for each row execute function guard_profile_role();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Role-based row level security (replaces the demo "any user" policies)
-- ─────────────────────────────────────────────────────────────────────────────
alter table departments enable row level security;
alter table notifications enable row level security;
alter table purchase_attachments enable row level security;

do $$ declare pol record; begin
  for pol in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles', 'departments', 'projects', 'vendors', 'purchase_requests', 'purchase_items', 'vendor_quotations',
                      'approvals', 'purchase_attachments', 'labor_requests', 'audit_events', 'notifications')
  loop execute format('drop policy %I on %I', pol.policyname, pol.tablename); end loop;
end $$;

-- Profiles: everyone signed in can see the team; you edit yourself, admins edit anyone
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on profiles for update to authenticated using (has_role(array['admin']::user_role[]));

-- Reference data: read for all, managed by admins (vendors also by Finance/Owner)
create policy departments_read on departments for select to authenticated using (true);
create policy departments_write on departments for all to authenticated
  using (has_role(array['admin', 'owner']::user_role[])) with check (has_role(array['admin', 'owner']::user_role[]));
create policy projects_read on projects for select to authenticated using (true);
create policy projects_write on projects for all to authenticated
  using (has_role(array['admin', 'owner']::user_role[])) with check (has_role(array['admin', 'owner']::user_role[]));
create policy vendors_read on vendors for select to authenticated using (true);
create policy vendors_write on vendors for all to authenticated
  using (has_role(array['admin', 'owner', 'finance']::user_role[])) with check (has_role(array['admin', 'owner', 'finance']::user_role[]));

-- Purchase requests
create policy pr_read on purchase_requests for select to authenticated using (can_view_purchase(id));
create policy pr_insert on purchase_requests for insert to authenticated
  with check (requester_id = auth.uid() and status = 'draft');
-- Requesters edit their own drafts; status itself is guarded by the trigger above
create policy pr_update_draft on purchase_requests for update to authenticated
  using (requester_id = auth.uid() and status in ('draft', 'quote_received'))
  with check (requester_id = auth.uid());
create policy pr_update_admin on purchase_requests for update to authenticated using (has_role(array['admin']::user_role[]));
create policy pr_delete_draft on purchase_requests for delete to authenticated
  using ((requester_id = auth.uid() and status in ('draft', 'quote_received')) or has_role(array['admin']::user_role[]));

-- Items: requester while editable, admins any time
create policy items_read on purchase_items for select to authenticated using (can_view_purchase(purchase_request_id));
create policy items_write on purchase_items for all to authenticated
  using (exists (select 1 from purchase_requests r where r.id = purchase_request_id
          and ((r.requester_id = auth.uid() and r.status in ('draft', 'quote_received')) or has_role(array['admin']::user_role[]))))
  with check (exists (select 1 from purchase_requests r where r.id = purchase_request_id
          and ((r.requester_id = auth.uid() and r.status in ('draft', 'quote_received')) or has_role(array['admin']::user_role[]))));

-- Quotations: requester until approved; Finance and admins can add or select quotes during review
create policy quotes_read on vendor_quotations for select to authenticated using (can_view_purchase(purchase_request_id));
create policy quotes_write on vendor_quotations for all to authenticated
  using (exists (select 1 from purchase_requests r where r.id = purchase_request_id
          and ((r.requester_id = auth.uid() and r.status in ('draft', 'quote_received', 'awaiting_finance'))
               or (has_role(array['finance', 'admin']::user_role[]) and r.status not in ('purchased', 'completed')))))
  with check (exists (select 1 from purchase_requests r where r.id = purchase_request_id
          and ((r.requester_id = auth.uid() and r.status in ('draft', 'quote_received', 'awaiting_finance'))
               or (has_role(array['finance', 'admin']::user_role[]) and r.status not in ('purchased', 'completed')))));

-- Approvals: read-only from the app, written by the workflow functions
create policy approvals_read on approvals for select to authenticated using (can_view_purchase(purchase_request_id));

-- Attachments: anyone who can see the request can add evidence; only admins delete
create policy attachments_read on purchase_attachments for select to authenticated using (can_view_purchase(purchase_request_id));
create policy attachments_insert on purchase_attachments for insert to authenticated
  with check (uploaded_by = auth.uid() and can_view_purchase(purchase_request_id));
create policy attachments_delete on purchase_attachments for delete to authenticated
  using (uploaded_by = auth.uid() or has_role(array['admin']::user_role[]));

-- Labor: everyone sees the site plan; requester edits while "requested", managers run it
create policy labor_read on labor_requests for select to authenticated using (true);
create policy labor_insert on labor_requests for insert to authenticated with check (requested_by = auth.uid() and status = 'requested');
create policy labor_update_requester on labor_requests for update to authenticated
  using (requested_by = auth.uid() and status = 'requested') with check (requested_by = auth.uid() and status in ('requested', 'cancelled'));
create policy labor_update_manager on labor_requests for update to authenticated
  using (has_role(array['general_manager', 'owner', 'admin']::user_role[]));

-- Audit: append-only, never editable
create policy audit_read on audit_events for select to authenticated using (true);
create policy audit_insert on audit_events for insert to authenticated with check (actor_id = auth.uid());

-- Notifications: your own only; rows are created by the triggers above
create policy notifications_read on notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on notifications for delete to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Private attachments bucket: 10 MB, PDF / images / Word / Excel only
--    The app opens files through short-lived signed URLs.
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false)
on conflict (id) do nothing;

update storage.buckets set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
where id = 'attachments';

drop policy if exists "authenticated upload to attachments" on storage.objects;
drop policy if exists "public read attachments" on storage.objects;
drop policy if exists attachments_objects_read on storage.objects;
drop policy if exists attachments_objects_insert on storage.objects;

-- Files live under <purchase_request_id>/..., so access follows the request
create policy attachments_objects_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and can_view_purchase(((storage.foldername(name))[1])::uuid));
create policy attachments_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and can_view_purchase(((storage.foldername(name))[1])::uuid));

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Realtime for the notification bell
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null; when undefined_object then null; end $$;

grant execute on function submit_purchase_request(uuid), decide_purchase_request(uuid, text, text, numeric),
  record_purchase(uuid, numeric), complete_purchase_request(uuid), my_role() to authenticated;
-- Reminders are for pg_cron / the SQL editor only
revoke execute on function send_pending_reminders(int) from public, anon, authenticated;

-- Internal helpers: only callable from the definer functions and triggers above
revoke execute on function notify_user(uuid, text, text, text, text), notify_role(user_role, text, text, text, text, uuid),
  log_audit(text, text, uuid, text, jsonb) from public, anon, authenticated;
