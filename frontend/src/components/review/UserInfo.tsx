import { useState } from 'react';
import { Copy, Check, User, ExternalLink } from 'lucide-react';
import type { ReviewOwner, ReviewProject } from '../../types';
import { GitHubIcon } from '../icons/GitHubIcon';

interface UserInfoProps {
  user: ReviewOwner;
  project: ReviewProject;
}

function cachetAvatarUrl(slackUserId: string | null): string | null {
  if (!slackUserId) return null;
  return `https://cachet.hackclub.com/users/${slackUserId}/r`;
}

export function UserInfo({ user, project }: UserInfoProps) {
  const [copied, setCopied] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const copySlackId = () => {
    if (!user.slackUserId) return;
    navigator.clipboard.writeText(user.slackUserId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  const slackDmUrl = user.slackUserId
    ? `https://hackclub.slack.com/team/${user.slackUserId}`
    : null;

  const resolvedReadmeUrl =
    project.readmeUrl ||
    (project.repoUrl
      ? `${project.repoUrl.replace(/\/$/, '')}/blob/main/README.md`
      : null);

  const avatarUrl = cachetAvatarUrl(user.slackUserId) || user.avatarUrl;

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        {avatarUrl && !avatarError ? (
          <img
            src={avatarUrl}
            alt={user.displayName}
            onError={() => setAvatarError(true)}
            className="w-10 h-10 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center border border-border">
            <User className="w-5 h-5 text-muted" />
          </div>
        )}
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-text truncate">{user.displayName}</div>
          <div className="flex items-center gap-1.5 text-[12px] text-subtext">
            {slackDmUrl ? (
              <a
                href={slackDmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                DM on Slack ↗
              </a>
            ) : null}
            {user.slackUserId && (
              <>
                <span className="text-muted">·</span>
                <span className="font-mono">{user.slackUserId}</span>
                <button
                  onClick={copySlackId}
                  title={copied ? 'Copied!' : 'Copy Slack ID'}
                  className="p-0.5 rounded hover:text-accent transition-colors"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3.5">
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-border bg-surface2 text-subtext text-[13px] font-bold hover:border-accent hover:text-accent transition-all"
          >
            <GitHubIcon className="w-4 h-4" />
            Code ↗
          </a>
        )}
        {project.playableUrl && (
          <a
            href={project.playableUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-red/30 bg-red-subtle text-red text-[13px] font-bold hover:bg-red/20 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Demo ↗
          </a>
        )}
        {resolvedReadmeUrl && (
          <a
            href={resolvedReadmeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-border bg-surface2 text-subtext text-[13px] font-bold hover:border-accent hover:text-accent transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            README ↗
          </a>
        )}
      </div>

      <div className="p-3 rounded-md border border-border bg-bg mb-3">
        <div className="text-[11px] uppercase tracking-wider text-muted font-bold mb-1">
          Project hours
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-green">
            {project.totalHours != null ? `${project.totalHours}h` : '—'}
          </span>
          <span className="text-xs text-muted">logged</span>
        </div>
      </div>

      {project.stardanceUrl && (
        <a
          href={project.stardanceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-md border border-border bg-surface2 text-subtext text-[13px] font-bold hover:border-accent hover:text-accent transition-all"
        >
          View on Stardance
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
