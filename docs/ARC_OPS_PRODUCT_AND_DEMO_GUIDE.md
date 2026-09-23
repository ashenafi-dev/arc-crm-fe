# ArchOps by Ethix

## Product, Investor, Sales, and Demonstration Guide

**Document status:** Internal presentation guide  
**Reviewed:** September 23, 2026  
**Repository:** ARC CRM  
**Current package version:** `0.0.0`  
**Recommended presentation label:** `Pilot Demo v0.1`  
**Audience:** Investors, architecture-firm owners, operational managers, pilot decision-makers, and the Ethix team

---

## 1. Executive summary

ArchOps is a focused operations platform for architecture and construction-adjacent firms. It gives the organization one controlled record for purchase requests, quotations, approvals, supporting documents, labor requests, notifications, and management visibility.

The product replaces a fragmented process built around phone calls, chat messages, screenshots, and manual follow-ups. A request enters once, moves through the correct decision-makers, retains its evidence, and remains visible from request to completion.

### The one-sentence pitch

> ArchOps helps architecture firms control every purchase and labor request from first request to final sign-off, with the evidence, responsibility, and status visible in one place.

### The investor version

> ArchOps converts an informal, person-dependent operating process into a repeatable digital control system. It begins with procurement and labor—the daily workflows where delays, missing evidence, and unclear responsibility cost firms money—and creates a foundation for a broader vertical operations platform.

### What ArchOps is not

ArchOps is not currently an accounting package, payroll platform, bank, inventory system, tax product, or generic ERP. That boundary is a strength: the pilot solves a specific operational problem without asking the client to replace every business system at once.

---

## 2. The problem it solves

Architecture firms coordinate purchases, approvals, and site labor across offices, projects, vendors, and job sites. When this work lives in calls and messaging apps:

- requests are incomplete or repeated;
- quotations and receipts become difficult to find;
- approvers do not know what is waiting for them;
- requesters repeatedly call for status updates;
- management cannot see delayed or exposed spend;
- vendor history is lost between individual purchases;
- responsibility becomes unclear when something goes wrong; and
- reporting depends on manual reconstruction.

ArchOps creates a single operating record with explicit stages, owners, evidence, and timestamps.

---

## 3. Product promise

ArchOps should be sold around three promises:

1. **Control:** the right person reviews the right request in the right sequence.
2. **Visibility:** owners and managers can see what is pending, delayed, approved, purchased, and active on site.
3. **Evidence:** quotations, decisions, receipts, and delivery documents stay attached to the transaction.

Avoid selling it as “another dashboard.” The dashboard is the result; the product value comes from the controlled workflow and the reliable data it creates.

---

## 4. Current product status

### Verification performed

The current application was reviewed against the September 21, 2026 pilot proposal and checked through source code, database migrations, production build, linting, dependency audit, and a live read-only browser session using the Owner demo role.

Verified routes:

- `/dashboard`
- `/requests`
- `/labor`
- `/vendors`
- `/audit`
- `/admin/projects`
- `/account`

All verified routes returned successfully, rendered meaningful content, and produced no browser runtime errors or framework error overlays.

The verification did not perform destructive live actions such as approving, deleting, or changing production-like records. Mutation behavior was assessed from the UI handlers, Supabase policies, triggers, and workflow functions.

### Readiness language

Use these labels consistently:

- **Implemented:** present in the product and connected to data.
- **Pilot-ready:** suitable for a controlled demonstration or selected-user pilot.
- **Needs hardening:** functionally present, but requires security, integrity, automation, or operational work before production use.
- **Not implemented:** promised or desirable behavior that is not present in the current codebase.
- **Future phase:** intentionally outside the pilot.

### Overall assessment

The product is visually strong and substantially implements the proposed core workflow. It is **demo-ready** and close to a controlled pilot, but it is **not yet production-ready**. The remaining work is mostly operational hardening and promise alignment rather than a redesign.

---

## 5. Complete operation catalogue

## 5.1 Authentication and account operations

| Operation | Who | Status | Notes |
|---|---|---:|---|
| Sign in with email and password | All users | Implemented | Supabase authentication |
| Quick role-based demo login | Demo users | Implemented | Employee, Finance, GM, Owner, and Admin |
| Protect internal routes | Authenticated users | Implemented | Unauthenticated users are redirected to sign-in |
| Sign out | All users | Implemented | Available from navigation and account screen |
| View own profile, role, and department | All users | Implemented | Account screen |
| Change display name | All users | Implemented | Updates initials as well |
| Change password | All users | Implemented | Minimum eight characters in the UI |
| Invite or create a user | Administrator | Needs hardening | Currently performed through Supabase Auth, not inside ArchOps |
| Reset a forgotten password | All users | Not implemented | No recovery flow in the current UI |

