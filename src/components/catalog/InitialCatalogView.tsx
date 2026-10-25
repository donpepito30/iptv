/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, ChevronLeft, ChevronRight, RotateCcw, Tv } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { MAIN_CATEGORIES } from '../../lib/iptv/categories.ts';
import { useChannelFilters } from '../../lib/iptv/channel-filters.ts';
import { CatalogChannel, CatalogResult } from '../../lib/iptv/types.ts';
import { CategoryChips } from '../channel/CategoryChips.tsx';
import { FilterBar } from '../channel/FilterBar.tsx';
import { CatalogChannelItem } from './CatalogChannelItem.tsx';
import { CatalogSkeleton } from './CatalogSkeleton.tsx';

export interface InitialCatalogViewProps {
  data: CatalogResult | null;
  loading: boolean;
  error: Error | null;
  progress: string;
  onRetry: () => void;
  onSelectChannel: (channel: CatalogChannel) => void;
  activeChannelId?: string | null;
  favoriteIds?: Set<string>;
}

const PAGE_SIZE = 50;

export const InitialCatalogView: React.FC<InitialCatalogViewProps> = ({
  data,
  loading,
  error,
  progress,
  onRetry,
  onSelectChannel,
  activeChannelId,
  favoriteIds,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const channelsList = useMemo(() => data?.channels || [], [data?.channels]);

  // Hook for instant filtering
  const { filterState, setFilter, resetFilters, filtered } = useChannelFilters(
    channelsList,
    favoriteIds
  );

  // Derive countries list with counts
  const countries = useMemo(() => {
    const map = new Map<string, { code: string; name: string; flag?: string; count: number }>();
    for (const ch of channelsList) {
      if (!ch.country) continue;
      const code = ch.country.toUpperCase();
      const existing = map.get(code);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(code, {
          code,
          name: ch.country_name || code,
          flag: ch.country_flag,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [channelsList]);

  // Derive regions list with counts
  const regions = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of channelsList) {
      if (!ch.region) continue;
      map.set(ch.region, (map.get(ch.region) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [channelsList]);

  // Derive category counts for chips
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: channelsList.length };
    for (const cat of MAIN_CATEGORIES) {
      counts[cat.id] = 0;
    }
    for (const ch of channelsList) {
      if (ch.primary_category && counts[ch.primary_category] !== undefined) {
        counts[ch.primary_category] += 1;
      }
    }
    return counts;
  }, [channelsList]);

  const handleSelectCategory = (catId: string) => {
    setFilter({ category: catId });
    setCurrentPage(0);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 rounded-2xl bg-[#111c2f] border border-[#1e293b]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#e2e8f0]">IPTV Studio</h1>
            <p className="text-xs text-[#94a3b8] mt-1">Cargando base de datos de canales en vivo...</p>
          </div>
          <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 self-start sm:self-auto">
            Sincronizando 6 fuentes...
          </div>
        </div>

        <CatalogSkeleton count={12} progressMessage={progress} />
      </div>
    );
  }

  // Error state with retry button
  if (error || !data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between p-6 rounded-2xl bg-[#111c2f] border border-[#1e293b]">
          <h1 className="text-2xl font-bold tracking-tight text-[#e2e8f0]">IPTV Studio</h1>
        </div>

        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111c2f] border border-red-500/30 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white mb-1">
            Error al sincronizar el catálogo
          </h2>
          <p className="text-xs text-[#94a3b8] max-w-md mb-6 leading-relaxed">
            {error?.message || 'No fue posible descargar los datos de iptv-org.'}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>
        </div>
      </div>
    );
  }

  const uniqueCountriesCount = new Set(data.channels.map((c) => c.country)).size;
  const totalChannelsFormatted = data.total_channels.toLocaleString('es-ES');
  const totalCountriesFormatted = (uniqueCountriesCount || data.countries.length).toLocaleString('es-ES');

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const startIdx = currentPage * PAGE_SIZE;
  const currentChannels = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header with title and exact requested counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#111c2f] border border-[#1e293b]">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#e2e8f0]">IPTV Studio</h1>
          {/* Requested counter: "N canales · M países" */}
          <div className="flex items-center gap-2 text-sm text-[#94a3b8] mt-1">
            <span className="font-mono font-bold text-emerald-400 tabular-nums">
              {totalChannelsFormatted} canales
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-bold text-sky-400 tabular-nums">
              {totalCountriesFormatted} países
            </span>
            {data.total_streams > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-slate-400 tabular-nums text-xs">
                  {data.total_streams.toLocaleString('es-ES')} señales
                </span>
              </>
            )}
          </div>
        </div>

        {/* Pagination controls for 50 items */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-[#94a3b8] font-mono tabular-nums mr-2">
              {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} de {filtered.length.toLocaleString('es-ES')}
            </span>
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors cursor-pointer"
              title="Anteriores 50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors cursor-pointer"
              title="Siguientes 50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Category Chips Scrollbar */}
      <CategoryChips
        selectedCategory={filterState.category}
        onSelectCategory={handleSelectCategory}
        categoryCounts={categoryCounts}
      />

      {/* Advanced Filter Bar */}
      <FilterBar
        filterState={filterState}
        onFilterChange={(updater) => {
          setFilter(updater);
          setCurrentPage(0);
        }}
        onResetFilters={() => {
          resetFilters();
          setCurrentPage(0);
        }}
        countries={countries}
        regions={regions}
        totalFilteredCount={filtered.length}
        favoritesCount={favoriteIds?.size || 0}
      />

      {/* Empty State when filters yield no matches */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111c2f] border border-[#1e293b] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Tv className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#e2e8f0] mb-1">
            No se encontraron canales con los filtros actuales
          </h3>
          <p className="text-xs text-[#94a3b8] max-w-sm mb-4">
            Prueba a cambiar los términos de búsqueda o restablecer los filtros aplicados.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        /* List of 50 channels from filtered results using CatalogChannelItem */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentChannels.map((channel, index) => (
            <CatalogChannelItem
              key={channel.id}
              channel={channel}
              indexNumber={startIdx + index + 1}
              isActive={channel.id === activeChannelId}
              onSelect={onSelectChannel}
            />
          ))}
        </div>
      )}
    </div>
  );
};
