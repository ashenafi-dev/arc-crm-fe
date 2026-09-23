# ArchOps showcase data

The comprehensive seed in `supabase/showcase-seed.sql` creates a presentation-ready operating history without deleting manually entered or client data.

## What it creates

- 5 polished demo identities covering Employee, Finance, General Manager, Owner, and Admin
- 10 departments, including one archived department
- 8 projects across several Ethiopian locations, including one completed/archived project
- 12 vendors across the main construction supply categories, including one inactive vendor
- 84 purchase requests across every workflow state
- 252 purchase line items and 243 competitive quotations
- Complete Finance, GM, and Owner approval histories where applicable
- 42 labor requests across every labor state and five months of staffing history
- A year of purchase history, with denser data in the last six months
- Current-week request activity, a populated 12-day activity heatmap, notification history, overdue work, and stalled approvals

Dates are calculated when the script runs. That keeps the 7-day request chart, 12-day activity heatmap, current-month KPIs, and 6-month spend trend populated even when the demo is refreshed later.

## Run order

For an existing pilot database that already has the five demo users and migration `002_pilot_features.sql`, open Supabase **SQL Editor**, paste the entire contents of `supabase/showcase-seed.sql`, and select **Run**.

For a fresh database:

1. Run `supabase/schema.sql` in the SQL Editor.
2. Create the five Auth users listed in `supabase/seed.sql`. You can use Supabase Authentication or `node supabase/create-demo-users.mjs` after temporarily supplying its service-role key.
3. Run `supabase/migrations/002_pilot_features.sql`.
4. Run `supabase/showcase-seed.sql`.

The final query prints dataset counts. The expected core totals are:

| Dataset | Rows |
| --- | ---: |
| Purchase requests | 84 |
| Purchase items | 252 |
| Vendor quotations | 243 |
| Labor requests | 42 |

Audit totals vary by the workflow states represented, but should be several hundred rows.

## Safety and refresh behavior

The script is transactional and aborts with a clear message if migration `002` or any required demo identity is missing. It uses `DEMO-PR-` and `DEMO-LR-` request numbers, deterministic showcase UUIDs, and `archops-showcase-v1` audit metadata. On a rerun, only those showcase records are replaced.

Projects, vendors, and departments are updated in place so links remain stable. Records created manually through the product are not cleared.

## Deliberate exclusion: fake attachments

The seed does not create attachment rows because the attachment bucket is private and each database row must point to a real Storage object. Placeholder rows would look convincing but fail when clicked during a demonstration. Upload a few genuine quotation, invoice, receipt, and delivery files through the UI if document-opening is part of the pitch.
