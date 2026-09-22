Yes. I would build a focused, realistic demo in Django, using server-rendered templates and HTMX. Avoid React for this first version. The goal is to impress the client with a complete workflow, not spend weeks building frontend infrastructure.

1. Demo goal

The client should be able to:

Sign in as different roles.
Create a purchase request.
Add quotations and supporting documents.
Submit the request to Finance.
Approve it as Finance, GM, and Owner.
Record the purchase and upload a receipt.
View the complete history.
Create and assign a labor request.
See everything from a management dashboard.

This is enough to make the product feel real.

2. Recommended technology
Component	Choice
Backend	Django 5
UI	Django templates, Bootstrap 5, HTMX
Database	PostgreSQL
Authentication	Django session authentication
Authorization	Role-based permissions
File storage	Google Cloud Storage
Email	Django email backend with Resend or SendGrid
Deployment	Google Cloud Run
Database hosting	Cloud SQL for PostgreSQL
Secrets	Google Secret Manager
Production server	Gunicorn
Static files	WhiteNoise
CI/CD	GitHub Actions or Cloud Build

Google provides an official Django deployment pattern using Cloud Run, Cloud SQL, Secret Manager, Cloud Storage, Artifact Registry, and Cloud Build. Google Cloud Django deployment guide

For the fastest initial demo, you can temporarily use:

SQLite locally
PostgreSQL in production
Local file storage locally
Cloud Storage in production
In-app notifications only
Fake email logging instead of real email delivery
3. System architecture

Keep everything in one Django application and one Cloud Run service.

You do not need microservices, Celery, Redis, React, or a separate API for this demo.

4. Django project structure
architecture_ops/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── local.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── accounts/
├── organizations/
├── procurement/
├── labor/
├── notifications/
├── dashboard/
├── audit/
├── templates/
├── static/
├── media/
├── requirements.txt
├── Dockerfile
├── compose.yaml
├── manage.py
└── .env.example
Django applications
accounts: authentication, users, roles
organizations: departments, projects and vendors
procurement: purchase requests, quotations and approvals
labor: labor requests and assignments
notifications: in-app notifications
dashboard: management metrics and activity
audit: immutable activity history
5. Core database design
User

Use a custom user model from the beginning.

