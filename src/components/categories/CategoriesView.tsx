/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CATEGORY_BY_ID, MAIN_CATEGORIES } from '../../lib/iptv/categories.ts';
import { CatalogChannel } from '../../lib/iptv/types.ts';
import { ChannelCard } from '../channel/ChannelCard.tsx';

export interface CategoriesViewProps {
  channels: CatalogChannel[];
  selectedCategoryId: string | null;
  activeChannelId?: string | null;
  favoriteIds: Set<string>;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectChannel: (channel: CatalogChannel) => void;
  onToggleFavorite: (channelId: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  channels,
  selectedCategoryId,
  activeChannelId,
  favoriteIds,
  onSelectCategory,
  onSelectChannel,
  onToggleFavorite,
}) => {
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('ALL');

  // Count channels per category
  const countsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of MAIN_CATEGORIES) map[cat.id] = 0;
    for (const ch of channels) {
      if (ch.primary_category && map[ch.primary_category] !== undefined) {
        map[ch.primary_category] += 1;
      }
    }
    return map;
  }, [channels]);

  // If a category is selected, show detail view with subcategory chips + channel grid
  if (selectedCategoryId) {
    const categoryMeta = CATEGORY_BY_ID.get(selectedCategoryId);
    const categoryChannels = channels.filter((c) => c.primary_category === selectedCategoryId);

    const subcategoriesList = categoryMeta?.subcategories
      ? Object.keys(categoryMeta.subcategories)
      : [];

    const filteredCategoryChannels =
      selectedSubcategory === 'ALL'
        ? categoryChannels
        : categoryChannels.filter((c) => c.subcategory === selectedSubcategory);

    return (
      <div className="flex flex-col gap-6">
        {/* Header with Back button and category gradient banner */}
        <div
          className={`relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r ${
            categoryMeta?.gradient || 'from-slate-800 to-slate-900'
          } text-white shadow-xl`}
        >
          <button
            type="button"
            onClick={() => {
              onSelectCategory(null);
              setSelectedSubcategory('ALL');
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/30 hover:bg-black/50 backdrop-blur-md text-xs font-semibold mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a todas las categorías</span>
          </button>

          <div className="flex items-center gap-4">
            <span className="text-4xl sm:text-5xl">{categoryMeta?.emoji || '📺'}</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {categoryMeta?.name || selectedCategoryId}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 font-mono mt-1 tabular-nums">
                {categoryChannels.length.toLocaleString('es-ES')} canales disponibles
              </p>
            </div>
          </div>
        </div>

        {/* Subcategories Chips */}
        {subcategoriesList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setSelectedSubcategory('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedSubcategory === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-[#111c2f] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#1e293b]'
              }`}
            >
              Todas ({categoryChannels.length})
            </button>

            {subcategoriesList.map((subName) => {
              const subCount = categoryChannels.filter((c) => c.subcategory === subName).length;
              const isSelected = selectedSubcategory === subName;

              return (
                <button
                  key={subName}
                  type="button"
                  onClick={() => setSelectedSubcategory(subName)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                      : 'bg-[#111c2f] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#1e293b]'
                  }`}
                >
                  <span>{subName}</span>
                  <span className="text-[11px] font-mono tabular-nums opacity-75 ml-1">
                    ({subCount})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Channel Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredCategoryChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isActive={channel.id === activeChannelId}
              isFavorite={favoriteIds.has(channel.id)}
              onSelect={onSelectChannel}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      </div>
    );
  }

  // Main Categories Explorer Grid (14 cards)
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#e2e8f0]">Categorías</h1>
          <p className="text-xs text-[#94a3b8] mt-1">Explora los canales agrupados por género y temáticas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {MAIN_CATEGORIES.map((cat) => {
          const count = countsByCategory[cat.id] || 0;

          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCategory(cat.id);
                }
              }}
              className={`group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${cat.gradient} cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg text-white select-none`}
            >
              <div className="relative z-10 flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{cat.emoji}</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold tracking-tight">{cat.name}</h3>
                  <p className="text-xs text-white/80 font-mono mt-0.5 tabular-nums">
                    {count.toLocaleString('es-ES')} canales
                  </p>
                </div>
              </div>

              {/* Decorative background circle */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
