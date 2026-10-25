/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { AppTheme } from './types.ts';

const THEME_STORAGE_KEY = 'iptv:theme';

export function getInitialTheme(): AppTheme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'dark';
  } catch {
    return 'dark';
  }
}

export function useTheme(): [AppTheme, (theme: AppTheme | ((prev: AppTheme) => AppTheme)) => void] {
  const [theme, setThemeState] = useState<AppTheme>(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Apply smooth 0.3s transition
    body.style.transition = 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease';

    if (theme === 'light') {
      root.classList.remove('dark');
      body.className = 'bg-slate-50 text-slate-900 antialiased selection:bg-emerald-500/20 selection:text-emerald-800';
    } else {
      root.classList.add('dark');
      body.className = 'bg-[#0b1220] text-[#e2e8f0] antialiased selection:bg-emerald-500/30 selection:text-emerald-200';
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  const setTheme = useCallback((updater: AppTheme | ((prev: AppTheme) => AppTheme)) => {
    setThemeState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  }, []);

  return [theme, setTheme];
}