class User(AbstractUser):
    class Role(models.TextChoices):
        EMPLOYEE = "employee", "Employee"
        FINANCE = "finance", "Finance"
        GENERAL_MANAGER = "general_manager", "General Manager"
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Administrator"

    role = models.CharField(max_length=30, choices=Role.choices)
    department = models.ForeignKey(
        "organizations.Department",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
Department
class Department(models.Model):
    name = models.CharField(max_length=150)
    is_active = models.BooleanField(default=True)
Project
class Project(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    client_name = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=255, blank=True)
    budget = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
Vendor
class Vendor(models.Model):
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    services = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
PurchaseRequest
class PurchaseRequest(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        QUOTE_RECEIVED = "quote_received", "Quote Received"
        AWAITING_FINANCE = "awaiting_finance", "Awaiting Finance"
        AWAITING_GM = "awaiting_gm", "Awaiting GM"
        AWAITING_OWNER = "awaiting_owner", "Awaiting Owner"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        PURCHASED = "purchased", "Purchased"
        COMPLETED = "completed", "Completed"

    request_number = models.CharField(max_length=30, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    project = models.ForeignKey(Project, on_delete=models.PROTECT)
    department = models.ForeignKey(Department, on_delete=models.PROTECT)
    requester = models.ForeignKey(User, on_delete=models.PROTECT)
    required_date = models.DateField(null=True, blank=True)
    estimated_amount = models.DecimalField(max_digits=14, decimal_places=2)
    approved_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    actual_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    justification = models.TextField()
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
PurchaseItem

Use separate items so a request can contain multiple materials.

class PurchaseItem(models.Model):
    purchase_request = models.ForeignKey(
        PurchaseRequest,
        related_name="items",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=40)
    estimated_unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )
VendorQuotation
class VendorQuotation(models.Model):
    purchase_request = models.ForeignKey(
        PurchaseRequest,
        related_name="quotations",
        on_delete=models.CASCADE,
    )
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    document = models.FileField(upload_to="quotations/%Y/%m/")
    is_selected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
Approval

Do not store all approvals directly on PurchaseRequest. Use separate records.

class Approval(models.Model):
    class Stage(models.TextChoices):
        FINANCE = "finance", "Finance"
        GM = "gm", "General Manager"
        OWNER = "owner", "Owner"

    class Decision(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    purchase_request = models.ForeignKey(
        PurchaseRequest,
        related_name="approvals",
        on_delete=models.CASCADE,
    )
    stage = models.CharField(max_length=20, choices=Stage.choices)
    decision = models.CharField(
        max_length=20,
        choices=Decision.choices,
        default=Decision.PENDING,
    )
    reviewer = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    comments = models.TextField(blank=True)
    decided_at = models.DateTimeField(null=True, blank=True)
Attachment
class PurchaseAttachment(models.Model):
    class Type(models.TextChoices):
        QUOTATION = "quotation", "Quotation"
        INVOICE = "invoice", "Invoice"
        RECEIPT = "receipt", "Receipt"
        DELIVERY = "delivery", "Delivery Document"
        PHOTO = "photo", "Photo"
        OTHER = "other", "Other"

    purchase_request = models.ForeignKey(
        PurchaseRequest,
        related_name="attachments",
        on_delete=models.CASCADE,
    )
    attachment_type = models.CharField(max_length=20, choices=Type.choices)
    file = models.FileField(upload_to="purchases/%Y/%m/")
    description = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    uploaded_at = models.DateTimeField(auto_now_add=True)
LaborRequest
class LaborRequest(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        REVIEWED = "reviewed", "Reviewed"
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    request_number = models.CharField(max_length=30, unique=True)
    project = models.ForeignKey(Project, on_delete=models.PROTECT)
    requested_by = models.ForeignKey(User, on_delete=models.PROTECT)
    labor_type = models.CharField(max_length=150)
    workers_required = models.PositiveIntegerField()
    location = models.CharField(max_length=255)
    required_at = models.DateTimeField()
    expected_duration_hours = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )
    description = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REQUESTED,
    )
    assigned_to = models.CharField(max_length=255, blank=True)
    management_notes = models.TextField(blank=True)
Notification
class Notification(models.Model):
    user = models.ForeignKey(
        User,
        related_name="notifications",
        on_delete=models.CASCADE,
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    url = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
AuditEvent
class AuditEvent(models.Model):
    actor = models.ForeignKey(
        User,
        null=True,
        on_delete=models.SET_NULL,
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

The application should never allow audit events to be edited through the UI.

6. Purchase workflow implementation

Put workflow logic in a service, not in views or templates.

# procurement/services/workflow.py

from django.db import transaction
from django.utils import timezone

@transaction.atomic
def submit_for_finance(request, actor):
    if request.status not in [
        PurchaseRequest.Status.DRAFT,
        PurchaseRequest.Status.QUOTE_RECEIVED,
    ]:
        raise InvalidTransition("Request cannot be submitted.")

    if not request.quotations.exists():
        raise InvalidTransition("At least one quotation is required.")

    request.status = PurchaseRequest.Status.AWAITING_FINANCE
    request.save(update_fields=["status", "updated_at"])

    Approval.objects.get_or_create(
        purchase_request=request,
        stage=Approval.Stage.FINANCE,
    )

    notify_role(
        role=User.Role.FINANCE,
        title=f"Finance approval required: {request.request_number}",
        url=reverse("procurement:detail", args=[request.pk]),
    )

    record_audit(
        actor=actor,
        action="purchase_submitted",
        instance=request,
        description="Purchase request submitted for Finance review.",
    )

Then implement:

submit_for_finance()
approve_finance()
approve_gm()
approve_owner()
reject_request()
record_purchase()
complete_request()
return_to_requester()
Required transitions
Draft
  ↓
Quote Received
  ↓
Awaiting Finance
  ├── Reject → Rejected
  ↓ Approve
Awaiting GM
  ├── Reject → Rejected
  ↓ Approve
Awaiting Owner
  ├── Reject → Rejected
  ↓ Approve
Approved
  ↓
Purchased
  ↓
Completed

Every transition must:

Validate the current status.
Validate the user’s role.
Update the status inside transaction.atomic().
Create or update the approval record.
Create notifications.
Write an audit event.
7. Permission rules

Create reusable permission functions:

def can_view_purchase(user, purchase):
    if user.role in {"owner", "admin", "finance", "general_manager"}:
        return True

    return (
        purchase.requester_id == user.id
        or purchase.department_id == user.department_id
    )

Examples:

Employee: create and view their own requests.
Finance: review requests awaiting Finance.
GM: review requests awaiting GM.
Owner: approve owner-stage requests and view all metrics.
Admin: manage configuration and users.
Nobody can approve their own request unless the client explicitly permits it.

Enforce permissions in the backend. Hiding a button in the UI is not sufficient.

8. Screens to build
Authentication
Login
Logout
Password change
Demo-role selector, optional
Main dashboard

Cards:

Pending approvals
Requests awaiting my action
Purchases this month
Total approved amount
Active labor requests
Delayed requests

Charts:

Spending by project
Spending by department
Requests by status
Monthly purchasing trend

Recent activity:

New request
Finance approval
GM approval
Purchase completed
Labor assigned
Purchase request screens
Purchase request list
Create request
Request details
Edit draft
Add items
Add quotations
Compare quotations
Submit request
Approve or reject
Record purchase
Upload receipt
Complete request
Activity timeline
Labor screens
Labor request list
Create labor request
Labor request details
Review
Assign
Start work
Complete work
Management screens
Projects
Departments
Vendors
Users
Reports
Audit log
9. Client-demo design

Use a clean dashboard layout:

Dark blue sidebar
White content background
Blue primary actions
Status badges
Large summary cards
Responsive tables
Activity timeline
Mobile-friendly navigation

Example status colors:

Status	Color
Draft	Gray
Awaiting approval	Amber
Approved	Blue
Rejected	Red
Purchased	Purple
Completed	Green

Add these details because they make a demo feel complete:

Company logo placeholder
Request numbers such as PR-2026-0012
Labor numbers such as LR-2026-0004
User avatar initials
Notification bell
Breadcrumbs
Empty states
Confirmation modals
Toast messages
Search and filters
10. Seeded demo data

Create a command:

python manage.py seed_demo

It should create:

Users
employee@demo.ethix.io
finance@demo.ethix.io
gm@demo.ethix.io
owner@demo.ethix.io
admin@demo.ethix.io

Use one shared demo password initially.

Projects
Riverside Office Renovation
Bole Residential Complex
City Center Interior Upgrade
Vendors
Addis Construction Supply
Horizon Electrical
Prime Office Furniture
Metro Plumbing Materials
Requests

Seed approximately:

Two awaiting Finance
One awaiting GM
One awaiting Owner
Two approved
Three completed
One rejected
Three labor requests

This ensures the dashboard looks populated during the demonstration.

11. Demo authentication strategy

For the client demo, provide two options.

Normal login

Give the client:

Owner account:
owner@demo.ethix.io

Employee account:
employee@demo.ethix.io
Role-switching demo mode

You can also add a development-only role switcher:

View as Employee
View as Finance
View as General Manager
View as Owner

Do not implement this as unrestricted impersonation in production. Protect it behind:

DEMO_MODE = env.bool("DEMO_MODE", default=False)
12. Notifications

For version one:

Store notifications in the database.
Display unread count in the navbar.
Mark notifications as read.
Link each notification to the relevant request.
Send email after the database transaction commits.
transaction.on_commit(
    lambda: send_approval_notification(request.pk)
)

Do not add Celery initially. For a demo with a few users, synchronous email is acceptable.

13. File uploads

Allow:

PDF
PNG
JPG
DOCX
XLSX

Apply:

Maximum file size, for example 10 MB
Randomized storage names
MIME validation
Permission checks before download
Private storage for financial documents

Cloud Storage is appropriate for uploaded media, and Google’s Django deployment guide documents using django-storages with a Cloud Storage bucket. Google Cloud Django guide

For the demo, you can use local media in development and Cloud Storage in production.

14. Dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

CMD exec gunicorn config.wsgi:application \
    --bind :${PORT:-8080} \
    --workers 2 \
    --threads 4 \
    --timeout 120
15. Important production settings
DEBUG = False

ALLOWED_HOSTS = [
    ".run.app",
    "demo.ethix.io",
]

CSRF_TRUSTED_ORIGINS = [
    "https://*.run.app",
    "https://demo.ethix.io",
]

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True

Keep secrets outside the source repository. Cloud Run supports exposing Secret Manager values to a service as environment variables or mounted files. Cloud Run secrets documentation

16. Cloud Run deployment

Use one region for Cloud Run, Cloud SQL, and Cloud Storage. For Ethix, us-central1 is reasonable because you already use it.

Enable services
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
Build the container
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/PROJECT_ID/ethix/architecture-ops
Deploy
gcloud run deploy architecture-ops-demo \
  --image us-central1-docker.pkg.dev/PROJECT_ID/ethix/architecture-ops \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT_ID:us-central1:architecture-ops-db \
  --set-env-vars DJANGO_SETTINGS_MODULE=config.settings.production \
  --set-secrets SECRET_KEY=architecture-ops-secret-key:latest \
  --min-instances 0 \
  --max-instances 2 \
  --memory 1Gi \
  --cpu 1

Cloud Run has built-in Cloud SQL connectivity, and Google documents connecting the service to a PostgreSQL instance through the Cloud SQL integration. Cloud SQL and Cloud Run documentation

“Allow unauthenticated” only makes the login screen publicly reachable. The business data remains protected by Django authentication.

17. Database migrations

Do not run migrations every time the web container starts.

For the demo, you can run:

gcloud run jobs create architecture-ops-migrate \
  --image us-central1-docker.pkg.dev/PROJECT_ID/ethix/architecture-ops \
  --region us-central1 \
  --add-cloudsql-instances PROJECT_ID:us-central1:architecture-ops-db \
  --set-env-vars DJANGO_SETTINGS_MODULE=config.settings.production \
  --set-secrets SECRET_KEY=architecture-ops-secret-key:latest \
  --command python \
  --args manage.py,migrate

Execute it:

gcloud run jobs execute architecture-ops-migrate \
  --region us-central1 \
  --wait

Create a separate seed job or temporarily run:

python manage.py seed_demo

through the same job mechanism.

18. Custom domain

Initially send the Cloud Run URL:

https://architecture-ops-demo-xxxxx-uc.a.run.app

After confirming the demo works, use:

demo.ethix.io

Keep the client’s name out of the public hostname until they agree.

19. Development order
Day 1
Set up Django
Custom user model
Authentication
Base dashboard layout
Projects, departments, vendors
Seed data
Day 2
Purchase request models
Create and edit request
Items and quotation uploads
Request list and details
Day 3
Approval workflow
Permission checks
Finance, GM and Owner queues
Approve and reject actions
Audit events
Day 4
Notifications
Purchase completion
Receipts and evidence
Activity timeline
Day 5
Labor requests
Assignment workflow
Management dashboard
Filters and charts
Day 6
UI polishing
Mobile responsiveness
Error handling
Demo accounts
Testing
Day 7
Deploy
Seed production demo data
Record a short walkthrough
Send the link to the client

A strong demo is realistic in approximately 5–7 focused development days. It should not take the full 6–8 weeks proposed for the client-ready pilot.

20. Coding-agent prompt

Use this as the initial prompt for Codex or another coding agent:

B
