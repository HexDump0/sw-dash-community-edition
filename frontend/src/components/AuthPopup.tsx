import { useEffect, useRef, useState, useCallback } from 'react';
import { LogOut, User, AlertCircle, ClipboardPaste, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/useAuth';

interface AuthPopupProps {
  open: boolean;
  onClose: () => void;
}

interface AuthModalProps {
  open: boolean;
}

function cachetAvatarUrl(slackUserId: string | null): string | null {
  if (!slackUserId) return null;
  return `https://cachet.dunkirk.sh/users/${slackUserId}/r`;
}

export function AuthModal({ open }: AuthModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-bg/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl animate-fade-in">
        <AuthContent onClose={() => {}} />
      </div>
    </div>
  );
}

export function AuthPopup({ open, onClose }: AuthPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={popupRef}
      className="absolute right-0 top-full mt-2 w-[340px] rounded-xl border border-border bg-surface shadow-2xl z-[100] animate-fade-in"
    >
      <AuthContent onClose={onClose} />
    </div>
  );
}

function AuthContent({ onClose }: { onClose: () => void }) {
  const { reviewer, login, logout, loading } = useAuth();
  const [curl, setCurl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setCurl('');
    setError(null);
    onClose();
  }, [onClose]);

  const handleLogin = async () => {
    if (!curl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await login(curl);
      setCurl('');
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await logout();
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-[13px] font-bold text-text">Reviewer session</span>
        {reviewer && (
          <button
            onClick={close}
            className="text-muted hover:text-text text-[12px] font-bold transition-colors"
          >
            Close
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {reviewer ? (
          <>
            <div className="flex items-center gap-3">
              <ReviewerAvatar reviewer={reviewer} />
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-text truncate">{reviewer.name}</p>
                <p className="text-[12px] text-subtext truncate">{reviewer.slackUserId}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={busy || loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red/40 bg-red-subtle text-red text-[13px] font-bold hover:bg-red hover:text-bg transition-all disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Log out
            </button>
          </>
        ) : (
          <>
            <p className="text-[12px] text-subtext leading-relaxed">
              Paste a curl command copied from your browser. We&apos;ll extract the{' '}
              <code className="text-accent bg-surface2 px-1 py-0.5 rounded">_stardance_session_v3</code>{' '}
              cookie and validate it.
            </p>

            <textarea
              value={curl}
              onChange={(e) => setCurl(e.target.value)}
              rows={6}
              placeholder={`curl 'https://stardance.hackclub.com/admin/certification/ship' \\\n  -H 'accept: ...' \\\n  -b '_stardance_session_v3=...'`}
              className="w-full bg-bg border border-border rounded-lg p-3 text-[12px] text-text placeholder-muted focus:outline-none focus:border-accent transition-colors resize-y font-mono"
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-subtle border border-red/30 text-red text-[12px]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={busy || !curl.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-accent text-bg text-[13px] font-bold hover:bg-accent-hover transition-all disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardPaste className="w-4 h-4" />}
              {busy ? 'Validating…' : 'Log in'}
            </button>
          </>
        )}
      </div>
    </>
  );
}

function ReviewerAvatar({ reviewer }: { reviewer: { name: string; slackUserId: string } }) {
  const [error, setError] = useState(false);
  const avatarUrl = cachetAvatarUrl(reviewer.slackUserId);

  if (avatarUrl && !error) {
    return (
      <img
        src={avatarUrl}
        alt={reviewer.name}
        onError={() => setError(true)}
        className="w-10 h-10 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-surface2 border border-border flex items-center justify-center">
      <User className="w-5 h-5 text-muted" />
    </div>
  );
}
