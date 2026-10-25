/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Heart, Play } from 'lucide-react';
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
  const [imgFailed, setImgFailed] = useState(false);
  const avatar = getChannelAvatar(channel.name);

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
      className={`group relative flex flex-col justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-200 select-none text-left ${
        isActive
          ? 'bg-[#14233c] border-2 border-[#34d399] shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/30'
          : 'bg-[#111c2f] border border-[#1e293b] hover:border-slate-700 hover:bg-[#16233b] hover:shadow-md'
      }`}
    >
      {/* Top Header inside card: Live Badge + Quality + Heart Favorite Button */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5">
        <div className="flex items-center gap-1.5">
          {/* Badge LIVE con punto */}
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE</span>
          </span>

          {/* Quality Badge */}
          {channel.best_quality && (
            <span className="text-[10px] font-mono text-sky-400 font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/25 tabular-nums">
              {channel.best_quality}
            </span>
          )}
        </div>

        {/* Botón de favorito: Corazón */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          className={`p-1.5 rounded-lg transition-all ${
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

      {/* Middle: Logo or generated initials on gradient */}
      <div className="flex items-center gap-3 min-w-0 mb-2">
        <div className="relative w-11 h-11 rounded-xl shrink-0 overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
          {channel.logo && !imgFailed ? (
            <img
              src={channel.logo}
              alt={channel.name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain p-1"
            />
          ) : (
            /* Fallback to initials on generated gradient */
            <div
              className={`w-full h-full bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-white font-extrabold text-xs tracking-wider shadow-inner`}
            >
              {avatar.initials}
            </div>
          )}
        </div>

        {/* Name and Country */}
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

      {/* Bottom Footer: Category / Subcategory + Play Button */}
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
