import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  User,
  Key,
  Webhook,
  Plus,
  Trash2,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { api } from '../lib/api';
import type { ApiKey, Webhook as WebhookDef } from '../types';
import { formatDate } from '../lib/format';
import { Modal, Field, LoadingState } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

// ─── Tabs ───────────────────────────────────────────────────────────────────
type Tab = 'profile' | 'apikeys' | 'webhooks';
const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
];

export default function Settings() {
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Settings · TrustedNetworx CRM</title>
      </Helmet>
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'profile' && <ProfileSection />}
      {tab === 'apikeys' && <ApiKeysSection />}
      {tab === 'webhooks' && <WebhooksSection />}
    </div>
  );
}

// ─── Profile ────────────────────────────────────────────────────────────────
function ProfileSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.get<{ id: string; name: string; email: string; role: string; createdAt?: string }>('/auth/me').then((u) => {
      setName(u.name);
      setEmail(u.email);
    });
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/me', { name });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card max-w-lg p-6">
      <form onSubmit={onSave} className="space-y-5">
        <Field label="Email">
          <input className="input bg-slate-50 text-slate-500" value={email} disabled />
        </Field>
        <Field label="Name">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </form>
    </div>
  );
}

// ─── API Keys ───────────────────────────────────────────────────────────────
function ApiKeysSection() {
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setLoading(true);
    api.get<ApiKey[]>('/apikeys').then(setKeys).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onCreate(name: string) {
    try {
      const key = await api.post<ApiKey>('/apikeys', { name, scopes: 'read,write' });
      toast.success('API key created');
      setShowCreate(false);
      load();
      // The full key is only returned at creation — display it once.
      if (key.key) {
        alert(`Your new API key:\n\n${key.key}\n\nCopy it now — you won't see it again.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this API key? Applications using it will lose access.')) return;
    try {
      await api.del(`/apikeys/${id}`);
      toast.success('API key deleted');
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          API keys allow external applications to access the CRM API programmatically.
        </p>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Key
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : keys.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">
          No API keys yet. Create one to get started.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Key</th>
                <th className="px-5 py-3">Scopes</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-900">{k.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">
                    {k.key ? k.key.slice(0, 8) : k.id.slice(0, 8)}…
                  </td>
                  <td className="px-5 py-3 text-slate-500">{k.scopes}</td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(k.createdAt)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => onDelete(k.id)}
                      className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                      aria-label="Delete key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateKeyModal onClose={() => setShowCreate(false)} onCreate={onCreate} />
      )}
    </div>
  );
}

function CreateKeyModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onCreate(name.trim());
    setSaving(false);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create API Key"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button form="key-form" type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </>
      }
    >
      <form id="key-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Key name" required>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. WordPress plugin"
            autoFocus
            required
          />
        </Field>
        <p className="text-xs text-slate-400">
          The full key will be shown once after creation. Copy it immediately — it cannot be retrieved later.
        </p>
      </form>
    </Modal>
  );
}

// ─── Webhooks ───────────────────────────────────────────────────────────────
function WebhooksSection() {
  const toast = useToast();
  const [hooks, setHooks] = useState<WebhookDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    setLoading(true);
    api.get<WebhookDef[]>('/webhooks').then(setHooks).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onCreate(url: string, event: string) {
    try {
      await api.post('/webhooks', { url, event });
      toast.success('Webhook created');
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function onToggle(hook: WebhookDef) {
    try {
      const updated = await api.put<WebhookDef>(`/webhooks/${hook.id}`, { active: !hook.active });
      setHooks((prev) => prev.map((h) => (h.id === hook.id ? updated : h)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api.del(`/webhooks/${id}`);
      toast.success('Webhook deleted');
      setHooks((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Webhooks fire when events happen (e.g. new lead created). Your endpoint receives a JSON POST.
        </p>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Webhook
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : hooks.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">
          No webhooks configured yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">URL</th>
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {hooks.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/50">
                  <td className="max-w-[240px] truncate px-5 py-3 font-mono text-xs text-slate-600">
                    {h.url}
                  </td>
                  <td className="px-5 py-3">
                    <span className="badge bg-slate-100 text-slate-600 text-xs">{h.event}</span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => onToggle(h)}
                      className="text-slate-400 hover:text-slate-600"
                      aria-label={h.active ? 'Disable' : 'Enable'}
                    >
                      {h.active ? (
                        <ToggleRight className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{formatDate(h.createdAt)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => onDelete(h.id)}
                      className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                      aria-label="Delete webhook"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateWebhookModal onClose={() => setShowCreate(false)} onCreate={onCreate} />
      )}
    </div>
  );
}

function CreateWebhookModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (url: string, event: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [event, setEvent] = useState('lead.created');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setSaving(true);
    await onCreate(url.trim(), event);
    setSaving(false);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create Webhook"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button form="webhook-form" type="submit" className="btn btn-primary" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </>
      }
    >
      <form id="webhook-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Endpoint URL" required>
          <input
            className="input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-app.com/webhook"
            autoFocus
            required
          />
        </Field>
        <Field label="Event">
          <select
            className="input"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
          >
            <option value="lead.created">lead.created</option>
            <option value="lead.updated">lead.updated</option>
            <option value="form.submitted">form.submitted</option>
          </select>
        </Field>
        <p className="text-xs text-slate-400">
          We'll POST JSON with the lead/form payload to this URL when the event fires.
        </p>
      </form>
    </Modal>
  );
}
