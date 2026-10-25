/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle, Loader2, RotateCcw, SkipForward } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../../lib/iptv/i18n.ts';
import { AppLanguage, ChannelWithStream, UserSettings } from '../../lib/iptv/types.ts';
import { HlsPlayer } from './HlsPlayer.tsx';
import { PlayerControls } from './PlayerControls.tsx';
import { PlayerInfoBar } from './PlayerInfoBar.tsx';

export interface VideoPlayerViewProps {
  channel: ChannelWithStream | null;
  settings: UserSettings;
  isFavorite: boolean;
  onUpdateSettings: (updater: Partial<UserSettings>) => void;
  onToggleFavorite: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onChannelWatched?: (channel: ChannelWithStream) => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  channel,
  settings,
  isFavorite,
  onUpdateSettings,
  onToggleFavorite,
  onNextChannel,
  onPrevChannel,
  onChannelWatched,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [availableLevels, setAvailableLevels] = useState<
    { index: number; height: number; bitrate: number }[]
  >([]);
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(-1);

  // Sync fullscreen state changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // When channel changes, record in watch history
  useEffect(() => {
    if (channel) {
      setErrorMessage(null);
      setIsPlaying(true);
      setAvailableLevels([]);
      setSelectedLevelIndex(-1);
      onChannelWatched?.(channel);
    }
  }, [channel?.id]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is focused inside an input or textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        onUpdateSettings({ muted: !settings.muted });
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'ArrowRight' && onNextChannel) {
        e.preventDefault();
        onNextChannel();
      } else if (e.code === 'ArrowLeft' && onPrevChannel) {
        e.preventDefault();
        onPrevChannel();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const nextVol = Math.min(1, Math.round((settings.volume + 0.1) * 10) / 10);
        onUpdateSettings({ volume: nextVol, muted: false });
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const nextVol = Math.max(0, Math.round((settings.volume - 0.1) * 10) / 10);
        onUpdateSettings({ volume: nextVol });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings, onNextChannel, onPrevChannel, onUpdateSettings]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen failed:', err);
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const togglePip = useCallback(() => {
    const video = containerRef.current?.querySelector('video');
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
      video.requestPictureInPicture().catch((err) => {
        console.warn('Picture-in-picture failed:', err);
      });
    }
  }, []);

  const handleRetry = () => {
    setErrorMessage(null);
    setIsBuffering(true);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 150);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Video Viewport Container */}
      <div
        ref={containerRef}
        className={`relative w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#1e293b] select-none transition-all ${
          settings.theaterMode ? 'aspect-[21/9] max-h-[75vh]' : 'aspect-video'
        }`}
      >
        <HlsPlayer
          channel={channel}
          volume={settings.volume}
          muted={settings.muted}
          isPlaying={isPlaying}
          lowLatency={settings.lowLatency}
          onPlayStateChange={setIsPlaying}
          onError={setErrorMessage}
          onBufferingChange={setIsBuffering}
          onLevelsLoaded={setAvailableLevels}
          selectedLevelIndex={selectedLevelIndex}
        />

        {/* Buffering Spinner */}
        {isBuffering && !errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-10 pointer-events-none">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Stream Error Overlay */}
        {errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md z-20 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {t('streamError', settings.language)}
            </h3>
            <p className="text-xs text-[#94a3b8] max-w-md mb-4 leading-relaxed">
              {t('streamErrorDesc', settings.language)}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('retry', settings.language)}</span>
              </button>
              {onNextChannel && (
                <button
                  type="button"
                  onClick={onNextChannel}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>{t('nextChannel', settings.language)}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Custom Overlaid Player Controls */}
        <PlayerControls
          isPlaying={isPlaying}
          isMuted={settings.muted}
          volume={settings.volume}
          qualityLabel={channel?.qualityLabel}
          theaterMode={settings.theaterMode}
          isFullscreen={isFullscreen}
          language={settings.language}
          availableLevels={availableLevels}
          selectedLevelIndex={selectedLevelIndex}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onToggleMute={() => onUpdateSettings({ muted: !settings.muted })}
          onVolumeChange={(vol) => onUpdateSettings({ volume: vol, muted: false })}
          onSelectLevel={setSelectedLevelIndex}
          onToggleTheater={() => onUpdateSettings({ theaterMode: !settings.theaterMode })}
          onTogglePip={togglePip}
          onToggleFullscreen={toggleFullscreen}
          onNextChannel={onNextChannel}
          onPrevChannel={onPrevChannel}
          onRetry={handleRetry}
        />
      </div>

      {/* Channel Information and Quick Actions */}
      <PlayerInfoBar
        channel={channel}
        isFavorite={isFavorite}
        language={settings.language}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
};
