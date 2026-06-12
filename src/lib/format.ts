// Small presentation helpers shared across pages.

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return '';
  const seconds = Math.floor((Date.now() - d) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  New: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-l-sky-500', dot: 'bg-sky-500' },
  Contacted: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-l-indigo-500', dot: 'bg-indigo-500' },
  Qualified: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-l-violet-500', dot: 'bg-violet-500' },
  'Proposal Sent': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-l-amber-500', dot: 'bg-amber-500' },
  Won: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-l-emerald-500', dot: 'bg-emerald-500' },
  Lost: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-l-rose-500', dot: 'bg-rose-500' },
};

export function statusStyle(status: string) {
  return (
    STATUS_STYLES[status] ?? {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-l-slate-400',
      dot: 'bg-slate-400',
    }
  );
}
