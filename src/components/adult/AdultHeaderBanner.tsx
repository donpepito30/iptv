/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Eye, Flame, Lock, ShieldCheck } from 'lucide-react';
import React from 'react';

export interface AdultHeaderBannerProps {
  totalCount: number;
  totalViewers: number;
  onLockAndExit: () => void;
}

export const AdultHeaderBanner: React.FC<AdultHeaderBannerProps> = ({
  totalCount,
  totalViewers,
  onLockAndExit,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1a0f1d] via-[#161224] to-[#0f172a] border border-rose-900/30 p-6 sm:p-8 shadow-xl">
      {/* Decorative ambient background blur */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-black uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
              <span>Zona Privada +18</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              <span>{totalCount} Modelos En Vivo</span>
            </span>

            {totalViewers > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-400 text-xs font-medium">
                <Eye className="w-3.5 h-3.5 text-rose-400" />
                <span>{totalViewers.toLocaleString()} espectadores</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Transmisiones en Vivo (+18)
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Sección privada con feeds de video HLS directos y visualización adaptativa. El contenido está completamente aislado de las listas de televisión y categorías familiares.
          </p>

          <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Filtro de privacidad activo · Ningún canal +18 se comparte en la guía general</span>
          </div>
        </div>

        {/* Action: Lock section and exit */}
        <div className="shrink-0 flex items-center">
          <button
            type="button"
            onClick={onLockAndExit}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-rose-950/60 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            title="Revocar acceso de adultos y volver al catálogo"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Bloquear y Salir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
