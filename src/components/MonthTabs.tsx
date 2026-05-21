import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MonthTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MonthTabs({ activeTab, onTabChange }: MonthTabsProps) {
  const tabs = [
    { id: 'abril', label: 'Abril 2026' },
    { id: 'maio', label: 'Maio 2026' },
  ];

  return (
    <div className="flex gap-1 bg-slate-200 p-1 rounded-lg w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
            activeTab === tab.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/50"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
