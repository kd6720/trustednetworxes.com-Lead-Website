import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Building2, Plus, Search, ExternalLink, Loader2 } from 'lucide-react';
import { api, qs } from '../lib/api';
import type { Company } from '../types';
import { formatDate } from '../lib/format';
import { Modal, Field, TableSkeleton, EmptyState } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

const BLANK = {
  name: '',
  website: '',
  industry: '',
  size: '',
  city: '',
  state: '',
  leadSource: '',
};

export default function Companies() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = useCallback((q: string) => {
    setLoading(true);
    api
      .get<Company[]>(`/companies${qs({ search: q })}`)
      .then(setCompanies)
      .finally(() => setLoading(false));
  }, []);

  // Debounced search; keeps the URL in sync so header search deep-links here.
  useEffect(() => {
    const t = setTimeout(() => {
      setParams(search ? { search } : {}, { replace: true });
      load(search);
    }, 250);
    return () => clearTimeout(t);
  }, [search, load, setParams]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.post<Company>('/companies', form);
      toast.success('Company created');
      setModalOpen(false);
      setForm(BLANK);
      navigate(`/companies/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Companies · TrustedNetworx CRM</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500">{companies.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Add Company
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, city, website…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies found"
            description={search ? 'Try a different search term.' : 'Add your first company to get started.'}
            action={
              !search && (
                <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Company
                </button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Industry</th>
                  <th className="px-5 py-3">Website</th>
                  <th className="px-5 py-3">Contacts</th>
                  <th className="px-5 py-3">Leads</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/companies/${c.id}`)}
                    className="cursor-pointer odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/50"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">{c.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{c.industry || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {c.website ? (
                        <a
                          href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {c.website.replace(/^https?:\/\//, '')}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{c._count?.contacts ?? 0}</td>
                    <td className="px-5 py-3.5 text-slate-600">{c._count?.leads ?? 0}</td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/companies/${c.id}`)}
                  className="flex w-full flex-col gap-1 px-4 py-4 text-left hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="text-sm text-slate-500">{c.industry || 'No industry'}</span>
                  <span className="text-xs text-slate-400">
                    {c._count?.contacts ?? 0} contacts · {c._count?.leads ?? 0} leads
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Company"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button form="company-form" type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </>
        }
      >
        <form id="company-form" onSubmit={onCreate} className="space-y-4">
          <Field label="Company name" required>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Industry">
              <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
            <Field label="Company size">
              <input className="input" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 11-50" />
            </Field>
          </div>
          <Field label="Website">
            <input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City">
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="State">
              <input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </Field>
          </div>
          <Field label="Lead source">
            <input className="input" value={form.leadSource} onChange={(e) => setForm({ ...form, leadSource: e.target.value })} placeholder="e.g. Referral, Web" />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
