import { useState } from 'react';
import { ArrowLeft, User, LogIn } from 'lucide-react';
import { useAuth } from '../../lib/useAuth';
import { AuthPopup } from '../AuthPopup';

interface TopBarProps {
  onBackToGallery: () => void;
}

function cachetAvatarUrl(slackUserId: string | null): string | null {
  if (!slackUserId) return null;
  return `https://cachet.dunkirk.sh/users/${slackUserId}/r`;
}

export function TopBar({ onBackToGallery }: TopBarProps) {
  const { reviewer } = useAuth();
  const [popupOpen, setPopupOpen] = useState(false);
  const avatarUrl = cachetAvatarUrl(reviewer?.slackUserId || null);
  const isLoggedIn = Boolean(reviewer);

  return (
    <div className="h-14 shrink-0 bg-surface border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToGallery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface2 text-subtext text-xs font-bold hover:border-accent hover:text-accent transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to queue
        </button>
        <div className="hidden md:flex items-center gap-2 text-sm text-subtext truncate">
          <span className="font-bold text-text truncate">Shipwrights Dash Community Edition™</span>
          <span className="text-muted">·</span>
          <span>Project Review</span>
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setPopupOpen((v) => !v)}
          className="flex items-center gap-2 pl-2 rounded-md px-1.5 py-1 hover:bg-surface2/60 transition-colors"
        >
          <span className="hidden sm:block text-[13px] text-text font-semibold">
            {reviewer?.name || 'Log in'}
          </span>
          {isLoggedIn ? (
            avatarUrl ? (
              <img
                src={avatarUrl}
                alt={reviewer?.name || 'Reviewer'}
                className="w-8 h-8 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface2 border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-muted" />
              </div>
            )
          ) : (
            <div className="w-8 h-8 rounded-full bg-accent-subtle border border-accent/30 flex items-center justify-center">
              <LogIn className="w-4 h-4 text-accent" />
            </div>
          )}
        </button>
        <AuthPopup open={popupOpen} onClose={() => setPopupOpen(false)} />
      </div>
    </div>
  );
}
