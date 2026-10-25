/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { EN_DICT, ES_DICT, PT_DICT } from './i18n-data.ts';
import { AppLanguage } from './types.ts';

export const TRANSLATIONS = {
  es: ES_DICT,
  en: EN_DICT,
  pt: PT_DICT,
} as const;

export type TranslationKey = keyof typeof ES_DICT | string;

export function getInitialLocale(): AppLanguage {
  if (typeof window === 'undefined') return 'es';
  try {
    const saved = window.localStorage.getItem('iptv:locale');
    if (saved === 'es' || saved === 'en' || saved === 'pt') return saved;
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith('pt')) return 'pt';
    if (navLang.startsWith('en')) return 'en';
    return 'es';
  } catch {
    return 'es';
  }
}

export function saveLocale(locale: AppLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('iptv:locale', locale);
  } catch {
    // Ignore storage quota
  }
}

/**
 * Universal translate function supporting:
 * translate(locale, key, params) AND translate(key, locale, params) AND translate(key)
 */
export function translate(
  first: AppLanguage | string,
  second?: string | Record<string, string | number>,
  third?: Record<string, string | number>
): string {
  let locale: AppLanguage = 'es';
  let key = '';
  let params: Record<string, string | number> | undefined = undefined;

  if (first === 'es' || first === 'en' || first === 'pt') {
    locale = first as AppLanguage;
    key = typeof second === 'string' ? second : '';
    params = third;
  } else {
    key = String(first);
    if (typeof second === 'string' && (second === 'es' || second === 'en' || second === 'pt')) {
      locale = second as AppLanguage;
      params = third;
    } else {
      locale = getInitialLocale();
      params = typeof second === 'object' ? (second as Record<string, string | number>) : undefined;
    }
  }

  const dict = TRANSLATIONS[locale] || TRANSLATIONS.es;
  let text: string = dict[key] || TRANSLATIONS.es[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
    }
  }

  return text;
}

export const t = translate;

const globalLocaleListeners = new Set<(l: AppLanguage) => void>();

export function useLocale(): [AppLanguage, (loc: AppLanguage) => void] {
  const [locale, setLocaleState] = useState<AppLanguage>(getInitialLocale);

  const setLocale = (newLocale: AppLanguage) => {
    setLocaleState(newLocale);
    saveLocale(newLocale);
    for (const listener of globalLocaleListeners) {
      listener(newLocale);
    }
  };

  return [locale, setLocale];
}
