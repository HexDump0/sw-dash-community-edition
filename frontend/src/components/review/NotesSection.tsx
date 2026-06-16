import { useState } from 'react';
import { Save, Check } from 'lucide-react';

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
    <div className="p-4 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted font-bold">
          {title}
        </span>
        <button
          onClick={handleSave}
          title={saved ? 'Saved' : 'Save'}
          className="p-1 rounded text-subtext hover:text-accent transition-colors"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        className="w-full bg-bg border border-border rounded-md p-2.5 text-[13px] text-text placeholder-muted focus:outline-none focus:border-accent transition-colors resize-y"
        placeholder="Add private notes..."
      />
    </div>
  );
}