## 5.2 Purchase request operations

| Operation | Who | Status | Notes |
|---|---|---:|---|
| Create a purchase request | Authenticated requester | Implemented | Project, title, department, description, required date, and justification |
| Add multiple line items | Requester | Implemented | Quantity, unit, price, and specifications |
| Save a draft | Requester | Implemented | Server-generated request number |
| Edit an eligible draft | Requester | Implemented | Draft and returned/quote-received requests |
| Delete an eligible draft | Requester/Admin | Implemented | Cascades related records |
| Search requests | Authorized viewers | Implemented | Search state is stored in the URL |
| Filter by workflow status | Authorized viewers | Implemented | All, new, review, approved, completed, and rejected groupings |
| View a request detail record | Authorized viewers | Implemented | Role/department visibility enforced through RLS |
| View monetary summary | Authorized viewers | Implemented | Estimated, approved, and actual values |
| View workflow timeline | Authorized viewers | Implemented | Approval stage and reviewer information |

## 5.3 Quotations and vendor selection

| Operation | Who | Status | Notes |
|---|---|---:|---|
| Add one or more vendor quotations | Requester/Finance/Admin | Implemented | Amount, validity, notes, and optional file |
| Compare quotation amounts | Authorized viewers | Implemented | Quotes are sorted and displayed together |
| Select a preferred quotation | Requester/Finance/Admin | Needs hardening | UI works; database operation should be atomic and uniquely constrained |
| Remove quotations while editable | Authorized editor | Implemented | Governed by request status and role policies |
| View vendor pricing history | Vendor-authorized roles | Implemented | Includes competing amounts per request |
| View vendor purchase wins | Vendor-authorized roles | Implemented | Purchased and completed transactions |

## 5.4 Purchase approval workflow

The implemented path is:

> Draft → Quote Received → Awaiting Finance → Awaiting GM → Awaiting Owner → Approved → Purchased → Completed

| Operation | Who | Status | Notes |
|---|---|---:|---|
| Submit a quoted request | Requester/Admin | Implemented | At least one quotation is required |
| Finance approval | Finance | Implemented | Server-side role check and self-approval protection |
| General Manager approval | General Manager | Implemented | Must occur after Finance |
| Owner approval | Owner | Implemented | Final approval stage |
| Add approval comments | Current approver | Implemented | Stored with the approval |
| Set approved amount | Current approver | Implemented | Can use selected quotation as default |
| Reject a request | Current approver | Implemented | A reason is required |
| Return a request for changes | Current approver | Implemented | A reason is required; chain restarts after resubmission |
| Prevent self-approval | Approvers | Implemented | Enforced by a database workflow function |
| Record an approved purchase | Finance/Owner/Admin | Implemented | Captures actual paid amount |
| Upload proof of purchase | Finance/Owner/Admin | Implemented | Receipt may be added while recording purchase |
| Mark purchased request complete | Requester/Finance/Owner/Admin | Implemented | Closes the workflow |
| Guarantee one selected quotation | System | Needs hardening | Add a partial unique database index and transactional RPC |
| Guarantee atomic item replacement | System | Needs hardening | Delete-and-reinsert currently spans separate client operations |

## 5.5 Document operations

Supported document categories:

- quotation;
- invoice;
- receipt;
- delivery record;
- photo; and
- other evidence.

| Operation | Who | Status | Notes |
|---|---|---:|---|
| Upload approved file types | Request viewers | Implemented | PDF, images, Word, and Excel; 10 MB limit |
| Store files in a private bucket | System | Implemented | Private Supabase Storage bucket |
| Open a file through a signed URL | Authorized viewers | Implemented | Five-minute signed URL |
| Associate file metadata with a request | System | Implemented | Filename, type, size, uploader, and date |
| Clean up a file after metadata failure | System | Needs hardening | Failed metadata insertion can leave an orphan object |
| Delete an attachment from the UI | Authorized user | Not implemented | Database row policy exists, but no complete storage/UI deletion flow |

## 5.6 Notifications

