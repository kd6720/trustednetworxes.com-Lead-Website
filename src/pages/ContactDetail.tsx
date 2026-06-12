import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  Mail,
  Phone,
  Smartphone,
  Briefcase,
  Building2,
  Target,
  Trash2,
  Pencil,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Contact, Company } from '../types';
import { LEAD_STATUSES } from '../types';
import { formatDate, formatCurrency, initials } from '../lib/format';
import { LoadingState, EmptyState, StatusBadge, Modal, Field } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [contact, setContact] = useState<Contact | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Contact>(`/contacts/${id}`)
      .then(setContact)
      .catch(() => toast.error('Contact not found'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  useEffect(() => {
    api.get<Company[]>('/companies').then(setCompanies).catch(() => {});
  }, []);

  function openEdit() {
    if (!contact) return;
    setForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      mobile: contact.mobile ?? '',
      companyId: contact.companyId ?? '',
      leadStatus: contact.leadStatus,
      notes: contact.notes ?? '',
    });
    setEditOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const payload = { ...form, companyId: form.companyId || null };
      const updated = await api.put<Contact>(`/contacts/${id}`, payload);
      setContact(updated);
      toast.success('Contact updated');
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!id || !confirm('Delete this contact?')) return;
    try {
      await api.del(`/contacts/${id}`);
      toast.success('Contact deleted');
      navigate('/contacts');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (loading) return <LoadingState />;
  if (!contact) return <EmptyState title="Contact not found" />;

  const company = contact.company as Company | null | undefined;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>
          {contact.firstName} {contact.lastName} · TrustedNetworx CRM
        </title>
      </Helmet>

      <Link to="/contacts" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to contacts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700">
            {initials(`${contact.firstName} ${contact.lastName}`)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-sm text-slate-500">{contact.title || 'No title set'}</p>
          </div>
          <StatusBadge status={contact.leadStatus} />
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={openEdit}>
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button className="btn btn-danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">Details</h2>
          <InfoRow icon={Mail} label="Email">
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                {contact.email}
              </a>
            ) : (
              '—'
            )}
          </InfoRow>
          <InfoRow icon={Phone} label="Phone">{contact.phone || '—'}</InfoRow>
          <InfoRow icon={Smartphone} label="Mobile">{contact.mobile || '—'}</InfoRow>
          <InfoRow icon={Briefcase} label="Title">{contact.title || '—'}</InfoRow>
          <InfoRow icon={Building2} label="Company">
            {company ? (
              <Link to={`/companies/${company.id}`} className="text-blue-600 hover:underline">
                {company.name}
              </Link>
            ) : (
              '—'
            )}
          </InfoRow>
          <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
            Added {formatDate(contact.createdAt)}
          </div>
          {contact.notes && (
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-slate-700">{contact.notes}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Target className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Leads</h2>
              <span className="text-sm text-slate-400">({contact.leads?.length ?? 0})</span>
            </div>
            {contact.leads && contact.leads.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {contact.leads.map((l) => (
                  <li key={l.id}>
                    <Link to={`/leads/${l.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                      <div>
                        <p className="font-medium text-slate-900">{l.name}</p>
                        <p className="text-sm text-slate-500">{formatCurrency(l.estimatedValue)}</p>
                      </div>
                      <StatusBadge status={l.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Target} title="No leads" description="No opportunities linked to this contact yet." />
            )}
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Contact"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button form="contact-edit" type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </>
        }
      >
        <form id="contact-edit" onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" required>
              <input className="input" value={form.firstName ?? ''} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </Field>
            <Field label="Last name" required>
              <input className="input" value={form.lastName ?? ''} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </Field>
          </div>
          <Field label="Title">
            <input className="input" value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input type="email" className="input" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="input" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company">
              <select className="input" value={form.companyId ?? ''} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                <option value="">— None —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={form.leadStatus ?? 'New'} onChange={(e) => setForm({ ...form, leadStatus: e.target.value })}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea className="input min-h-24" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Mail;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span className="w-20 shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 break-words text-slate-800">{children}</span>
    </div>
  );
}
