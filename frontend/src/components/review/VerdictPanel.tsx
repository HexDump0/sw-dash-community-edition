import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Unlock, Clock } from 'lucide-react';
import type { ReviewDetail } from '../../types';

const feedbackTemplates = [
  { label: 'Great work!', body: 'This is a solid project. Approved! 🚀' },
  { label: 'Needs demo', body: 'Please add a working demo link so we can verify the project in action.' },
  { label: 'README needed', body: 'Could you add a README with setup instructions and a screenshot?' },
  { label: 'Not original', body: 'This appears to follow a tutorial closely. Please add substantial original work and resubmit.' },
];

interface VerdictPanelProps {
  review: ReviewDetail;
  onSubmitted?: () => void;
}

export function VerdictPanel({ review, onSubmitted }: VerdictPanelProps) {
  const [verdict, setVerdict] = useState<'approved' | 'returned' | null>(null);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    // TODO: wire to real verdict PATCH
    onSubmitted?.();
  };

  if (!review.claim.heldByMe) {
    return (
      <div className="p-5">
        <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-subtle border border-yellow/30">
          <span className="flex items-center gap-2 text-[13px] font-bold text-yellow">
            <Unlock className="w-4 h-4" />
            You don&apos;t hold the claim
          </span>
          <button className="action-btn action-btn--small action-btn--primary">
            Claim this review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5">
                <button className="action-btn action-btn--small action-btn--destructive w-full mb-5">
            <Unlock className="w-3.5 h-3.5" />
            Unclaim
          </button>
      {review.claim.expiresAt && (
        <div className="flex items-center justify-between p-3 mb-5 rounded-lg bg-green-subtle border border-green/30">
          <span className="flex items-center gap-2 text-[13px] font-bold text-green">
            <Clock className="w-4 h-4" />
            Claim active
          </span>
          <div className="flex flex-col items-end gap-1">
            <ClaimCountdown expiresAt={review.claim.expiresAt} />
          </div>
        </div>
      )}

      <div className="mb-5">
        <label className="block text-[11px] uppercase tracking-wider text-muted font-bold mb-3">
          Verdict
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setVerdict('approved')}
            className={`
              flex items-center justify-center gap-2 px-3 py-3 rounded-lg font-bold transition-all
              ${verdict === 'approved'
                ? 'bg-green text-bg'
                : 'bg-surface2 text-text border border-border hover:border-green'
              }
            `}
          >
            <CheckCircle2 className="w-5 h-5" />
            Approve
          </button>
          <button
            onClick={() => setVerdict('returned')}
            className={`
              flex items-center justify-center gap-2 px-3 py-3 rounded-lg font-bold transition-all
              ${verdict === 'returned'
                ? 'bg-red text-bg'
                : 'bg-surface2 text-text border border-border hover:border-red'
              }
            `}
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] uppercase tracking-wider text-muted font-bold">
            Feedback
          </label>
          <select
            className="bg-surface2 border border-border rounded-md text-[11px] text-text px-2 py-1 focus:outline-none focus:border-accent"
            onChange={(e) => {
              const t = feedbackTemplates.find((x) => x.label === e.target.value);
              if (t) setFeedback(t.body);
            }}
          >
            <option value="">Insert template...</option>
            {feedbackTemplates.map((t) => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>
        </div>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={6}
          maxLength={10000}
          className="w-full bg-bg border border-border rounded-lg p-3 text-[14px] text-text placeholder-muted focus:outline-none focus:border-accent transition-colors resize-y"
          placeholder="Write feedback visible to the project owner..."
        />
      </div>

      <div className="mb-5">
        <label className="block text-[11px] uppercase tracking-wider text-muted font-bold mb-2">
          Walkthrough video
        </label>
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors cursor-pointer">
          <p className="text-[13px] text-subtext">Drag a video here, or click to choose one</p>
          <p className="text-[12px] text-muted mt-1">mp4, webm, or mov</p>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="action-btn action-btn--large action-btn--primary w-full"
      >
        Submit verdict
      </button>
    </div>
  );
}

function ClaimCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining('Expired');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span className="font-mono text-[13px] font-bold text-green flex items-center gap-1">
      <Clock className="w-3.5 h-3.5" />
      {remaining}
    </span>
  );
}