| Operation | Who | Status | Notes |
|---|---|---:|---|
| Receive in-app workflow notifications | Relevant users | Implemented | Created by database triggers |
| Receive notifications in real time | Signed-in user | Implemented | Supabase Realtime subscription |
| Open the related record | Notification recipient | Implemented | Notification links route to the relevant request |
| Mark one notification read | Notification recipient | Implemented | Own notifications only |
| Mark all notifications read | Notification recipient | Implemented | Own notifications only |
| Dismiss one or all notifications | Notification recipient | Implemented | Own notifications only |
| Generate delayed-approval reminders | System | Partially implemented | Database reminder function exists |
| Run reminders automatically | System | Not implemented | No confirmed scheduler/cron configuration in the repository |
| Send email notifications | Relevant users | Not implemented | Included in the proposal but no email provider or sending code exists |
| Send WhatsApp or SMS notifications | Relevant users | Future phase | Correctly outside the pilot |

## 5.7 Labor request operations

The implemented path is:

> Requested → Reviewed → Assigned → In Progress → Completed

Cancellation is available outside the forward path.

| Operation | Who | Status | Notes |
|---|---|---:|---|
| Create a labor request | Authenticated requester | Implemented | Project, trade, worker count, location, schedule, duration, and work details |
| Choose common labor types | Requester | Implemented | Includes laborers, electricians, plumbers, carpenters, masons, and welders |
| Filter labor requests | Authorized users | Implemented | Active, requested, in progress, completed, and all |
| Assign a crew lead | GM/Owner/Admin | Implemented | Available from list and detail screens |
| Add management notes | GM/Owner/Admin | Implemented | Visible to requester |
| Advance through labor stages | GM/Owner/Admin | Needs hardening | UI follows the sequence, but the database permits arbitrary manager transitions |
| Cancel an unreviewed request | Requester | Implemented | Available before management review |
| Cancel a managed request | GM/Owner/Admin | Implemented | Confirmation required |
| View labor timeline and history | Authorized users | Implemented | Built from audit events |
| Notify requester of labor changes | Requester | Implemented | In-app trigger notifications |

## 5.8 Vendor operations

| Operation | Who | Status | Notes |
|---|---|---:|---|
| View vendor directory | Admin/Owner/Finance | Implemented | Navigation is role-scoped |
| Filter vendors by service | Admin/Owner/Finance | Implemented | Derived from vendor service tags |
| Add a vendor | Admin/Owner/Finance | Implemented | Contact, services, address, and status |
| Edit a vendor | Admin/Owner/Finance | Implemented | Includes active/inactive state |
| View vendor contact information | Admin/Owner/Finance | Implemented | Phone, email, address, and services |
| View pricing history | Admin/Owner/Finance | Implemented | Quote history with comparisons |
| View total purchased and purchase history | Admin/Owner/Finance | Implemented | Uses actual, approved, or quoted value |
| View related quotation files | Admin/Owner/Finance | Implemented | Files from requests won by vendor |
| Delete a vendor | Admin/Owner/Finance | Not implemented | Deactivation is the safer supported operation |
| Show spend by vendor on management dashboard | Management | Not implemented | Proposal expectation; available indirectly on vendor detail only |

## 5.9 Management dashboard operations

The current Owner dashboard is a strong demonstration asset.

Implemented views include:

- role-specific “Awaiting my action” queue;
- pending approvals and value in review;
- purchases during the current month;
- total approved value;
- active labor and total workers requested;
- overdue and stalled requests;
- seven-day request volume;
- two-week team activity heatmap;
- workflow pipeline for new, in-review, approved, and completed work;
- spend by project;
- spend by department;
- request distribution by status;
- approved-versus-paid purchasing trend over six months; and
- active labor cards.

Current limitation: dashboard calculations happen in the browser after loading visible request records. This is appropriate for a pilot dataset but should move to database views or reporting RPCs as data volume grows.

## 5.10 Audit operations

| Operation | Who | Status | Notes |
|---|---|---:|---|
| View global audit activity | Admin/Owner | Implemented | Navigation is restricted by role |
| Group activity by date | Admin/Owner | Implemented | Today, yesterday, or calendar date |
| Link events to purchase/labor records | Admin/Owner | Implemented | Direct navigation from activity |
| Record approval decisions and amounts | System | Implemented | Database workflow functions |
| Record labor creation/transitions | System | Implemented | Database triggers |
| Prevent editing/deleting audit entries | System | Implemented | Append-only table policy |
| Prevent fabricated client audit entries | System | Needs hardening | Authenticated users can currently insert arbitrary self-attributed events |
| Record every important operation | System | Partially implemented | Uploads, quote selection, and several admin changes are not comprehensively audited |
| Search/filter/export the audit log | Admin/Owner | Not implemented | Current page shows the latest 100 events |

