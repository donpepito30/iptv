/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { CatalogChannel } from '../../lib/iptv/types.ts';

interface ChannelOsdProps {
  channel: CatalogChannel | null;
  usingProxy: boolean;
}

export const ChannelOsd: React.FC<ChannelOsdProps> = ({ channel, usingProxy }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!channel) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(timer);
  }, [channel?.id]);

  if (!visible || !channel) return null;

  return (
    <div className="absolute top-4 left-4 z-30 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700/60 shadow-2xl">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            referrerPolicy="no-referrer"
            className="w-7 h-7 object-contain rounded bg-slate-900 p-0.5"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-7 h-7 rounded bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center text-xs">
            {channel.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white text-xs">{channel.name}</span>
            <span className="text-xs">{channel.countryFlag}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
            <span className="text-emerald-400 font-medium">{channel.qualityLabel || 'HD'}</span>
            <span>•</span>
            <span className="text-slate-400 capitalize">{channel.primary_category || 'General'}</span>
            {usingProxy && (
              <>
                <span>•</span>
                <span className="text-amber-400 flex items-center gap-0.5">
                  <Radio className="w-2.5 h-2.5" />
                  Proxy Relay
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
