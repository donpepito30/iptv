/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExternalLink, Play, ShieldAlert, Tv2 } from 'lucide-react';
import React from 'react';
import { CatalogChannel } from '../../lib/iptv/types.ts';

export interface PlayerIframeFallbackProps {
  channel: CatalogChannel | null;
  onExitEmbed: () => void;
}

export const PlayerIframeFallback: React.FC<PlayerIframeFallbackProps> = ({
  channel,
  onExitEmbed,
}) => {
  const embedUrl = channel?.embedUrl || channel?.website || '';

  if (!embedUrl) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-500 mb-2" />
        <h4 className="text-sm font-bold text-white mb-1">
          No hay reproductor embebido disponible
        </h4>
        <p className="text-xs text-slate-400 mb-4">
          Este canal no cuenta con una URL de transmisión oficial alternativa.
        </p>
        <button
          type="button"
          onClick={onExitEmbed}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold"
        >
          Volver al reproductor HLS
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">
      {/* Top Banner Control */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300 z-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>Modo Oficial</span>
          </span>
          <span className="font-semibold text-white truncate max-w-[180px] sm:max-w-xs">
            {channel?.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExitEmbed}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Tv2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Stream Directo</span>
          </button>
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Abrir en ventana externa"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Embedded Iframe */}
      <div className="relative flex-1 w-full h-full bg-black">
        <iframe
          src={embedUrl}
          title={channel?.name || 'Live Stream'}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
};
