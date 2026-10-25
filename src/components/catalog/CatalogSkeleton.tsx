/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface CatalogSkeletonProps {
  count?: number;
  progressMessage?: string;
}

export const CatalogSkeleton: React.FC<CatalogSkeletonProps> = ({
  count = 12,
  progressMessage,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Loading status bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#111c2f] border border-[#1e293b]">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs text-[#94a3b8] font-medium">
            {progressMessage || 'Descargando y procesando catálogo de iptv-org...'}
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">iptv-org API</span>
      </div>

      {/* Grid of skeleton rows/cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#111c2f] border border-[#1e293b] animate-pulse"
          >
            {/* Logo skeleton */}
            <div className="w-11 h-11 rounded-xl bg-slate-800/80 shrink-0" />

            {/* Content skeleton */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="h-4 bg-slate-800 rounded-md w-3/4" />
              <div className="h-3 bg-slate-800/60 rounded-md w-1/2" />
            </div>

            {/* Quality pill skeleton */}
            <div className="w-12 h-5 rounded-md bg-slate-800/80 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};
