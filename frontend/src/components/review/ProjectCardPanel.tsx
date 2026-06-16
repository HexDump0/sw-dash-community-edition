import { ExternalLink, Globe } from 'lucide-react';
import type { ReviewProject } from '../../types';
import { GitHubIcon } from '../icons/GitHubIcon';

interface ProjectCardPanelProps {
  project: ReviewProject;
}

export function ProjectCardPanel({ project }: ProjectCardPanelProps) {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        {project.screenshotUrl ? (
          <div className="mb-5 rounded-lg overflow-hidden border border-[rgba(131,130,141,0.25)] bg-[#08061E]">
            <img
              src={project.screenshotUrl}
              alt={project.title}
              className="w-full h-auto object-cover"
            />
          </div>
        ) : (
          <div className="mb-5 rounded-lg border border-[rgba(131,130,141,0.25)] bg-[#08061E] h-64 flex items-center justify-center text-[#83828D]">
            No screenshot available
          </div>
        )}

        <h2 className="text-2xl font-bold text-white mb-2">{project.title}</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block py-0.5 px-2.5 bg-[rgba(244,235,185,0.12)] text-[#F4EBB9] rounded-xl text-[11px] font-bold">
            {project.projectType}
          </span>
        </div>

        <p className="text-[14px] text-[#AFB2C1] leading-relaxed whitespace-pre-wrap mb-6">
          {project.description || 'No description provided.'}
        </p>

        <div className="flex flex-wrap gap-2">
          {project.playableUrl && (
            <a
              href={project.playableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[rgba(255,141,157,0.12)] text-[#FF8D9D] text-[13px] font-bold hover:bg-[rgba(255,141,157,0.2)] transition-colors"
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#343651] text-white text-[13px] font-bold border border-[rgba(131,130,141,0.25)] hover:border-[#F4EBB9] hover:text-[#F4EBB9] transition-colors"
            >
              <GitHubIcon className="w-4 h-4" />
              View code
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
