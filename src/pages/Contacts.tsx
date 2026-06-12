import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Users, Plus, Search, Loader2 } from 'lucide-react';
import { api, qs } from '../lib/api';
import type { Contact, Company, CompanyRef } from '../types';
import { LEAD_STATUSES } from '../types';
import { Modal, Field, TableSkeleton, EmptyState, StatusBadge } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

const BLANK = {
  firstName: '',
  lastName: '',
  title: '',
  email: '',
  phone: '',
  companyId: '',
  leadStatus: 'New',
};

function companyName(c: Contact['company']): string {
  if (!c) return '—';
  return (c as CompanyRef).name ?? '—';
}

export default function Contacts() {
  const navigate = useNavigate();
  const toast = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = useCallback((q: string, status: string) => {
    setLoading(true);
    api
      .get<Contact[]>(`/contacts${qs({ search: q, status })}`)
      .then(setContacts)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, statusFilter), 250);
    return () => clearTimeout(t);
  }, [search, statusFilter, load]);

  // Companies for the "Add contact" dropdown.
  useEffect(() => {
    api.get<Company[]>('/companies').then(setCompanies).catch(() => {});
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, companyId: form.companyId || null };
      await api.post<Contact>('/contacts', payload);
      toast.success('Contact created');
      setModalOpen(false);
      setForm(BLANK);
      load(search, statusFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Contacts · TrustedNetworx CRM</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500">{contacts.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add Contact
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input max-w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts found"
            description={search || statusFilter ? 'Try adjusting your filters.' : 'Add your first contact to get started.'}
            action={
              !search && !statusFilter && (
                <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Contact
                </button>
              )
            }
          />
        ) : (
          <>
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                    className="cursor-pointer odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">
                        {c.firstName} {c.lastName}
                      </div>
                      {c.title && <div className="text-xs text-slate-500">{c.title}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{c.email || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{companyName(c.company)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.leadStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="divide-y divide-slate-100 sm:hidden">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/contacts/${c.id}`)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="truncate text-sm text-slate-500">{c.email || companyName(c.company)}</p>
                  </div>
                  <StatusBadge status={c.leadStatus} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Contact"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button form="contact-form" type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </>
        }
      >
        <form id="contact-form" onSubmit={onCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" required>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required autoFocus />
            </Field>
            <Field label="Last name" required>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </Field>
          </div>
          <Field label="Title">
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Company">
              <select className="input" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                <option value="">— None —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={form.leadStatus} onChange={(e) => setForm({ ...form, leadStatus: e.target.value })}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
