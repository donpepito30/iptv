/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Volume2, VolumeX, PictureInPicture2, Maximize2, Minimize2 } from 'lucide-react';
import { UserSettings } from '../../lib/iptv/types.ts';

interface PlayerBottomBarProps {
  isPlaying: boolean;
  isFullscreen: boolean;
  settings: UserSettings;
  onTogglePlay: () => void;
  onUpdateSettings: (updater: Partial<UserSettings>) => void;
  onTogglePip: () => void;
  onToggleFullscreen: () => void;
}

export const PlayerBottomBar: React.FC<PlayerBottomBarProps> = ({
  isPlaying,
  isFullscreen,
  settings,
  onTogglePlay,
  onUpdateSettings,
  onTogglePip,
  onToggleFullscreen,
}) => {
  return (
    <div className="pointer-events-auto bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 rounded-xl flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
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

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onTogglePip}
          className="p-2 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Picture-in-Picture"
        >
          <PictureInPicture2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Pantalla completa (F)"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
