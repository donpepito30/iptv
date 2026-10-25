/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ChevronUp,
  Maximize2,
  Minus,
  Radio,
  Tv,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getChannelAvatar } from '../../lib/iptv/avatar.ts';
import { getCurrentProgram, SimulatedProgram } from '../../lib/iptv/epg.ts';
import { CatalogChannel } from '../../lib/iptv/types.ts';

export interface MiniPlayerProps {
  channel: CatalogChannel | null;
  onExpand: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  channel,
  onExpand,
  onClose,
  children,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [program, setProgram] = useState<SimulatedProgram | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  // Update simulated program for the current channel
  useEffect(() => {
    if (channel) {
      setProgram(getCurrentProgram(channel, new Date()));
      const interval = setInterval(() => {
        setProgram(getCurrentProgram(channel, new Date()));
      }, 30000); // refresh every 30s
      return () => clearInterval(interval);
    }
  }, [channel]);

  // Auto-hide controls after 3 seconds of inactivity
  const resetHideTimer = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!channel) return null;

  const avatar = getChannelAvatar(channel.name);

  return (
    <aside
      aria-label="Reproductor flotante"
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 transition-all duration-300 select-none shadow-2xl rounded-2xl border border-[#1e293b] bg-[#111c2f] overflow-hidden ${
        isMinimized ? 'w-72 sm:w-80' : 'w-80 sm:w-96'
      }`}
    >
      {/* Top Header Bar: Logo, Name, simulated EPG program, expand/minimize/close */}
      <div className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-900/90 border-b border-[#1e293b] gap-2">
        <div
          onClick={onExpand}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 group"
          title="Clic para expandir a pantalla completa"
        >
          {/* Logo or initials */}
          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain p-0.5"
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-white font-bold text-[10px]`}
              >
                {avatar.initials}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#e2e8f0] group-hover:text-emerald-400 truncate">
                {channel.name}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-[9px] font-bold text-emerald-400 border border-emerald-500/30 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>

            {/* Simulated EPG Program Title */}
            <p className="text-[11px] text-[#94a3b8] truncate flex items-center gap-1">
              <Tv className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">{program?.title || 'Transmisión en directo'}</span>
            </p>
          </div>
        </div>

        {/* Action buttons: Minimize, Expand, Close */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isMinimized ? 'Expandir vista previa' : 'Minimizar a barra'}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onExpand}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Expandir a modo completo"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar reproductor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Video Viewport Container (hidden if minimized) */}
      <div className={`relative aspect-video bg-black overflow-hidden ${isMinimized ? 'hidden' : 'block'}`}>
        {children}

        {/* Floating Mini Overlay for EPG progress (auto-hides after 3s) */}
        <div
          className={`absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-1 transition-opacity duration-300 pointer-events-none ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
            <span className="truncate max-w-[180px]">{program?.title}</span>
            <span className="font-mono text-slate-400">{program?.timeSlot}</span>
          </div>
          {program && (
            <div className="w-full bg-slate-700/60 h-1 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${program.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
