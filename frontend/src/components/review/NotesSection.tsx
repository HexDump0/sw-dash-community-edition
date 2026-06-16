import { useState } from 'react';
import { Save } from 'lucide-react';

interface NotesSectionProps {
  title: string;
  initialContent: string;
}

export function NotesSection({ title, initialContent }: NotesSectionProps) {
  const [content, setContent] = useState(initialContent);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="p-4 border-t border-[rgba(131,130,141,0.25)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-[#83828D] font-bold">
          {title}
        </span>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 text-[11px] font-bold text-[#AFB2C1] hover:text-[#F4EBB9] transition-colors"
        >
          {saved ? 'Saved!' : <><Save className="w-3 h-3" /> Save</>}
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full bg-[#08061E] border border-[rgba(131,130,141,0.25)] rounded-md p-2.5 text-[13px] text-white placeholder-[#83828D] focus:outline-none focus:border-[#F4EBB9] transition-colors resize-y"
        placeholder="Add private notes..."
      />
    </div>
  );
}
