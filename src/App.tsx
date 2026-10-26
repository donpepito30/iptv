/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { AdultView } from './components/adult/AdultView.tsx';
import { CatalogSkeleton } from './components/catalog/CatalogSkeleton.tsx';
import { CategoriesView } from './components/categories/CategoriesView.tsx';
import { CustomStreamModal } from './components/channel/CustomStreamModal.tsx';
import { GuideView } from './components/guide/GuideView.tsx';
import { BrowseView } from './components/home/BrowseView.tsx';
import { Header } from './components/layout/Header.tsx';
import { ShortcutsModal } from './components/layout/ShortcutsModal.tsx';
import { WatchView } from './components/player/WatchView.tsx';
import { CURATED_CHANNELS } from './lib/iptv/curated.ts';
import { useLocale } from './lib/iptv/i18n.ts';
import { CatalogChannel } from './lib/iptv/types.ts';
import { useHistory } from './lib/iptv/useHistory.ts';
import { useIptvCatalog } from './lib/iptv/useIptvCatalog.ts';
import { useNavigation } from './lib/iptv/useNavigation.ts';
import { useCustomChannels, useFavorites, useSettings } from './lib/iptv/useStorage.ts';
import { useTheme } from './lib/iptv/useTheme.ts';

// Lazy-loaded CommandPalette (⌘K / Ctrl+K)
const CommandPalette = React.lazy(() => import('./components/search/CommandPalette.tsx'));

