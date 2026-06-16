import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Award } from 'lucide-react';
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

const RANK_COLORS: Record<number, string> = {
  1: 'bg-yellow-subtle text-yellow border-yellow/30',
  2: 'bg-subtext/10 text-subtext border-subtext/20',
  3: 'bg-accent-subtle text-accent border-accent/30',
};

export function QueueStatsPanel({ stats, leaderboards }: QueueStatsPanelProps) {
  const [period, setPeriod] = useState<Period>('daily');

  const netIsPositive = stats.net_positive;
  const netFlowText = `${netIsPositive ? '+' : ''}${stats.net_flow}`;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Overview card */}
      <div className="rounded-xl bg-surface border border-border p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-accent" />
          <span className="text-[11px] uppercase tracking-wider text-muted font-bold">Overview</span>
        </div>

        {/* Today */}
        <div className="mb-4">
          <div className="text-[11px] text-muted mb-1">Today&apos;s progress</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${netIsPositive ? 'text-green' : 'text-red'}`}>
              {netFlowText}
            </span>
            <span className="text-sm font-semibold text-subtext">{netIsPositive ? 'ahead' : 'behind'}</span>
          </div>
          <div className="text-[12px] text-muted mt-0.5">
            reviewed {stats.decisions_today ?? 0} · {stats.new_today ?? 0} new received
          </div>
        </div>

        {/* Metric grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <MiniMetric label="In queue" value={stats.pending} hint="pending" />
          <MiniMetricLink
            label="Oldest"
            value={stats.oldest_waiting_text}
            hint="waiting"
            href={stats.oldest_waiting_id ? `/review/${stats.oldest_waiting_id}` : undefined}
          />
          <MiniMetric label="Approval" value={stats.approval_rate !== null ? `${stats.approval_rate}%` : '—'} hint="all time" />
          <MiniMetric label="This week" value={stats.decisions_this_week} hint="reviewed" />
        </div>

        {/* All time */}
        <div className="mt-auto pt-3 border-t border-border">
          <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-2">All time</div>
          <div className="grid grid-cols-3 gap-2">
            <Tally value={stats.approved} label="approved" tone="green" />
            <Tally value={stats.returned} label="returned" tone="red" />
            <Tally value={stats.decided} label="reviewed" tone="neutral" />
          </div>
        </div>
      </div>

      {/* Leaderboard card */}
      <div className="rounded-xl bg-surface border border-border p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-accent" />
            <span className="text-[11px] uppercase tracking-wider text-muted font-bold">Leaderboard</span>
          </div>
          <div className="flex items-center bg-bg rounded-lg p-0.5 border border-border">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
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

        <div className="flex-1 space-y-1">
          {(leaderboards[period] ?? []).slice(0, 7).map((row) => {
            const rankStyle = RANK_COLORS[row.position] || 'bg-surface2 text-subtext border-border';
            return (
              <div
                key={`${period}-${row.position}`}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-bg/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-md border text-[12px] font-bold ${rankStyle}`}>
                    {row.position}
                  </span>
                  <span className="text-[15px] text-text truncate">{row.name}</span>
                </div>
                <span className="text-[15px] font-mono font-semibold text-accent">{row.count}</span>
              </div>
            );
          })}
          {(leaderboards[period] ?? []).length === 0 && (
            <p className="text-[13px] text-muted py-4 text-center">No leaderboard data.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-bg border border-border">
      <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-0.5">{label}</div>
      <div className="text-lg font-bold text-text truncate">{value}</div>
      {hint && <div className="text-[10px] text-muted">{hint}</div>}
    </div>
  );
}

function MiniMetricLink({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className="p-2.5 rounded-lg bg-bg border border-border hover:border-accent transition-colors cursor-pointer">
      <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-0.5">{label}</div>
      <div className="text-lg font-bold text-text truncate">{value}</div>
      {hint && <div className="text-[10px] text-muted">{hint}</div>}
    </div>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}

function Tally({ value, label, tone }: { value: number; label: string; tone: 'green' | 'red' | 'neutral' }) {
  const colors = {
    green: 'text-green',
    red: 'text-red',
    neutral: 'text-text',
  };
  return (
    <div className="text-center p-2 rounded-lg bg-bg border border-border">
      <div className={`text-xl font-bold ${colors[tone]}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</div>
    </div>
  );
}
