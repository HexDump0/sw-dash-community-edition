import { GitHubIcon } from '../icons/GitHubIcon';
import type { GitHubRepo } from '../../types';
import { timeAgo } from '../../lib/utils';

interface GitHubPanelProps {
  repo: GitHubRepo | null;
  loading: boolean;
  error: string | null;
  repoUrl: string | null;
}

export function GitHubPanel({ repo, loading, error, repoUrl }: GitHubPanelProps) {
  return (
    <div className="flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-2">
          <GitHubIcon className="w-4 h-4 text-[#AFB2C1]" />
          <span className="text-[13px] text-[#AFB2C1]">GitHub</span>
        </div>
        {repo && repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-bold text-[#95DBFF] hover:underline truncate max-w-[180px]"
          >
            {repo.fullName} ↗
          </a>
        )}
      </div>

      <hr className="border-none border-t border-[rgba(131,130,141,0.25)] m-0" />

      {loading ? (
        <div className="px-4 py-5 text-[13px] text-[#AFB2C1] text-center">Loading GitHub data...</div>
      ) : error ? (
        <div className="mx-3 my-2 px-4 py-3 text-[13px] text-[#FF8D9D] bg-[rgba(255,141,157,0.1)] rounded text-center">
          {error}
        </div>
      ) : !repo ? (
        <div className="px-4 py-5 text-[13px] text-[#AFB2C1] text-center">No GitHub data available.</div>
      ) : (
        <>
          <div className="flex justify-evenly px-4 py-3.5 text-[13px] text-[#AFB2C1]">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <strong className="text-white font-semibold">{repo.stars}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <circle cx="18" cy="6" r="3" />
                <line x1="12" y1="15" x2="12" y2="9" />
                <path d="M6 9v3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V9" />
              </svg>
              <strong className="text-white font-semibold">{repo.forks}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <strong className="text-white font-semibold">{repo.openIssues}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <line x1="6" y1="9" x2="6" y2="21" />
              </svg>
              <strong className="text-white font-semibold">{repo.pullRequests}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
            {repo.language && (
              <span className="bg-[rgba(255,213,152,0.15)] text-[#FFD598] text-[12px] font-semibold px-2.5 py-0.5 rounded">
                {repo.language}
              </span>
            )}
            {repo.license && <span className="text-[#AFB2C1]">{repo.license}</span>}
          </div>

          <div className="flex gap-4 px-4 pt-2 pb-3 text-[12px] text-[#AFB2C1]">
            <span>Created {timeAgo(repo.createdAt)}</span>
            <span>Pushed {timeAgo(repo.pushedAt)}</span>
          </div>

          <hr className="border-none border-t border-[rgba(131,130,141,0.25)] m-0" />

          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 text-[11px] uppercase tracking-wider text-[#83828D] font-bold">
              Recent commits
            </div>
            {repo.commits.map((commit) => (
              <div
                key={commit.sha}
                className="px-4 py-2.5 border-b border-[rgba(131,130,141,0.15)] last:border-0"
              >
                <div className="text-[12px] text-white font-medium truncate">
                  {commit.message}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-[#83828D]">
                  <span className="font-mono text-[#F4EBB9]">{commit.sha}</span>
                  <span>by {commit.author}</span>
                  <span>· {timeAgo(commit.date)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
