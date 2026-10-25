/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react';
import React from 'react';
import { CatalogStream } from '../../lib/iptv/types.ts';

export interface PlayerLoadingOverlayProps {
  channelName?: string;
  currentSourceIndex: number;
  totalSources: number;
}

export const PlayerLoadingOverlay: React.FC<PlayerLoadingOverlayProps> = ({
  channelName,
  currentSourceIndex,
  totalSources,
}) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xs z-20 text-center">
    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
    <h3 className="text-base font-bold text-white mb-1">{channelName}</h3>
    <p className="text-xs text-[#94a3b8] font-mono">
      Conectando señal (Fuente {currentSourceIndex + 1} de {totalSources})...
    </p>
  </div>
);

export interface PlayerErrorOverlayProps {
  errorMessage: string | null;
  usableStreams: CatalogStream[];
  currentStreamIndex: number;
  onSwitchStream: (index: number) => void;
  onRetry: () => void;
}

export const PlayerErrorOverlay: React.FC<PlayerErrorOverlayProps> = ({
  errorMessage,
  usableStreams,
  currentStreamIndex,
  onSwitchStream,
  onRetry,
}) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md z-30 text-center">
    <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
      <AlertTriangle className="w-6 h-6" />
    </div>
    <h3 className="text-base font-bold text-white mb-1">
      No se pudo reproducir la transmisión
    </h3>
    <p className="text-xs text-slate-300 max-w-md mb-4 leading-relaxed font-sans">
      {errorMessage}
    </p>

    {/* Sources Selector (Fuente 1/5...) */}
    {usableStreams.length > 1 && (
      <div className="flex items-center gap-1.5 mb-4 flex-wrap justify-center">
        <span className="text-xs text-[#94a3b8] mr-1">Probar otra fuente:</span>
        {usableStreams.map((s, idx) => (
          <button
            key={s.url}
            type="button"
            onClick={() => onSwitchStream(idx)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              idx === currentStreamIndex
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Fuente {idx + 1} ({s.quality || 'HD'})
          </button>
        ))}
      </div>
    )}

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onRetry}
        className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Reintentar</span>
      </button>
    </div>
  </div>
);
