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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {/* Overview */}
      <div className="rounded-xl bg-surface border border-border p-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent" />
          <span className="text-[11px] uppercase tracking-wider text-muted font-bold">Overview</span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold leading-none ${netIsPositive ? 'text-green' : 'text-red'}`}>
                {netFlowText}
              </span>
              <span className="text-sm font-semibold text-subtext">{netIsPositive ? 'ahead' : 'behind'}</span>
            </div>
            <div className="text-[12px] text-muted mt-1">
              reviewed {stats.decisions_today ?? 0} · {stats.new_today ?? 0} new received
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase tracking-wider text-muted font-bold">This week</div>
            <div className="text-2xl font-bold text-text">{stats.decisions_this_week}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MiniMetric label="In queue" value={stats.pending} hint="pending" />
          <MiniMetricLink
            label="Oldest"
            value={stats.oldest_waiting_text}
            hint="waiting"
            href={stats.oldest_waiting_id ? `/review/${stats.oldest_waiting_id}` : undefined}
          />
          <MiniMetric label="Approval" value={stats.approval_rate !== null ? `${stats.approval_rate}%` : '—'} hint="all time" />
          <MiniMetric label="Overdue" value={stats.overdue_pending} hint="waiting too long" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Tally value={stats.approved} label="approved" tone="green" />
          <Tally value={stats.returned} label="returned" tone="red" />
          <Tally value={stats.decided} label="reviewed" tone="neutral" />
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl bg-surface border border-border p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-accent" />
            <span className="text-[11px] uppercase tracking-wider text-muted font-bold">Leaderboard</span>
          </div>
          <div className="flex items-center bg-bg rounded-lg p-0.5 border border-border">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
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
          {(leaderboards[period] ?? []).slice(0, 10).map((row) => {
            const rankStyle = RANK_COLORS[row.position] || 'bg-surface2 text-subtext border-border';
            return (
              <div
                key={`${period}-${row.position}`}
                className="flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-bg/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 flex items-center justify-center rounded border text-[11px] font-bold ${rankStyle}`}>
                    {row.position}
                  </span>
                  <span className="text-[14px] text-text truncate">{row.name}</span>
                </div>
                <span className="text-[14px] font-mono font-semibold text-accent">{row.count}</span>
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
    <div className="p-2 rounded-lg bg-surface2 border border-border">
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
    <div className="p-2 rounded-lg bg-surface2 border border-border hover:border-accent transition-colors cursor-pointer">
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
    <div className="p-2 rounded-lg bg-surface2 border border-border text-center">
      <div className={`text-2xl font-bold ${colors[tone]}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted font-bold">{label}</div>
    </div>
  );
}
