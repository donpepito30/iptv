/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { MAIN_CATEGORIES } from '../../lib/iptv/categories.ts';

export interface CategoryChipsProps {
  selectedCategory: string; // 'ALL' or category id
  onSelectCategory: (categoryId: string) => void;
  categoryCounts?: Record<string, number>;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  return (
    <div className="relative w-full group/chips">
      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth select-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* "Todas" Chip */}
        <button
          type="button"
          onClick={() => onSelectCategory('ALL')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            selectedCategory === 'ALL'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-[#111c2f] hover:bg-[#16233b] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#1e293b]'
          }`}
        >
          <span>✨</span>
          <span>Todas</span>
          {categoryCounts?.ALL !== undefined && (
            <span className="text-[11px] font-mono tabular-nums opacity-80">
              ({categoryCounts.ALL})
            </span>
          )}
        </button>

        {/* 14 Main Category Chips */}
        {MAIN_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts?.[cat.id];

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg ring-1 ring-white/20`
                  : 'bg-[#111c2f] hover:bg-[#16233b] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#1e293b]'
              }`}
            >
              <span className="text-sm">{cat.emoji}</span>
              <span>{cat.name}</span>
              {count !== undefined && (
                <span className="text-[11px] font-mono tabular-nums opacity-75">
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
