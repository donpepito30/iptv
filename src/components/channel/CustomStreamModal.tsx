/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlusCircle, Tv, X } from 'lucide-react';
import React, { useState } from 'react';
import { getFallbackCountryFlag } from '../../lib/iptv/filter.ts';
import { t } from '../../lib/iptv/i18n.ts';
import { AppLanguage, ChannelWithStream } from '../../lib/iptv/types.ts';

export interface CustomStreamModalProps {
  isOpen: boolean;
  language: AppLanguage;
  onClose: () => void;
  onAddChannel: (channel: ChannelWithStream) => void;
}

export const CustomStreamModal: React.FC<CustomStreamModalProps> = ({
  isOpen,
  language,
  onClose,
  onAddChannel,
}) => {
  const [name, setName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [category, setCategory] = useState('general');
  const [country, setCountry] = useState('ES');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = streamUrl.trim();
    const cleanName = name.trim();

    if (!cleanName) {
      setError('Por favor indica un nombre para el canal');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setError(t('invalidUrlError', language));
      return;
    }

    const cleanCountry = country.toUpperCase().trim() || 'GLOBAL';
    const newId = `custom-${Date.now()}`;
    const customChannel: ChannelWithStream = {
      id: newId,
      name: cleanName,
      country: cleanCountry,
      countryFlag: getFallbackCountryFlag(cleanCountry),
      categories: [category.toLowerCase().trim() || 'general'],
      languages: ['es'],
      primaryStreamUrl: cleanUrl,
      qualityLabel: 'HD',
      isCustom: true,
      streams: [
        {
          channel: newId,
          url: cleanUrl,
          quality: 'HD',
          status: 'online',
        },
      ],
    };

    onAddChannel(customChannel);
    setName('');
    setStreamUrl('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#111c2f] border border-[#1e293b] rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1e293b]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Tv className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-[#e2e8f0]">
              {t('addCustomModalTitle', language)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {error && (
            <div className="p-3 text-xs text-red-300 bg-red-500/15 border border-red-500/30 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
              {t('channelNameLabel', language)}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Mi Canal Local HD"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#1e293b] text-sm text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
              {t('streamUrlLabel', language)}
            </label>
            <input
              type="url"
              required
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://servidor.com/live/stream.m3u8"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-[#1e293b] text-sm text-[#e2e8f0] font-mono focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
                {t('categoryLabel', language)}
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="news, sports..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-[#1e293b] text-xs text-[#e2e8f0] focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] mb-1.5">
                {t('countryLabel', language)} (ISO)
              </label>
              <input
                type="text"
                maxLength={2}
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                placeholder="ES, MX, AR..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-[#1e293b] text-xs text-[#e2e8f0] uppercase focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1e293b] mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-xl transition-colors"
            >
              {t('cancel', language)}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('saveChannel', language)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
