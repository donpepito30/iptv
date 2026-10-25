/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CatalogChannel, UserSettings } from '../../lib/iptv/types.ts';
import { usePlayerEngine } from '../../lib/iptv/usePlayerEngine.ts';
import { PlayerErrorOverlay, PlayerLoadingOverlay } from './PlayerOverlays.tsx';

export interface PlayerProps {
  channel: CatalogChannel | null;
  settings: UserSettings;
  onUpdateSettings: (updater: Partial<UserSettings>) => void;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  channel,
  settings,
  onUpdateSettings,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const engine = usePlayerEngine(channel, isPlaying);

  // Sync volume & mute to video element
  useEffect(() => {
    if (engine.videoRef.current) {
      engine.videoRef.current.volume = settings.volume;
      engine.videoRef.current.muted = settings.muted;
    }
  }, [settings.volume, settings.muted, engine.videoRef]);

  // Sync play/pause
  useEffect(() => {
    const video = engine.videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, engine.videoRef]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcuts (Space, M, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        onUpdateSettings({ muted: !settings.muted });
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.muted, onUpdateSettings]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const togglePip = useCallback(() => {
    const video = engine.videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
      video.requestPictureInPicture().catch(() => {});
    }
  }, [engine.videoRef]);

  const resetHideTimer = () => {
    setIsHovered(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
      setShowQualityMenu(false);
    }, 3500);
  };

  const currentLevelText =
    engine.currentLevelIndex === -1
      ? 'Calidad Auto'
      : `${engine.qualityLevels.find((l) => l.index === engine.currentLevelIndex)?.height || 720}p`;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#1e293b] select-none group"
    >
      <video
        ref={engine.videoRef}
        className="w-full h-full object-contain bg-black"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Loading Overlay */}
      {(engine.status === 'loading' || engine.status === 'checking') && (
        <PlayerLoadingOverlay
          channelName={channel?.name}
          currentSourceIndex={engine.currentStreamIndex}
          totalSources={engine.usableStreams.length}
        />
      )}

      {/* Error Overlay with honest CORS / timeout reason + Retry + Source selector */}
      {engine.status === 'error' && (
        <PlayerErrorOverlay
          errorMessage={engine.errorMessage}
          usableStreams={engine.usableStreams}
          currentStreamIndex={engine.currentStreamIndex}
          onSwitchStream={engine.switchStreamIndex}
          onRetry={engine.retry}
        />
      )}

      {/* Overlaid Controls */}
      <div
        className={`absolute inset-0 flex flex-col justify-between p-4 pointer-events-none transition-opacity duration-300 ${
          isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top: LIVE Badge + Quality panel */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </div>

            {engine.usableStreams.length > 1 && (
              <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                Fuente {engine.currentStreamIndex + 1}/{engine.usableStreams.length}
              </span>
            )}
          </div>

          {/* Quality Panel */}
          {engine.qualityLevels.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur border border-slate-700 text-xs text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>{currentLevelText}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showQualityMenu && (
                <div className="absolute right-0 mt-1 w-36 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl py-1 z-30">
                  <button
                    type="button"
                    onClick={() => {
                      engine.setQualityLevel(-1);
                      setShowQualityMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
                  >
                    <span>Calidad Auto</span>
                    {engine.currentLevelIndex === -1 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  {engine.qualityLevels.map((lvl) => (
                    <button
                      key={lvl.index}
                      type="button"
                      onClick={() => {
                        engine.setQualityLevel(lvl.index);
                        setShowQualityMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      <span className="tabular-nums">{lvl.height}p</span>
                      {engine.currentLevelIndex === lvl.index && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="pointer-events-auto bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
              title={isPlaying ? 'Pausa (Espacio)' : 'Reproducir (Espacio)'}
            >
              {isPlaying ? (
                <span className="flex gap-1">
                  <span className="w-1.5 h-3.5 bg-slate-950 rounded-xs" />
                  <span className="w-1.5 h-3.5 bg-slate-950 rounded-xs" />
                </span>
              ) : (
                <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" />
              )}
            </button>

            {/* Volume slider & mute */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ muted: !settings.muted })}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Silencio (M)"
              >
                {settings.muted || settings.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.muted ? 0 : settings.volume}
                onChange={(e) => onUpdateSettings({ volume: parseFloat(e.target.value), muted: false })}
                className="w-20 accent-emerald-400 h-1.5 rounded-lg bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Right Tools: PiP + Fullscreen */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePip}
              className="p-2 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Picture-in-Picture"
            >
              <PictureInPicture2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Pantalla completa (F)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
