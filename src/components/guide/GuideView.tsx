/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Tv } from 'lucide-react';
import React, { useState } from 'react';
import { CatalogChannel } from '../../lib/iptv/types.ts';

export interface GuideViewProps {
  channels: CatalogChannel[];
  activeChannelId?: string | null;
  onSelectChannel: (channel: CatalogChannel) => void;
}

export const GuideView: React.FC<GuideViewProps> = ({
  channels,
  activeChannelId,
  onSelectChannel,
}) => {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? channels.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : channels.slice(0, 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#111c2f] border border-[#1e293b]">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#e2e8f0]">Guía de Canales TV</h1>
          <p className="text-xs text-[#94a3b8] mt-1">
            Programación y emisiones activas en tiempo real
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar por canal..."
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60"
        />
      </div>

      {/* Guide Table */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#111c2f] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#94a3b8]">
            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-[#1e293b]">
              <tr>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">País / Región</th>
                <th className="py-3 px-4">Género</th>
                <th className="py-3 px-4">Calidad</th>
                <th className="py-3 px-4">Señal</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60 font-medium">
              {filtered.map((channel) => {
                const isActive = channel.id === activeChannelId;

                return (
                  <tr
                    key={channel.id}
                    onClick={() => onSelectChannel(channel)}
                    className={`hover:bg-[#16233b] cursor-pointer transition-colors ${
                      isActive ? 'bg-[#14233c] text-emerald-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-[#e2e8f0] flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <Tv className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <span className="truncate max-w-[180px]">{channel.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      {channel.country_flag} {channel.country_name}
                    </td>
                    <td className="py-3 px-4 capitalize">
                      {channel.primary_category || 'General'}
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400">
                      {channel.best_quality || 'HD'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChannel(channel);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-bold text-[11px] transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Ver</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
