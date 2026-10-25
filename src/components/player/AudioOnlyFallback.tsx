/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Radio } from 'lucide-react';
import { CatalogChannel } from '../../lib/iptv/types.ts';

interface AudioOnlyFallbackProps {
  channel: CatalogChannel | null;
}

export const AudioOnlyFallback: React.FC<AudioOnlyFallbackProps> = ({ channel }) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black flex flex-col items-center justify-center pointer-events-none z-10 select-none">
      <div className="relative mb-4">
        {channel?.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-24 h-24 object-contain rounded-2xl bg-slate-800 p-2 border border-slate-700 shadow-2xl animate-pulse"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-24 h-24 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-3xl shadow-2xl animate-pulse">
            {channel?.name?.slice(0, 2).toUpperCase() || 'TV'}
          </div>
        )}
        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-1.5 rounded-full shadow-lg">
          <Radio className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
        </div>
      </div>

      <h3 className="text-white font-bold text-lg mb-1">{channel?.name}</h3>
      <p className="text-emerald-400 text-xs font-medium tracking-wide uppercase flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        Emisión en Vivo (Modo Solo Audio)
      </p>

      {/* Visualizer bars */}
      <div className="flex items-center gap-1 mt-6 h-6">
        {[40, 70, 100, 55, 85, 30, 95, 60, 80, 45, 90, 65, 35, 75].map((height, i) => (
          <span
            key={i}
            className="w-1 bg-gradient-to-t from-emerald-500 to-teal-300 rounded-full animate-pulse"
            style={{
              height: `${height}%`,
              animationDelay: `${(i * 120) % 800}ms`,
              animationDuration: '900ms',
            }}
          />
        ))}
      </div>
    </div>
  );
};
