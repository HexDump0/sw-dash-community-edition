import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  List,
  Search,
  Clock,
  RefreshCw,
  Lock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { QueueData, QueueShip } from '../types';
import { waitingFor, formatTypeName, timeAgo } from '../lib/utils';

const sortOptions = [
  { id: 'longest-wait', label: 'Longest wait' },
  { id: 'shortest-wait', label: 'Shortest wait' },
  { id: 'type', label: 'Type' },
  { id: 'title', label: 'Title' },
];

// Mock past reviews for demo
const myPastReviews = [
  { id: 101, projectTitle: 'Portfolio', userName: 'Alex', status: 'returned', reviewedAt: '2026-06-16T10:00:00Z', projectType: 'web_playable' },
  { id: 102, projectTitle: 'Todo CLI', userName: 'Sam', status: 'approved', reviewedAt: '2026-06-15T14:00:00Z', projectType: 'cross_platform_playable' },
];

const allPastReviews = [
  { id: 201, projectTitle: 'Weather Bot', userName: 'Jordan', reviewerName: 'frog', status: 'approved', reviewedAt: '2026-06-16T08:00:00Z', projectType: 'web_playable' },
  { id: 202, projectTitle: 'LED Matrix', userName: 'Casey', reviewerName: 'Carlson', status: 'approved', reviewedAt: '2026-06-15T22:00:00Z', projectType: 'hardware' },
];

