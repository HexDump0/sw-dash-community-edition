import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Unlock, Clock, Sparkles, Plus, Save } from 'lucide-react';
import type { ReviewDetail } from '../../types';
import { claimReview, unclaimReview, submitVerdict, ApiError, getFeedbackTemplates, saveFeedbackTemplate } from '../../lib/api';
import { fixGrammar } from '../../lib/harper';

const BUILTIN_TEMPLATES = [
  { label: 'Great work!', body: 'This is a solid project. Approved! 🚀' },
  { label: 'Needs demo', body: 'Please add a working demo link so we can verify the project in action.' },
  { label: 'README needed', body: 'Could you add a README with setup instructions and a screenshot?' },
  { label: 'Not original', body: 'This appears to follow a tutorial closely. Please add substantial original work and resubmit.' },
];

interface SavedTemplate {
  id: number;
  label: string;
  body: string;
}

interface VerdictPanelProps {
  review: ReviewDetail;
  certId: number;
  onSubmitted?: () => void;
  onRefresh?: () => void;
}

export function VerdictPanel({ review, certId, onSubmitted, onRefresh }: VerdictPanelProps) {
  const [verdict, setVerdict] = useState<'approved' | 'returned' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [grammarBusy, setGrammarBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getFeedbackTemplates()
      .then((templates) => setSavedTemplates(templates))
      .catch(() => setSavedTemplates([]));
  }, []);

  const handleClaim = async () => {
    setBusy(true);
    setError(null);
    try {
      await claimReview(certId);
      onRefresh?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Claim failed');
    } finally {
      setBusy(false);
    }
  };

  const handleUnclaim = async () => {
    setBusy(true);
    setError(null);
    try {
      await unclaimReview(certId);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Unclaim failed');
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!verdict) return;
    setBusy(true);
    setError(null);
    try {
      if (!review.claim.heldByMe) {
        await claimReview(certId);
      }
      await submitVerdict(certId, verdict, feedback, video);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verdict failed');
      setBusy(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) setVideo(file);
  };

  return (
    <div className="p-5">
      {!review.claim.heldByMe ? (
        <>
          <button
            onClick={handleClaim}
            disabled={busy}
            className="action-btn action-btn--large action-btn--primary w-full mb-3 disabled:opacity-50"
          >
            {busy ? 'Claiming…' : 'Claim this review'}
          </button>
          <div className="flex items-center p-3 mb-5 rounded-lg bg-yellow-subtle border border-yellow/30">
            <span className="flex items-center gap-2 text-[13px] font-bold text-yellow">
              <Unlock className="w-4 h-4" />
              You don&apos;t hold the claim
            </span>
          </div>
        </>
      ) : (
        <>
          <button
            onClick={handleUnclaim}
            disabled={busy}
            className="action-btn action-btn--small action-btn--destructive w-full mb-5 disabled:opacity-50"
          >
            <Unlock className="w-3.5 h-3.5" />
            {busy ? 'Working…' : 'Unclaim'}
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
        </>
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
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!feedback.trim()) return;
                setGrammarBusy(true);
                setError(null);
                try {
                  const corrected = await fixGrammar(feedback);
                  setFeedback(corrected);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Grammar fix failed');
                } finally {
                  setGrammarBusy(false);
                }
              }}
              disabled={grammarBusy || !feedback.trim()}
              className="inline-flex items-center gap-1 py-1 px-2 rounded-md border border-border bg-surface2 text-subtext text-[11px] font-bold hover:border-accent hover:text-accent transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              {grammarBusy ? 'Fixing…' : 'Fix grammar'}
            </button>
            <select
              className="bg-surface2 border border-border rounded-md text-[11px] text-text px-2 py-1 focus:outline-none focus:border-accent"
              value=""
              onChange={(e) => {
                const [source, key] = e.target.value.split(':');
                if (source === 'builtin') {
                  const t = BUILTIN_TEMPLATES.find((x) => x.label === key);
                  if (t) setFeedback(t.body);
                } else if (source === 'saved') {
                  const t = savedTemplates.find((x) => String(x.id) === key);
                  if (t) setFeedback(t.body);
                }
                e.target.value = '';
              }}
            >
              <option value="">Insert template...</option>
              {BUILTIN_TEMPLATES.length > 0 && (
                <optgroup label="Built-in">
                  {BUILTIN_TEMPLATES.map((t) => (
                    <option key={`builtin:${t.label}`} value={`builtin:${t.label}`}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {savedTemplates.length > 0 && (
                <optgroup label="Saved">
                  {savedTemplates.map((t) => (
                    <option key={`saved:${t.id}`} value={`saved:${t.id}`}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <button
              onClick={async () => {
                if (!feedback.trim()) return;
                const label = window.prompt('Name this template:', feedback.trim().slice(0, 40));
                if (!label?.trim()) return;
                setTemplateBusy(true);
                setError(null);
                try {
                  await saveFeedbackTemplate(label.trim(), feedback.trim());
                  const updated = await getFeedbackTemplates();
                  setSavedTemplates(updated);
                } catch (e) {
                  setError(e instanceof ApiError ? e.message : 'Save template failed');
                } finally {
                  setTemplateBusy(false);
                }
              }}
              disabled={templateBusy || !feedback.trim()}
              className="inline-flex items-center gap-1 py-1 px-2 rounded-md border border-border bg-surface2 text-subtext text-[11px] font-bold hover:border-accent hover:text-accent transition-all disabled:opacity-50"
            >
              {templateBusy ? <Save className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              Save
            </button>
          </div>
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
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => setVideo(e.target.files?.[0] || null)}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e)}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors cursor-pointer"
        >
          {video ? (
            <p className="text-[13px] text-text font-medium">{video.name}</p>
          ) : (
            <>
              <p className="text-[13px] text-subtext">Drag a video here, or click to choose one</p>
              <p className="text-[12px] text-muted mt-1">mp4, webm, or mov</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 text-[12px] text-red bg-red-subtle p-3 rounded border border-red/30">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!verdict || busy}
        className="action-btn action-btn--large action-btn--primary w-full disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Submit verdict'}
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
