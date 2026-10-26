/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Filter, Globe, Loader2, Search, SlidersHorizontal, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { AdultModelItem, transformModelToCatalogChannel } from '../../lib/iptv/adult-catalog.ts';
import { getAdultConsent, revokeAdultConsent } from '../../lib/iptv/adult-storage.ts';
import { CatalogChannel } from '../../lib/iptv/types.ts';
import { AdultSortOption, useAdultCatalog } from '../../lib/iptv/useAdultCatalog.ts';
import { AdultHeaderBanner } from './AdultHeaderBanner.tsx';
import { AdultModelCard } from './AdultModelCard.tsx';
import { AgeGateModal } from './AgeGateModal.tsx';

export interface AdultViewProps {
  activeChannelId?: string | null;
  onSelectChannel: (channel: CatalogChannel) => void;
  onExit: () => void;
}

export const AdultView: React.FC<AdultViewProps> = ({
  activeChannelId,
  onSelectChannel,
  onExit,
}) => {
  const [hasConsent, setHasConsent] = useState<boolean>(() => getAdultConsent());
  const [showAgeGate, setShowAgeGate] = useState<boolean>(() => !getAdultConsent());

  const {
    filteredModels,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedCountry,
    setSelectedCountry,
    selectedLanguage,
    setSelectedLanguage,
    sortBy,
    setSortBy,
    availableCountries,
    availableLanguages,
    totalCount,
    totalViewers,
  } = useAdultCatalog();

  // If consent is revoked from another tab or action
  useEffect(() => {
    if (!hasConsent) {
      setShowAgeGate(true);
    }
  }, [hasConsent]);

  const handleConfirmAge = () => {
    setHasConsent(true);
    setShowAgeGate(false);
  };

  const handleCancelAge = () => {
    setShowAgeGate(false);
    onExit();
  };

  const handleLockAndExit = () => {
    revokeAdultConsent();
    setHasConsent(false);
    onExit();
  };

  const handleModelSelect = (model: AdultModelItem) => {
    const channel = transformModelToCatalogChannel(model);
    onSelectChannel(channel);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Age Gate Warning Modal */}
      <AgeGateModal
        isOpen={showAgeGate}
        onConfirm={handleConfirmAge}
        onCancel={handleCancelAge}
      />

      {/* Top Banner */}
      <AdultHeaderBanner
        totalCount={totalCount}
        totalViewers={totalViewers}
        onLockAndExit={handleLockAndExit}
      />

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#111c2f] border border-[#1e293b]">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por modelo, etiqueta o país..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Country filter */}
          <div className="relative flex items-center">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="pl-8 pr-7 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500 appearance-none cursor-pointer"
            >
              <option value="ALL">Todos los países ({totalCount})</option>
              {availableCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </div>

          {/* Language filter */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="ALL">Idiomas (Todos)</option>
            {availableLanguages.map((l) => (
              <option key={l.lang} value={l.lang}>
                {l.lang.toUpperCase()} ({l.count})
              </option>
            ))}
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as AdultSortOption)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
          >
            <option value="viewers">Más vistos (Espectadores)</option>
            <option value="name">Nombre (A - Z)</option>
            <option value="country">País de origen</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
          <p className="text-xs text-slate-400">Cargando transmisiones de modelos en vivo...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center">
          <p className="text-xs text-rose-300 font-semibold mb-2">{error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Model Cards Grid */}
      {!loading && !error && filteredModels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredModels.map((model) => (
            <AdultModelCard
              key={model.id}
              model={model}
              isActive={activeChannelId === model.channelId}
              onSelect={handleModelSelect}
            />
          ))}
        </div>
      )}

      {/* Empty Search / Filter state */}
      {!loading && !error && filteredModels.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111c2f] border border-[#1e293b] rounded-2xl">
          <Users className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-200 mb-1">
            No se encontraron modelos con los filtros seleccionados
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Intenta borrar la búsqueda o seleccionar otro país o idioma.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCountry('ALL');
              setSelectedLanguage('ALL');
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
          >
            Restablecer filtros
          </button>
        </div>
      )}
    </div>
  );
};
