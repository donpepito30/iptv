/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertTriangle,
  Globe,
  Loader2,
  Radio,
  RotateCcw,
  ShieldCheck,
  SkipForward,
} from 'lucide-react';
import React from 'react';
import { ErrorKind } from '../../lib/iptv/player-fallback.ts';
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
      Conectando señal {totalSources > 1 ? `(Fuente ${currentSourceIndex + 1} de ${totalSources})` : ''}...
    </p>
  </div>
);

export interface PlayerErrorOverlayProps {
  errorMessage: string | null;
  errorKind?: ErrorKind | null;
  usableStreams: CatalogStream[];
  currentStreamIndex: number;
  hasEmbedUrl?: boolean;
  categoryLabel?: string;
  autoplayNext?: boolean;
  onSwitchStream: (index: number) => void;
  onRetry: () => void;
  onRetryWithProxy?: () => void;
  onSwitchToEmbed?: () => void;
  onNextChannel?: () => void;
}

export const PlayerErrorOverlay: React.FC<PlayerErrorOverlayProps> = ({
  errorMessage,
  errorKind,
  usableStreams,
  currentStreamIndex,
  hasEmbedUrl,
  categoryLabel,
  autoplayNext = true,
  onSwitchStream,
  onRetry,
  onRetryWithProxy,
  onSwitchToEmbed,
  onNextChannel,
}) => {
  const [countdown, setCountdown] = React.useState<number | null>(() => (autoplayNext && onNextChannel ? 5 : null));

  React.useEffect(() => {
    if (countdown === null || !onNextChannel) return;
    if (countdown <= 0) {
      onNextChannel();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onNextChannel]);
  const getBadgeLabel = () => {
    switch (errorKind) {
      case 'geo':
        return { label: 'Bloqueo Geográfico', icon: Globe, color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' };
      case 'cors':
      case 'mixed_content':
        return { label: 'Túnel Proxy Relay', icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' };
      case 'offline':
      case 'timeout':
        return { label: 'Señal en Pausa', icon: Radio, color: 'text-sky-400 bg-sky-500/20 border-sky-500/40' };
      default:
        return { label: 'Transmisión Inactiva', icon: AlertTriangle, color: 'text-red-400 bg-red-500/20 border-red-500/40' };
    }
  };

  const badge = getBadgeLabel();
  const BadgeIcon = badge.icon;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md z-30 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-2.5">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold border mb-2 ${badge.color}`}>
        <BadgeIcon className="w-3.5 h-3.5" />
        <span>{badge.label}</span>
      </div>

      <h3 className="text-base font-bold text-white mb-1.5">
        No se pudo reproducir la transmisión
      </h3>

      <p className="text-xs text-slate-300 max-w-md mb-4 leading-relaxed font-sans">
        {errorMessage}
      </p>

      {/* Alternative Stream Candidates */}
      {usableStreams.length > 1 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap justify-center">
          <span className="text-xs text-[#94a3b8] mr-1">Probar otra fuente:</span>
          {usableStreams.map((s, idx) => (
            <button
              key={`${s.url}-${idx}`}
              type="button"
              onClick={() => onSwitchStream(idx)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                idx === currentStreamIndex
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              Fuente {idx + 1} {s.quality ? `(${s.quality})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Auto-advance countdown notice */}
      {countdown !== null && onNextChannel && (
        <div className="mb-4 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 justify-center animate-pulse">
          <span>
            Avanzando automáticamente al siguiente canal {categoryLabel ? `en "${categoryLabel}"` : ''} en{' '}
            <strong className="font-mono text-amber-200">{countdown}s</strong>...
          </span>
          <button
            type="button"
            onClick={() => setCountdown(null)}
            className="underline hover:text-white font-semibold ml-1 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => {
            setCountdown(null);
            onRetry();
          }}
          className="btn-3d-slate px-4 py-2 rounded-xl text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reintentar</span>
        </button>

        {onRetryWithProxy && (
          <button
            type="button"
            onClick={() => {
              setCountdown(null);
              onRetryWithProxy();
            }}
            className="btn-3d-emerald px-4 py-2 rounded-xl text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Forzar Proxy Relay</span>
          </button>
        )}

        {hasEmbedUrl && onSwitchToEmbed && (
          <button
            type="button"
            onClick={() => {
              setCountdown(null);
              onSwitchToEmbed();
            }}
            className="btn-3d-rose px-4 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Modo Oficial Embebido</span>
          </button>
        )}

        {onNextChannel && (
          <button
            type="button"
            onClick={onNextChannel}
            className="btn-3d-slate px-4 py-2 rounded-xl text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>
              {categoryLabel ? `Siguiente (${categoryLabel})` : 'Siguiente Canal'}
            </span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
