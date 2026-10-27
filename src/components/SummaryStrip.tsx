import { Building2, Layers, UserCircle, Calendar } from 'lucide-react';
import type { DashboardData } from '../types';

interface SummaryStripProps {
  data: DashboardData;
  fileName?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SummaryStrip({ data, fileName }: SummaryStripProps) {
  const avgOverdue = data.kpi.totalAccounts > 0
    ? data.kpi.totalOverdue / data.kpi.totalAccounts
    : 0;
  const collectionRate = data.kpi.totalOverdue > 0
    ? (data.kpi.ptpPaidAmount / data.kpi.totalOverdue) * 100
    : 0;

  const stats = [
    {
      label: 'Companies',
      value: data.companies.length.toString(),
      icon: Building2,
      color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/60',
    },
    {
      label: 'Departments',
      value: data.departments.length.toString(),
      icon: Layers,
      color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/60',
    },
    {
      label: 'Active Agents',
      value: data.agents.length.toString(),
      icon: UserCircle,
      color: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/60',
    },
    {
      label: 'Avg Overdue/Account',
      value: formatCurrency(avgOverdue),
      icon: Calendar,
      color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/60',
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors duration-200 dark:bg-slate-900/95 dark:ring-slate-800">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 bg-clip-text text-sm font-black tracking-wide text-transparent drop-shadow-[0_0_7px_rgba(34,211,238,0.3)]">
            Fis Report
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{fileName || 'Sample Data Loaded'}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
        <div className="hidden lg:block h-10 w-px bg-slate-200 dark:bg-slate-800" />
        <div className="text-right">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{collectionRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Collection Rate</p>
        </div>
      </div>
    </div>
  );
}
