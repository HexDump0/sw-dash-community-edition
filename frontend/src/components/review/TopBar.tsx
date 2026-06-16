import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface TopBarProps {
  currentIndex: number;
  totalCount: number;
  onNext: () => void;
  onPrev: () => void;
  onBackToGallery: () => void;
}

export function TopBar({
  currentIndex,
  totalCount,
  onNext,
  onPrev,
  onBackToGallery,
}: TopBarProps) {
  return (
    <div className="h-14 shrink-0 bg-[#0E0C25] border-b border-[rgba(131,130,141,0.25)] flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBackToGallery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[rgba(131,130,141,0.25)] bg-[#343651] text-[#AFB2C1] text-xs font-bold hover:border-[#F4EBB9] hover:text-[#F4EBB9] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to queue
        </button>
        <div className="hidden sm:flex items-center gap-2 text-sm text-[#AFB2C1]">
          <span className="font-bold text-white">Stardance</span>
          <span className="text-[#83828D]">·</span>
          <span>Project Review</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={currentIndex <= 0}
          className="p-1.5 rounded-md border border-[rgba(131,130,141,0.25)] bg-[#343651] text-[#AFB2C1] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-[#AFB2C1] font-mono min-w-[80px] text-center">
          {currentIndex + 1} / {totalCount}
        </span>
        <button
          onClick={onNext}
          disabled={currentIndex >= totalCount - 1}
          className="p-1.5 rounded-md border border-[rgba(131,130,141,0.25)] bg-[#343651] text-[#AFB2C1] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
