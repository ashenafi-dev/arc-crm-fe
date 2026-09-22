-- Additive migration: attachments (quotations, receipts, invoices, etc).
-- Does NOT drop anything — safe to run on top of your existing seeded data.
-- Run in Supabase SQL Editor after schema.sql has already been applied once.

create type attachment_type as enum ('quotation', 'invoice', 'receipt', 'delivery', 'photo', 'other');

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

alter table purchase_attachments enable row level security;

create policy "authenticated read" on purchase_attachments for select using (auth.role() = 'authenticated');
create policy "authenticated write" on purchase_attachments for all using (auth.role() = 'authenticated');

-- Storage: allow authenticated uploads to the "attachments" bucket, and
-- public read (the bucket itself is public, this makes object listing/select
-- consistent with that).
create policy "authenticated upload to attachments" on storage.objects
  for insert with check (bucket_id = 'attachments' and auth.role() = 'authenticated');

create policy "public read attachments" on storage.objects
  for select using (bucket_id = 'attachments');
