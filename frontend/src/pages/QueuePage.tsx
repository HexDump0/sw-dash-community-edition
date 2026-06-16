import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Clock,
  RefreshCw,
  Lock,
  AlertTriangle,
  ArrowRight,
  List,
  LayoutGrid,
  Table as TableIcon,
  User,
} from 'lucide-react';
import type { QueueData, QueueShip } from '../types';
import { waitingFor, formatTypeName, useNow } from '../lib/utils';
import { QueueStatsPanel } from '../components/queue/QueueStatsPanel';

const sortOptions = [
  { id: 'longest-wait', label: 'Longest wait' },
  { id: 'shortest-wait', label: 'Shortest wait' },
  { id: 'type', label: 'Type' },
  { id: 'title', label: 'Title' },
];

const SORT_KEY = 'stardance.queueSort';
const VIEW_KEY = 'stardance.queueViewMode';

type ViewMode = 'list' | 'grid' | 'table';

interface Reviewer {
  name: string;
  slackUserId: string;
}

function cachetAvatarUrl(slackUserId: string | null): string | null {
  if (!slackUserId) return null;
  return `https://cachet.hackclub.com/users/${slackUserId}/r`;
}

function getStoredSort(): string {
  try {
    const v = localStorage.getItem(SORT_KEY);
    if (v && sortOptions.some((o) => o.id === v)) return v;
  } catch {
    // ignore storage errors
  }
  return 'longest-wait';
}

function getStoredView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY) as ViewMode;
    if (v === 'list' || v === 'grid' || v === 'table') return v;
  } catch {
    // ignore storage errors
  }
  return 'grid';
}

