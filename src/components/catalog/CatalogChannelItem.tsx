/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Tv } from 'lucide-react';
import React, { useState } from 'react';
import { getChannelAvatar } from '../../lib/iptv/avatar.ts';
import { CatalogChannel } from '../../lib/iptv/types.ts';

export interface CatalogChannelItemProps {
  channel: CatalogChannel;
  indexNumber: number;
  isActive: boolean;
  onSelect: (channel: CatalogChannel) => void;
}

export const CatalogChannelItem: React.FC<CatalogChannelItemProps> = ({
  channel,
  indexNumber,
  isActive,
  onSelect,
}) => {
  const [logoStage, setLogoStage] = useState<number>(0);
  const avatar = getChannelAvatar(channel.name);

  const getLogoSrc = () => {
    if (!channel.logo) return null;
    if (logoStage === 0) return channel.logo;
    if (logoStage === 1) return `/api/image-proxy?url=${encodeURIComponent(channel.logo)}`;
    return null;
  };

  const currentLogoSrc = getLogoSrc();

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
      className={`group flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:scale-[1.01] focus:z-10 ${
        isActive
          ? 'bg-[#14233c] border-2 border-[#34d399] shadow-lg shadow-emerald-500/10'
          : 'bg-[#111c2f] border border-[#1e293b] hover:border-slate-700 hover:bg-[#16233b]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Index & Logo / Fallback icon */}
        <div className="relative w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-inner">
          {currentLogoSrc ? (
            <img
              src={currentLogoSrc}
              alt={channel.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain filter drop-shadow-sm"
              onError={() => setLogoStage((prev) => prev + 1)}
            />
          ) : (
            <div
              className={`w-full h-full rounded-lg bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-white font-black text-xs`}
            >
              {avatar.initials}
            </div>
          )}
        </div>

        {/* Channel Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              #{indexNumber}
            </span>
            <h3 className="text-sm font-semibold text-[#e2e8f0] truncate group-hover:text-white">
              {channel.name}
            </h3>
            {channel.country_flag && (
              <span className="text-sm shrink-0" title={channel.country_name}>
                {channel.country_flag}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#94a3b8] mt-0.5 truncate">
            <span className="truncate">{channel.country_name}</span>
            {channel.region && <span aria-hidden="true">·</span>}
            {channel.region && <span className="truncate text-slate-400">{channel.region}</span>}
            {channel.primary_category && <span aria-hidden="true">·</span>}
            {channel.primary_category && (
              <span className="capitalize">{channel.primary_category}</span>
            )}
            {channel.subcategory && <span aria-hidden="true">·</span>}
            {channel.subcategory && (
              <span className="text-emerald-400/90 font-medium truncate">
                {channel.subcategory}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quality badge & play affordance */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {channel.best_quality && (
          <span className="text-[11px] font-mono text-sky-400 font-semibold px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20">
            {channel.best_quality}
          </span>
        )}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            isActive
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};
