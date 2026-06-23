import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Plus, Search, Loader2, GripVertical } from 'lucide-react';
import { api, qs } from '../lib/api';
import type { Lead, Company, Contact, CompanyRef } from '../types';
import { LEAD_STATUSES } from '../types';
import { formatCurrency, statusStyle, timeAgo } from '../lib/format';
import { Modal, Field, Spinner } from '../components/ui';
import { useToast } from '../contexts/ToastContext';
import LeadDetail from './LeadDetail';

const BLANK = {
  name: '',
  companyId: '',
  contactId: '',
  source: '',
  status: 'New',
  estimatedValue: '',
  notes: '',
};

export default function Leads() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const load = useCallback((q: string) => {
    setLoading(true);
    api
      .get<Lead[]>(`/leads${qs({ search: q })}`)
      .then(setLeads)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 250);
    return () => clearTimeout(t);
  }, [search, load]);

  useEffect(() => {
    api.get<Company[]>('/companies').then(setCompanies).catch(() => {});
    api.get<Contact[]>('/contacts').then(setContacts).catch(() => {});
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        companyId: form.companyId || null,
        contactId: form.contactId || null,
        estimatedValue: form.estimatedValue === '' ? null : Number(form.estimatedValue),
      };
      await api.post<Lead>('/leads', payload);
      toast.success('Lead created');
      setModalOpen(false);
      setForm(BLANK);
      load(search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  }

  // Optimistic drag-and-drop between pipeline columns.
  async function moveLead(leadId: string, status: string) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === status) return;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
    try {
      await api.patch(`/leads/${leadId}/status`, { status });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to move lead');
      load(search); // revert from server
    }
  }

  function columnLeads(status: string) {
    return leads.filter((l) => l.status === status);
  }

  return (
    <div className="flex h-full flex-col space-y-5">
      <Helmet>
        <title>Leads · TrustedNetworx CRM</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500">{leads.length} opportunities</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add Lead
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((status) => {
            const items = columnLeads(status);
            const s = statusStyle(status);
            const total = items.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0);
            return (
              <div
                key={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver((cur) => (cur === status ? null : cur))}
                onDrop={() => {
                  if (dragId) moveLead(dragId, status);
                  setDragId(null);
                  setDragOver(null);
                }}
                className={`flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70 transition-colors ${
                  dragOver === status ? 'bg-blue-100/70 ring-2 ring-blue-300' : ''
                }`}
              >
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className="text-sm font-semibold text-slate-700">{status}</span>
                    <span className="rounded-full bg-white px-1.5 text-xs font-medium text-slate-500">
                      {items.length}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{formatCurrency(total)}</span>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2">
                  {items.map((l) => {
                    const company = l.company as CompanyRef | null | undefined;
                    return (
                      <div
                        key={l.id}
                        draggable
                        onDragStart={() => setDragId(l.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setDragOver(null);
                        }}
                        onClick={() => navigate(`/leads/${l.id}`)}
                        className={`group cursor-pointer rounded-lg border-l-4 bg-white p-3 shadow-sm transition hover:shadow-md ${s.border} ${
                          dragId === l.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900">{l.name}</p>
                          <GripVertical className="h-4 w-4 shrink-0 text-slate-300 opacity-0 group-hover:opacity-100" />
                        </div>
                        {company && <p className="mt-1 text-xs text-slate-500">{company.name}</p>}
                        <p className="mt-1 text-xs text-slate-400">{timeAgo(l.createdAt)}</p>
                        {l.estimatedValue != null && (
                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {formatCurrency(l.estimatedValue)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                      Drop leads here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add lead modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Lead"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button form="lead-form" type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </>
        }
      >
        <form id="lead-form" onSubmit={onCreate} className="space-y-4">
          <Field label="Lead name" required>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </Field>
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
            <Field label="Contact">
              <select className="input" value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                <option value="">— None —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated value">
              <input
                type="number"
                min="0"
                className="input"
                value={form.estimatedValue}
                onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Source">
            <input className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Web Form, Referral" />
          </Field>
          <Field label="Notes">
            <textarea className="input min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </form>
      </Modal>

      {/* Detail drawer (route-driven) */}
      {id && (
        <LeadDetail
          id={id}
          onClose={() => navigate('/leads')}
          onChange={() => load(search)}
        />
      )}
    </div>
  );
}
