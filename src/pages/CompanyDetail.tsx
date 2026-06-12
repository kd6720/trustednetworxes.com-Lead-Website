import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Briefcase,
  Users,
  Target,
  Trash2,
  Pencil,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Company } from '../types';
import { formatDate, formatCurrency } from '../lib/format';
import { LoadingState, EmptyState, StatusBadge, Modal, Field } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Company>(`/companies/${id}`)
      .then(setCompany)
      .catch(() => toast.error('Company not found'))
      .finally(() => setLoading(false));
  }, [id, toast]);

  function openEdit() {
    if (!company) return;
    setForm({
      name: company.name,
      website: company.website ?? '',
      industry: company.industry ?? '',
      size: company.size ?? '',
      address: company.address ?? '',
      city: company.city ?? '',
      state: company.state ?? '',
      zip: company.zip ?? '',
      notes: company.notes ?? '',
      leadSource: company.leadSource ?? '',
    });
    setEditOpen(true);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api.put<Company>(`/companies/${id}`, form);
      setCompany((prev) => ({ ...prev, ...updated }));
      toast.success('Company updated');
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!id || !confirm('Delete this company? Contacts and leads will be detached.')) return;
    try {
      await api.del(`/companies/${id}`);
      toast.success('Company deleted');
      navigate('/companies');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  if (loading) return <LoadingState />;
  if (!company) return <EmptyState icon={Building2} title="Company not found" />;

  const location = [company.city, company.state, company.zip].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <Helmet>
        <title>{company.name} · TrustedNetworx CRM</title>
      </Helmet>

      <Link to="/companies" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to companies
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-navy-100 text-navy-600">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            <p className="text-sm text-slate-500">{company.industry || 'No industry set'}</p>
          </div>
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
        {/* Info */}
        <div className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">Details</h2>
          <InfoRow icon={Globe} label="Website">
            {company.website ? (
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                {company.website.replace(/^https?:\/\//, '')}
              </a>
            ) : (
              '—'
            )}
          </InfoRow>
          <InfoRow icon={Briefcase} label="Size">{company.size || '—'}</InfoRow>
          <InfoRow icon={MapPin} label="Location">{location || '—'}</InfoRow>
          <InfoRow icon={Target} label="Lead source">{company.leadSource || '—'}</InfoRow>
          <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
            Added {formatDate(company.createdAt)}
          </div>
          {company.notes && (
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-slate-700">{company.notes}</p>
            </div>
          )}
        </div>

        {/* Contacts + Leads */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Contacts</h2>
              <span className="text-sm text-slate-400">({company.contacts?.length ?? 0})</span>
            </div>
            {company.contacts && company.contacts.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {company.contacts.map((c) => (
                  <li key={c.id}>
                    <Link to={`/contacts/${c.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                      <div>
                        <p className="font-medium text-slate-900">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="text-sm text-slate-500">{c.title || c.email || '—'}</p>
                      </div>
                      <StatusBadge status={c.leadStatus} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Users} title="No contacts" description="No contacts linked to this company yet." />
            )}
          </div>

          <div className="card">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
              <Target className="h-4 w-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Leads</h2>
              <span className="text-sm text-slate-400">({company.leads?.length ?? 0})</span>
            </div>
            {company.leads && company.leads.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {company.leads.map((l) => (
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
              <EmptyState icon={Target} title="No leads" description="No opportunities linked to this company yet." />
            )}
          </div>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Company"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button form="company-edit" type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </>
        }
      >
        <form id="company-edit" onSubmit={onSave} className="space-y-4">
          <Field label="Company name" required>
            <input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Industry">
              <input className="input" value={form.industry ?? ''} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
            <Field label="Size">
              <input className="input" value={form.size ?? ''} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            </Field>
          </div>
          <Field label="Website">
            <input className="input" value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City">
              <input className="input" value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="State">
              <input className="input" value={form.state ?? ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
            <Field label="Zip">
              <input className="input" value={form.zip ?? ''} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
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
  icon: typeof Globe;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <span className="w-24 shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 flex-1 break-words text-slate-800">{children}</span>
    </div>
  );
}
