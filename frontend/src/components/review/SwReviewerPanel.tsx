import { useCallback, useState } from 'react';
import { Bot, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import type { ReviewStatus } from '../../types';
import { ApiError, getReviewStatus, requestReview } from '../../lib/api';
import { usePollingData } from '../../lib/usePollingData';

interface SwReviewerPanelProps {
  certId: number;
}

const STATUS_META: Record<ReviewStatus['status'], { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  not_started: {
    label: 'No review yet',
    icon: <Bot className="w-4 h-4" />,
    color: 'text-subtext',
    bg: 'bg-surface',
  },
  in_progress: {
    label: 'sw-clanker is reviewing',
    icon: <Clock className="w-4 h-4 animate-spin" />,
    color: 'text-mauve',
    bg: 'bg-mauve-subtle',
  },
  done: {
    label: 'Review complete',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green',
    bg: 'bg-green-subtle',
  },
};

export function SwReviewerPanel({ certId }: SwReviewerPanelProps) {
  const fetcher = useCallback(async () => getReviewStatus(certId), [certId]);
  const { data: status, loading, error: pollError, refresh } = usePollingData(fetcher, [certId], 5000);

  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const handleRequest = async () => {
    setRequesting(true);
    setRequestError(null);
    try {
      await requestReview(certId);
      refresh();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setRequestError('Your session expired. Please log in again.');
      } else {
        setRequestError(e instanceof ApiError ? e.message : 'Could not request review.');
      }
    } finally {
      setRequesting(false);
    }
  };

  const meta = status ? STATUS_META[status.status] : STATUS_META.not_started;
  const isInProgress = status?.status === 'in_progress';
  const isDone = status?.status === 'done';
  const hasError = requestError || pollError || status?.error;
  const resultOk = isDone && status?.result?.ok;
  const pdfReady = isDone && (status?.pdf_ready || status?.result?.pdf_ready);
  const pdfUrl = `/api/reviews/${certId}/pdf`;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-mauve-subtle">
              <Bot className="w-5 h-5 text-mauve" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">sw-clanker report</h2>
              <p className="text-[13px] text-subtext">AI-generated review status</p>
            </div>
          </div>
          <button
            onClick={handleRequest}
            disabled={requesting || isInProgress}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-mauve/30 bg-mauve-subtle text-mauve text-[13px] font-bold hover:bg-mauve/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {requesting ? (
              <><Clock className="w-4 h-4 animate-spin" /> Requesting…</>
            ) : isInProgress ? (
              <><Clock className="w-4 h-4 animate-spin" /> Reviewing…</>
            ) : isDone ? (
              <><RefreshCw className="w-4 h-4" /> Re-run sw-clanker</>
            ) : (
              <><Bot className="w-4 h-4" /> Request sw-clanker review</>
            )}
          </button>
        </div>

        {hasError && (
          <div className="mb-4 p-4 rounded-lg bg-red-subtle border border-red/25 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red shrink-0 mt-0.5" />
            <div>
              <div className="text-[13px] font-bold text-text">Something went wrong</div>
              <div className="text-[12px] text-subtext">{requestError || pollError || status?.error}</div>
            </div>
          </div>
        )}

        <div className={`mb-6 p-4 rounded-lg border border-border ${meta.bg} flex items-center gap-3`}>
          <div className={meta.color}>{meta.icon}</div>
          <div>
            <div className={`text-[13px] font-bold ${meta.color}`}>{meta.label}</div>
            {status?.queued_at && !loading && (
              <div className="text-[12px] text-subtext">
                {isDone
                  ? `Completed ${new Date(status.completed_at || '').toLocaleString()}`
                  : `Requested ${new Date(status.queued_at).toLocaleString()}`}
              </div>
            )}
          </div>
        </div>

        {loading && !status && (
          <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-border bg-surface">
            <Clock className="w-10 h-10 text-mauve animate-spin mb-3" />
            <p className="text-subtext text-center max-w-sm">Loading sw-clanker status…</p>
          </div>
        )}

        {!isDone && !isInProgress && !loading && (
          <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-dashed border-border bg-surface">
            <Bot className="w-12 h-12 text-muted mb-3" />
            <p className="text-subtext text-center max-w-sm">
              No AI review has been run yet. Click the button above to enqueue sw-clanker.
            </p>
          </div>
        )}

        {isInProgress && (
          <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-border bg-surface">
            <Clock className="w-12 h-12 text-mauve animate-spin mb-3" />
            <p className="text-subtext text-center max-w-sm">
              sw-clanker is working on this project. This usually takes 1–2 minutes. The status updates automatically.
            </p>
          </div>
        )}

        {isDone && (
          <div className="space-y-4">
            {resultOk ? (
              <div className="p-4 rounded-lg bg-green-subtle border border-green/25">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green" />
                  <span className="text-lg font-bold text-text">Review finished</span>
                </div>
                <p className="text-[13px] text-subtext">
                  The review ran successfully. The PDF is also posted in the watcher Slack thread.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-red-subtle border border-red/25">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-5 h-5 text-red" />
                  <span className="text-lg font-bold text-text">Review failed</span>
                </div>
                <p className="text-[13px] text-subtext">
                  {status?.result?.error || 'The review completed but reported a failure.'}
                </p>
              </div>
            )}

            {pdfReady && (
              <div className="rounded-lg border border-border bg-surface overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg">
                  <span className="text-[13px] font-bold text-text">Review PDF</span>
                  <a
                    href={pdfUrl}
                    download={`review_${certId}.pdf`}
                    className="flex items-center gap-1.5 text-[12px] font-bold text-mauve hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
                <iframe
                  src={pdfUrl}
                  title={`Review PDF for ship ${certId}`}
                  className="w-full h-[600px] bg-bg"
                />
              </div>
            )}

            {isDone && !pdfReady && resultOk && (
              <div className="p-4 rounded-lg bg-yellow-subtle border border-yellow/25 text-[13px] text-subtext">
                The review finished but no PDF was saved. Check the Slack thread for the PDF.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