export function QueuePage() {
  const [data, setData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState('longest-wait');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetch('/fixtures/queue.json')
      .then((r) => r.json())
      .then((d: QueueData) => {
        setData(d);
        setLoading(false);
      });
  }, []);

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

  if (loading || !data) {
    return (
      <div className="h-screen bg-[#08061E] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#F4EBB9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#08061E] overflow-hidden">
      {/* Top bar */}
      <div className="h-14 shrink-0 bg-[#0E0C25] border-b border-[rgba(131,130,141,0.25)] flex items-center justify-between px-6">
        <div className="font-bold text-[18px] text-[#F4EBB9]">
          Stardance <span className="text-white font-normal text-[13px] ml-2">Ship Review</span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[13px] text-[#AFB2C1]">{filteredShips.length} of {data.ships.length} projects</p>
          <Link
            to="/stats"
            className="py-1.5 px-3.5 rounded-md border border-[rgba(131,130,141,0.25)] bg-[#343651] text-[#AFB2C1] text-[12px] font-bold hover:border-[#F4EBB9] hover:text-[#F4EBB9] transition-all"
          >
            Stats
          </Link>
          <button className="py-1.5 px-3.5 rounded-md border border-[rgba(131,130,141,0.25)] bg-[#343651] text-[#AFB2C1] text-[12px] font-bold hover:border-[#F4EBB9] hover:text-[#F4EBB9] transition-all">
            <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 bg-[#0E0C25] border-b border-[rgba(131,130,141,0.25)] px-6 py-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#83828D]" />
          <input
            type="text"
            placeholder="Search by project or author name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2.5 pl-10 pr-3 bg-[#08061E] border border-[rgba(131,130,141,0.25)] rounded-lg text-white text-sm outline-none transition-all placeholder:text-[#83828D] focus:border-[#F4EBB9]"
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
                  ? 'bg-[rgba(244,235,185,0.12)] border-[#F4EBB9] text-[#F4EBB9]'
                  : 'border-[rgba(131,130,141,0.25)] bg-[#343651] text-[#AFB2C1] hover:border-[#F4EBB9] hover:text-white'
                }
              `}
            >
              {formatTypeName(type)}
            </button>
          ))}
          {selectedTypes.size > 0 && (
            <button
              onClick={() => setSelectedTypes(new Set())}
              className="py-1.5 px-3.5 rounded-[20px] border border-[rgba(131,130,141,0.25)] bg-transparent text-[#AFB2C1] text-[12px] font-bold underline hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Pending queue */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] uppercase tracking-wider text-[#83828D] font-semibold">
              Pending Queue
              <span className="text-white/60 font-normal normal-case ml-1">({filteredShips.length})</span>
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSort(opt.id)}
                    className={`
                      py-1 px-2.5 rounded-md text-[11px] font-bold transition-all
                      ${sort === opt.id
                        ? 'bg-[rgba(244,235,185,0.12)] text-[#F4EBB9] border border-[rgba(244,235,185,0.3)]'
                        : 'text-[#AFB2C1] hover:text-white'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center bg-[#343651] border border-[rgba(131,130,141,0.25)] rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#0E0C25] border border-[rgba(131,130,141,0.25)] text-[#F4EBB9]' : 'text-[#AFB2C1] hover:text-white'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#0E0C25] border border-[rgba(131,130,141,0.25)] text-[#F4EBB9]' : 'text-[#AFB2C1] hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] content-start gap-4">
              {filteredShips.map((ship, i) => (
                <GalleryCard key={ship.id} ship={ship} index={i} />
              ))}
              {filteredShips.length === 0 && (
                <p className="col-span-full text-center text-[#AFB2C1] py-12">No projects match your filters.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col border border-[rgba(131,130,141,0.25)] rounded-[10px] bg-[#0E0C25] overflow-hidden">
              <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_120px] gap-3 items-center p-3 border-b border-[rgba(131,130,141,0.25)] text-[11px] text-[#83828D] uppercase tracking-wider font-semibold">
                <div>Project</div>
                <div>Author</div>
                <div>Type</div>
                <div>Wait</div>
                <div>Status</div>
              </div>
              {filteredShips.map((ship) => (
                <ListRow key={ship.id} ship={ship} />
              ))}
            </div>
          )}
        </section>

        {/* My past reviews */}
        <section className="mb-6">
          <h2 className="text-[13px] uppercase tracking-wider text-[#83828D] font-semibold mb-3">
            My Past Reviews <span className="text-white/60 font-normal normal-case ml-1">({myPastReviews.length})</span>
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] content-start gap-4">
            {myPastReviews.map((review) => (
              <PastReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>

        {/* All past reviews */}
        <section className="pb-6">
          <h2 className="text-[13px] uppercase tracking-wider text-[#83828D] font-semibold mb-3">
            All Past Reviews <span className="text-white/60 font-normal normal-case ml-1">({allPastReviews.length})</span>
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] content-start gap-4">
            {allPastReviews.map((review) => (
              <PastReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function GalleryCard({ ship, index }: { ship: QueueShip; index: number }) {
  const waitingHours = ship.waitingHours || 7 * 24;
  const isStale = waitingHours >= 72;
  const isMedium = waitingHours >= 24 && waitingHours < 72;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link
        to={`/review/${ship.id}`}
        className="flex flex-col gap-1.5 p-5 bg-[#0E0C25] border border-[rgba(131,130,141,0.25)] rounded-[10px] cursor-pointer transition-all duration-150 hover:border-[#F4EBB9] hover:bg-[#343651] h-full"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-semibold text-white leading-snug">{ship.projectTitle}</p>
          {ship.claimState === 'locked' && (
            <Lock className="w-4 h-4 text-[#FFD598] shrink-0" />
          )}
        </div>
        <p className="text-[13px] text-[#AFB2C1]">{ship.ownerDisplayName}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2">
          {ship.projectType && (
            <span className="inline-block py-0.5 px-2.5 bg-[rgba(244,235,185,0.12)] text-[#F4EBB9] rounded-xl text-[11px] font-bold">
              {formatTypeName(ship.projectType)}
            </span>
          )}
          <span
            className={`
              inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold border
              ${isStale ? 'bg-[rgba(255,141,157,0.12)] text-[#FF8D9D] border-[rgba(255,141,157,0.3)]' :
                isMedium ? 'bg-[rgba(255,213,152,0.12)] text-[#FFD598] border-[rgba(255,213,152,0.3)]' :
                'bg-[#343651] text-[#AFB2C1] border-[rgba(131,130,141,0.25)]'}
            `}
          >
            <Clock className="w-3 h-3" />
            Waiting {waitingFor(new Date(Date.now() - waitingHours * 3600000).toISOString())}
          </span>
          {ship.hasBadReview && (
            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold bg-[rgba(255,141,157,0.12)] text-[#FF8D9D] border border-[rgba(255,141,157,0.3)]">
              <AlertTriangle className="w-3 h-3" />
              Bad review
            </span>
          )}
          {ship.claimState === 'locked' && (
            <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold bg-[rgba(255,213,152,0.12)] text-[#FFD598] border border-[rgba(255,213,152,0.3)]">
              <Lock className="w-3 h-3" />
              {ship.claimReviewerDisplayName}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function ListRow({ ship }: { ship: QueueShip }) {
  const waitingHours = ship.waitingHours || 7 * 24;
  const isStale = waitingHours >= 72;

  return (
    <Link
      to={`/review/${ship.id}`}
      className="grid grid-cols-[2fr_1.2fr_1fr_1fr_120px] gap-3 items-center p-3 border-b border-[rgba(131,130,141,0.15)] last:border-0 hover:bg-[#343651] transition-colors"
    >
      <div className="font-semibold text-[14px] text-white truncate">{ship.projectTitle}</div>
      <div className="text-[13px] text-[#AFB2C1] truncate">{ship.ownerDisplayName}</div>
      <div>
        <span className="inline-block py-0.5 px-2 bg-[rgba(244,235,185,0.12)] text-[#F4EBB9] rounded-xl text-[11px] font-bold truncate max-w-full">
          {formatTypeName(ship.projectType)}
        </span>
      </div>
      <div>
        <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold border ${isStale ? 'bg-[rgba(255,141,157,0.12)] text-[#FF8D9D] border-[rgba(255,141,157,0.3)]' : 'bg-[#343651] text-[#AFB2C1] border-[rgba(131,130,141,0.25)]'}`}>
          <Clock className="w-3 h-3" />
          {waitingFor(new Date(Date.now() - waitingHours * 3600000).toISOString())}
        </span>
      </div>
      <div className="text-[12px] text-[#AFB2C1]">
        {ship.claimState === 'locked' ? (
          <span className="flex items-center gap-1 text-[#FFD598]">
            <Lock className="w-3 h-3" />
            Claimed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[#81FFFF]">
            Open
            <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </Link>
  );
}

function PastReviewCard({ review }: { review: { id: number; projectTitle: string; userName: string; status: string; reviewedAt: string; projectType: string; reviewerName?: string } }) {
  return (
    <Link
      to={`/review/${review.id}`}
      className="flex flex-col gap-1.5 p-4 bg-[#0E0C25] border border-[rgba(131,130,141,0.25)] rounded-[10px] cursor-pointer transition-all duration-150 hover:border-[#F4EBB9] hover:bg-[#343651]"
    >
      <p className="text-[15px] font-semibold text-white">{review.projectTitle}</p>
      <p className="text-[13px] text-[#AFB2C1]">{review.userName}</p>
      <div className="flex items-center gap-1.5 flex-wrap mt-1">
        <span className={`inline-flex items-center gap-1 py-0.5 px-2 rounded-xl text-[11px] font-bold border ${
          review.status === 'approved'
            ? 'bg-[rgba(129,255,255,0.12)] text-[#81FFFF] border-[rgba(129,255,255,0.3)]'
            : 'bg-[rgba(255,141,157,0.12)] text-[#FF8D9D] border-[rgba(255,141,157,0.3)]'
        }`}>
          {review.status}
        </span>
        <span className="inline-block py-0.5 px-2 bg-[rgba(244,235,185,0.12)] text-[#F4EBB9] rounded-xl text-[11px] font-bold">
          {formatTypeName(review.projectType)}
        </span>
      </div>
      <div className="text-[11px] text-[#83828D] mt-1">
        {review.reviewerName ? `by ${review.reviewerName} · ` : ''}{timeAgo(review.reviewedAt)}
      </div>
    </Link>
  );
}
