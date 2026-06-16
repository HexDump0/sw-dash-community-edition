import { useState } from 'react';
import { CheckCircle2, XCircle, SkipForward, Unlock, Clock } from 'lucide-react';
import type { ReviewDetail } from '../../types';

const feedbackTemplates = [
  { label: 'Great work!', body: 'This is a solid project. Approved! 🚀' },
  { label: 'Needs demo', body: 'Please add a working demo link so we can verify the project in action.' },
  { label: 'README needed', body: 'Could you add a README with setup instructions and a screenshot?' },
  { label: 'Not original', body: 'This appears to follow a tutorial closely. Please add substantial original work and resubmit.' },
];

interface VerdictPanelProps {
  review: ReviewDetail;
}

export function VerdictPanel({ review }: VerdictPanelProps) {
  const [verdict, setVerdict] = useState<'approved' | 'returned' | null>(null);
  const [feedback, setFeedback] = useState('');

  if (!review.claim.heldByMe) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-12 h-12 rounded-full bg-[rgba(255,213,152,0.15)] flex items-center justify-center mb-4">
          <Unlock className="w-6 h-6 text-[#FFD598]" />
        </div>
        <p className="text-[#AFB2C1] mb-4">You don&apos;t hold the claim on this review.</p>
        <button className="action-btn action-btn--large action-btn--primary">
          Claim this review
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {review.claim.expiresAt && (
        <div className="flex items-center justify-between p-3 mb-6 rounded-lg bg-[rgba(129,255,255,0.1)] border border-[rgba(129,255,255,0.3)]">
          <span className="flex items-center gap-2 text-[13px] font-bold text-[#81FFFF]">
            Claim active
          </span>
          <ClaimCountdown expiresAt={review.claim.expiresAt} />
        </div>
      )}

      <div className="mb-6">
        <label className="block text-[11px] uppercase tracking-wider text-[#83828D] font-bold mb-3">
          Verdict
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setVerdict('approved')}
            className={`
              flex items-center justify-center gap-2 px-4 py-4 rounded-lg font-bold transition-all
              ${verdict === 'approved'
                ? 'bg-[#81FFFF] text-[#08061E]'
                : 'bg-[#343651] text-white border border-[rgba(131,130,141,0.25)] hover:border-[#81FFFF]'
              }
            `}
          >
            <CheckCircle2 className="w-5 h-5" />
            Approve
          </button>
          <button
            onClick={() => setVerdict('returned')}
            className={`
              flex items-center justify-center gap-2 px-4 py-4 rounded-lg font-bold transition-all
              ${verdict === 'returned'
                ? 'bg-[#FF8D9D] text-[#08061E]'
                : 'bg-[#343651] text-white border border-[rgba(131,130,141,0.25)] hover:border-[#FF8D9D]'
              }
            `}
          >
            <XCircle className="w-5 h-5" />
            Reject
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] uppercase tracking-wider text-[#83828D] font-bold">
            Feedback for the user
          </label>
          <select
            className="bg-[#343651] border border-[rgba(131,130,141,0.25)] rounded-md text-[11px] text-white px-2 py-1 focus:outline-none focus:border-[#F4EBB9]"
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
          rows={8}
          maxLength={10000}
          className="w-full bg-[#08061E] border border-[rgba(131,130,141,0.25)] rounded-lg p-4 text-[14px] text-white placeholder-[#83828D] focus:outline-none focus:border-[#F4EBB9] transition-colors resize-y"
          placeholder="Write feedback visible to the project owner..."
        />
      </div>

      <div className="mb-6">
        <label className="block text-[11px] uppercase tracking-wider text-[#83828D] font-bold mb-2">
          Walkthrough video
        </label>
        <div className="border-2 border-dashed border-[rgba(131,130,141,0.25)] rounded-lg p-8 text-center hover:border-[#F4EBB9]/50 transition-colors cursor-pointer">
          <p className="text-[13px] text-[#AFB2C1]">Drag a video here, or click to choose one</p>
          <p className="text-[12px] text-[#83828D] mt-1">mp4, webm, or mov</p>
        </div>
      </div>

      <div className="space-y-2">
        <button className="action-btn action-btn--large action-btn--primary w-full">
          Submit verdict
        </button>
        <div className="flex gap-2">
          <button className="action-btn action-btn--small action-btn--secondary flex-1">
            <SkipForward className="w-4 h-4" />
            Skip
          </button>
          <button className="action-btn action-btn--small action-btn--destructive flex-1">
            <Unlock className="w-4 h-4" />
            Unclaim
          </button>
        </div>
      </div>
    </div>
  );
}

function ClaimCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('');

  useState(() => {
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
  });

  return (
    <span className="font-mono text-[13px] font-bold text-[#81FFFF] flex items-center gap-1">
      <Clock className="w-3.5 h-3.5" />
      {remaining}
    </span>
  );
}