export default function App() {
  const [theme, setTheme] = useTheme();
  const [locale, setLocale] = useLocale();
  const [settings, updateSettings] = useSettings();
  const { favorites, toggleFavorite } = useFavorites();
  const { addToHistory } = useHistory();
  const { customChannels, addCustomChannel } = useCustomChannels();

  const {
    view,
    channelId,
    categoryId,
    isSearchOpen,
    goToView,
    watchChannel,
    viewCategory,
    toggleSearch,
  } = useNavigation();

  const { data, loading, error, progress, retry } = useIptvCatalog();

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isMiniClosed, setIsMiniClosed] = useState(false);
  const [activeAdultChannel, setActiveAdultChannel] = useState<CatalogChannel | null>(null);

  const allChannels = useMemo(() => {
    if (!data || data.channels.length === 0) {
      return customChannels.length > 0 ? [...customChannels, ...CURATED_CHANNELS] : CURATED_CHANNELS;
    }
    return [...customChannels, ...data.channels];
  }, [data, customChannels]);

  const watchAllChannels = useMemo(() => {
    if (activeAdultChannel) return [activeAdultChannel, ...allChannels];
    return allChannels;
  }, [activeAdultChannel, allChannels]);

  const favoriteIdsSet = useMemo(() => new Set(favorites), [favorites]);

  const currentWatchChannel = useMemo(() => {
    if (!channelId) return allChannels[0] || null;
    if (channelId.startsWith('adult-')) {
      if (activeAdultChannel && activeAdultChannel.id === channelId) return activeAdultChannel;
    }
    return allChannels.find((c) => c.id === channelId) || activeAdultChannel || allChannels[0] || null;
  }, [channelId, allChannels, activeAdultChannel]);

  useEffect(() => {
    if (view === 'watch' && currentWatchChannel) {
      addToHistory(currentWatchChannel.id);
      setIsMiniClosed(false);
    }
  }, [view, currentWatchChannel?.id, addToHistory]);

  const handleSelectChannel = (channel: CatalogChannel) => {
    if (channel.id.startsWith('adult-')) {
      setActiveAdultChannel(channel);
    }
    setIsMiniClosed(false);
    watchChannel(channel.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddCustomChannel = (channel: CatalogChannel) => {
    addCustomChannel(channel);
    setIsMiniClosed(false);
    watchChannel(channel.id);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      <Header
        language={locale}
        theme={theme}
        currentView={view}
        onNavigate={goToView}
        onLanguageChange={setLocale}
        onThemeToggle={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onOpenSearch={() => toggleSearch(true)}
        onOpenCustomModal={() => setIsCustomModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
        {loading && allChannels.length > 0 && (
          <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-[#94a3b8]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{progress}</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-400">Segundo plano</span>
          </div>
        )}

        {loading && allChannels.length === 0 && (
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-[#111c2f] border border-[#1e293b]">
              <h1 className="text-2xl font-black text-[#e2e8f0]">IPTV Studio Hub</h1>
              <p className="text-xs text-[#94a3b8] mt-1">{progress}</p>
            </div>
            <CatalogSkeleton count={12} progressMessage={progress} />
          </div>
        )}

        {error && allChannels.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-[#111c2f] border border-red-500/30 rounded-3xl">
            <h2 className="text-lg font-bold text-white mb-2">Error al cargar el catálogo</h2>
            <p className="text-xs text-[#94a3b8] max-w-md mb-6">{error.message}</p>
            <button
              type="button"
              onClick={retry}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {allChannels.length > 0 && (
          <>
            {view === 'watch' && (
              <WatchView
                channel={currentWatchChannel}
                allChannels={watchAllChannels}
                settings={settings}
                isFavorite={currentWatchChannel ? favoriteIdsSet.has(currentWatchChannel.id) : false}
                favoriteIds={favoriteIdsSet}
                onUpdateSettings={updateSettings}
                onToggleFavorite={toggleFavorite}
                onSelectChannel={handleSelectChannel}
                onBack={() => (currentWatchChannel?.id.startsWith('adult-') ? goToView('adult') : goToView('browse'))}
                isMini={false}
              />
            )}

            {view !== 'watch' && currentWatchChannel && !isMiniClosed && (
              <WatchView
                channel={currentWatchChannel}
                allChannels={watchAllChannels}
                settings={settings}
                isFavorite={favoriteIdsSet.has(currentWatchChannel.id)}
                favoriteIds={favoriteIdsSet}
                onUpdateSettings={updateSettings}
                onToggleFavorite={toggleFavorite}
                onSelectChannel={handleSelectChannel}
                onBack={() => (currentWatchChannel?.id.startsWith('adult-') ? goToView('adult') : goToView('browse'))}
                isMini={true}
                onExpand={() => goToView('watch')}
                onCloseMini={() => setIsMiniClosed(true)}
              />
            )}

            {view === 'browse' && (
              <BrowseView
                channels={allChannels}
                activeChannelId={currentWatchChannel?.id}
                favoriteIds={favoriteIdsSet}
                onSelectChannel={handleSelectChannel}
                onWatch={watchChannel}
                onToggleFavorite={toggleFavorite}
                onNavigateToCategory={viewCategory}
              />
            )}

            {view === 'categories' && (
              <CategoriesView
                channels={allChannels}
                selectedCategoryId={categoryId}
                activeChannelId={currentWatchChannel?.id}
                favoriteIds={favoriteIdsSet}
                onSelectCategory={viewCategory}
                onSelectChannel={handleSelectChannel}
                onToggleFavorite={toggleFavorite}
              />
            )}

            {view === 'guide' && (
              <GuideView
                channels={allChannels}
                activeChannelId={currentWatchChannel?.id}
                onSelectChannel={handleSelectChannel}
              />
            )}

            {view === 'adult' && (
              <AdultView
                activeChannelId={currentWatchChannel?.id}
                onSelectChannel={handleSelectChannel}
                onExit={() => goToView('browse')}
              />
            )}
          </>
        )}
      </main>

      <footer className="mt-auto border-t border-[#1e293b] py-6 text-center text-xs text-[#94a3b8]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} IPTV Studio Hub · Canales en vivo de iptv-org</p>
          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => setIsShortcutsModalOpen(true)}
              className="hover:text-[#e2e8f0] transition-colors cursor-pointer"
            >
              Atajos de teclado (⌘K)
            </button>
            <button
              type="button"
              onClick={() => goToView('guide')}
              className="hover:text-[#e2e8f0] transition-colors cursor-pointer"
            >
              Guía de canales
            </button>
            <button
              type="button"
              onClick={() => goToView('adult')}
              className="text-rose-400 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
            >
              Zona +18
            </button>
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        {isSearchOpen && (
          <CommandPalette
            isOpen={isSearchOpen}
            channels={allChannels}
            onClose={() => toggleSearch(false)}
            onSelectChannel={handleSelectChannel}
          />
        )}
      </Suspense>

      <CustomStreamModal
        isOpen={isCustomModalOpen}
        language={locale}
        onClose={() => setIsCustomModalOpen(false)}
        onAddChannel={handleAddCustomChannel}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        language={locale}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
