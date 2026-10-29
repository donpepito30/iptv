/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Compass, Search, Sparkles, Star, Trash2, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CatalogChannel } from '../../lib/iptv/types.ts';
import { ChannelCard } from '../channel/ChannelCard.tsx';

export interface FavoritesViewProps {
  channels: CatalogChannel[];
  favoriteIds: Set<string>;
  activeChannelId?: string | null;
  onSelectChannel: (channel: CatalogChannel) => void;
  onToggleFavorite: (channelId: string) => void;
  onExploreChannels: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  channels,
  favoriteIds,
  activeChannelId,
  onSelectChannel,
  onToggleFavorite,
  onExploreChannels,
}) => {
  const [search, setSearch] = useState('');

  // Extract all favorite channels strictly (excluding any adult streams)
  const favoriteChannels = useMemo(() => {
    return channels.filter((c) => favoriteIds.has(c.id) && !c.id.startsWith('adult-'));
  }, [channels, favoriteIds]);

  // Filter within favorites by search query
  const filteredFavorites = useMemo(() => {
    if (!search.trim()) return favoriteChannels;
    const q = search.toLowerCase().trim();
    return favoriteChannels.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.country_name?.toLowerCase().includes(q) ||
        c.primary_category?.toLowerCase().includes(q)
    );
  }, [favoriteChannels, search]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* 3D Top Header Banner */}
      <div className="panel-3d rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25 shrink-0">
            <Star className="w-7 h-7 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Canales Favoritos</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {favoriteChannels.length}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Tu selección personal con navegación continua y reproducción prioritaria
            </p>
          </div>
        </div>

        {favoriteChannels.length > 0 && (
          <div className="flex items-center gap-3 z-10">
            <button
              type="button"
              onClick={onExploreChannels}
              className="btn-3d-slate px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Explorar más canales</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Filter Bar within Favorites */}
      {favoriteChannels.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl panel-3d">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar en tus favoritos por nombre, país o género..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 font-mono flex items-center gap-2 shrink-0 px-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Mostrando {filteredFavorites.length} de {favoriteChannels.length}
            </span>
          </div>
        </div>
      )}

      {/* Grid of Favorite Channels or Empty State */}
      {favoriteChannels.length === 0 ? (
        <div className="panel-3d rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto w-full my-8">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
            <Star className="w-8 h-8 fill-amber-400/30" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Aún no tienes favoritos</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            Guarda tus canales preferidos pulsando el icono del corazón en cualquier tarjeta. Podrás
            navegar entre ellos de forma continua sin salir de tu lista.
          </p>
          <button
            type="button"
            onClick={onExploreChannels}
            className="btn-3d-emerald px-6 py-3 rounded-xl text-slate-950 text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Compass className="w-4 h-4 stroke-[3]" />
            <span>Explorar canales y añadir</span>
          </button>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="panel-3d rounded-2xl p-8 text-center text-slate-400 text-xs">
          No se encontraron canales favoritos que coincidan con &quot;{search}&quot;.
          <button
            type="button"
            onClick={() => setSearch('')}
            className="block mx-auto mt-3 text-amber-400 font-bold hover:underline cursor-pointer"
          >
            Limpiar filtro de búsqueda
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFavorites.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isActive={activeChannelId === channel.id}
              isFavorite={true}
              onSelect={onSelectChannel}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};
