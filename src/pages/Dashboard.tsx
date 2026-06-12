import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Target,
  Sparkles,
  TrendingUp,
  Trophy,
  Activity as ActivityIcon,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api';
import type { DashboardStats } from '../types';
import { LEAD_STATUSES } from '../types';
import { formatCurrency, timeAgo, statusStyle } from '../lib/format';
import { LoadingState, EmptyState } from '../components/ui';

const OPEN = ['New', 'Contacted', 'Qualified', 'Proposal Sent'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardStats>('/dashboard/stats')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;
  if (!stats) return null;

  const cards = [
    { label: 'Total Leads', value: stats.totalLeads, icon: Target, color: 'bg-blue-50 text-blue-600' },
    { label: 'New Today', value: stats.newToday, icon: Sparkles, color: 'bg-sky-50 text-sky-600' },
    { label: 'Open Opportunities', value: stats.openOpps, icon: TrendingUp, color: 'bg-violet-50 text-violet-600' },
    {
      label: 'Won This Month',
      value: stats.wonThisMonth,
      sub: formatCurrency(stats.wonValue),
      icon: Trophy,
      color: 'bg-emerald-50 text-emerald-600',
    },
  ];

  const totalPipeline = stats.pipeline.reduce((s, p) => s + p.count, 0) || 1;
  const byStatus = new Map(stats.pipeline.map((p) => [p.status, p]));

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Dashboard · TrustedNetworx CRM</title>
      </Helmet>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Your sales pipeline at a glance</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{c.label}</span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900">{c.value}</div>
            {c.sub && <div className="mt-1 text-sm font-medium text-emerald-600">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline breakdown */}
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Pipeline Status</h2>
            <Link to="/leads" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
              View board <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {LEAD_STATUSES.map((status) => {
              const entry = byStatus.get(status);
              const count = entry?.count ?? 0;
              const s = statusStyle(status);
              const pct = Math.round((count / totalPipeline) * 100);
              return (
                <div key={status}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                      {status}
                    </span>
                    <span className="text-slate-500">
                      {count} · {formatCurrency(entry?.value ?? 0)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${s.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex gap-6 border-t border-slate-100 pt-4 text-sm">
            <div>
              <span className="text-slate-500">Companies</span>
              <span className="ml-2 font-semibold text-slate-900">{stats.totalCompanies}</span>
            </div>
            <div>
              <span className="text-slate-500">Contacts</span>
              <span className="ml-2 font-semibold text-slate-900">{stats.totalContacts}</span>
            </div>
            <div>
              <span className="text-slate-500">Open</span>
              <span className="ml-2 font-semibold text-slate-900">
                {OPEN.reduce((sum, st) => sum + (byStatus.get(st)?.count ?? 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Recent Activity</h2>
          {stats.recentActivity.length === 0 ? (
            <EmptyState icon={ActivityIcon} title="No activity yet" description="Activity will appear here as you work leads." />
          ) : (
            <ul className="space-y-4">
              {stats.recentActivity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <ActivityIcon className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">{a.description}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {a.user?.name ? `${a.user.name} · ` : ''}
                      {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