## 5.11 Administration operations

| Operation | Who | Status | Notes |
|---|---|---:|---|
| View users | Admin | Implemented | Search and role filters |
| Change user name, role, and department | Admin | Implemented | Role guard exists at database level |
| Create/edit/archive projects | Admin/Owner | Implemented | Includes code, client, location, and budget |
| Show spend against project budget | Admin/Owner | Implemented | Derived from request values |
| Create/edit/deactivate departments | Admin/Owner | Implemented | Safer than hard deletion when referenced |
| Create/edit/deactivate vendors | Admin/Owner/Finance | Implemented | Role-scoped |
| Configure approval stages | Admin | Not implemented | Current three-stage workflow is fixed in SQL |
| Configure monetary approval thresholds | Admin | Not implemented | Mentioned as discoverable in proposal, not implemented |
| Configure notification timing | Admin | Not implemented | Reminder function accepts hours, but there is no settings screen |

---

## 6. Pilot proposal coverage

| Proposal commitment | Current result | Presentation guidance |
|---|---|---|
| Users and role-based access | Implemented; needs one important RLS hardening fix | Demonstrate roles, but do not call production security complete |
| Projects and vendor records | Implemented | Safe to showcase |
| Purchase requests and approval workflow | Implemented and strong | Make this the central demo story |
| Quotation and evidence attachments | Implemented; deletion/cleanup needs hardening | Showcase uploads and signed access |
| In-application notifications | Implemented | Showcase notification bell and role queue |
| Email notifications | Not implemented | State honestly as pilot completion work |
| Purchase confirmation and history | Implemented | Showcase actual amount, receipt, and completion |
| Basic labor requests and assignments | Implemented; transition enforcement needs hardening | Showcase after procurement |
| Management dashboard | Implemented and visually strong | Open the signed-in demo here |
| Spend by project and department | Implemented | Safe to showcase |
| Spend by vendor | Not on dashboard | Show vendor-detail history instead; list dashboard view as near-term work |
| Pending-action reminders | Function exists; scheduling not confirmed | Do not claim reminders are automatically running |
| Responsive browser experience | Implemented in layout | Perform a mobile regression pass before client handover |
| Complete audit history | Partially implemented | Say “workflow audit history,” not “every system action,” until hardened |

---

## 7. Production blockers and completion plan

These are not optional polish items. They protect the credibility of the product’s central promise.

### P0 — complete before a real client pilot

1. **Restrict self-profile updates.** A user can currently change more profile columns than the account UI exposes, including department. Because department helps determine request visibility, self-service database updates must be limited to safe fields such as name and initials.
2. **Enforce labor transitions on the server.** Managers should not be able to skip directly from Requested to Completed or rewrite ownership fields through the API.
3. **Protect audit integrity.** Remove general client insertion into `audit_events`; create audit entries only through trusted workflow functions and triggers.
4. **Make quotation selection atomic.** Use a database function and a unique constraint so each request has at most one selected quotation.
5. **Make document attachment creation recoverable.** If the metadata insert fails, delete the uploaded object; add a complete authorized deletion path.
6. **Configure and verify email notifications or revise the accepted pilot scope.** The proposal explicitly includes email.
7. **Schedule reminder automation.** Configure Supabase Cron or an equivalent scheduled job and monitor failures.

### P1 — complete before broad rollout

1. Add automated workflow, RLS, and browser tests.
2. Audit quotation changes, file uploads/deletions, vendor edits, project edits, department edits, and role changes.
3. Add password recovery and controlled in-app user invitation.
4. Add audit search, filtering, pagination, and export.
5. Move dashboard aggregation into database views/RPCs for scale and consistent reporting.
6. Add error monitoring, operational logs, backup/restore documentation, and a support runbook.
7. Split the current production JavaScript bundle; the present bundle is approximately 1.2 MB before gzip.
8. Replace the default Vite README with setup, migration, deployment, demo reset, and support instructions.

### P2 — validated future improvements

1. Configurable approval thresholds and optional approval stages.
2. Dashboard spend by vendor.
3. CSV/PDF reporting exports.
4. Accounting integration after the workflow data is trusted.
5. WhatsApp/SMS only when a client confirms it will materially reduce response time.

---

## 8. Recommended showcase feature: Decision Impact

### Recommendation

Add one compact **Decision Impact** panel to the management dashboard after the P0 work is complete.

It should show:

