interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="h-12 shrink-0 bg-[#0E0C25] border-b border-[rgba(131,130,141,0.25)] flex items-center px-2 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-1.5 rounded-md text-[13px] font-bold transition-all
            ${activeTab === tab.id
              ? 'bg-[rgba(244,235,185,0.12)] text-[#F4EBB9] border border-[rgba(244,235,185,0.3)]'
              : 'text-[#AFB2C1] hover:text-white hover:bg-white/5 border border-transparent'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
