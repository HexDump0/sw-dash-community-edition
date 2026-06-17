import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Unlock,
  Clock,
  Sparkles,
  Plus,
  Save,
  X,
  UploadCloud,
  Trash2,
  Play,
  AlertTriangle,
} from 'lucide-react';
import type { ReviewDetail } from '../../types';
import {
  claimReview,
  unclaimReview,
  submitVerdict,
  uploadVerdictVideo,
  ApiError,
  getFeedbackTemplates,
  saveFeedbackTemplate,
} from '../../lib/api';
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
  const [videoSignedId, setVideoSignedId] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [grammarBusy, setGrammarBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [savePopupOpen, setSavePopupOpen] = useState(false);
  const [templateLabel, setTemplateLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

  const resetVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideo(null);
    setVideoSignedId(null);
    setVideoPreviewUrl(null);
    setUploadState('idle');
    setUploadProgress(0);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startUpload = async (file: File) => {
    setUploadState('uploading');
    setUploadProgress(0);
    setUploadError(null);
    try {
      const { signedId } = await uploadVerdictVideo(certId, file, (percent) => {
        setUploadProgress(percent);
      });
      setVideoSignedId(signedId);
      setUploadState('done');
    } catch (e) {
      setUploadState('error');
      setUploadError(e instanceof ApiError ? e.message : 'Video upload failed');
    }
  };

  const handleVideoSelect = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setError('Only mp4, webm, and mov videos are allowed.');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setError('Video must be smaller than 100 MB.');
      return;
    }
    setError(null);
    resetVideo();
    setVideo(file);
    setVideoPreviewUrl(URL.createObjectURL(file));
    startUpload(file);
  };

  useEffect(() => {
    getFeedbackTemplates()
      .then((templates) => setSavedTemplates(templates))
      .catch(() => setSavedTemplates([]));
  }, []);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

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
      await submitVerdict(certId, verdict, feedback, videoSignedId);
      onSubmitted?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verdict failed');
      setBusy(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleVideoSelect(e.dataTransfer.files?.[0]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <div className="flex items-center gap-1.5">
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
              title={grammarBusy ? 'Fixing grammar…' : 'Fix grammar'}
              className="flex items-center gap-1 py-1 px-2 rounded-md border border-border bg-surface2 text-subtext text-[11px] font-bold hover:border-accent hover:text-accent transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {grammarBusy ? 'Fixing…' : 'Fix'}
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
              <option value="">Templates</option>
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
              onClick={() => {
                setTemplateLabel(feedback.trim().slice(0, 40));
                setSavePopupOpen(true);
              }}
              disabled={templateBusy || !feedback.trim()}
              title="Save current feedback as a template"
              className="flex items-center gap-1 py-1 px-2 rounded-md border border-border bg-surface2 text-subtext text-[11px] font-bold hover:border-accent hover:text-accent transition-all disabled:opacity-50 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
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
          onChange={(e) => handleVideoSelect(e.target.files?.[0])}
        />

        {videoPreviewUrl ? (
          <div className="rounded-lg border border-border overflow-hidden bg-bg">
            <div className="relative aspect-video bg-black group">
              <video
                src={videoPreviewUrl}
                className="w-full h-full object-contain"
                controls
                preload="metadata"
              />
            </div>
            <div className="p-3 flex items-center justify-between gap-3 border-t border-border">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-text truncate">{video?.name}</p>
                <p className="text-[11px] text-muted">{video ? formatFileSize(video.size) : ''}</p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadState === 'uploading'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-surface2 text-subtext text-[11px] font-bold hover:border-accent hover:text-accent transition-all disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Replace
              </button>
              <button
                onClick={resetVideo}
                disabled={uploadState === 'uploading'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-red/30 bg-red-subtle text-red text-[11px] font-bold hover:bg-red/20 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>

            {uploadState === 'uploading' && (
              <div className="px-3 pb-3 border-t border-border pt-3">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-subtext font-medium">Uploading…</span>
                  <span className="text-muted">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadState === 'done' && (
              <div className="px-3 pb-3 border-t border-border pt-3 flex items-center gap-2 text-[12px] text-green">
                <CheckCircle2 className="w-4 h-4" />
                <span>Video uploaded and ready</span>
              </div>
            )}

            {uploadState === 'error' && (
              <div className="px-3 pb-3 border-t border-border pt-3">
                <div className="flex items-start gap-2 text-[12px] text-red mb-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError || 'Upload failed'}</span>
                </div>
                <button
                  onClick={() => video && startUpload(video)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-surface2 text-subtext text-[11px] font-bold hover:border-accent hover:text-accent transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  Retry upload
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e)}
            className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-8 h-8 text-muted mx-auto mb-2" />
            <p className="text-[13px] text-subtext">Drag a video here, or click to choose one</p>
            <p className="text-[12px] text-muted mt-1">mp4, webm, or mov · up to 100 MB</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-5 text-[12px] text-red bg-red-subtle p-3 rounded border border-red/30">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!verdict || busy || (video !== null && uploadState !== 'done')}
        className="action-btn action-btn--large action-btn--primary w-full disabled:opacity-50"
      >
        {busy ? 'Submitting…' : video && uploadState !== 'done' ? 'Uploading video…' : 'Submit verdict'}
      </button>

      {savePopupOpen && (
        <SaveTemplatePopup
          label={templateLabel}
          onLabelChange={setTemplateLabel}
          onCancel={() => setSavePopupOpen(false)}
          onSave={async () => {
            if (!templateLabel.trim() || !feedback.trim()) return;
            setTemplateBusy(true);
            setError(null);
            try {
              await saveFeedbackTemplate(templateLabel.trim(), feedback.trim());
              const updated = await getFeedbackTemplates();
              setSavedTemplates(updated);
              setSavePopupOpen(false);
            } catch (e) {
              setError(e instanceof ApiError ? e.message : 'Save template failed');
            } finally {
              setTemplateBusy(false);
            }
          }}
          busy={templateBusy}
        />
      )}
    </div>
  );
}

function SaveTemplatePopup({
  label,
  onLabelChange,
  onCancel,
  onSave,
  busy,
}: {
  label: string;
  onLabelChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bg/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl p-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-text">Save as template</h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-muted hover:text-text hover:bg-surface2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[12px] text-subtext mb-3">
          Give this feedback template a short name so everyone can find it.
        </p>

        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="Template name"
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-[13px] text-text placeholder-muted focus:outline-none focus:border-accent transition-colors mb-4"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-3 rounded-lg border border-border bg-surface2 text-subtext text-[13px] font-bold hover:border-accent hover:text-text transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={busy || !label.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-accent text-bg text-[13px] font-bold hover:bg-accent-hover transition-all disabled:opacity-50"
          >
            {busy ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
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