export function QueuePage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [reviewer, setReviewer] = useState<Reviewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState(getStoredSort);
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredView);

  useEffect(() => {
    Promise.all([
      fetch('/fixtures/queue.json').then((r) => r.json()),
      fetch('/fixtures/reviewer.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([queueData, reviewerData]) => {
      setData(queueData as QueueData);
      setReviewer(reviewerData as Reviewer | null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY, sort);
    } catch {
      // ignore storage errors
    }
  }, [sort]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, viewMode);
    } catch {
      // ignore storage errors
    }
  }, [viewMode]);

  const projectTypes = useMemo(() => {
    if (!data) return [];
    const types = new Set(data.ships.map((s) => s.projectType).filter(Boolean));
    return Array.from(types).sort();
  }, [data]);

  const filteredShips = useMemo(() => {
    if (!data) return [];
    let ships = [...data.ships];

    if (search.trim()) {
      const q = search.toLowerCase();
      ships = ships.filter(
        (s) =>
          s.projectTitle.toLowerCase().includes(q) ||
          s.ownerDisplayName.toLowerCase().includes(q)
      );
    }

    if (selectedTypes.size > 0) {
      ships = ships.filter((s) => selectedTypes.has(s.projectType));
    }

    switch (sort) {
      case 'longest-wait':
        ships.sort((a, b) => (b.waitingHours || 0) - (a.waitingHours || 0));
        break;
      case 'shortest-wait':
        ships.sort((a, b) => (a.waitingHours || 0) - (b.waitingHours || 0));
        break;
      case 'type':
        ships.sort((a, b) => a.projectType.localeCompare(b.projectType));
        break;
      case 'title':
        ships.sort((a, b) => a.projectTitle.localeCompare(b.projectTitle));
        break;
    }

    return ships;
  }, [data, search, selectedTypes, sort]);

  const toggleType = (type: string) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setSelectedTypes(next);
  };

  const changeSort = (id: string) => {
    setSort(id);
  };

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
  };

  if (loading || !data) {
    return (
      <div className="h-screen bg-bg flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg overflow-hidden">
      {/* Top bar */}
      <div className="h-14 shrink-0 bg-surface border-b border-border flex items-center justify-between px-6">
        <div className="font-bold text-[18px] text-accent">
          Shipwright <span className="text-text font-normal text-[13px] ml-2">Review Queue</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="py-1.5 px-3.5 rounded-md border border-border bg-surface2 text-subtext text-[12px] font-bold hover:border-accent hover:text-accent transition-all">
            <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
            Refresh
          </button>
          <ReviewerBadge reviewer={reviewer} />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <QueueStatsPanel stats={data.stats} leaderboards={data.leaderboards} />

        {/* Search + filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by project or author name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2.5 pl-10 pr-3 bg-surface border border-border rounded-lg text-text text-sm outline-none transition-all placeholder:text-muted focus:border-accent"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {projectTypes.map((type) => (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`
                  py-1.5 px-3.5 rounded-[20px] border text-[12px] font-bold transition-all
                  ${selectedTypes.has(type)
                    ? 'bg-accent-subtle border-accent text-accent'
                    : 'border-border bg-surface2 text-subtext hover:border-accent hover:text-text'
                  }
                `}
              >
                {formatTypeName(type)}
              </button>
            ))}
            {selectedTypes.size > 0 && (
              <button
                onClick={() => setSelectedTypes(new Set())}
                className="py-1.5 px-3.5 rounded-[20px] border border-border bg-transparent text-subtext text-[12px] font-bold underline hover:text-text"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] uppercase tracking-wider text-muted font-semibold">
              Pending
              <span className="text-text/60 font-normal normal-case ml-1">({filteredShips.length})</span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => changeSort(opt.id)}
                    className={`
                      py-1 px-2.5 rounded-md text-[11px] font-bold transition-all
                      ${sort === opt.id
                        ? 'bg-accent-subtle text-accent border border-accent/30'
                        : 'text-subtext hover:text-text'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-surface2 border border-border rounded-lg p-0.5">
                <ViewToggleButton mode="list" current={viewMode} onChange={changeView} icon={List} />
                <ViewToggleButton mode="grid" current={viewMode} onChange={changeView} icon={LayoutGrid} />
                <ViewToggleButton mode="table" current={viewMode} onChange={changeView} icon={TableIcon} />
              </div>
            </div>
          </div>

          {viewMode === 'list' && (
            <div className="flex flex-col gap-2">
              {filteredShips.map((ship, i) => (
                <QueueRow key={ship.id} ship={ship} index={i} />
              ))}
              {filteredShips.length === 0 && (
                <p className="text-center text-subtext py-12">No projects match your filters.</p>
              )}
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] content-start gap-4">
              {filteredShips.map((ship, i) => (
                <GalleryCard key={ship.id} ship={ship} index={i} />
              ))}
              {filteredShips.length === 0 && (
                <p className="col-span-full text-center text-subtext py-12">No projects match your filters.</p>
              )}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="flex flex-col border border-border rounded-lg bg-surface overflow-hidden">
              <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_120px] gap-3 items-center p-3 border-b border-border text-[11px] text-muted uppercase tracking-wider font-semibold">
                <div>Project</div>
                <div>Author</div>
                <div>Type</div>
                <div>Wait</div>
                <div>Status</div>
              </div>
              {filteredShips.map((ship) => (
                <TableRow key={ship.id} ship={ship} />
              ))}
              {filteredShips.length === 0 && (
                <p className="text-center text-subtext py-12">No projects match your filters.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ReviewerBadge({ reviewer }: { reviewer: Reviewer | null }) {
  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = cachetAvatarUrl(reviewer?.slackUserId || null);

  return (
    <div className="flex items-center gap-2 pl-2 border-l border-border ml-1">
      <span className="hidden sm:block text-[13px] text-text font-semibold">{reviewer?.name || 'Reviewer'}</span>
      {avatarUrl && !avatarError ? (
        <img
          src={avatarUrl}
          alt={reviewer?.name || 'Reviewer'}
          onError={() => setAvatarError(true)}
          className="w-8 h-8 rounded-full border border-border object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-surface2 border border-border flex items-center justify-center">
          <User className="w-4 h-4 text-muted" />
        </div>
      )}
    </div>
  );
}

function ViewToggleButton({
  mode,
  current,
  onChange,
  icon: Icon,
}: {
  mode: ViewMode;
  current: ViewMode;
  onChange: (m: ViewMode) => void;
  icon: React.ElementType;
}) {
  const active = current === mode;
  return (
    <button
      onClick={() => onChange(mode)}
      className={`p-1.5 rounded-md transition-all ${
        active
          ? 'bg-surface border border-border text-accent'
          : 'text-subtext hover:text-text'
      }`}
      title={`${mode} view`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function QueueRow({ ship, index }: { ship: QueueShip; index: number }) {
  const waitingHours = ship.waitingHours || 7 * 24;
  const isStale = waitingHours >= 72;
  const isMedium = waitingHours >= 24 && waitingHours < 72;
  const now = useNow();
  const queuedAt = new Date(now.getTime() - waitingHours * 3600000).toISOString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
    >
      <Link
        to={`/review/${ship.id}`}
        className="group flex items-center justify-between gap-4 p-4 bg-surface border border-border rounded-lg cursor-pointer transition-all duration-150 hover:border-accent hover:bg-surface2"
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold text-text leading-snug truncate">
                {ship.projectTitle}
              </p>
              <span className="text-[11px] text-dim font-mono shrink-0">{ship.projectShipIdLabel}</span>
            </div>
            <p className="text-[13px] text-subtext truncate">by {ship.ownerDisplayName}</p>
          </div>

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {ship.projectType && (
              <span className="inline-block py-0.5 px-2.5 bg-accent-subtle text-accent rounded-xl text-[11px] font-bold">
                {formatTypeName(ship.projectType)}
              </span>
            )}
            {ship.hasBadReview && (
              <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold bg-red-subtle text-red border border-red/30">
                <AlertTriangle className="w-3 h-3" />
                Bad review
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`
              inline-flex items-center gap-1 py-1 px-2 rounded-lg text-[11px] font-bold border
              ${isStale ? 'bg-red-subtle text-red border-red/30' :
                isMedium ? 'bg-yellow-subtle text-yellow border-yellow/30' :
                'bg-surface2 text-subtext border-border'}
            `}
          >
            <Clock className="w-3 h-3" />
            Waiting {waitingFor(queuedAt)}
          </span>

          {ship.claimState === 'locked' ? (
            <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[11px] font-bold bg-yellow-subtle text-yellow border border-yellow/30">
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">{ship.claimReviewerDisplayName || 'Claimed'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[11px] font-bold bg-green-subtle text-green border border-green/30">
              Open
              <ArrowRight className="w-3 h-3" />
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function GalleryCard({ ship, index }: { ship: QueueShip; index: number }) {
  const waitingHours = ship.waitingHours || 7 * 24;
  const isStale = waitingHours >= 72;
  const isMedium = waitingHours >= 24 && waitingHours < 72;
  const now = useNow();
  const queuedAt = new Date(now.getTime() - waitingHours * 3600000).toISOString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link
        to={`/review/${ship.id}`}
        className="flex flex-col gap-1.5 p-5 bg-surface border border-border rounded-lg cursor-pointer transition-all duration-150 hover:border-accent hover:bg-surface2 h-full"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold text-text leading-snug">{ship.projectTitle}</p>
          {ship.claimState === 'locked' && (
            <Lock className="w-4 h-4 text-yellow shrink-0" />
          )}
        </div>
        <p className="text-[13px] text-subtext">{ship.ownerDisplayName}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2">
          {ship.projectType && (
            <span className="inline-block py-0.5 px-2.5 bg-accent-subtle text-accent rounded-xl text-[11px] font-bold">
              {formatTypeName(ship.projectType)}
            </span>
          )}
          <span
            className={`
              inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold border
              ${isStale ? 'bg-red-subtle text-red border-red/30' :
                isMedium ? 'bg-yellow-subtle text-yellow border-yellow/30' :
                'bg-surface2 text-subtext border-border'}
            `}
          >
            <Clock className="w-3 h-3" />
            Waiting {waitingFor(queuedAt)}
          </span>
          {ship.hasBadReview && (
            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold bg-red-subtle text-red border border-red/30">
              <AlertTriangle className="w-3 h-3" />
              Bad review
            </span>
          )}
          {ship.claimState === 'locked' && (
            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold bg-yellow-subtle text-yellow border border-yellow/30">
              <Lock className="w-3 h-3" />
              {ship.claimReviewerDisplayName}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function TableRow({ ship }: { ship: QueueShip }) {
  const waitingHours = ship.waitingHours || 7 * 24;
  const isStale = waitingHours >= 72;
  const now = useNow();
  const queuedAt = new Date(now.getTime() - waitingHours * 3600000).toISOString();

  return (
    <Link
      to={`/review/${ship.id}`}
      className="grid grid-cols-[2fr_1.2fr_1fr_1fr_120px] gap-3 items-center p-3 border-b border-border last:border-0 hover:bg-surface2 transition-colors"
    >
      <div className="font-semibold text-[14px] text-text truncate">{ship.projectTitle}</div>
      <div className="text-[13px] text-subtext truncate">{ship.ownerDisplayName}</div>
      <div>
        <span className="inline-block py-0.5 px-2 bg-accent-subtle text-accent rounded-xl text-[11px] font-bold truncate max-w-full">
          {formatTypeName(ship.projectType)}
        </span>
      </div>
      <div>
        <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold border ${isStale ? 'bg-red-subtle text-red border-red/30' : 'bg-surface2 text-subtext border-border'}`}>
          <Clock className="w-3 h-3" />
          {waitingFor(queuedAt)}
        </span>
      </div>
      <div className="text-[12px] text-subtext">
        {ship.claimState === 'locked' ? (
          <span className="flex items-center gap-1 text-yellow">
            <Lock className="w-3 h-3" />
            Claimed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-green">
            Open
            <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </Link>
  );
}
