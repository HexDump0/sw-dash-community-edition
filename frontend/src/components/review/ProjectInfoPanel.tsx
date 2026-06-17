import { ExternalLink, Globe, FileText, Clock, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { ReviewProject, Devlog } from '../../types';
import { GitHubIcon } from '../icons/GitHubIcon';

interface ProjectInfoPanelProps {
  project: ReviewProject;
  description: string;
  aiDeclaration: string;
  submissionMeta: Record<string, string>;
  bannerUrl?: string | null;
  devlogs?: Devlog[];
}

function formatDuration(seconds: number): string {
  const hrs = Math.round(seconds / 3600);
  if (hrs < 1) return '<1h';
  return `${hrs}h`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function ProjectInfoPanel({
  project,
  description,
  aiDeclaration,
  submissionMeta,
  bannerUrl,
  devlogs,
}: ProjectInfoPanelProps) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Banner */}
        {bannerUrl ? (
          <div className="rounded-lg overflow-hidden border border-border bg-bg">
            <img src={bannerUrl} alt={`${project.title} banner`} className="w-full h-48 object-cover" />
          </div>
        ) : project.screenshotUrl ? (
          <div className="rounded-lg overflow-hidden border border-border bg-bg">
            <img src={project.screenshotUrl} alt={project.title} className="w-full h-auto object-cover" />
          </div>
        ) : null}

        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-text">{project.title}</h1>
            {project.projectType && (
              <span className="inline-block py-0.5 px-2.5 bg-accent-subtle text-accent rounded-xl text-[11px] font-bold">
                {project.projectType}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {project.playableUrl && (
              <a
                href={project.playableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-subtle text-red text-[13px] font-bold hover:bg-red/20 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Try demo
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface2 text-text text-[13px] font-bold border border-border hover:border-accent hover:text-accent transition-colors"
              >
                <GitHubIcon className="w-4 h-4" />
                View code
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {project.readmeUrl && (
              <a
                href={project.readmeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface2 text-text text-[13px] font-bold border border-border hover:border-accent hover:text-accent transition-colors"
              >
                <FileText className="w-4 h-4" />
                README
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="p-4 rounded-lg bg-surface border border-border">
          <h3 className="text-[11px] uppercase tracking-wider text-muted font-bold mb-2">
            Description
          </h3>
          <p className="text-[14px] text-subtext leading-relaxed whitespace-pre-wrap">
            {description || 'No description provided.'}
          </p>
        </div>

        {/* AI Declaration */}
        {aiDeclaration && (
          <div className="p-4 rounded-lg bg-mauve-subtle border border-mauve/25">
            <h3 className="text-[11px] uppercase tracking-wider text-mauve font-bold mb-2">
              AI Declaration
            </h3>
            <p className="text-[14px] text-subtext leading-relaxed whitespace-pre-wrap">
              {aiDeclaration}
            </p>
          </div>
        )}

        {/* Submission meta */}
        {Object.keys(submissionMeta).length > 0 && (
          <div className="p-4 rounded-lg bg-surface border border-border">
            <h3 className="text-[11px] uppercase tracking-wider text-muted font-bold mb-3">
              Submission
            </h3>
            <dl className="grid grid-cols-3 gap-3">
              {Object.entries(submissionMeta).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[11px] uppercase tracking-wider text-muted font-bold mb-0.5">
                    {key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="text-[13px] text-text">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Devlogs */}
        <div className="space-y-4">
          <h3 className="text-[11px] uppercase tracking-wider text-muted font-bold">
            Devlogs
          </h3>
          {devlogs && devlogs.length > 0 ? (
            <div className="space-y-4">
              {devlogs.map((log) => (
                <div key={log.id} className="p-4 rounded-lg bg-surface border border-border">
                  <div className="flex items-center justify-between mb-3 text-[12px] text-subtext">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(log.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(log.durationSeconds)}
                    </span>
                  </div>
                  <div className="markdown-content text-[14px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {log.body}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-muted">No devlogs available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
