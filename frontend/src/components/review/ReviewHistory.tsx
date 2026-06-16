import type { TimelineEvent } from '../../types';
import { timeAgo } from '../../lib/utils';

interface ReviewHistoryProps {
  timeline: TimelineEvent[];
}

export function ReviewHistory({ timeline }: ReviewHistoryProps) {
  return (
    <div className="p-4 border-t border-[rgba(131,130,141,0.25)]">
      <h3 className="text-[11px] uppercase tracking-wider text-[#83828D] font-bold mb-3">
        Review history
      </h3>
      {timeline.length === 0 ? (
        <p className="text-[13px] text-[#AFB2C1]">No past reviews.</p>
      ) : (
        <div className="space-y-3">
          {timeline.map((event) => (
            <div
              key={event.id}
              className="relative pl-4 border-l-2 border-[rgba(131,130,141,0.25)]"
            >
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[#343651]" />
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[12px] font-bold ${
                  event.status === 'approved' ? 'text-[#81FFFF]' :
                  event.status === 'returned' ? 'text-[#FF8D9D]' :
                  'text-[#FFD598]'
                }`}>
                  {event.status}
                </span>
                <span className="text-[11px] text-[#83828D]">
                  {event.date ? timeAgo(event.date) : '—'}
                </span>
              </div>
              <div className="text-[13px] text-white font-medium truncate">
                {event.title}
              </div>
              {event.feedback && (
                <p className="text-[12px] text-[#AFB2C1] mt-1 line-clamp-2">
                  {event.feedback}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
