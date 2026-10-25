/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowUpDown, Globe, RotateCcw, Search, Sparkles, Star, Tag, X } from 'lucide-react';
import React from 'react';
import { t } from '../../lib/iptv/i18n.ts';
import { AppLanguage, FilterCriteria, SortOption } from '../../lib/iptv/types.ts';

export interface ChannelFiltersProps {
  criteria: FilterCriteria;
  sortOption: SortOption;
  language: AppLanguage;
  activeTab: 'all' | 'favorites' | 'history';
  countries: { code: string; name: string; flag?: string; count: number }[];
  categories: { id: string; name: string; count: number }[];
  totalFilteredCount: number;
  favoritesCount: number;
  historyCount: number;
  onCriteriaChange: (updater: Partial<FilterCriteria>) => void;
  onSortChange: (sort: SortOption) => void;
  onTabChange: (tab: 'all' | 'favorites' | 'history') => void;
  onResetFilters: () => void;
}

export const ChannelFilters: React.FC<ChannelFiltersProps> = ({
  criteria,
  sortOption,
  language,
  activeTab,
  countries,
  categories,
  totalFilteredCount,
  favoritesCount,
  historyCount,
  onCriteriaChange,
  onSortChange,
  onTabChange,
  onResetFilters,
}) => {
  const hasActiveFilters =
    criteria.search !== '' ||
    criteria.country !== 'ALL' ||
    criteria.category !== 'ALL' ||
    criteria.onlyWithLogo;

  return (
    <div className="flex flex-col gap-3">
      {/* Top Navigation Tabs: All, Favorites, Recents */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
        <div className="flex items-center gap-1 p-1 bg-[#111c2f] rounded-xl border border-[#1e293b]">
          <button
            type="button"
            onClick={() => onTabChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            {t('allChannels', language)}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('favorites')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'favorites'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/30'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{t('favoritesOnly', language)}</span>
            <span className="text-[11px] font-mono tabular-nums opacity-80">({favoritesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'history'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            <span>{t('recentChannels', language)}</span>
            <span className="text-[11px] font-mono tabular-nums opacity-80 ml-1">({historyCount})</span>
          </button>
        </div>

        {/* Counter badge */}
        <div className="text-xs text-[#94a3b8] font-medium hidden sm:block">
          <span className="text-emerald-400 font-mono font-bold tabular-nums mr-1">
            {totalFilteredCount}
          </span>
          {t('totalChannels', language)}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          type="text"
          value={criteria.search}
          onChange={(e) => onCriteriaChange({ search: e.target.value })}
          placeholder={t('searchPlaceholder', language)}
          className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#111c2f] border border-[#1e293b] text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-emerald-500/60 transition-colors"
        />
        {criteria.search && (
          <button
            type="button"
            onClick={() => onCriteriaChange({ search: '' })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Row: Countries, Categories, Sorting, Reset */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Country Selector */}
        <div className="relative">
          <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          <select
            value={criteria.country}
            onChange={(e) => onCriteriaChange({ country: e.target.value })}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#111c2f] border border-[#1e293b] text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60 appearance-none truncate cursor-pointer"
            aria-label={t('filterByCountry', language)}
          >
            <option value="ALL">{t('allCountries', language)}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag ? `${c.flag} ` : ''}{c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>

        {/* Category Selector */}
        <div className="relative">
          <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          <select
            value={criteria.category}
            onChange={(e) => onCriteriaChange({ category: e.target.value })}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#111c2f] border border-[#1e293b] text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60 appearance-none truncate cursor-pointer"
            aria-label={t('filterByCategory', language)}
          >
            <option value="ALL">{t('allCategories', language)}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.count})
              </option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div className="relative">
          <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          <select
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#111c2f] border border-[#1e293b] text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60 appearance-none cursor-pointer"
            aria-label="Ordenar canales"
          >
            <option value="popular">Populares</option>
            <option value="name-asc">Nombre (A - Z)</option>
            <option value="name-desc">Nombre (Z - A)</option>
            <option value="country">Por País</option>
          </select>
        </div>

        {/* Reset button or Logo filter toggle */}
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('resetFilters', language)}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onCriteriaChange({ onlyWithLogo: !criteria.onlyWithLogo })}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-colors ${
              criteria.onlyWithLogo
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#111c2f] border-[#1e293b] text-[#94a3b8] hover:text-[#e2e8f0]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Solo con logo</span>
          </button>
        )}
      </div>
    </div>
  );
};
