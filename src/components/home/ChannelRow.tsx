/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useRef } from 'react';
import { CatalogChannel } from '../../lib/iptv/types.ts';
import { ChannelCard } from '../channel/ChannelCard.tsx';

export interface ChannelRowProps {
  title: string;
  emoji?: string;
  channels: CatalogChannel[];
  activeChannelId?: string | null;
  favoriteIds: Set<string>;
  onSelectChannel: (channel: CatalogChannel) => void;
  onToggleFavorite: (channelId: string) => void;
  onViewAll?: () => void;
}

export const ChannelRow: React.FC<ChannelRowProps> = ({
  title,
  emoji,
  channels,
  activeChannelId,
  favoriteIds,
  onSelectChannel,
  onToggleFavorite,
  onViewAll,
}) => {
  const rowRef = useRef<HTMLDivElement | null>(null);

  if (channels.length === 0) return null;

  // Max 20 channels per row as requested
  const displayChannels = channels.slice(0, 20);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!rowRef.current) return;
    const scrollAmount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex flex-col gap-3 group/row">
      {/* Row Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-xl">{emoji}</span>}
          <h3 className="text-lg font-bold text-[#e2e8f0] tracking-tight">{title}</h3>
          <span className="text-xs font-mono text-[#94a3b8] tabular-nums">
            ({channels.length})
          </span>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors mr-2 cursor-pointer"
            >
              Ver todos →
            </button>
          )}

          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1.5 rounded-lg bg-[#111c2f] border border-[#1e293b] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Desplazar a la izquierda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1.5 rounded-lg bg-[#111c2f] border border-[#1e293b] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Desplazar a la derecha"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={rowRef}
        className="flex items-stretch gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1 select-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {displayChannels.map((channel) => (
          <div key={channel.id} className="w-64 sm:w-72 shrink-0">
            <ChannelCard
              channel={channel}
              isActive={channel.id === activeChannelId}
              isFavorite={favoriteIds.has(channel.id)}
              onSelect={onSelectChannel}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
