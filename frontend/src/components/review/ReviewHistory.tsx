import type { TimelineEvent } from '../../types';
import { timeAgo } from '../../lib/utils';

interface ReviewHistoryProps {
  timeline: TimelineEvent[];
}

export function ReviewHistory({ timeline }: ReviewHistoryProps) {
  return (
    <div className="p-4 border-t border-border">
      <h3 className="text-[11px] uppercase tracking-wider text-muted font-bold mb-3">
        Review history
      </h3>
      {timeline.length === 0 ? (
        <p className="text-[13px] text-subtext">No past reviews.</p>
      ) : (
        <div className="space-y-3">
          {timeline.map((event) => (
            <div
              key={event.id}
              className="relative pl-4 border-l-2 border-border"
            >
              <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-surface3" />
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[12px] font-bold ${
                  event.status === 'approved' ? 'text-green' :
                  event.status === 'returned' ? 'text-red' :
                  'text-yellow'
                }`}>
                  {event.status}
                </span>
                <span className="text-[11px] text-muted">
                  {event.date ? timeAgo(event.date) : '—'}
                </span>
              </div>
              <div className="text-[13px] text-text font-medium truncate">
                {event.title}
              </div>
              {event.reviewerName && (
                <div className="text-[11px] text-muted mt-0.5">
                  by {event.reviewerName}
                </div>
              )}
              {event.feedback && (
                <p className="text-[12px] text-subtext mt-1 line-clamp-2">
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
