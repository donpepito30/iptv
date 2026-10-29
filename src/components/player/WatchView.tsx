/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft, ExternalLink, Globe, Heart } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getChannelAvatar } from '../../lib/iptv/avatar.ts';
import { CatalogChannel, UserSettings } from '../../lib/iptv/types.ts';
import { ChannelCard } from '../channel/ChannelCard.tsx';
import { MiniPlayer } from './MiniPlayer.tsx';
import { Player } from './Player.tsx';

export interface WatchViewProps {
  channel: CatalogChannel | null;
  allChannels: CatalogChannel[];
  categoryChannels?: CatalogChannel[];
  categoryName?: string;
  settings: UserSettings;
  isFavorite: boolean;
  favoriteIds: Set<string>;
  onUpdateSettings: (updater: Partial<UserSettings>) => void;
  onToggleFavorite: (channelId: string) => void;
  onSelectChannel: (channel: CatalogChannel) => void;
  onBack: () => void;
  onExitCategory?: () => void;
  isMini?: boolean;
  onExpand?: () => void;
  onCloseMini?: () => void;
}

export const WatchView: React.FC<WatchViewProps> = ({
  channel,
  allChannels,
  categoryChannels,
  categoryName,
  settings,
  isFavorite,
  favoriteIds,
  onUpdateSettings,
  onToggleFavorite,
  onSelectChannel,
  onBack,
  onExitCategory,
  isMini = false,
  onExpand,
  onCloseMini,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);

  // Scoped navigation pool: strictly within the selected category or adult section
  const navPool = useMemo(() => {
    if (categoryChannels && categoryChannels.length > 0) return categoryChannels;
    return allChannels;
  }, [categoryChannels, allChannels]);

  const currentIndex = useMemo(() => {
    if (!channel) return -1;
    return navPool.findIndex((c) => c.id === channel.id);
  }, [navPool, channel?.id]);

  const handlePrevChannel = () => {
    if (navPool.length === 0) return;
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : navPool.length - 1;
    onSelectChannel(navPool[prevIdx]);
  };

  const handleNextChannel = () => {
    if (navPool.length === 0) return;
    const nextIdx = currentIndex >= 0 && currentIndex < navPool.length - 1 ? currentIndex + 1 : 0;
    onSelectChannel(navPool[nextIdx]);
  };

  // Related channels from same category or same country
  const relatedChannels = useMemo(() => {
    if (!channel || isMini) return [];
    return navPool
      .filter(
        (c) =>
          c.id !== channel.id &&
          (c.primary_category === channel.primary_category || c.country === channel.country)
      )
      .slice(0, 8);
  }, [channel, navPool, isMini]);

  if (!channel) {
    if (isMini) return null;
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111c2f] border border-[#1e293b] rounded-2xl">
        <h3 className="text-base font-bold text-[#e2e8f0] mb-3">Canal no encontrado</h3>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  // Floating MiniPlayer mode
  if (isMini) {
    return (
      <MiniPlayer channel={channel} onExpand={onExpand || onBack} onClose={onCloseMini || onBack}>
        <Player
          channel={channel}
          settings={settings}
          categoryLabel={categoryName}
          onUpdateSettings={onUpdateSettings}
          onPrevChannel={handlePrevChannel}
          onNextChannel={handleNextChannel}
        />
      </MiniPlayer>
    );
  }

  const avatar = getChannelAvatar(channel.name);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Navigation Back & Category Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="btn-3d-slate inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-[#e2e8f0] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>{categoryName ? `Volver a ${categoryName}` : 'Volver al catálogo'}</span>
          </button>

          {categoryName && onExitCategory && categoryName !== '+18 Adultos' && (
            <button
              type="button"
              onClick={onExitCategory}
              className="px-3 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer hidden sm:inline-block"
            >
              Ver catálogo general
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {categoryName && (
            <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-xs">
              {categoryName} {currentIndex >= 0 ? `(${currentIndex + 1} de ${navPool.length})` : ''}
            </span>
          )}
          <span className="text-xs font-mono text-[#94a3b8] tabular-nums">#{channel.id}</span>
        </div>
      </div>

      {/* Main Full Player Viewport */}
      <Player
        channel={channel}
        settings={settings}
        categoryLabel={categoryName}
        onUpdateSettings={onUpdateSettings}
        onPrevChannel={handlePrevChannel}
        onNextChannel={handleNextChannel}
      />

      {/* Channel Details Info Sheet */}
      <div className="p-5 rounded-2xl panel-3d flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner p-1">
            {channel.logo && !logoFailed ? (
              <img
                src={channel.logo}
                alt={channel.name}
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-tr ${avatar.gradient} rounded-xl flex items-center justify-center text-white font-black text-sm tracking-wider`}
              >
                {avatar.initials}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#e2e8f0] truncate tracking-tight">
                {channel.name}
              </h1>
              {channel.country_flag && (
                <span className="text-xl shrink-0" title={channel.country_name}>
                  {channel.country_flag}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8] mt-1">
              <span>{channel.country_name || channel.country}</span>
              {channel.region && <span aria-hidden="true">·</span>}
              <span>{channel.region}</span>
              {channel.primary_category && <span aria-hidden="true">·</span>}
              <span className="capitalize text-slate-200 font-semibold">
                {channel.primary_category}
              </span>
              {channel.subcategory && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-semibold">{channel.subcategory}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          {channel.website && (
            <a
              href={channel.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Web oficial</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onToggleFavorite(channel.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isFavorite
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span>{isFavorite ? 'Favorito' : 'Añadir a favoritos'}</span>
          </button>
        </div>
      </div>

      {/* Related Channels Row */}
      {relatedChannels.length > 0 && (
        <section aria-label="Canales relacionados" className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#e2e8f0]">
              Canales relacionados ({channel.primary_category || channel.country_name})
            </h2>
            <span className="text-xs text-[#94a3b8] font-mono tabular-nums">
              {relatedChannels.length} canales
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {relatedChannels.map((rel) => (
              <ChannelCard
                key={rel.id}
                channel={rel}
                isFavorite={favoriteIds.has(rel.id)}
                onSelect={onSelectChannel}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
