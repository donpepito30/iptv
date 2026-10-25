/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Heart, Play, Radio } from 'lucide-react';
import React, { useState } from 'react';
import { getChannelAvatar } from '../../lib/iptv/avatar.ts';
import { CatalogChannel } from '../../lib/iptv/types.ts';

export interface ChannelCardProps {
  channel: CatalogChannel;
  isActive?: boolean;
  isFavorite: boolean;
  onSelect: (channel: CatalogChannel) => void;
  onToggleFavorite: (channelId: string) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  isActive = false,
  isFavorite,
  onSelect,
  onToggleFavorite,
}) => {
  // 0: direct, 1: proxied, 2: failed (avatar fallback)
  const [logoState, setLogoState] = useState<number>(0);
  const avatar = getChannelAvatar(channel.name);

  const getLogoSrc = () => {
    if (!channel.logo) return null;
    if (logoState === 0) return channel.logo;
    if (logoState === 1) return `/api/image-proxy?url=${encodeURIComponent(channel.logo)}`;
    return null;
  };

  const currentLogoSrc = getLogoSrc();

  const handleImgError = () => {
    setLogoState((prev) => prev + 1);
  };

  return (
    <div
      onClick={() => onSelect(channel)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(channel);
        }
      }}
      className={`group relative flex flex-col justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-200 select-none text-left focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:scale-[1.03] focus:z-10 focus:shadow-xl ${
        isActive
          ? 'bg-[#14233c] border-2 border-[#34d399] shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/30'
          : 'bg-[#111c2f] border border-[#1e293b] hover:border-slate-700 hover:bg-[#16233b] hover:shadow-md'
      }`}
    >
      {/* Top Header inside card: Live Beacon + Quality + Favorite Heart */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5">
        <div className="flex items-center gap-1.5">
          {/* Badge LIVE */}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>EN VIVO</span>
          </span>

          {/* Quality Badge */}
          {channel.best_quality && (
            <span className="text-[10px] font-mono text-sky-400 font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/25 tabular-nums">
              {channel.best_quality}
            </span>
          )}

          {/* Multiple sources badge */}
          {channel.streams && channel.streams.length > 1 && (
            <span
              className="text-[10px] font-mono text-purple-300 font-medium px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/25 hidden sm:inline-block"
              title={`${channel.streams.length} fuentes de transmisión`}
            >
              {channel.streams.length} fuentes
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          className={`p-1.5 rounded-lg transition-all focus:outline-none focus:ring-1 focus:ring-rose-400 ${
            isFavorite
              ? 'text-rose-500 hover:scale-110'
              : 'text-slate-500 hover:text-rose-400 hover:bg-white/5 opacity-70 group-hover:opacity-100'
          }`}
          title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          <Heart
            className={`w-4 h-4 transition-transform ${
              isFavorite ? 'fill-rose-500 scale-105' : ''
            }`}
          />
        </button>
      </div>

      {/* Middle: Official Logo or Broadcast Initial Avatar */}
      <div className="flex items-center gap-3 min-w-0 mb-2">
        <div className="relative w-12 h-12 rounded-xl shrink-0 overflow-hidden bg-slate-900/90 border border-slate-800 flex items-center justify-center p-1 shadow-inner group-hover:border-slate-700 transition-colors">
          {currentLogoSrc ? (
            <img
              src={currentLogoSrc}
              alt={channel.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={handleImgError}
              className="w-full h-full object-contain filter drop-shadow-sm transition-transform group-hover:scale-105"
            />
          ) : (
            <div
              className={`w-full h-full rounded-lg bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-white font-black text-xs tracking-wider shadow-inner`}
            >
              {avatar.initials}
            </div>
          )}
        </div>

        {/* Channel Name and Country Flag */}
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-semibold truncate leading-snug ${
              isActive ? 'text-[#34d399]' : 'text-[#e2e8f0] group-hover:text-white'
            }`}
          >
            {channel.name}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] mt-0.5 truncate">
            {channel.country_flag && (
              <span className="text-xs shrink-0">{channel.country_flag}</span>
            )}
            <span className="truncate">
              {channel.country_name || channel.country || 'Internacional'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Category + Quick Zap Play Button */}
      <div className="flex items-center justify-between text-xs text-[#94a3b8] pt-2 border-t border-[#1e293b]/70 mt-1">
        <div className="flex items-center gap-1.5 truncate text-[11px]">
          {channel.primary_category && (
            <span className="capitalize text-slate-300 truncate">
              {channel.primary_category}
            </span>
          )}
          {channel.subcategory && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-400 font-medium truncate">
                {channel.subcategory}
              </span>
            </>
          )}
        </div>

        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0 ${
            isActive
              ? 'bg-emerald-500 text-slate-950 shadow-sm'
              : 'bg-slate-800 text-slate-400 group-hover:bg-emerald-500 group-hover:text-slate-950'
          }`}
        >
          <Play className="w-3 h-3 fill-current translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};
