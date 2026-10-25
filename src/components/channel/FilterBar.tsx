/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Globe,
  MapPin,
  Radio,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Tv,
  X,
} from 'lucide-react';
import React from 'react';
import { MAIN_CATEGORIES } from '../../lib/iptv/categories.ts';
import { ChannelFilterState } from '../../lib/iptv/channel-filters.ts';

export interface FilterBarProps {
  filterState: ChannelFilterState;
  onFilterChange: (updater: Partial<ChannelFilterState>) => void;
  onResetFilters: () => void;
  countries: { code: string; name: string; flag?: string; count: number }[];
  regions: { name: string; count: number }[];
  totalFilteredCount: number;
  favoritesCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filterState,
  onFilterChange,
  onResetFilters,
  countries,
  regions,
  totalFilteredCount,
  favoritesCount,
}) => {
  const hasActiveFilters =
    filterState.search !== '' ||
    filterState.country !== 'ALL' ||
    filterState.region !== 'ALL' ||
    filterState.category !== 'ALL' ||
    filterState.minQuality !== 'ALL' ||
    filterState.onlyFavorites;

  return (
    <div className="flex flex-col gap-3">
      {/* Search Input and Quick Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            value={filterState.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Buscar por canal, nombre alternativo, país o región..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#111c2f] border border-[#1e293b] text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-emerald-500/60 transition-colors"
          />
          {filterState.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              title="Borrar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Toggles: Solo favoritos y Solo en vivo (inactivo) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onFilterChange({ onlyFavorites: !filterState.onlyFavorites })}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              filterState.onlyFavorites
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-[#111c2f] text-[#94a3b8] hover:text-[#e2e8f0] border-[#1e293b]'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${filterState.onlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Favoritos</span>
            <span className="text-[11px] font-mono tabular-nums opacity-75">({favoritesCount})</span>
          </button>

          {/* Requested button: "solo en vivo" (inactivo por ahora) */}
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#111c2f]/60 text-slate-500 border border-[#1e293b] cursor-not-allowed opacity-60"
            title="Comprobación de señal en vivo en tiempo real (Próximamente)"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-500/40" />
            <span>Solo en vivo</span>
            <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-slate-800 text-slate-400">
              Pronto
            </span>
          </button>
        </div>
      </div>

      {/* Dropdown Filters Row: Países, Regiones, Categorías, Calidad mínima */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Country Selector */}
        <div className="relative">
          <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          <select
            value={filterState.country}
            onChange={(e) => onFilterChange({ country: e.target.value })}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#111c2f] border border-[#1e293b] text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60 appearance-none truncate cursor-pointer"
            aria-label="Filtrar por país"
          >
            <option value="ALL">🌐 Todos los países</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag ? `${c.flag} ` : ''}{c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>

        {/* Region Selector */}
        <div className="relative">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          <select
            value={filterState.region}
            onChange={(e) => onFilterChange({ region: e.target.value })}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#111c2f] border border-[#1e293b] text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60 appearance-none truncate cursor-pointer"
            aria-label="Filtrar por región"
          >
            <option value="ALL">🗺️ Todas las regiones</option>
            {regions.map((r) => (
              <option key={r.name} value={r.name}>
                {r.name} ({r.count})
              </option>
            ))}
          </select>
        </div>

        {/* Category Dropdown */}
        <div className="relative">
          <Tv className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          <select
            value={filterState.category}
            onChange={(e) => onFilterChange({ category: e.target.value })}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#111c2f] border border-[#1e293b] text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60 appearance-none truncate cursor-pointer"
            aria-label="Filtrar por categoría"
          >
            <option value="ALL">📺 Todas las categorías</option>
            {MAIN_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Quality Selector */}
        <div className="relative">
          <Sparkles className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
          <select
            value={filterState.minQuality}
            onChange={(e) => onFilterChange({ minQuality: e.target.value })}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-[#111c2f] border border-[#1e293b] text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60 appearance-none cursor-pointer"
            aria-label="Calidad mínima"
          >
            <option value="ALL">Todas las calidades</option>
            <option value="1080p">Alta (1080p o 4K)</option>
            <option value="720p">Media (720p o superior)</option>
            <option value="480p">Estándar (480p o superior)</option>
          </select>
        </div>
      </div>

      {/* Filter status strip & Reset button */}
      <div className="flex items-center justify-between text-xs text-[#94a3b8] pt-1">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="text-emerald-400 font-mono font-bold tabular-nums">
            {totalFilteredCount.toLocaleString('es-ES')}
          </span>
          <span>canales encontrados</span>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer filtros</span>
          </button>
        )}
      </div>
    </div>
  );
};
