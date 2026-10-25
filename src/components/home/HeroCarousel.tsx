/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChevronLeft, ChevronRight, Play, Radio, Sparkles } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getChannelAvatar } from '../../lib/iptv/avatar.ts';
import { CatalogChannel } from '../../lib/iptv/types.ts';

export interface HeroCarouselProps {
  channels: CatalogChannel[];
  onWatch: (channelId: string) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ channels, onWatch }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Pick 6 featured channels: prioritize channels with logos and highest quality
  const featured = useMemo(() => {
    if (channels.length === 0) return [];
    const withLogos = channels.filter((c) => c.logo && c.best_quality);
    const sorted = [...withLogos].sort((a, b) => {
      const qA = a.best_quality?.includes('4K') ? 2 : a.best_quality?.includes('1080') ? 1 : 0;
      const qB = b.best_quality?.includes('4K') ? 2 : b.best_quality?.includes('1080') ? 1 : 0;
      return qB - qA;
    });

    return sorted.slice(0, 6).length >= 3
      ? sorted.slice(0, 6)
      : channels.slice(0, 6);
  }, [channels]);

  // Autoplay every 7 seconds
  useEffect(() => {
    if (featured.length <= 1 || isPaused) return;

    timerRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 7000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [featured.length, isPaused]);

  if (featured.length === 0) return null;

  const activeChannel = featured[currentIndex];
  const avatar = getChannelAvatar(activeChannel.name);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % featured.length);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#111c2f] to-[#0b1220] border border-[#1e293b] shadow-2xl p-6 sm:p-10 min-h-[300px] flex flex-col justify-between select-none"
    >
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mb-20" />

      {/* Top Banner Status */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>EN VIVO AHORA</span>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1 text-xs text-sky-400 font-medium px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Destacado</span>
          </div>
        </div>

        {/* Quality indicator */}
        {activeChannel.best_quality && (
          <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-xs font-mono font-bold text-sky-300">
            {activeChannel.best_quality}
          </span>
        )}
      </div>

      {/* Middle Channel Showcase */}
      <div className="relative z-10 my-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5 max-w-2xl">
          {/* Logo or Generated Initials on Gradient */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xl p-2">
            {activeChannel.logo ? (
              <img
                src={activeChannel.logo}
                alt={activeChannel.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-tr ${avatar.gradient} rounded-xl flex items-center justify-center text-white font-extrabold text-2xl tracking-wider`}
              >
                {avatar.initials}
              </div>
            )}
          </div>

          {/* Title, Country and Category */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-[#e2e8f0] truncate tracking-tight">
                {activeChannel.name}
              </h2>
              {activeChannel.country_flag && (
                <span className="text-2xl shrink-0" title={activeChannel.country_name}>
                  {activeChannel.country_flag}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#94a3b8] mt-1.5">
              <span>{activeChannel.country_name || activeChannel.country}</span>
              {activeChannel.region && <span aria-hidden="true">·</span>}
              {activeChannel.region && <span>{activeChannel.region}</span>}
              {activeChannel.primary_category && <span aria-hidden="true">·</span>}
              {activeChannel.primary_category && (
                <span className="capitalize text-slate-200 font-medium">
                  {activeChannel.primary_category}
                </span>
              )}
              {activeChannel.subcategory && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-semibold">{activeChannel.subcategory}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Primary CTA Button: "Ver ahora" */}
        <div className="shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => onWatch(activeChannel.id)}
            className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition-all shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950 translate-x-0.5" />
            <span>Ver ahora</span>
          </button>
        </div>
      </div>

      {/* Bottom Footer: Carousel Navigation Controls */}
      <div className="relative z-10 flex items-center justify-between gap-4 pt-2 border-t border-[#1e293b]/60">
        {/* Indicators */}
        <div className="flex items-center gap-2">
          {featured.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'w-8 bg-emerald-400'
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              title={item.name}
            />
          ))}
        </div>

        {/* Previous / Next Arrows */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Canal anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Siguiente canal"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
