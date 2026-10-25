/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Check, Copy, ExternalLink, Globe, Star, Tv } from 'lucide-react';
import React, { useState } from 'react';
import { t } from '../../lib/iptv/i18n.ts';
import { AppLanguage, ChannelWithStream } from '../../lib/iptv/types.ts';

export interface PlayerInfoBarProps {
  channel: ChannelWithStream | null;
  isFavorite: boolean;
  language: AppLanguage;
  onToggleFavorite: () => void;
}

export const PlayerInfoBar: React.FC<PlayerInfoBarProps> = ({
  channel,
  isFavorite,
  language,
  onToggleFavorite,
}) => {
  const [copied, setCopied] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  if (!channel) {
    return (
      <div className="p-4 bg-[#111c2f] border border-[#1e293b] rounded-2xl flex items-center justify-center text-sm text-[#94a3b8]">
        {t('noStreamAvailable', language)}
      </div>
    );
  }

  const handleCopy = () => {
    const url = channel.primaryStreamUrl || channel.streams?.[0]?.url;
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="p-4 bg-[#111c2f] border border-[#1e293b] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
      {/* Left side: Logo & Channel Title & Metadata */}
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Channel Logo with robust fallback */}
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
          {channel.logo && !logoFailed ? (
            <img
              src={channel.logo}
              alt={channel.name}
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              className="w-full h-full object-contain p-1.5"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[#34d399]">
              <Tv className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Text info: Name + clean unboxed metadata with dot separators */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#e2e8f0] truncate">{channel.name}</h2>
            {channel.countryFlag && (
              <span className="text-base shrink-0" title={channel.countryName || channel.country}>
                {channel.countryFlag}
              </span>
            )}
            {channel.isCustom && (
              <span className="text-[11px] font-medium text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                Custom
              </span>
            )}
          </div>

          {/* Clean unboxed metadata according to zero-pill rule */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#94a3b8] mt-0.5">
            {channel.network && <span>{channel.network}</span>}
            {channel.network && channel.countryName && <span aria-hidden="true">·</span>}
            {channel.countryName && <span>{channel.countryName}</span>}
            {channel.categories.length > 0 && <span aria-hidden="true">·</span>}
            {channel.categories.length > 0 && (
              <span className="capitalize">{channel.categories.slice(0, 2).join(', ')}</span>
            )}
            {channel.qualityLabel && <span aria-hidden="true">·</span>}
            {channel.qualityLabel && (
              <span className="text-sky-400 font-mono font-medium">{channel.qualityLabel}</span>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Actions (Favorite, Copy URL, Website) */}
      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
        {/* Favorite toggle button */}
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            isFavorite
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
              : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-750'
          }`}
          title={isFavorite ? t('removeFromFavorites', language) : t('addToFavorites', language)}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span className="hidden sm:inline">
            {isFavorite ? t('favoritesOnly', language) : t('addToFavorites', language)}
          </span>
        </button>

        {/* Copy stream URL */}
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
          title={t('copyUrl', language)}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">{t('copied', language)}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">{t('copyUrl', language)}</span>
            </>
          )}
        </button>

        {/* External official website */}
        {channel.website && (
          <a
            href={channel.website}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 flex items-center gap-1.5 transition-colors"
            title={t('openWebsite', language)}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{t('openWebsite', language)}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        )}
      </div>
    </div>
  );
};
