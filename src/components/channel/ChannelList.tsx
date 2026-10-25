/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronDown, SearchX, Star, Tv } from 'lucide-react';
import React, { useState } from 'react';
import { t } from '../../lib/iptv/i18n.ts';
import { AppLanguage, ChannelWithStream } from '../../lib/iptv/types.ts';
import { ChannelCard } from './ChannelCard.tsx';

export interface ChannelListProps {
  channels: ChannelWithStream[];
  activeChannelId: string | null;
  favoriteIds: Set<string>;
  language: AppLanguage;
  activeTab: 'all' | 'favorites' | 'history';
  onSelectChannel: (channel: ChannelWithStream) => void;
  onToggleFavorite: (channelId: string) => void;
  onResetFilters?: () => void;
  onClearHistory?: () => void;
}

const PAGE_SIZE = 36;

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  activeChannelId,
  favoriteIds,
  language,
  activeTab,
  onSelectChannel,
  onToggleFavorite,
  onResetFilters,
  onClearHistory,
}) => {
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Reset pagination when channel count shifts dramatically
  const visibleChannels = channels.slice(0, displayCount);
  const hasMore = displayCount < channels.length;

  const handleLoadMore = () => {
    setDisplayCount((prev) => Math.min(prev + PAGE_SIZE, channels.length));
  };

  // Empty state handling
  if (channels.length === 0) {
    if (activeTab === 'favorites') {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111c2f] border border-[#1e293b] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
            <Star className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#e2e8f0] mb-1">
            {t('emptyFavorites', language)}
          </h3>
          <p className="text-xs text-[#94a3b8] max-w-sm">
            {t('emptyFavoritesDesc', language)}
          </p>
        </div>
      );
    }

    if (activeTab === 'history') {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111c2f] border border-[#1e293b] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
            <Tv className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#e2e8f0] mb-1">
            {t('emptyHistory', language)}
          </h3>
          <p className="text-xs text-[#94a3b8] max-w-sm">
            {t('emptyHistoryDesc', language)}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111c2f] border border-[#1e293b] rounded-2xl">
        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-[#e2e8f0] mb-1">
          {t('noChannelsFound', language)}
        </h3>
        <p className="text-xs text-[#94a3b8] max-w-sm mb-4">
          {t('noChannelsFoundDesc', language)}
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors"
          >
            {t('resetFilters', language)}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* History clear header if on history tab */}
      {activeTab === 'history' && onClearHistory && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClearHistory}
            className="text-xs text-[#94a3b8] hover:text-red-400 transition-colors"
          >
            {t('clearHistory', language)}
          </button>
        </div>
      )}

      {/* Grid of channels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
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

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            type="button"
            onClick={handleLoadMore}
            className="px-6 py-2.5 rounded-xl bg-[#111c2f] hover:bg-[#16233b] border border-[#1e293b] hover:border-slate-700 text-xs font-semibold text-[#e2e8f0] flex items-center gap-2 transition-all shadow-sm"
          >
            <span>Cargar más canales</span>
            <ChevronDown className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] text-[#94a3b8] font-mono tabular-nums">
              ({visibleChannels.length} / {channels.length})
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
