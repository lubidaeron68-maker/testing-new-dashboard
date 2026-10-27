import {
  Users,
  Phone,
  Clock,
  Handshake,
  PhoneCall,
  PhoneMissed,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { KPIData } from '../types';
import { cn } from '../utils/cn';

interface KPICardsProps {
  kpi: KPIData;
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'violet';
}

const colorClasses: Record<KPICardProps['color'], { bg: string; icon: string; ring: string }> = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    icon: 'text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-100 dark:ring-indigo-900/40',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    icon: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-100 dark:ring-emerald-900/40',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    icon: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-100 dark:ring-amber-900/40',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    icon: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-100 dark:ring-rose-900/40',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/50',
    icon: 'text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-100 dark:ring-sky-900/40',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/50',
    icon: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-100 dark:ring-violet-900/40',
  },
};

function KPICard({ title, value, subtitle, icon: Icon, trend, color }: KPICardProps) {
  const colors = colorClasses[color];
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all duration-200 hover:shadow-md hover:ring-slate-300 dark:bg-slate-900/95 dark:ring-slate-800 dark:hover:ring-slate-700">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
          {trend !== undefined && (
            <div
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                trend >= 0
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
              )}
            >
              <TrendingUp className={cn('h-3 w-3', trend < 0 && 'rotate-180')} />
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl ring-4 transition-transform group-hover:scale-105', colors.bg, colors.ring)}>
          <Icon className={cn('h-6 w-6', colors.icon)} />
        </div>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function KPICards({ kpi }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KPICard
        title="Total FIS Taggings(w/redial)"
        value={formatNumber(kpi.totalAccounts)}
        subtitle="Active collection taggings"
        icon={Users}
        color="indigo"
      />
      <KPICard
        title="Total unique accounts tagged"
        value={formatNumber(kpi.uniqueAccounts)}
        subtitle="Based on unique Agreement ID"
        icon={Phone}
        color="sky"
      />
      <KPICard
        title="Avg Call Duration"
        value={`${kpi.avgCallDuration.toFixed(1)} min`}
        subtitle="Operational efficiency"
        icon={Clock}
        color="violet"
      />
      <KPICard
        title="PTP'S"
        value={formatNumber(kpi.totalPTP)}
        subtitle="Promise to pay + Promise to pay (lump sum)"
        icon={Handshake}
        color="amber"
      />
      <KPICard
        title="Number of RPC"
        value={formatNumber(kpi.rpcCount)}
        subtitle="Right Party Contact (RPC)"
        icon={PhoneCall}
        color="emerald"
      />
      <KPICard
        title="No Contact Rate"
        value={`${kpi.noContactRate.toFixed(1)}%`}
        subtitle="Unreachable / drop / no answer"
        icon={PhoneMissed}
        color="rose"
      />
    </div>
  );
}
