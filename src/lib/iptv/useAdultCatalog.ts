/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AdultModelItem,
  loadAdultModels,
  transformModelToCatalogChannel,
} from './adult-catalog.ts';
import { CatalogChannel } from './types.ts';

export type AdultSortOption = 'viewers' | 'name' | 'country';

export function useAdultCatalog() {
  const [models, setModels] = useState<AdultModelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [sortBy, setSortBy] = useState<AdultSortOption>('viewers');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadAdultModels()
      .then((items) => {
        if (!mounted) return;
        setModels(items);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Compute available countries with counts
  const availableCountries = useMemo(() => {
    const counts = new Map<string, { code: string; name: string; count: number }>();
    models.forEach((m) => {
      const code = m.countryCode || 'INT';
      const existing = counts.get(code);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(code, { code, name: m.countryName, count: 1 });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [models]);

  // Compute available languages
  const availableLanguages = useMemo(() => {
    const counts = new Map<string, number>();
    models.forEach((m) => {
      m.languages.forEach((lang) => {
        counts.set(lang, (counts.get(lang) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([lang, count]) => ({ lang, count }))
      .sort((a, b) => b.count - a.count);
  }, [models]);

  // Filtered and sorted models
  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return models
      .filter((m) => {
        if (selectedCountry !== 'ALL' && m.countryCode !== selectedCountry) return false;
        if (selectedLanguage !== 'ALL' && !m.languages.includes(selectedLanguage)) return false;
        if (q) {
          const matchName = m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q);
          const matchCountry = m.countryName.toLowerCase().includes(q);
          const matchTag = m.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchName && !matchCountry && !matchTag) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'viewers') return b.viewersCount - a.viewersCount;
        if (sortBy === 'name') return a.displayName.localeCompare(b.displayName);
        if (sortBy === 'country') return a.countryName.localeCompare(b.countryName);
        return 0;
      });
  }, [models, searchQuery, selectedCountry, selectedLanguage, sortBy]);

  // CatalogChannel representation of all models for player routing
  const adultCatalogChannels = useMemo<CatalogChannel[]>(() => {
    return models.map(transformModelToCatalogChannel);
  }, [models]);

  const totalViewers = useMemo(() => {
    return models.reduce((acc, curr) => acc + curr.viewersCount, 0);
  }, [models]);

  return {
    models,
    filteredModels,
    adultCatalogChannels,
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
    totalCount: models.length,
    totalViewers,
  };
}
