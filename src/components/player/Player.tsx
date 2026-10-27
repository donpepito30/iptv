/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, Tv2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CatalogChannel, UserSettings } from '../../lib/iptv/types.ts';
import { usePlayerEngine } from '../../lib/iptv/usePlayerEngine.ts';
import { AudioOnlyFallback } from './AudioOnlyFallback.tsx';
import { ChannelOsd } from './ChannelOsd.tsx';
import { PlayerBottomBar } from './PlayerBottomBar.tsx';
import { PlayerIframeFallback } from './PlayerIframeFallback.tsx';
import { PlayerErrorOverlay, PlayerLoadingOverlay } from './PlayerOverlays.tsx';
import { PlayerQualityMenu } from './PlayerQualityMenu.tsx';
import { TelemetryHud } from './TelemetryHud.tsx';

export interface PlayerProps {
  channel: CatalogChannel | null;
  settings: UserSettings;
  categoryLabel?: string;
  onUpdateSettings: (updater: Partial<UserSettings>) => void;
  onPrevChannel?: () => void;
  onNextChannel?: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  channel,
  settings,
  categoryLabel,
  onUpdateSettings,
  onPrevChannel,
  onNextChannel,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEmbedMode, setIsEmbedMode] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const engine = usePlayerEngine(channel, isPlaying);

  // Reset embed mode whenever the channel changes
  useEffect(() => {
    setIsEmbedMode(false);
  }, [channel?.id]);

  useEffect(() => {
    if (engine.videoRef.current) {
      engine.videoRef.current.volume = settings.volume;
      engine.videoRef.current.muted = settings.muted;
    }
  }, [settings.volume, settings.muted, engine.videoRef]);

  useEffect(() => {
    const video = engine.videoRef.current;
    if (!video || isEmbedMode) return;
    if (isPlaying) {
      video.play().catch(() => setIsPlaying(false));
    } else {
      video.pause();
    }
  }, [isPlaying, engine.videoRef, isEmbedMode]);

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
    if (!video || isEmbedMode) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
      video.requestPictureInPicture().catch(() => {});
    }
  }, [engine.videoRef, isEmbedMode]);

  // Keyboard navigation & shortcuts
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
  }, [settings.muted, onUpdateSettings, toggleFullscreen, onPrevChannel, onNextChannel, engine, togglePip]);

  const resetHideTimer = () => {
    setIsHovered(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
    }, 3500);
  };

  const hasEmbed = Boolean(channel?.embedUrl || channel?.website);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#1e293b] select-none group"
    >
      {/* Fallback to Embedded Iframe Player if active */}
      {isEmbedMode ? (
        <PlayerIframeFallback channel={channel} onExitEmbed={() => setIsEmbedMode(false)} />
      ) : (
        <>
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

          {/* Stats HUD */}
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

          {/* Error Overlay with Embed Fallback */}
          {engine.status === 'error' && (
            <PlayerErrorOverlay
              errorMessage={engine.errorMessage}
              errorKind={engine.errorKind}
              usableStreams={engine.usableStreams}
              currentStreamIndex={engine.currentStreamIndex}
              hasEmbedUrl={hasEmbed}
              categoryLabel={categoryLabel}
              autoplayNext={settings.autoplayNext}
              onRetry={engine.retry}
              onRetryWithProxy={engine.retryWithProxy}
              onSwitchToEmbed={() => setIsEmbedMode(true)}
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
            {/* Top Control Bar */}
            <div className="flex items-center justify-end gap-2 pointer-events-auto">
              {hasEmbed && (
                <button
                  type="button"
                  onClick={() => setIsEmbedMode(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/80 hover:bg-rose-600 text-white flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-500/40 shadow-sm"
                  title="Cambiar al reproductor embebido oficial"
                >
                  <Tv2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Modo Oficial</span>
                </button>
              )}

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

              <PlayerQualityMenu
                qualityLevels={engine.qualityLevels}
                currentLevelIndex={engine.currentLevelIndex}
                onSelectLevel={engine.setQualityLevel}
              />
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
        </>
      )}
    </div>
  );
};
