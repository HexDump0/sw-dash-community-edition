import { useState } from 'react';
import { Copy, Check, User } from 'lucide-react';
import type { ReviewOwner, ReviewProject } from '../../types';
import { GitHubIcon } from '../icons/GitHubIcon';

interface UserInfoProps {
  user: ReviewOwner;
  project: ReviewProject;
}

export function UserInfo({ user, project }: UserInfoProps) {
  const [copied, setCopied] = useState(false);

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

  const airlockUrl = project.repoUrl
    ? `https://airlock.hackclub.com/?r=${encodeURIComponent(project.repoUrl)}`
    : null;

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-10 h-10 rounded-full border border-[rgba(131,130,141,0.25)]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#343651] flex items-center justify-center">
            <User className="w-5 h-5 text-[#AFB2C1]" />
          </div>
        )}
        <div>
          <div className="text-[16px] font-bold text-white">{user.displayName}</div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#AFB2C1]">
            {slackDmUrl ? (
              <a
                href={slackDmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F4EBB9] transition-colors"
              >
                DM on Slack ↗
              </a>
            ) : null}
            {user.slackUserId && (
              <>
                <span className="text-[#83828D]">·</span>
                <span>{user.slackUserId}</span>
                <button
                  onClick={copySlackId}
                  title={copied ? 'Copied!' : 'Copy Slack ID'}
                  className="p-0.5 rounded hover:text-[#F4EBB9] transition-colors"
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
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-[rgba(131,130,141,0.25)] bg-[#343651] text-[#AFB2C1] text-[13px] font-bold hover:border-[#F4EBB9] hover:text-[#F4EBB9] transition-all"
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
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-[rgba(255,141,157,0.3)] bg-[rgba(255,141,157,0.12)] text-[#FF8D9D] text-[13px] font-bold hover:bg-[rgba(255,141,157,0.2)] transition-all"
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
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-[rgba(131,130,141,0.25)] bg-[#343651] text-[#AFB2C1] text-[13px] font-bold hover:border-[#F4EBB9] hover:text-[#F4EBB9] transition-all"
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
        {airlockUrl && (
          <a
            href={airlockUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-[#F4EBB9]/40 text-[#F4EBB9] text-[13px] font-bold hover:bg-[rgba(244,235,185,0.12)] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Airlock ↗
          </a>
        )}
      </div>

      <div className="mb-3.5 p-3 rounded-md border border-[rgba(131,130,141,0.25)] bg-[#08061E]">
        <div className="text-[11px] uppercase tracking-wider text-[#83828D] font-bold mb-1">
          Submitted hours
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-[#81FFFF]">12.5h</span>
          <span className="text-xs text-[#83828D]">Hackatime</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[13px]">
        {user.age !== null && (
          <span className="bg-[rgba(129,255,255,0.12)] text-[#81FFFF] text-[11px] font-bold py-0.5 px-2 rounded">
            {user.age}yo
          </span>
        )}
        {user.country && (
          <span className="bg-[rgba(244,235,185,0.12)] text-[#F4EBB9] text-[11px] font-bold py-0.5 px-2 rounded">
            {user.country}
          </span>
        )}
      </div>
    </div>
  );
}
