/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Activity,
  Check,
  ChevronDown,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CatalogChannel, UserSettings } from '../../lib/iptv/types.ts';
import { usePlayerEngine } from '../../lib/iptv/usePlayerEngine.ts';
import { AudioOnlyFallback } from './AudioOnlyFallback.tsx';
import { ChannelOsd } from './ChannelOsd.tsx';
import { PlayerBottomBar } from './PlayerBottomBar.tsx';
import { PlayerErrorOverlay, PlayerLoadingOverlay } from './PlayerOverlays.tsx';
import { TelemetryHud } from './TelemetryHud.tsx';

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
  onPrevChannel,
  onNextChannel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const engine = usePlayerEngine(channel, isPlaying);

  useEffect(() => {
    if (engine.videoRef.current) {
      engine.videoRef.current.volume = settings.volume;
      engine.videoRef.current.muted = settings.muted;
    }
  }, [settings.volume, settings.muted, engine.videoRef]);

  useEffect(() => {
    const video = engine.videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, engine.videoRef]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

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

  // 10-Foot UI Keyboard shortcuts (Space, M, F, I, S, Arrows/Page keys for flipping)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space' || e.code === 'MediaPlayPause' || e.key === 'MediaPlayPause') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        onUpdateSettings({ muted: !settings.muted });
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        togglePip();
      } else if (e.code === 'KeyI') {
        e.preventDefault();
        setShowTelemetry((prev) => !prev);
      } else if (e.code === 'KeyS' && engine.usableStreams.length > 1) {
        e.preventDefault();
        const nextIdx = (engine.currentStreamIndex + 1) % engine.usableStreams.length;
        engine.switchStreamIndex(nextIdx);
      } else if (e.code === 'PageUp' || e.code === 'ArrowUp' || e.key === 'ChannelUp') {
        if (onPrevChannel) {
          e.preventDefault();
          onPrevChannel();
        }
      } else if (e.code === 'PageDown' || e.code === 'ArrowDown' || e.key === 'ChannelDown') {
        if (onNextChannel) {
          e.preventDefault();
          onNextChannel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.muted, onUpdateSettings, toggleFullscreen, onPrevChannel, onNextChannel, engine]);

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

      {/* 10-Foot OSD Info Banner on channel change */}
      <ChannelOsd channel={channel} usingProxy={engine.usingProxy} />

      {/* Audio-only Radio Mode Fallback */}
      {engine.telemetry.isAudioOnly && <AudioOnlyFallback channel={channel} />}

      {/* Stats for Nerds HUD */}
      {showTelemetry && (
        <TelemetryHud
          telemetry={engine.telemetry}
          currentStreamIndex={engine.currentStreamIndex}
          totalStreams={engine.usableStreams.length}
          onClose={() => setShowTelemetry(false)}
        />
      )}

      {/* Loading Overlay */}
      {(engine.status === 'loading' || engine.status === 'checking') && (
        <PlayerLoadingOverlay
          channelName={channel?.name}
          currentSourceIndex={engine.currentStreamIndex}
          totalSources={engine.usableStreams.length}
        />
      )}

      {/* Error Overlay */}
      {engine.status === 'error' && (
        <PlayerErrorOverlay
          errorMessage={engine.errorMessage}
          errorKind={engine.errorKind}
          usableStreams={engine.usableStreams}
          currentStreamIndex={engine.currentStreamIndex}
          onRetry={engine.retry}
          onRetryWithProxy={engine.retryWithProxy}
          onNextChannel={onNextChannel}
          onSwitchStream={engine.switchStreamIndex}
        />
      )}

      {/* Floating Controls Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-4 transition-opacity duration-300 ${
          isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Control Bar: Quality Selector & Telemetry button */}
        <div className="flex items-center justify-end gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowTelemetry(!showTelemetry)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showTelemetry
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-black/60 hover:bg-black/80 text-slate-300'
            }`}
            title="Telemetría técnica (I)"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Telemetría</span>
          </button>

          {engine.qualityLevels.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-xs font-medium text-slate-200 flex items-center gap-1.5 border border-slate-700/60 backdrop-blur-md cursor-pointer"
              >
                <span>{currentLevelText}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {showQualityMenu && (
                <div className="absolute right-0 top-full mt-2 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30">
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
        <PlayerBottomBar
          isPlaying={isPlaying}
          isFullscreen={isFullscreen}
          settings={settings}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onUpdateSettings={onUpdateSettings}
          onTogglePip={togglePip}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
};
