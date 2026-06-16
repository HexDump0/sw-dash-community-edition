import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Clock, BarChart3, CheckCircle2, Award } from 'lucide-react';
import type { QueueStats, LeaderboardRow } from '../../types';

interface QueueStatsPanelProps {
  stats: QueueStats;
  leaderboards: Record<string, LeaderboardRow[]>;
}

type Period = 'daily' | 'weekly' | 'alltime';

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  alltime: 'All time',
};

export function QueueStatsPanel({ stats, leaderboards }: QueueStatsPanelProps) {
  const [period, setPeriod] = useState<Period>('daily');

  const netIsPositive = stats.net_positive;
  const netSign = netIsPositive ? '+' : '';
  const netLabel = netIsPositive ? 'ahead' : 'behind';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* Left: stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
        {/* Today */}
        <div className="col-span-2 sm:col-span-1 p-3 rounded-lg bg-surface border border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-1">Today</div>
          <div className="flex items-baseline gap-1.5 mb-0.5">
            <span className={`text-xl font-bold ${netIsPositive ? 'text-green' : 'text-red'}`}>
              {netSign}{stats.net_flow}
            </span>
            <span className="text-xs text-subtext font-semibold">{netLabel}</span>
          </div>
          <p className="text-[11px] text-muted">
            reviewed {stats.decisions_today ?? 0}, {stats.new_today ?? 0} new
          </p>
        </div>

        <MetricTile
          label="In queue"
          value={stats.pending}
          hint="pending"
          icon={BarChart3}
          tone="accent"
        />
        <MetricTile
          label="Oldest"
          value={stats.oldest_waiting_text}
          hint="waiting"
          href={stats.oldest_waiting_id ? `/review/${stats.oldest_waiting_id}` : undefined}
          icon={Clock}
          tone="yellow"
        />
        <MetricTile
          label="Approval"
          value={stats.approval_rate !== null ? `${stats.approval_rate}%` : '—'}
          hint="all time"
          icon={CheckCircle2}
          tone="green"
        />
        <MetricTile
          label="This week"
          value={stats.decisions_this_week}
          hint="reviewed"
          icon={TrendingUp}
          tone="blue"
        />

        {/* All time */}
        <div className="col-span-2 sm:col-span-3 p-3 rounded-lg bg-surface border border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-2">All time</div>
          <div className="grid grid-cols-3 gap-2">
            <Tally value={stats.approved} label="approved" color="text-green" />
            <Tally value={stats.returned} label="returned" color="text-red" />
            <Tally value={stats.decided} label="reviewed" color="text-text" />
          </div>
        </div>
      </div>

      {/* Right: leaderboard */}
      <div className="p-3 rounded-lg bg-surface border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-accent" />
            <span className="text-[11px] uppercase tracking-wider text-muted font-bold">Leaderboard</span>
          </div>
          <div className="flex items-center gap-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  period === p
                    ? 'bg-accent-subtle text-accent'
                    : 'text-muted hover:text-text'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-0.5">
          {(leaderboards[period] ?? []).slice(0, 7).map((row) => (
            <div key={`${period}-${row.position}`} className="flex items-center justify-between text-[14px]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-5 text-center font-mono text-muted">{row.position}</span>
                <span className="text-text truncate">{row.name}</span>
              </div>
              <span className="font-mono font-semibold text-accent">{row.count}</span>
            </div>
          ))}
          {(leaderboards[period] ?? []).length === 0 && (
            <p className="text-[13px] text-muted">No leaderboard data.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ElementType;
  tone: 'accent' | 'green' | 'red' | 'yellow' | 'blue';
  href?: string;
}) {
  const toneClasses: Record<string, string> = {
    accent: 'text-accent bg-accent-subtle',
    green: 'text-green bg-green-subtle',
    red: 'text-red bg-red-subtle',
    yellow: 'text-yellow bg-yellow-subtle',
    blue: 'text-blue bg-blue-subtle',
  };

  const inner = (
    <div className={`p-3 rounded-lg bg-surface border border-border transition-colors ${href ? 'hover:border-accent cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</span>
        <div className={`p-1 rounded ${toneClasses[tone]}`}>
          <Icon className="w-3 h-3" />
        </div>
      </div>
      <div className="text-xl font-bold text-text truncate">{value}</div>
      {hint && <div className="text-[10px] text-muted">{hint}</div>}
    </div>
  );

  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}

function Tally({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</div>
    </div>
  );
}