- **Value waiting for approval:** total estimated or approved value currently in review;
- **Median approval cycle:** median time from submission to final approval;
- **Overdue exposure:** value of open requests past their required date or stalled over 48 hours; and
- **Quotation spread:** difference between selected and alternative quotations, labelled as variance—not guaranteed savings.

### Why this deserves implementation

The current dashboard proves that the product records activity. Decision Impact would prove why that activity matters commercially. It gives management an immediate answer to four investor/client questions:

1. How much money is waiting on a decision?
2. How quickly are decisions being made?
3. How much work or spend is at risk of delay?
4. Are quotations being compared rather than accepted blindly?

All four measures can be derived from data ArchOps already captures. No accounting integration, AI model, or new operational workflow is required.

### Guardrails

- Do not label quotation difference as “savings” unless a defensible baseline is agreed.
- Do not invent “hours saved” without before-and-after measurement.
- Define the start and end timestamps for approval-cycle reporting.
- Exclude drafts from approval-time calculations.
- Make every metric clickable so management can inspect the underlying records.

### Why not add AI yet

An AI assistant would be visually fashionable but would weaken this pilot’s story. The strongest immediate value is control, evidence, and measurable decision speed. Add AI later only for a proven task such as summarizing a long request, detecting missing evidence, or explaining why a request is delayed.

---

## 9. Domain and product naming recommendation

### Recommended public product name

**ArchOps by Ethix**

Why:

- short enough to remember and say in a meeting;
- directly connects architecture with operations;
- matches the current application branding;
- broader than procurement, leaving room for labor and future modules; and
- keeps Ethix visible as the builder and commercial partner.

### Domain shortlist

Preferred structure:

- marketing site: `archops.africa`
- application: `app.archops.africa`

Alternatives:

- `archops.et` — strong local identity if registration eligibility and availability work;
- `usearchops.com` — clear global fallback;
- `getarchops.com` — campaign-friendly fallback;
- `ethixops.com` — strongest if Ethix plans several industry-specific operations products.

Domain availability, trademark conflict, and social handles must be checked immediately before purchase. Do not print a domain in investor material until it is registered and connected.

### Suggested tagline

> Every request. Every approval. One operational record.

The landing page’s existing “Every spend. Signed off.” remains an excellent procurement-specific headline.

---

## 10. Investor and sales meeting flow

## 10.1 Before the meeting

- Use a dedicated demo environment, never live client data.
- Confirm all five demo roles can sign in.
- Reset the demo dataset to a known state.
- Keep one request at each important stage.
- Prepare one request with three quotations and supporting documents.
- Prepare one request awaiting Finance, one awaiting GM, and one awaiting Owner.
- Prepare one approved request ready to record as purchased.
- Prepare one active labor request with a crew lead.
- Confirm notification counts, audit events, charts, and dates look credible.
- Use realistic currency and labels for the target client; the current demo uses `$`.
- Close unrelated browser tabs and disable personal notifications.
- Have a PDF or screenshots available in case venue connectivity fails.

## 10.2 Recommended 12-minute demonstration

### Minute 0–1: establish the pain

Open with the current operating reality:

> “A purchase should be a controlled business decision, but today the request, quote, approval, receipt, and status often live in five different conversations.”

Do not begin with technical architecture.

### Minute 1–2: show the public story

Use the landing page to establish:

- the three-stage approval path;
- the five operating roles;
- the before-versus-after transformation; and
- the promise of one auditable record.

### Minute 2–4: open the Owner dashboard

Point out, in this order:

1. what is waiting for the Owner now;
2. total value currently in review;
3. delayed requests;
4. spend by project and department; and
5. active labor on site.

The message is: management does not need to call five people to understand the day.

### Minute 4–8: follow one purchase

Use a prepared request and show:

1. business need, project, department, and required date;
2. line items and estimated value;
3. multiple vendor quotations and the selected quotation;
4. attached evidence;
5. Finance and GM decisions already recorded;
6. Owner approval or rejection controls;
7. notification routing; and
8. purchase amount, receipt, and final completion.

If performing a live approval, rehearse it and keep a backup request at the next stage.

### Minute 8–9: show accountability

Open the workflow timeline and Audit Log. Explain that the value is not merely knowing the current status; it is knowing who acted, when, and on what evidence.

Use the precise phrase **workflow audit history** until the audit hardening work is complete.

### Minute 9–10: show labor

Show a labor request with project, trade, worker count, schedule, location, duration, assignment, management notes, and progress timeline.

