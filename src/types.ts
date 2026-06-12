// Shared TypeScript interfaces mirroring the backend API responses.

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
}

export interface CompanyRef {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  size: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  leadSource: string | null;
  assignedUserId: string | null;
  createdAt: string;
  _count?: { contacts: number; leads: number };
  contacts?: Contact[];
  leads?: Lead[];
  assignedUser?: { id: string; name: string } | null;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  companyId: string | null;
  notes: string | null;
  leadStatus: string;
  assignedUserId: string | null;
  createdAt: string;
  company?: Company | CompanyRef | null;
  leads?: Lead[];
}

export interface ContactRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Lead {
  id: string;
  name: string;
  companyId: string | null;
  contactId: string | null;
  source: string | null;
  status: string;
  estimatedValue: number | null;
  nextFollowUp: string | null;
  notes: string | null;
  assignedUserId: string | null;
  createdAt: string;
  company?: Company | CompanyRef | null;
  contact?: Contact | ContactRef | null;
  assignedUser?: { id: string; name: string } | null;
  activities?: Activity[];
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  leadId: string | null;
  userId: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
  lead?: { id: string; name: string } | null;
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

export interface FormDef {
  id: string;
  name: string;
  fields: FormField[];
  redirectUrl: string | null;
  confirmationMessage: string | null;
  notifyEmail: string | null;
  spamProtection: boolean;
  createdAt: string;
  _count?: { submissions: number };
  submissions?: FormSubmission[];
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  source: string | null;
  createdAt: string;
}

export interface PublicForm {
  id: string;
  name: string;
  fields: FormField[];
  confirmationMessage: string | null;
  redirectUrl: string | null;
}

export interface Webhook {
  id: string;
  url: string;
  event: string;
  active: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  scopes: string;
  lastUsed: string | null;
  createdAt: string;
}

export interface PipelineEntry {
  status: string;
  count: number;
  value: number;
}

export interface DashboardStats {
  totalLeads: number;
  newToday: number;
  openOpps: number;
  wonThisMonth: number;
  wonValue: number;
  totalCompanies: number;
  totalContacts: number;
  pipeline: PipelineEntry[];
  recentActivity: Activity[];
}

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Won',
  'Lost',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
