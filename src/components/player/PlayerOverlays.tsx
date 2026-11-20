/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AlertTriangle,
  Check,
  Flag,
  Globe,
  Loader2,
  Radio,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Wifi,
} from 'lucide-react';
import React, { useState } from 'react';
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
  <div
    role="status"
    aria-live="polite"
    className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xs z-20 text-center"
  >
    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
    <h3 className="text-base font-bold text-white mb-1">{channelName}</h3>
    <p className="text-xs text-[#94a3b8] font-mono">
      Conectando señal {totalSources > 1 ? `(Fuente ${currentSourceIndex + 1} de ${totalSources})` : ''}...
    </p>
  </div>
);

export interface PlayerReconnectingBannerProps {
  attempt: number;
  maxAttempts: number;
}

export const PlayerReconnectingBanner: React.FC<PlayerReconnectingBannerProps> = ({
  attempt,
  maxAttempts,
}) => (
  <div
    role="status"
    aria-live="polite"
    className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-2xl animate-in fade-in duration-200"
  >
    <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
    <span>
      Reconectando… intento <strong className="font-mono text-amber-200">{attempt}</strong> de{' '}
      <strong className="font-mono text-amber-200">{maxAttempts}</strong>
    </span>
  </div>
);

export interface PlayerErrorOverlayProps {
  errorMessage: string | null;
  errorKind?: ErrorKind | null;
  usableStreams: CatalogStream[];
  currentStreamIndex: number;
  channelName?: string;
  streamUrl?: string;
  usingProxy?: boolean;
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
  channelName,
  streamUrl,
  usingProxy = false,
  hasEmbedUrl,
  categoryLabel,
  autoplayNext = true,
  onSwitchStream,
  onRetry,
  onRetryWithProxy,
  onSwitchToEmbed,
  onNextChannel,
}) => {
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem('iptv:autoplay-next');
      if (stored === 'false') return null;
    } catch {}
    return autoplayNext && onNextChannel ? 5 : null;
  });

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

  const handleCancelCountdown = () => {
    setCountdown(null);
    try {
      localStorage.setItem('iptv:autoplay-next', 'false');
    } catch {}
  };

  const handleReportBroken = () => {
    const activeUrl = streamUrl || usableStreams[currentStreamIndex]?.url || '';
    const payload = `${channelName || 'Canal'}: ${activeUrl}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(payload).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    const issueUrl = `https://github.com/iptv-org/iptv/issues/new?title=${encodeURIComponent(
      `Broken stream: ${channelName || 'Canal'}`
    )}&body=${encodeURIComponent(
      `Canal: ${channelName || 'Desconocido'}\nStream URL: ${activeUrl}\nReportado desde la aplicación IPTV.`
    )}`;
    window.open(issueUrl, '_blank', 'noopener,noreferrer');
  };

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
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md z-30 text-center select-none"
    >
      <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-2.5">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap justify-center">
        <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold border ${badge.color}`}>
          <BadgeIcon className="w-3.5 h-3.5" />
          <span>{badge.label}</span>
        </div>

        {usableStreams.length > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            <span>Fuente {currentStreamIndex + 1} de {usableStreams.length}</span>
            <span className="text-slate-500">·</span>
            <span className={usingProxy ? 'text-amber-300' : 'text-emerald-300'}>
              {usingProxy ? 'Proxy Relay' : 'Conexión Directa'}
            </span>
          </div>
        )}
      </div>

      <h3 className="text-base font-bold text-white mb-1">
        No se pudo reproducir la transmisión
      </h3>

      <p className="text-xs text-slate-300 max-w-md mb-3 leading-relaxed font-sans">
        {errorMessage}
      </p>

      {/* Alternative Stream Candidates */}
      {usableStreams.length > 1 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap justify-center">
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
        <div className="mb-3 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 justify-center animate-pulse">
          <span>
            Avanzando automáticamente al siguiente canal {categoryLabel ? `en "${categoryLabel}"` : ''} en{' '}
            <strong className="font-mono text-amber-200">{countdown}s</strong>...
          </span>
          <button
            type="button"
            onClick={handleCancelCountdown}
            className="underline hover:text-white font-semibold ml-1 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => {
            setCountdown(null);
            onRetry();
          }}
          className="btn-3d-slate px-3.5 py-2 rounded-xl text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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
            className="btn-3d-emerald px-3.5 py-2 rounded-xl text-slate-950 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
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
            className="btn-3d-rose px-3.5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Modo Oficial Embebido</span>
          </button>
        )}

        {onNextChannel && (
          <button
            type="button"
            onClick={onNextChannel}
            className="btn-3d-slate px-3.5 py-2 rounded-xl text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{categoryLabel ? `Siguiente (${categoryLabel})` : 'Siguiente Canal'}</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Report Broken Link Button */}
        <button
          type="button"
          onClick={handleReportBroken}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-rose-400 border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Copiar datos del canal y abrir reporte en GitHub"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Flag className="w-3.5 h-3.5 text-rose-400" />}
          <span>{copied ? 'Copiado al portapapeles' : 'Reportar enlace caído'}</span>
        </button>
      </div>
    </div>
  );
};
