import { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';

interface ReadmePanelProps {
  readmeUrl: string | null;
}

export function ReadmePanel({ readmeUrl }: ReadmePanelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/fixtures/readme.json')
      .then((r) => r.json())
      .then((data) => {
        setContent(data.content);
        setLoading(false);
      })
      .catch(() => {
        setContent(null);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#F4EBB9] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <FileText className="w-10 h-10 text-[#83828D] mb-3" />
        <p className="text-[#AFB2C1] mb-3">No README content available.</p>
        {readmeUrl && (
          <a
            href={readmeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#343651] text-white text-[13px] font-bold border border-[rgba(131,130,141,0.25)] hover:border-[#F4EBB9] hover:text-[#F4EBB9] transition-colors"
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
      <pre className="font-mono text-[13px] text-[#AFB2C1] whitespace-pre-wrap leading-relaxed max-w-4xl mx-auto">
        {content}
      </pre>
    </div>
  );
}
