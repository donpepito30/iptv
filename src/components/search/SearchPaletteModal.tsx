/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Search, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getChannelAvatar } from '../../lib/iptv/avatar.ts';
import { channelMatchesSearch } from '../../lib/iptv/channel-filters.ts';
import { CatalogChannel } from '../../lib/iptv/types.ts';

export interface SearchPaletteModalProps {
  isOpen: boolean;
  channels: CatalogChannel[];
  onClose: () => void;
  onSelectChannel: (channel: CatalogChannel) => void;
}

export const SearchPaletteModal: React.FC<SearchPaletteModalProps> = ({
  isOpen,
  channels,
  onClose,
  onSelectChannel,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const matches = query.trim()
    ? channels.filter((c) => channelMatchesSearch(c, query)).slice(0, 15)
    : channels.slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#111c2f] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e293b]">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar canal, país, categoría (ej. RTVE, Deportes, España)..."
            className="flex-1 bg-transparent text-sm text-[#e2e8f0] placeholder-[#64748b] focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700 rounded-md">
            ESC
          </kbd>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#1e293b]/40">
          {matches.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#94a3b8]">
              No se encontraron canales para «{query}»
            </div>
          ) : (
            matches.map((ch) => {
              const avatar = getChannelAvatar(ch.name);

              return (
                <div
                  key={ch.id}
                  onClick={() => {
                    onSelectChannel(ch);
                    onClose();
                  }}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#16233b] cursor-pointer transition-colors group select-none"
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
                        <span className="text-sm font-semibold text-[#e2e8f0] group-hover:text-emerald-400 truncate">
                          {ch.name}
                        </span>
                        {ch.country_flag && <span className="text-xs">{ch.country_flag}</span>}
                      </div>
                      <div className="text-xs text-[#94a3b8] truncate">
                        {ch.country_name} · <span className="capitalize">{ch.primary_category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ch.best_quality && (
                      <span className="text-[10px] font-mono text-sky-400 font-semibold px-1.5 py-0.5 rounded bg-sky-500/15">
                        {ch.best_quality}
                      </span>
                    )}
                    <Play className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
