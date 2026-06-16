import { ExternalLink, Globe, FileText, Clock, Calendar } from 'lucide-react';
import type { ReviewProject } from '../../types';
import { GitHubIcon } from '../icons/GitHubIcon';

export interface Devlog {
  id: number;
  title: string;
  body: string;
  durationSeconds: number;
  createdAt: string;
}

interface ProjectInfoPanelProps {
  project: ReviewProject;
  description: string;
  aiDeclaration: string;
  links: Record<string, string>;
  submissionMeta: Record<string, string>;
  bannerUrl?: string | null;
  devlogs?: Devlog[];
}

function formatDuration(seconds: number): string {
  const hrs = Math.round(seconds / 3600);
  if (hrs < 1) return '<1h';
  return `${hrs}h`;
}

export function ProjectInfoPanel({
  project,
  description,
  aiDeclaration,
  links,
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
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* Links */}
        {Object.keys(links).length > 0 && (
          <div className="p-4 rounded-lg bg-surface border border-border">
            <h3 className="text-[11px] uppercase tracking-wider text-muted font-bold mb-3">
              Links
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(links).map(([key, value]) => (
                <a
                  key={key}
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface2 border border-border text-subtext text-[12px] font-bold hover:border-accent hover:text-accent transition-colors"
                >
                  {key}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Devlogs */}
        <div className="p-4 rounded-lg bg-surface border border-border">
          <h3 className="text-[11px] uppercase tracking-wider text-muted font-bold mb-3">
            Devlogs
          </h3>
          {devlogs && devlogs.length > 0 ? (
            <div className="space-y-3">
              {devlogs.map((log) => (
                <div key={log.id} className="p-3 rounded-md bg-bg border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold text-text">{log.title}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-subtext">
                      <Clock className="w-3 h-3" />
                      {formatDuration(log.durationSeconds)}
                    </span>
                  </div>
                  <p className="text-[12px] text-subtext line-clamp-3 mb-2">{log.body}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleDateString()}
                    </span>
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