The message is that the platform is already expanding from spend control into operational coordination.

### Minute 10–11: show vendor memory

Open a vendor record and show its quotation history, competing prices, purchases won, purchased total, and related quotation files.

The message is that each transaction makes future buying decisions better.

### Minute 11–12: close with expansion, not feature clutter

> “The pilot proves one controlled operational loop. Once the firm trusts that data, Ethix can add configurable authority limits, reporting, integrations, and additional operating modules without rebuilding the foundation.”

Then ask for a concrete next step: pilot sponsor, selected users, workflow validation date, and success criteria.

---

## 11. Questions to ask the client or investor

### Discovery questions

- Which purchases require Finance, GM, and Owner approval today?
- Do approval levels change by amount, department, or project?
- What is the most common reason a request is delayed?
- What evidence is mandatory before approval and before payment?
- Who should see requests across departments?
- When should a delayed request trigger a reminder or escalation?
- Which labor transitions require an explicit sign-off?
- Which currency and fiscal reporting periods are required?
- Is email sufficient for the pilot, or is WhatsApp operationally essential?
- What measurable outcome would make the pilot successful after 30 or 60 days?

### Recommended pilot success measures

- percentage of pilot requests created inside ArchOps;
- percentage of submitted requests with complete quotation evidence;
- median time spent at each approval stage;
- number and value of overdue requests;
- percentage of purchases with receipt/delivery evidence;
- reduction in manual status-chasing messages;
- active weekly users by role; and
- user-reported confidence in finding the current status and evidence.

---

## 12. Objection handling

### “We already use WhatsApp.”

WhatsApp is useful for conversation, but it is not a controlled transaction record. ArchOps does not need to eliminate conversation; it ensures the final request, evidence, decision, and status remain structured and retrievable.

### “Can this replace our accounting system?”

Not in the pilot, and it should not claim to. ArchOps controls the operational journey before and around the accounting entry. A later integration can pass approved purchase data to accounting once the workflow is validated.

### “Why not buy a large ERP?”

An ERP may cover more modules, but it usually requires broader process change, configuration, training, and cost. ArchOps begins with the firm’s actual bottleneck and can prove value quickly.

### “Is this only for one architecture firm?”

The first pilot is intentionally specific, but the workflow pattern—request, evidence, staged decision, purchase, and confirmation—applies to many project-based professional and construction businesses. The pilot validates the repeatable core.

### “Is it secure?”

The product uses authenticated access, role-aware policies, private document storage, and signed links. Before real client data is admitted, the documented P0 authorization and audit hardening must be completed and tested.

---

## 13. Version and release plan

The repository currently reports version `0.0.0`, which is a scaffold version and should not appear in client-facing materials.

### Recommended release labels

| Version | Meaning | Exit criteria |
|---|---|---|
| `0.1.0` Pilot Demo | Investor/client demonstration | Current UI, stable demo data, rehearsed flow, honest gap list |
| `0.2.0` Controlled Pilot | Selected real users and non-critical data | P0 fixes, email/reminder decision, automated core tests, operational runbook |
| `0.3.0` Pilot Acceptance | Agreed pilot scope demonstrated | Client testing complete, critical pilot issues resolved, handover material ready |
| `1.0.0` Production | Supported commercial deployment | Security review, backups, monitoring, recovery, support terms, and production acceptance |

Version numbers should describe readiness, not visual polish.

---

## 14. Scope boundaries for the meeting

### Included in the pilot story

- role-based users;
- projects, departments, and vendors;
- purchase requests and staged approval;
- quotation comparison;
- private supporting documents;
- purchase confirmation;
- in-app notifications;
- basic labor requests and assignments;
- management dashboard; and
- workflow audit history.

### Do not imply these are included today

- accounting, payroll, or tax processing;
- bank or payment execution;
- inventory or warehouse management;
- native iOS or Android apps;
- WhatsApp or SMS integration;
- advanced data migration;
- arbitrary workflow configuration;
- automated email until it is implemented and verified;
- AI decision-making; or
- formal financial statements.

---

## 15. Final meeting message

The strongest ArchOps story is not “we built many screens.” It is:

> Ethix has turned a fragmented approval process into one visible, evidence-backed operating loop. The pilot already shows who needs to act, what money is waiting, what is delayed, what was approved, what was purchased, and what is happening on site. The next step is to harden the controls, validate the workflow with real users, and measure the operational improvement.

That is a credible pilot, a clear client benefit, and a defensible foundation for a broader product.
