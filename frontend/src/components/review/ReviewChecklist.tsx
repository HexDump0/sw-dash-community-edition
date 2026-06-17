import { useState } from 'react';
import type { ChecklistState } from '../../types';
import { saveChecklist } from '../../lib/api';

const CHECKLIST_ITEMS = [
  'README exists with setup/run instructions',
  'Playable URL works without building from source',
  'Code repo is public and accessible',
  'Code is original (not AI slop, tutorial clone, or plagiarism)',
  'Commits show incremental progress matching claimed hours',
  'Hours are proportional to project scope and complexity',
  'Screenshot accurately represents the project',
];

interface ReviewChecklistProps {
  initial: ChecklistState;
  certId: number;
  onChange?: (state: ChecklistState) => void;
}

export function ReviewChecklist({ initial, certId, onChange }: ReviewChecklistProps) {
  const [checkedItems, setCheckedItems] = useState<number[]>(initial.checkedItems);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleItem = async (index: number) => {
    const next = checkedItems.includes(index)
      ? checkedItems.filter((i) => i !== index)
      : [...checkedItems, index];
    setCheckedItems(next);
    setSaveError(null);
    try {
      await saveChecklist(certId, next);
      onChange?.({ checkedItems: next });
    } catch {
      setSaveError('Save failed');
    }
  };

  return (
    <div className="shrink-0 border-t border-[rgba(131,130,141,0.25)] px-4 py-3.5">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.8px] text-[#83828D] font-semibold mb-2.5">
        <span>Review Checklist</span>
        <span className="flex items-center gap-2">
          {saveError && <span className="text-[#FF8D9D]">{saveError}</span>}
          <span className="font-normal text-[#AFB2C1] font-mono">
            {checkedItems.length}/{CHECKLIST_ITEMS.length}
          </span>
        </span>
      </div>

      <div className="space-y-1">
        {CHECKLIST_ITEMS.map((item, index) => {
          const checked = checkedItems.includes(index);
          return (
            <button
              key={index}
              onClick={() => toggleItem(index)}
              className="flex items-start gap-2 py-1.5 select-none bg-transparent border-none w-full text-left font-[inherit] cursor-pointer hover:opacity-85"
            >
              <input
                type="checkbox"
                checked={checked}
                readOnly
                tabIndex={-1}
                className="w-4 h-4 border-[1.5px] border-[rgba(131,130,141,0.4)] rounded-[3px] bg-[#08061E] cursor-pointer shrink-0 mt-px relative transition-all duration-150 pointer-events-none checked:bg-[#81FFFF] checked:border-[#81FFFF] checked:after:content-['✓'] checked:after:absolute checked:after:-top-px checked:after:left-0.5 checked:after:text-[11px] checked:after:text-[#08061E] checked:after:font-bold"
              />
              <label
                className={`text-[13px] cursor-pointer leading-[1.4] ${
                  checked ? 'text-[#83828D] line-through' : 'text-white'
                }`}
              >
                {item}
              </label>
            </button>
          );
        })}
      </div>
    </div>
  );
}
