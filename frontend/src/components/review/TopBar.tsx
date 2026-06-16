import { ArrowLeft } from 'lucide-react';

interface TopBarProps {
  onBackToGallery: () => void;
}

export function TopBar({ onBackToGallery }: TopBarProps) {
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
        <div className="hidden sm:flex items-center gap-2 text-sm text-subtext">
          <span className="font-bold text-text">Stardance</span>
          <span className="text-muted">·</span>
          <span>Project Review</span>
        </div>
      </div>
    </div>
  );
}
