/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { MAIN_CATEGORIES } from '../../lib/iptv/categories.ts';
import { useChannelFilters } from '../../lib/iptv/channel-filters.ts';
import { CatalogChannel } from '../../lib/iptv/types.ts';
import { useHistory } from '../../lib/iptv/useHistory.ts';
import { useRecommendations } from '../../lib/iptv/useRecommendations.ts';
import { CategoryChips } from '../channel/CategoryChips.tsx';
import { FilterBar } from '../channel/FilterBar.tsx';
import { ChannelRow } from './ChannelRow.tsx';
import { HeroCarousel } from './HeroCarousel.tsx';
import { InfiniteChannelGrid } from './InfiniteChannelGrid.tsx';

export interface BrowseViewProps {
  channels: CatalogChannel[];
  activeChannelId?: string | null;
  favoriteIds: Set<string>;
  onSelectChannel: (channel: CatalogChannel) => void;
  onWatch: (channelId: string) => void;
  onToggleFavorite: (channelId: string) => void;
  onNavigateToCategory?: (categoryId: string) => void;
}

export const BrowseView: React.FC<BrowseViewProps> = ({
  channels,
  activeChannelId,
  favoriteIds,
  onSelectChannel,
  onWatch,
  onToggleFavorite,
  onNavigateToCategory,
}) => {
  const { filterState, setFilter, resetFilters, filtered } = useChannelFilters(
    channels,
    favoriteIds
  );

  const { history } = useHistory();
  const { recommended } = useRecommendations(channels);

  // Map history channel IDs to full CatalogChannel objects
  const historyChannels = useMemo(() => {
    if (history.length === 0) return [];
    const map = new Map<string, CatalogChannel>();
    for (const ch of channels) {
      map.set(ch.id, ch);
    }
    return history
      .map((id) => map.get(id))
      .filter((ch): ch is CatalogChannel => Boolean(ch));
  }, [history, channels]);

  const isFilteringActive =
    filterState.search !== '' ||
    filterState.country !== 'ALL' ||
    filterState.region !== 'ALL' ||
    filterState.category !== 'ALL' ||
    filterState.minQuality !== 'ALL' ||
    filterState.onlyFavorites;

  // Extract unique countries with counts
  const countries = useMemo(() => {
    const map = new Map<string, { code: string; name: string; flag?: string; count: number }>();
    for (const ch of channels) {
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
    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name)
    );
  }, [channels]);

  // Extract unique regions with counts
  const regions = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of channels) {
      if (!ch.region) continue;
      map.set(ch.region, (map.get(ch.region) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [channels]);

  // Netflix-style pre-grouped rows by top categories and regions
  const rows = useMemo(() => {
    const list: {
      title: string;
      emoji?: string;
      channels: CatalogChannel[];
      categoryId?: string;
    }[] = [];

    // Category rows (News, Sports, Movies, Entertainment, Music)
    for (const cat of MAIN_CATEGORIES.slice(0, 5)) {
      const match = channels.filter((c) => c.primary_category === cat.id);
      if (match.length > 0) {
        list.push({
          title: cat.name,
          emoji: cat.emoji,
          channels: match,
          categoryId: cat.id,
        });
      }
    }

    // Region rows (Europe, Americas, Asia)
    for (const r of regions.slice(0, 3)) {
      const match = channels.filter((c) => c.region === r.name);
      if (match.length > 0) {
        list.push({
          title: `Región: ${r.name}`,
          emoji: '🗺️',
          channels: match,
        });
      }
    }

    return list;
  }, [channels, regions]);

  return (
    <div className="flex flex-col gap-8">
      {/* Non-filtering mode: Hero Carousel, Continue Watching, and For You rows */}
      {!isFilteringActive && (
        <>
          <section aria-label="Canales destacados">
            <HeroCarousel channels={channels} onWatch={onWatch} />
          </section>

          {/* Row: Continuar viendo */}
          {historyChannels.length > 0 && (
            <section aria-label="Continuar viendo">
              <ChannelRow
                title="Continuar viendo"
                emoji="⏱️"
                channels={historyChannels}
                activeChannelId={activeChannelId}
                favoriteIds={favoriteIds}
                onSelectChannel={onSelectChannel}
                onToggleFavorite={onToggleFavorite}
              />
            </section>
          )}

          {/* Row: Para ti (affine recommendations based on watched categories & countries) */}
          {recommended.length > 0 && (
            <section aria-label="Para ti">
              <ChannelRow
                title="Para ti"
                emoji="✨"
                channels={recommended}
                activeChannelId={activeChannelId}
                favoriteIds={favoriteIds}
                onSelectChannel={onSelectChannel}
                onToggleFavorite={onToggleFavorite}
              />
            </section>
          )}
        </>
      )}

      {/* Category Chips Scrollbar */}
      <section aria-label="Explorador de categorías">
        <CategoryChips
          selectedCategory={filterState.category}
          onSelectCategory={(catId) => setFilter({ category: catId })}
        />
      </section>

      {/* Filter Bar */}
      <section aria-label="Filtros avanzados">
        <FilterBar
          filterState={filterState}
          onFilterChange={setFilter}
          onResetFilters={resetFilters}
          countries={countries}
          regions={regions}
          totalFilteredCount={filtered.length}
          favoritesCount={favoriteIds.size}
        />
      </section>

      {/* Content Switcher: If filtering is active, show InfiniteChannelGrid; else show rows */}
      {isFilteringActive ? (
        <section aria-label="Resultados de búsqueda y filtrado">
          <InfiniteChannelGrid
            channels={filtered}
            activeChannelId={activeChannelId}
            favoriteIds={favoriteIds}
            onSelectChannel={onSelectChannel}
            onToggleFavorite={onToggleFavorite}
            onResetFilters={resetFilters}
          />
        </section>
      ) : (
        <section aria-label="Colecciones temáticas" className="flex flex-col gap-8">
          {rows.map((row) => (
            <ChannelRow
              key={row.title}
              title={row.title}
              emoji={row.emoji}
              channels={row.channels}
              activeChannelId={activeChannelId}
              favoriteIds={favoriteIds}
              onSelectChannel={onSelectChannel}
              onToggleFavorite={onToggleFavorite}
              onViewAll={
                row.categoryId && onNavigateToCategory
                  ? () => onNavigateToCategory(row.categoryId!)
                  : undefined
              }
            />
          ))}

          {/* All Channels Infinite Scroll Section at bottom */}
          <div className="pt-4 border-t border-[#1e293b]">
            <h3 className="text-lg font-bold text-[#e2e8f0] mb-4">Todos los Canales</h3>
            <InfiniteChannelGrid
              channels={channels}
              activeChannelId={activeChannelId}
              favoriteIds={favoriteIds}
              onSelectChannel={onSelectChannel}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        </section>
      )}
    </div>
  );
};
