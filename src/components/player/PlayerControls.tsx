/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  Monitor,
  PictureInPicture2,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { t } from '../../lib/iptv/i18n.ts';
import { AppLanguage } from '../../lib/iptv/types.ts';

export interface PlayerControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  qualityLabel?: string;
  theaterMode: boolean;
  isFullscreen: boolean;
  language: AppLanguage;
  availableLevels: { index: number; height: number; bitrate: number }[];
  selectedLevelIndex: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onSelectLevel: (index: number) => void;
  onToggleTheater: () => void;
  onTogglePip: () => void;
  onToggleFullscreen: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  onRetry?: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  isMuted,
  volume,
  qualityLabel = 'HD',
  theaterMode,
  isFullscreen,
  language,
  availableLevels,
  selectedLevelIndex,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onSelectLevel,
  onToggleTheater,
  onTogglePip,
  onToggleFullscreen,
  onNextChannel,
  onPrevChannel,
  onRetry,
}) => {
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const resetHideTimer = () => {
    setIsHovered(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
      setShowQualityMenu(false);
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const currentLevelText =
    selectedLevelIndex === -1
      ? `${t('autoQuality', language)} (${qualityLabel})`
      : `${availableLevels.find((l) => l.index === selectedLevelIndex)?.height || 720}p`;

  return (
    <div
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-4 transition-opacity duration-300 ${
        isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Top bar overlay */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Live indicator badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('liveBadge', language)}</span>
          </div>

          {/* Quality badge */}
          <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold tabular-nums">
            {qualityLabel}
          </div>
        </div>

        {/* Quality selector dropdown */}
        <div className="relative pointer-events-auto">
          {availableLevels.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700/80 text-xs text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                title={t('quality', language)}
              >
                <span>{currentLevelText}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showQualityMenu && (
                <div className="absolute right-0 mt-1 w-36 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl py-1 z-30">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLevel(-1);
                      setShowQualityMenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-left text-slate-200 hover:bg-slate-800"
                  >
                    <span>{t('autoQuality', language)}</span>
                    {selectedLevelIndex === -1 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  {availableLevels.map((lvl) => (
                    <button
                      key={lvl.index}
                      type="button"
                      onClick={() => {
                        onSelectLevel(lvl.index);
                        setShowQualityMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left text-slate-200 hover:bg-slate-800"
                    >
                      <span className="tabular-nums">{lvl.height}p</span>
                      {selectedLevelIndex === lvl.index && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls overlay */}
      <div className="pointer-events-auto bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 rounded-xl flex items-center justify-between gap-4">
        {/* Left playback & channel surfing controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
            title={isPlaying ? t('pause', language) : t('play', language)}
          >
            {isPlaying ? (
              <span className="flex gap-1">
                <span className="w-1.5 h-4 bg-slate-950 rounded-sm" />
                <span className="w-1.5 h-4 bg-slate-950 rounded-sm" />
              </span>
            ) : (
              <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
            )}
          </button>

          {onPrevChannel && (
            <button
              type="button"
              onClick={onPrevChannel}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={t('prevChannel', language)}
            >
              <SkipBack className="w-5 h-5" />
            </button>
          )}

          {onNextChannel && (
            <button
              type="button"
              onClick={onNextChannel}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={t('nextChannel', language)}
            >
              <SkipForward className="w-5 h-5" />
            </button>
          )}

          {/* Volume slider and mute */}
          <div className="flex items-center gap-2 group/volume pl-1">
            <button
              type="button"
              onClick={onToggleMute}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={isMuted ? t('unmute', language) : t('mute', language)}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-red-400" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-20 accent-emerald-400 h-1.5 rounded-lg bg-slate-700 cursor-pointer"
              aria-label={t('volume', language)}
            />
          </div>
        </div>

        {/* Right tools: theater mode, PiP, fullscreen */}
        <div className="flex items-center gap-1.5">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={t('retry', language)}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleTheater}
            className={`p-2 rounded-lg transition-colors ${
              theaterMode
                ? 'text-emerald-400 bg-emerald-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title={theaterMode ? t('exitTheaterMode', language) : t('theaterMode', language)}
          >
            <Monitor className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePip}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title={t('pipMode', language)}
          >
            <PictureInPicture2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title={t('fullscreen', language)}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
