/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Calendar, Compass, Flame, Moon, Plus, Search, Sun, Tv } from 'lucide-react';
import React, { useState } from 'react';
import { t } from '../../lib/iptv/i18n.ts';
import { AppLanguage, AppTheme } from '../../lib/iptv/types.ts';
import { AppView } from '../../lib/iptv/useNavigation.ts';

export interface HeaderProps {
  language: AppLanguage;
  theme: AppTheme;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onLanguageChange: (lang: AppLanguage) => void;
  onThemeToggle: () => void;
  onOpenSearch: () => void;
  onOpenCustomModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  theme,
  currentView,
  onNavigate,
  onLanguageChange,
  onThemeToggle,
  onOpenSearch,
  onOpenCustomModal,
}) => {
  const [langOpen, setLangOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b1220]/95 backdrop-blur-md border-b border-[#1e293b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Zone 1: Brand Wordmark (clickable to browse) */}
        <div
          onClick={() => onNavigate('browse')}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Tv className="w-5 h-5 fill-slate-950" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-[#e2e8f0] group-hover:text-white whitespace-nowrap">
            {t(language, 'appName')}
          </span>
        </div>

        {/* Zone 2: Navigation Links (Browse, Categories, Guide) */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-[#94a3b8]">
          <button
            type="button"
            onClick={() => onNavigate('browse')}
            className={`hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              currentView === 'browse' ? 'text-emerald-400 font-bold' : ''
            }`}
          >
            {t(language, 'navHome')}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('categories')}
            className={`flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              currentView === 'categories' ? 'text-emerald-400 font-bold' : ''
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t(language, 'navCategories')}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('guide')}
            className={`flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap cursor-pointer ${
              currentView === 'guide' ? 'text-emerald-400 font-bold' : ''
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t(language, 'navGuide')}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('adult')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
              currentView === 'adult'
                ? 'text-rose-400 font-bold bg-rose-500/15 border-rose-500/40 shadow-xs shadow-rose-500/20'
                : 'text-rose-400/80 border-rose-900/40 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-950/30'
            }`}
            title="Sección privada +18 (Verificación requerida)"
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Zona +18</span>
          </button>
        </nav>

        {/* Zone 3: Search button with ⌘K + Theme + Lang + CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111c2f] hover:bg-[#16233b] border border-[#1e293b] text-xs text-[#94a3b8] hover:text-[#e2e8f0] transition-colors cursor-pointer"
            title="Buscar canales (⌘K / Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{t(language, 'searchBtn')}</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 rounded shadow-xs">
              {t(language, 'searchShortcut')}
            </kbd>
          </button>

          {/* Language selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen(!langOpen)}
              className="px-2.5 py-1.5 rounded-xl bg-[#111c2f] border border-[#1e293b] text-xs font-semibold text-[#e2e8f0] hover:bg-[#16233b] transition-colors uppercase cursor-pointer"
              title={t(language, 'language')}
            >
              {language}
            </button>
            {langOpen && (
              <div className="absolute right-0 mt-1 w-28 bg-[#111c2f] border border-[#1e293b] rounded-xl shadow-xl py-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    onLanguageChange('es');
                    setLangOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-800 cursor-pointer ${
                    language === 'es' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  Español (ES)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLanguageChange('en');
                    setLangOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-800 cursor-pointer ${
                    language === 'en' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  English (EN)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLanguageChange('pt');
                    setLangOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-800 cursor-pointer ${
                    language === 'pt' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  Português (PT)
                </button>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={onThemeToggle}
            className="p-2 rounded-xl bg-[#111c2f] border border-[#1e293b] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#16233b] transition-colors cursor-pointer"
            title={theme === 'dark' ? t(language, 'themeLight') : t(language, 'themeDark')}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Add custom stream */}
          <button
            type="button"
            onClick={onOpenCustomModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>{t(language, 'addStream')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden items-center justify-around px-2 py-1.5 border-t border-[#1e293b]/70 bg-[#080d17] text-xs font-semibold text-[#94a3b8]">
        <button
          type="button"
          onClick={() => onNavigate('browse')}
          className={`flex items-center gap-1.5 py-1 px-3 rounded-lg transition-colors ${
            currentView === 'browse' ? 'text-emerald-400 font-bold bg-emerald-500/10' : ''
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>{t(language, 'navHome')}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('categories')}
          className={`flex items-center gap-1.5 py-1 px-3 rounded-lg transition-colors ${
            currentView === 'categories' ? 'text-emerald-400 font-bold bg-emerald-500/10' : ''
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>{t(language, 'navCategories')}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('guide')}
          className={`flex items-center gap-1.5 py-1 px-3 rounded-lg transition-colors ${
            currentView === 'guide' ? 'text-emerald-400 font-bold bg-emerald-500/10' : ''
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{t(language, 'navGuide')}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('adult')}
          className={`flex items-center gap-1 py-1 px-2.5 rounded-lg transition-colors ${
            currentView === 'adult' ? 'text-rose-400 font-bold bg-rose-500/15' : 'text-rose-400/80'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>+18</span>
        </button>
      </div>
    </header>
  );
};
