/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, ShieldCheck, Zap, X } from 'lucide-react';
import { PlayerTelemetry } from '../../lib/iptv/player-telemetry.ts';

interface TelemetryHudProps {
  telemetry: PlayerTelemetry;
  currentStreamIndex: number;
  totalStreams: number;
  onClose: () => void;
}

export const TelemetryHud: React.FC<TelemetryHudProps> = ({
  telemetry,
  currentStreamIndex,
  totalStreams,
  onClose,
}) => {
  return (
    <div className="absolute top-4 right-4 z-40 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-xs font-mono text-slate-200 min-w-64 max-w-xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-sans font-bold text-emerald-400">
          <Activity className="w-3.5 h-3.5" />
          <span>Telemetría Broadcast</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer transition-colors"
          title="Cerrar telemetría (I)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Transporte:</span>
          <span
            className={`font-semibold inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
              telemetry.isProxy
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {telemetry.isProxy ? (
              <>
                <Zap className="w-2.5 h-2.5" />
                Relay Proxy
              </>
            ) : (
              <>
                <ShieldCheck className="w-2.5 h-2.5" />
                Directo CDN
              </>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Resolución:</span>
          <span className="font-semibold text-white">{telemetry.resolution}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Bitrate:</span>
          <span className="font-semibold text-emerald-300">
            {telemetry.bitrateKbps > 0 ? `${telemetry.bitrateKbps} kbps` : 'Adaptativo'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Buffer Adelantado:</span>
          <span
            className={`font-semibold ${
              telemetry.bufferSec < 2 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {telemetry.bufferSec.toFixed(1)} s
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Cuadros Descartados:</span>
          <span className="text-slate-300">{telemetry.droppedFrames}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Fuente:</span>
          <span className="text-slate-300">
            {currentStreamIndex + 1} de {totalStreams}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Perfil Hardware:</span>
          <span className="font-semibold text-cyan-300">
            {telemetry.deviceTier || 'Estándar'} ({telemetry.bufferCapMb || 60}MB)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Motor de video:</span>
          <span className="text-slate-400 text-[11px]">{telemetry.engineName}</span>
        </div>
      </div>
    </div>
  );
};
