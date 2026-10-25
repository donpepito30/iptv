/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Loader2, Tv } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { CatalogChannel } from '../../lib/iptv/types.ts';
import { ChannelCard } from '../channel/ChannelCard.tsx';

export interface InfiniteChannelGridProps {
  channels: CatalogChannel[];
  activeChannelId?: string | null;
  favoriteIds: Set<string>;
  onSelectChannel: (channel: CatalogChannel) => void;
  onToggleFavorite: (channelId: string) => void;
  onResetFilters?: () => void;
}

const BATCH_SIZE = 36;

export const InfiniteChannelGrid: React.FC<InfiniteChannelGridProps> = ({
  channels,
  activeChannelId,
  favoriteIds,
  onSelectChannel,
  onToggleFavorite,
  onResetFilters,
}) => {
  const [displayCount, setDisplayCount] = useState(BATCH_SIZE);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination count when the channels array changes
  useEffect(() => {
    setDisplayCount(BATCH_SIZE);
  }, [channels]);

  const hasMore = displayCount < channels.length;
  const visibleChannels = channels.slice(0, displayCount);

  // IntersectionObserver for infinite scrolling
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => Math.min(prev + BATCH_SIZE, channels.length));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, channels.length]);

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111c2f] border border-[#1e293b] rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
          <Tv className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#e2e8f0] mb-1">
          No se encontraron canales
        </h3>
        <p className="text-xs text-[#94a3b8] max-w-sm mb-4">
          Prueba a cambiar los términos de búsqueda o restablecer los filtros aplicados.
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
          >
            Restablecer filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleChannels.map((channel) => (
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

      {/* Infinite Scroll Observer Sentinel */}
      {hasMore && (
        <div
          ref={observerTargetRef}
          className="flex items-center justify-center py-6 text-xs text-[#94a3b8] gap-2"
        >
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          <span>Cargando más canales ({visibleChannels.length} de {channels.length})...</span>
        </div>
      )}
    </div>
  );
};
