export type Role = 'employee' | 'finance' | 'general_manager' | 'owner' | 'admin'

export const ROLE_LABELS: Record<Role, string> = {
  employee: 'Employee',
  finance: 'Finance',
  general_manager: 'General Manager',
  owner: 'Owner',
  admin: 'Administrator',
}

export type RequestStatus =
  | 'draft'
  | 'quote_received'
  | 'awaiting_finance'
  | 'awaiting_gm'
  | 'awaiting_owner'
  | 'approved'
  | 'rejected'
  | 'purchased'
  | 'completed'

export const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Draft',
  quote_received: 'Quote Received',
  awaiting_finance: 'Awaiting Finance',
  awaiting_gm: 'Awaiting GM',
  awaiting_owner: 'Awaiting Owner',
  approved: 'Approved',
  rejected: 'Rejected',
  purchased: 'Purchased',
  completed: 'Completed',
}

export const STATUS_COLORS: Record<RequestStatus, string> = {
  draft: 'var(--status-draft)',
  quote_received: 'var(--status-amber)',
  awaiting_finance: 'var(--status-amber)',
  awaiting_gm: 'var(--status-amber)',
  awaiting_owner: 'var(--status-amber)',
  approved: 'var(--status-blue)',
  rejected: 'var(--status-red)',
  purchased: 'var(--status-purple)',
  completed: 'var(--status-green)',
}

export type ApprovalStage = 'finance' | 'gm' | 'owner'
export type ApprovalDecision = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  department: string | null
  avatar_initials: string
}

export interface Project {
  id: string
  name: string
  code: string
  client_name: string | null
  is_active: boolean
}

export interface Vendor {
  id: string
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  services: string | null
}

export interface PurchaseItem {
  id: string
  purchase_request_id: string
  name: string
  quantity: number
  unit: string
  estimated_unit_price: number | null
}

export interface VendorQuotation {
  id: string
  purchase_request_id: string
  vendor_id: string
  vendor?: Vendor
  amount: number
  notes: string | null
  is_selected: boolean
  created_at: string
}

export interface Approval {
  id: string
  purchase_request_id: string
  stage: ApprovalStage
  decision: ApprovalDecision
  reviewer_id: string | null
  reviewer?: Profile
  comments: string | null
  decided_at: string | null
}

export interface PurchaseRequest {
  id: string
  request_number: string
  title: string
  description: string
  project_id: string
  project?: Project
  department: string
  requester_id: string
  requester?: Profile
  required_date: string | null
  estimated_amount: number
  approved_amount: number | null
  actual_amount: number | null
  justification: string
  status: RequestStatus
  rejection_reason: string | null
  created_at: string
  updated_at: string
  items?: PurchaseItem[]
  quotations?: VendorQuotation[]
  approvals?: Approval[]
}

export type LaborStatus = 'requested' | 'reviewed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

export const LABOR_STATUS_LABELS: Record<LaborStatus, string> = {
  requested: 'Requested',
  reviewed: 'Reviewed',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export interface LaborRequest {
  id: string
  request_number: string
  project_id: string
  project?: Project
  requested_by: string
  requester?: Profile
  labor_type: string
  workers_required: number
  location: string
  required_at: string
  description: string
  status: LaborStatus
  assigned_to: string | null
  created_at: string
}

export interface AuditEvent {
  id: string
  actor_id: string | null
  actor?: Profile
  action: string
  entity_type: string
  entity_id: string
  description: string
  created_at: string
}
