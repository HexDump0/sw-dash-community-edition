import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  CheckCircle2,
  XCircle,
  BarChart3,
  Clock,
  Wallet,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyStats } from '../types';

export function StatsPage() {
  const [data, setData] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutOpen, setPayoutOpen] = useState(false);

  useEffect(() => {
    fetch('/fixtures/mystats.json')
      .then((r) => r.json())
      .then((d: MyStats) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen starfield flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { stats, history } = data;

  return (
    <div className="min-h-screen starfield py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-subtext hover:text-accent transition-colors font-bold mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to queue
        </Link>

        <h1 className="text-4xl font-bold text-text font-display italic mb-8">
          My Review Stats
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total reviews" value={stats.total} icon={BarChart3} accent="text-text" />
          <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="text-green" />
          <StatCard label="Returned" value={stats.returned} icon={XCircle} accent="text-red" />
          <StatCard label="Approval rate" value={`${stats.approvalRate ?? 0}%`} icon={Clock} accent="text-accent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:row-span-2 card-surface2 p-6 h-fit"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-accent-subtle">
                <Star className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-text">Stardust</h2>
            </div>

            <div className="text-center py-6">
              <div className="text-7xl font-bold gradient-text mb-2">{stats.unclaimed}</div>
              <div className="text-sm font-bold uppercase tracking-widest text-muted">balance</div>
            </div>

            <div className="mt-6">
              {stats.pendingPayout ? (
                <div className="w-full py-3 px-4 rounded-full bg-yellow-subtle border border-yellow/30 text-yellow text-center font-bold">
                  {stats.pendingPayout}
                </div>
              ) : stats.unclaimed < 10 ? (
                <div className="w-full py-3 px-4 rounded-full bg-surface2 border border-border text-muted text-center font-bold">
                  Need 10+ stardust
                </div>
              ) : (
                <button
                  onClick={() => setPayoutOpen(true)}
                  className="action-btn action-btn--large action-btn--primary w-full"
                >
                  <Wallet className="w-5 h-5" />
                  Request Payout
                </button>
              )}
            </div>

            {payoutOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 rounded-lg bg-bg border border-border"
              >
                <label className="block text-xs font-bold uppercase tracking-wider text-subtext mb-2">
                  Amount to request
                </label>
                <input
                  type="number"
                  min={10}
                  max={stats.unclaimed}
                  defaultValue={stats.unclaimed}
                  className="ws-input mb-3"
                />
                <p className="text-xs text-muted mb-3">
                  Minimum 10 ✦, maximum {stats.unclaimed} ✦
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPayoutOpen(false)}
                    className="action-btn action-btn--small action-btn--secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button className="action-btn action-btn--small action-btn--primary flex-1">
                    Submit
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 card-surface2 p-5"
          >
            <h2 className="text-xl font-bold text-text flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-accent" />
              History
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Activity</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Status</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Amount</th>
                    <th className="pb-3 text-xs font-bold uppercase tracking-wider text-muted">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item, i) => (
                    <motion.tr
                      key={`${item.id}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text">{item.title}</span>
                          <span className="text-xs text-muted font-mono">#{item.id}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        {item.isPayout ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-mauve-subtle text-mauve">
                            Payout
                          </span>
                        ) : (
                          <StatusBadge status={item.status} />
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`font-bold ${item.isPayout ? 'text-red' : 'text-green'}`}>
                          {item.isPayout ? '-' : '+'}{item.amount} ✦
                        </span>
                      </td>
                      <td className="py-3 text-sm text-subtext">{item.date}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="card-surface2 p-5"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-subtext">{label}</span>
        <Icon className="w-5 h-5 text-muted" />
      </div>
      <div className={`text-4xl font-bold ${accent}`}>{value}</div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const colors: Record<string, string> = {
    approved: 'bg-green-subtle text-green border-green/30',
    returned: 'bg-red-subtle text-red border-red/30',
    pending: 'bg-yellow-subtle text-yellow border-yellow/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[normalized] || colors.pending}`}>
      {status}
    </span>
  );
}
