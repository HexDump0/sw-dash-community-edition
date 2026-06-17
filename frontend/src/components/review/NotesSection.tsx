import { useState } from 'react';
import { Save, Check, AlertCircle } from 'lucide-react';
import type { NotesState } from '../../types';
import { saveNotes } from '../../lib/api';

interface NotesSectionProps {
  title: string;
  notes: NotesState;
  certId: number;
  field: keyof NotesState;
  onChange: (notes: NotesState) => void;
}

export function NotesSection({ title, notes, certId, field, onChange }: NotesSectionProps) {
  const [content, setContent] = useState(notes[field]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  const handleSave = async () => {
    try {
      setError(false);
      const updated: NotesState = { ...notes, [field]: content };
      await saveNotes(certId, updated);
      setSaved(true);
      onChange(updated);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="p-4 border-t border-border">
      {error && (
        <div className="mb-2 text-[11px] text-red">Failed to save note.</div>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted font-bold">
          {title}
        </span>
        <button
          onClick={handleSave}
          title={error ? 'Save failed' : saved ? 'Saved' : 'Save'}
          className={`p-1 rounded transition-colors ${error ? 'text-red hover:text-red' : 'text-subtext hover:text-accent'}`}
        >
          {error ? <AlertCircle className="w-3.5 h-3.5 text-red" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
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
