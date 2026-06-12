import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FileText, Plus, Trash2, Code2, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
import type { FormDef, FormField } from '../types';
import { formatDate } from '../lib/format';
import { Modal, Field, LoadingState, EmptyState } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

// The set of fields a builder can toggle on/off.
const AVAILABLE: { name: string; label: string; type: string }[] = [
  { name: 'name', label: 'Full Name', type: 'text' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'company', label: 'Company', type: 'text' },
  { name: 'message', label: 'Message', type: 'textarea' },
];

export default function Forms() {
  const toast = useToast();
  const [forms, setForms] = useState<FormDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [embedForm, setEmbedForm] = useState<FormDef | null>(null);
  const [saving, setSaving] = useState(false);

  // Builder state
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({ name: true, email: true });
  const [required, setRequired] = useState<Record<string, boolean>>({ email: true });
  const [confirmationMessage, setConfirmationMessage] = useState('Thank you! We will be in touch shortly.');

  function load() {
    setLoading(true);
    api
      .get<FormDef[]>('/forms')
      .then(setForms)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function resetBuilder() {
    setName('');
    setSelected({ name: true, email: true });
    setRequired({ email: true });
    setConfirmationMessage('Thank you! We will be in touch shortly.');
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const fields: FormField[] = AVAILABLE.filter((f) => selected[f.name]).map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      required: !!required[f.name],
    }));
    if (fields.length === 0) {
      toast.error('Select at least one field');
      return;
    }
    setSaving(true);
    try {
      await api.post<FormDef>('/forms', { name, fields, confirmationMessage });
      toast.success('Form created');
      setBuilderOpen(false);
      resetBuilder();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create form');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this form? Submissions will be removed.')) return;
    try {
      await api.del(`/forms/${id}`);
      toast.success('Form deleted');
      setForms((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Forms · TrustedNetworx CRM</title>
      </Helmet>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lead Capture Forms</h1>
          <p className="text-sm text-slate-500">Build embeddable forms that create leads automatically</p>
        </div>
        <button className="btn btn-primary" onClick={() => setBuilderOpen(true)}>
          <Plus className="h-4 w-4" /> New Form
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : forms.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={FileText}
            title="No forms yet"
            description="Create a form to capture leads from your website."
            action={
              <button className="btn btn-primary" onClick={() => setBuilderOpen(true)}>
                <Plus className="h-4 w-4" /> New Form
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <div key={f.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
                <button
                  onClick={() => onDelete(f.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Delete form"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{f.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {f.fields.length} field{f.fields.length === 1 ? '' : 's'} ·{' '}
                {f._count?.submissions ?? 0} submission{(f._count?.submissions ?? 0) === 1 ? '' : 's'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Created {formatDate(f.createdAt)}</p>
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                <button className="btn btn-secondary flex-1" onClick={() => setEmbedForm(f)}>
                  <Code2 className="h-4 w-4" /> Embed
                </button>
                <a
                  className="btn btn-secondary"
                  href={`/embed/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Preview form"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Builder modal */}
      <Modal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        title="Form Builder"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setBuilderOpen(false)}>
              Cancel
            </button>
            <button form="form-builder" type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Form
            </button>
          </>
        }
      >
        <form id="form-builder" onSubmit={onCreate} className="space-y-5">
          <Field label="Form name" required>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Contact Us" required autoFocus />
          </Field>

          <div>
            <label className="label">Fields to include</label>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              {AVAILABLE.map((f) => (
                <div key={f.name} className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={!!selected[f.name]}
                      onChange={(e) => setSelected({ ...selected, [f.name]: e.target.checked })}
                    />
                    {f.label}
                  </label>
                  <label
                    className={`flex items-center gap-1.5 text-xs ${
                      selected[f.name] ? 'text-slate-500' : 'text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!selected[f.name]}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={!!required[f.name]}
                      onChange={(e) => setRequired({ ...required, [f.name]: e.target.checked })}
                    />
                    required
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Field label="Confirmation message">
            <textarea
              className="input min-h-20"
              value={confirmationMessage}
              onChange={(e) => setConfirmationMessage(e.target.value)}
            />
          </Field>
        </form>
      </Modal>

      {/* Embed code modal */}
      {embedForm && <EmbedModal form={embedForm} onClose={() => setEmbedForm(null)} />}
    </div>
  );
}

function EmbedModal({ form, onClose }: { form: FormDef; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const origin = window.location.origin;
  const snippet = `<iframe
  src="${origin}/embed/${form.id}"
  width="100%"
  height="520"
  frameborder="0"
  title="${form.name}"
></iframe>`;

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Embed Code"
      footer={
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Paste this snippet into your website to display the <strong>{form.name}</strong> form. Submissions
          create a lead automatically.
        </p>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
            {snippet}
          </pre>
          <button
            onClick={copy}
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-white hover:bg-slate-600"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <a
          href={`/embed/${form.id}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Preview form <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </Modal>
  );
}
