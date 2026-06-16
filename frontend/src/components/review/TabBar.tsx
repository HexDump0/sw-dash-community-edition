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
    <div className="h-12 shrink-0 bg-surface border-b border-border flex items-center px-2 gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            px-4 py-1.5 rounded-md text-[13px] font-bold transition-all
            ${activeTab === tab.id
              ? 'bg-accent-subtle text-accent border border-accent/30'
              : 'text-subtext hover:text-text hover:bg-white/5 border border-transparent'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
