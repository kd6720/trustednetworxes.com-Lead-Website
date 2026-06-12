import { useEffect, useState } from 'react';
import {
  X,
  Building2,
  User as UserIcon,
  Calendar,
  DollarSign,
  Tag,
  Trash2,
  Send,
  Phone,
  Mail,
  StickyNote,
  Users,
  Plus,
  Loader2,
} from 'lucide-react';
import { api } from '../lib/api';
import type { Lead, Activity, Company, ContactRef } from '../types';
import { LEAD_STATUSES } from '../types';
import { formatCurrency, formatDate, formatDateTime } from '../lib/format';
import { Drawer, Spinner, StatusBadge } from '../components/ui';
import { useToast } from '../contexts/ToastContext';

const ACTIVITY_ICONS: Record<string, typeof StickyNote> = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  meeting: Users,
  status_change: Tag,
  created: Plus,
};

export default function LeadDetail({
  id,
  onClose,
  onChange,
}: {
  id: string;
  onClose: () => void;
  onChange?: () => void;
}) {
  const toast = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [noteType, setNoteType] = useState('note');
  const [noteText, setNoteText] = useState('');
  const [posting, setPosting] = useState(false);

  function reload() {
    api
      .get<Lead>(`/leads/${id}`)
      .then(setLead)
      .catch(() => toast.error('Lead not found'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(status: string) {
    if (!lead || status === lead.status) return;
    setSavingStatus(true);
    try {
      await api.patch(`/leads/${id}/status`, { status });
      toast.success(`Moved to ${status}`);
      reload();
      onChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  }

  async function addActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setPosting(true);
    try {
      await api.post<Activity>('/activities', {
        type: noteType,
        description: noteText.trim(),
        leadId: id,
      });
      setNoteText('');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add activity');
    } finally {
      setPosting(false);
    }
  }

  async function onDelete() {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    try {
      await api.del(`/leads/${id}`);
      toast.success('Lead deleted');
      onChange?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  const company = lead?.company as Company | null | undefined;
  const contact = lead?.contact as ContactRef | null | undefined;

  return (
    <Drawer open onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-900">Lead Details</h2>
        <div className="flex items-center gap-1">
          <button onClick={onDelete} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Delete lead">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading || !lead ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge status={lead.status} />
              {savingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{lead.name}</h1>
          </div>

          {/* Status selector */}
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={lead.status}
              disabled={savingStatus}
              onChange={(e) => changeStatus(e.target.value)}
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-sm">
            <Meta icon={DollarSign} label="Value">{formatCurrency(lead.estimatedValue)}</Meta>
            <Meta icon={Tag} label="Source">{lead.source || '—'}</Meta>
            <Meta icon={Building2} label="Company">{company?.name || '—'}</Meta>
            <Meta icon={UserIcon} label="Contact">
              {contact ? `${contact.firstName} ${contact.lastName}` : '—'}
            </Meta>
            <Meta icon={Calendar} label="Follow-up">{formatDate(lead.nextFollowUp)}</Meta>
            <Meta icon={Calendar} label="Created">{formatDate(lead.createdAt)}</Meta>
          </div>

          {lead.notes && (
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Notes</p>
              <p className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">{lead.notes}</p>
            </div>
          )}

          {/* Activity composer */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Log activity</h3>
            <form onSubmit={addActivity} className="space-y-2">
              <select className="input" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
              <textarea
                className="input min-h-20"
                placeholder="What happened?"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <button type="submit" className="btn btn-primary w-full" disabled={posting || !noteText.trim()}>
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Add to timeline
              </button>
            </form>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Activity timeline</h3>
            {lead.activities && lead.activities.length > 0 ? (
              <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                {lead.activities.map((a) => {
                  const Icon = ACTIVITY_ICONS[a.type] ?? StickyNote;
                  return (
                    <li key={a.id} className="relative">
                      <span className="absolute top-0.5 -left-[27px] flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white">
                        <Icon className="h-3 w-3 text-slate-500" />
                      </span>
                      <p className="text-sm text-slate-700">{a.description}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {a.user?.name ? `${a.user.name} · ` : ''}
                        {formatDateTime(a.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-sm text-slate-400">No activity yet.</p>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Meta({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Tag;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="font-medium text-slate-800">{children}</div>
    </div>
  );
}
