/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExternalLink, Eye, Play, Radio, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { AdultModelItem } from '../../lib/iptv/adult-catalog.ts';

export interface AdultModelCardProps {
  model: AdultModelItem;
  isActive?: boolean;
  onSelect: (model: AdultModelItem) => void;
}

export const AdultModelCard: React.FC<AdultModelCardProps> = ({
  model,
  isActive = false,
  onSelect,
}) => {
  // Snapshot fallback: 0 = original snapshot, 1 = proxied snapshot, 2 = original avatar, 3 = proxied avatar, 4 = none
  const [snapshotState, setSnapshotState] = useState<number>(0);
  const [avatarState, setAvatarState] = useState<number>(0);

  const getSnapshotSrc = () => {
    if (snapshotState === 0 && model.snapshotUrl) return model.snapshotUrl;
    if (snapshotState === 1 && model.snapshotUrl) return `/api/image-proxy?url=${encodeURIComponent(model.snapshotUrl)}`;
    if (snapshotState === 2 && model.avatarUrl) return model.avatarUrl;
    if (snapshotState === 3 && model.avatarUrl) return `/api/image-proxy?url=${encodeURIComponent(model.avatarUrl)}`;
    return null;
  };

  const getAvatarSrc = () => {
    if (!model.avatarUrl) return null;
    if (avatarState === 0) return model.avatarUrl;
    if (avatarState === 1) return `/api/image-proxy?url=${encodeURIComponent(model.avatarUrl)}`;
    return null;
  };

  const snapshotSrc = getSnapshotSrc();
  const avatarSrc = getAvatarSrc();

  return (
    <div
      onClick={() => onSelect(model)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(model);
        }
      }}
      className={`group relative flex flex-col justify-between rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 select-none text-left focus:outline-none focus:ring-2 focus:ring-rose-400 focus:scale-[1.02] focus:z-10 focus:shadow-xl ${
        isActive
          ? 'bg-[#1e1327] border-2 border-rose-500 shadow-xl shadow-rose-950/40 ring-1 ring-rose-500/40'
          : 'bg-[#111c2f] border border-[#1e293b] hover:border-rose-500/50 hover:bg-[#161d31] hover:shadow-lg hover:shadow-rose-950/20'
      }`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
        {snapshotSrc ? (
          <img
            src={snapshotSrc}
            alt={model.displayName}
            loading="lazy"
            onError={() => setSnapshotState((prev) => prev + 1)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-rose-950/40 text-slate-500 p-4">
            <Radio className="w-8 h-8 text-rose-500/40 mb-1" />
            <span className="text-[11px] font-semibold text-slate-400">{model.displayName}</span>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />

        {/* Live status badge (Top Left) */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600/90 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span>En vivo</span>
          </span>
          {model.isHD && (
            <span className="px-1.5 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
              HD
            </span>
          )}
        </div>

        {/* Viewers counter (Top Right) */}
        {model.viewersCount > 0 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-xs text-slate-300 text-[11px] font-semibold border border-slate-800">
            <Eye className="w-3 h-3 text-rose-400" />
            <span>{model.viewersCount.toLocaleString()}</span>
          </div>
        )}

        {/* Floating Play Icon on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40">
          <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Model avatar overlay (Bottom Left) */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-rose-500/80 bg-slate-800 shrink-0 shadow-md">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={model.displayName}
                onError={() => setAvatarState((prev) => prev + 1)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-rose-700 text-white text-xs font-black">
                {model.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-white truncate drop-shadow-md">
              {model.displayName}
            </h3>
            <span className="text-[10px] text-slate-300 drop-shadow-xs">
              {model.countryName}
            </span>
          </div>
        </div>
      </div>

      {/* Card Info & Meta Footer */}
      <div className="p-3 flex items-center justify-between gap-2 border-t border-slate-800/80 bg-[#0e1726]">
        <div className="flex flex-wrap items-center gap-1 overflow-hidden">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300 uppercase">
            {model.countryCode}
          </span>
          {model.languages.slice(0, 2).map((lang) => (
            <span
              key={lang}
              className="px-1.5 py-0.5 rounded bg-slate-800/60 text-[10px] text-slate-400 uppercase font-mono"
            >
              {lang}
            </span>
          ))}
        </div>

        {/* Direct embed fallback link */}
        {model.embedUrl && (
          <a
            href={model.embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Abrir página oficial de la transmisión"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
