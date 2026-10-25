/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Search, Tv, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getChannelAvatar } from '../../lib/iptv/avatar.ts';
import { fuzzySearchChannels } from '../../lib/iptv/fuzzy-search.ts';
import { CatalogChannel } from '../../lib/iptv/types.ts';

export interface CommandPaletteProps {
  isOpen: boolean;
  channels: CatalogChannel[];
  onClose: () => void;
  onSelectChannel: (channel: CatalogChannel) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  channels,
  onClose,
  onSelectChannel,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Compute fuzzy matches (maximum 30)
  const results = React.useMemo(() => {
    return fuzzySearchChannels(channels, query, 30);
  }, [channels, query]);

  // Reset index when query changes or when opened
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Keyboard navigation: ↑, ↓, Enter, Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          results.length > 0 ? (prev - 1 + results.length) % results.length : 0
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          onSelectChannel(results[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onSelectChannel, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos de canales"
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#111c2f] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e293b] bg-slate-900/60">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por canal, país, red o calidad (ej. RTVE, Colombia, 1080p)..."
            className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
          />
          <span className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700 rounded-md">
            {results.length} canales
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List (max 30 items) */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-[#1e293b]/30">
          {results.length === 0 ? (
            <div className="py-14 text-center text-xs text-[#94a3b8] flex flex-col items-center gap-2">
              <Tv className="w-8 h-8 text-slate-600" />
              <span>No se encontraron canales para «{query}»</span>
            </div>
          ) : (
            results.map((ch, idx) => {
              const avatar = getChannelAvatar(ch.name);
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={ch.id}
                  data-index={idx}
                  onClick={() => {
                    onSelectChannel(ch);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors select-none ${
                    isSelected
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'hover:bg-[#16233b] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                      {ch.logo ? (
                        <img
                          src={ch.logo}
                          alt={ch.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-tr ${avatar.gradient} flex items-center justify-center text-white font-bold text-[11px]`}
                        >
                          {avatar.initials}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-sm font-semibold truncate ${
                            isSelected ? 'text-emerald-300' : 'text-[#e2e8f0]'
                          }`}
                        >
                          {ch.name}
                        </span>
                        {ch.country_flag && <span className="text-xs">{ch.country_flag}</span>}
                      </div>
                      <div className="text-xs text-[#94a3b8] truncate flex items-center gap-1.5">
                        <span>{ch.country_name || ch.country}</span>
                        {ch.primary_category && <span>·</span>}
                        {ch.primary_category && (
                          <span className="capitalize">{ch.primary_category}</span>
                        )}
                        {ch.network && <span className="text-slate-500">({ch.network})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ch.best_quality && (
                      <span className="text-[10px] font-mono text-sky-400 font-semibold px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/20">
                        {ch.best_quality}
                      </span>
                    )}
                    <Play
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-emerald-400 scale-110' : 'text-slate-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2 border-t border-[#1e293b] bg-slate-900/60 flex items-center justify-between text-[11px] text-[#94a3b8]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-300">↑</kbd>{' '}
              <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-300">↓</kbd>{' '}
              Navegar
            </span>
            <span>
              <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-300">↵</kbd>{' '}
              Sintonizar
            </span>
          </div>
          <span>
            <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-300">ESC</kbd>{' '}
            Cerrar
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
