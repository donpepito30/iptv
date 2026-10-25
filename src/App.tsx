/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { CatalogSkeleton } from './components/catalog/CatalogSkeleton.tsx';
import { CategoriesView } from './components/categories/CategoriesView.tsx';
import { CustomStreamModal } from './components/channel/CustomStreamModal.tsx';
import { GuideView } from './components/guide/GuideView.tsx';
import { BrowseView } from './components/home/BrowseView.tsx';
import { Header } from './components/layout/Header.tsx';
import { ShortcutsModal } from './components/layout/ShortcutsModal.tsx';
import { WatchView } from './components/player/WatchView.tsx';
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

  // Navigation with URL hash sync (#watch=ID)
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

  // Load catalog
  const { data, loading, error, progress, retry } = useIptvCatalog();

  // Modals & MiniPlayer states
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isMiniClosed, setIsMiniClosed] = useState(false);

  // Combine fetched catalog with custom channels
  const allChannels = useMemo(() => {
    if (!data) return customChannels;
    return [...customChannels, ...data.channels];
  }, [data, customChannels]);

  // Set of favorite IDs
  const favoriteIdsSet = useMemo(() => new Set(favorites), [favorites]);

  // Active channel for watch mode
  const currentWatchChannel = useMemo(() => {
    if (!channelId) return allChannels[0] || null;
    return allChannels.find((c) => c.id === channelId) || allChannels[0] || null;
  }, [channelId, allChannels]);

  // Record to history whenever channel is selected for watch
  useEffect(() => {
    if (view === 'watch' && currentWatchChannel) {
      addToHistory(currentWatchChannel.id);
      setIsMiniClosed(false);
    }
  }, [view, currentWatchChannel?.id, addToHistory]);

  const handleSelectChannel = (channel: CatalogChannel) => {
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
      {/* Sticky Top Header */}
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

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
        {/* Loading State with Skeletons */}
        {loading && (
          <div className="flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-[#111c2f] border border-[#1e293b]">
              <h1 className="text-2xl font-black text-[#e2e8f0]">IPTV Studio Hub</h1>
              <p className="text-xs text-[#94a3b8] mt-1">{progress}</p>
            </div>
            <CatalogSkeleton count={12} progressMessage={progress} />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
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

        {/* Loaded Views */}
        {!loading && !error && (
          <>
            {/* View: Watch (Full view) */}
            {view === 'watch' && (
              <WatchView
                channel={currentWatchChannel}
                allChannels={allChannels}
                settings={settings}
                isFavorite={
                  currentWatchChannel ? favoriteIdsSet.has(currentWatchChannel.id) : false
                }
                favoriteIds={favoriteIdsSet}
                onUpdateSettings={updateSettings}
                onToggleFavorite={toggleFavorite}
                onSelectChannel={handleSelectChannel}
                onBack={() => goToView('browse')}
                isMini={false}
              />
            )}

            {/* Persistent Floating MiniPlayer when outside watch view */}
            {view !== 'watch' && currentWatchChannel && !isMiniClosed && (
              <WatchView
                channel={currentWatchChannel}
                allChannels={allChannels}
                settings={settings}
                isFavorite={favoriteIdsSet.has(currentWatchChannel.id)}
                favoriteIds={favoriteIdsSet}
                onUpdateSettings={updateSettings}
                onToggleFavorite={toggleFavorite}
                onSelectChannel={handleSelectChannel}
                onBack={() => goToView('browse')}
                isMini={true}
                onExpand={() => goToView('watch')}
                onCloseMini={() => setIsMiniClosed(true)}
              />
            )}

            {/* View: Browse */}
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

            {/* View: Categories */}
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

            {/* View: Guide */}
            {view === 'guide' && (
              <GuideView
                channels={allChannels}
                activeChannelId={currentWatchChannel?.id}
                onSelectChannel={handleSelectChannel}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
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
          </div>
        </div>
      </footer>

      {/* Lazy-Loaded CommandPalette (⌘K / Ctrl+K) */}
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

      {/* Custom Stream Modal */}
      <CustomStreamModal
        isOpen={isCustomModalOpen}
        language={locale}
        onClose={() => setIsCustomModalOpen(false)}
        onAddChannel={handleAddCustomChannel}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        language={locale}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}
