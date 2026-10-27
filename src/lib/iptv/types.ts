/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// --- Raw iptv-org API Types ---

export interface RawChannel {
  id: string;
  name: string;
  alt_names?: string[];
  network?: string | null;
  country: string;
  subdivision?: string | null;
  city?: string | null;
  broadcast_area?: string[];
  languages?: string[];
  categories?: string[];
  is_nsfw?: boolean;
  launched?: string | null;
  closed?: string | null;
  replaced_by?: string | null;
  website?: string | null;
  logo?: string | null;
}

export interface RawStream {
  channel: string;
  feed?: string | null;
  title?: string | null;
  url: string;
  referrer?: string | null;
  http_referrer?: string | null;
  user_agent?: string | null;
  quality?: string | null;
  labels?: string[];
  width?: number | null;
  height?: number | null;
  bitrate?: number | null;
  status?: string | null;
}

export interface Country {
  name: string;
  code: string;
  flag?: string;
  languages?: string[];
}

export interface Category {
  id: string;
  name: string;
}

export interface Region {
  code: string;
  name: string;
  countries: string[];
}

export interface BlocklistItem {
  channel?: string;
  stream?: string;
  reason?: string;
}

export interface RawLogo {
  channel: string;
  url: string;
  format?: string;
  width?: number;
  height?: number;
}

// --- Processed Catalog Final Types ---

export interface CatalogStream {
  url: string;
  quality?: string | null;
  title?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
  channel?: string;
  status?: string | null;
  height?: number | null;
  width?: number | null;
}

export interface CatalogChannel {
  id: string;
  name: string;
  alt_names?: string[];
  network?: string | null;
  country: string;
  country_name?: string;
  country_flag?: string;
  countryName?: string;
  countryFlag?: string;
  region?: string | null;
  categories: string[];
  languages?: string[];
  streams: CatalogStream[];
  best_quality?: string | null;
  primary_category?: string | null;
  secondary_categories?: string[];
  subcategory?: string | null;
  logo?: string | null;
  website?: string | null;
  embedUrl?: string | null;
  isCustom?: boolean;
  primaryStreamUrl?: string;
  qualityLabel?: string;
}

export interface CatalogResult {
  channels: CatalogChannel[];
  countries: Country[];
  categories: Category[];
  regions: Region[];
  total_channels: number;
  total_streams: number;
}

// Aliases for compatibility
export type Channel = RawChannel;
export type Stream = CatalogStream;
export type ChannelWithStream = CatalogChannel;

// UI and persistent state types
export interface FilterCriteria {
  search: string;
  country: string;
  category: string;
  language: string;
  onlyWithLogo: boolean;
  onlyFavorites: boolean;
}

export type SortOption = 'popular' | 'name-asc' | 'name-desc' | 'country';
export type AppLanguage = 'es' | 'en' | 'pt';
export type AppTheme = 'dark' | 'light';

export interface UserSettings {
  theme: AppTheme;
  language: AppLanguage;
  volume: number;
  muted: boolean;
  theaterMode: boolean;
  autoplayNext: boolean;
  lowLatency: boolean;
}

export interface WatchHistoryItem {
  channelId: string;
  channelName: string;
  logo?: string | null;
  countryFlag?: string;
  watchedAt: number;
}
