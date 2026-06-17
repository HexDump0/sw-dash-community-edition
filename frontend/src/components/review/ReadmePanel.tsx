import { ExternalLink, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface ReadmePanelProps {
  readmeUrl: string | null;
  content: string | null;
  loading?: boolean;
}

export function ReadmePanel({ readmeUrl, content, loading }: ReadmePanelProps) {
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <FileText className="w-10 h-10 text-muted mb-3" />
        <p className="text-subtext mb-3">No README content available.</p>
        {readmeUrl && (
          <a
            href={readmeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface2 text-text text-[13px] font-bold border border-border hover:border-accent hover:text-accent transition-colors"
          >
            Open README
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <article className="markdown-content max-w-4xl mx-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
