/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Check, ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

export interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
}

export interface PlayerQualityMenuProps {
  qualityLevels: QualityLevel[];
  currentLevelIndex: number;
  onSelectLevel: (index: number) => void;
}

export const PlayerQualityMenu: React.FC<PlayerQualityMenuProps> = ({
  qualityLevels,
  currentLevelIndex,
  onSelectLevel,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (qualityLevels.length === 0) return null;

  const currentLevelText =
    currentLevelIndex === -1
      ? 'Calidad Auto'
      : `${qualityLevels.find((l) => l.index === currentLevelIndex)?.height || 720}p`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-xs font-medium text-slate-200 flex items-center gap-1.5 border border-slate-700/60 backdrop-blur-md cursor-pointer"
      >
        <span>{currentLevelText}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30">
          <button
            type="button"
            onClick={() => {
              onSelectLevel(-1);
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <span>Calidad Auto</span>
            {currentLevelIndex === -1 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
          {qualityLevels.map((lvl) => (
            <button
              key={lvl.index}
              type="button"
              onClick={() => {
                onSelectLevel(lvl.index);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              <span className="tabular-nums">{lvl.height}p</span>
              {currentLevelIndex === lvl.index && (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
