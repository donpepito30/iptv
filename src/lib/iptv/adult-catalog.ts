/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogChannel, CatalogStream } from './types.ts';

export interface AdultModelRaw {
  id: string | number;
  displayName?: string;
  username: string;
  avatarUrl?: string;
  avatar?: string;
  snapshotUrl?: string;
  popularSnapshotUrl?: string;
  thumbnail?: string;
  videoUrl?: string;
  streamUrl?: string;
  hlsUrl?: string;
  stream?: {
    url?: string;
    urls?: Record<string, string>;
  };
  streamUrls?: Record<string, string>;
  viewersCount?: number;
  modelsCountry?: string;
  countryCode?: string;
  country?: string;
  languages?: string[];
  broadcastHD?: boolean;
  isHd?: boolean;
  isLive?: boolean;
  iframeEmbedUrl?: string;
  embedUrl?: string;
  age?: number;
  tags?: string[];
}

export interface AdultModelItem {
  id: string | number;
  channelId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  snapshotUrl: string;
  streamUrl: string;
  streamUrls?: Record<string, string>;
  embedUrl: string;
  viewersCount: number;
  countryCode: string;
  countryName: string;
  languages: string[];
  isHD: boolean;
  isLive: boolean;
  age: number;
  tags: string[];
}

const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina',
  AT: 'Austria',
  BR: 'Brasil',
  CA: 'Canadá',
  CL: 'Chile',
  CN: 'China',
  CO: 'Colombia',
  DE: 'Alemania',
  EC: 'Ecuador',
  ES: 'España',
  FR: 'Francia',
  GB: 'Reino Unido',
  HU: 'Hungría',
  IE: 'Irlanda',
  IN: 'India',
  IT: 'Italia',
  JP: 'Japón',
  LK: 'Sri Lanka',
  MX: 'México',
  PE: 'Perú',
  PH: 'Filipinas',
  RO: 'Rumania',
  RU: 'Rusia',
  TW: 'Taiwán',
  UA: 'Ucrania',
  US: 'Estados Unidos',
  VE: 'Venezuela',
  VN: 'Vietnam',
};

export function normalizeAdultModel(raw: AdultModelRaw): AdultModelItem {
  const code = (raw.modelsCountry || raw.countryCode || raw.country || 'INT').toUpperCase();
  const cName = COUNTRY_NAMES[code] || (code !== 'INT' ? code : 'Internacional');
  const dName = raw.displayName || raw.username || `Modelo ${raw.id}`;
  const isHd = Boolean(raw.isHd || raw.broadcastHD);

  // Extract primary stream
  const primaryStream =
    raw.videoUrl ||
    raw.streamUrls?.['480p'] ||
    raw.streamUrls?.['original'] ||
    raw.streamUrl ||
    raw.hlsUrl ||
    raw.stream?.url ||
    raw.stream?.urls?.['480p'] ||
    raw.stream?.urls?.['original'] ||
    '';

  const embed =
    raw.iframeEmbedUrl ||
    raw.embedUrl ||
    `https://stripchat.com/embed/${raw.username}`;

  const avatar = raw.avatarUrl || raw.avatar || raw.thumbnail || raw.snapshotUrl || '';
  const snapshot = raw.snapshotUrl || raw.thumbnail || raw.popularSnapshotUrl || raw.avatarUrl || '';

  return {
    id: raw.id,
    channelId: `adult-${raw.id}`,
    displayName: dName,
    username: raw.username,
    avatarUrl: avatar,
    snapshotUrl: snapshot,
    streamUrl: primaryStream,
    streamUrls: raw.streamUrls || raw.stream?.urls,
    embedUrl: embed,
    viewersCount: raw.viewersCount || 0,
    countryCode: code,
    countryName: cName,
    languages: Array.isArray(raw.languages) && raw.languages.length > 0 ? raw.languages : ['es'],
    isHD: isHd,
    isLive: raw.isLive !== false,
    age: raw.age || 18,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}

export function transformModelToCatalogChannel(model: AdultModelItem): CatalogChannel {
  const streams: CatalogStream[] = [];
  const primaryUrl = model.streamUrl;

  if (primaryUrl) {
    streams.push({
      url: primaryUrl,
      quality: model.isHD ? '720p HD' : '480p SD',
      title: `${model.displayName} (Principal)`,
      referrer: 'https://stripchat.com/',
      status: 'online',
    });
  }

  // Add 240p eco / backup stream if available
  if (model.streamUrls?.['240p'] && model.streamUrls['240p'] !== primaryUrl) {
    streams.push({
      url: model.streamUrls['240p'],
      quality: '240p Eco',
      title: `${model.displayName} (Bajo consumo)`,
      referrer: 'https://stripchat.com/',
      status: 'online',
    });
  }

  // Add original / HQ stream if available
  if (model.streamUrls?.['original'] && model.streamUrls['original'] !== primaryUrl) {
    streams.push({
      url: model.streamUrls['original'],
      quality: 'Original HQ',
      title: `${model.displayName} (Calidad Original)`,
      referrer: 'https://stripchat.com/',
      status: 'online',
    });
  }

  const fallbackStreams: CatalogStream[] = [
    {
      url: primaryUrl,
      quality: model.isHD ? 'HD' : 'SD',
      title: `${model.displayName} (Live)`,
      referrer: 'https://stripchat.com/',
      status: 'online',
    },
  ];

  return {
    id: model.channelId,
    name: model.displayName,
    country: model.countryCode,
    country_name: model.countryName,
    countryName: model.countryName,
    categories: ['adult', '18+', 'cams'],
    primary_category: 'adult',
    languages: model.languages,
    streams: streams.length > 0 ? streams : fallbackStreams,
    logo: model.avatarUrl,
    website: model.embedUrl,
    embedUrl: model.embedUrl,
    isCustom: true,
    primaryStreamUrl: primaryUrl,
    qualityLabel: model.isHD ? 'HD 720p' : 'SD 480p',
  };
}

let cachedModels: AdultModelItem[] | null = null;

export async function loadAdultModels(): Promise<AdultModelItem[]> {
  if (cachedModels && cachedModels.length > 0) {
    return cachedModels;
  }

  const primaryPath = '/assets/aistudio/2redex69_models_2026-10-27__1___1__8193a58f.json';
  const fallbackPath = '/assets/aistudio/2redex69_50_modelos_variadas_2026-10-26_6eec6bcf.json';

  const mergedMap = new Map<string, AdultModelRaw>();

  try {
    const res = await fetch(primaryPath);
    if (res.ok) {
      const list: AdultModelRaw[] = await res.json();
      for (const item of list) {
        mergedMap.set(String(item.id || item.username), item);
      }
    }
  } catch (err) {
    console.warn('[AdultCatalog] Primary dataset fetch failed, trying fallback:', err);
  }

  try {
    const res2 = await fetch(fallbackPath);
    if (res2.ok) {
      const list2: AdultModelRaw[] = await res2.json();
      for (const item of list2) {
        const key = String(item.id || item.username);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item);
        }
      }
    }
  } catch (err) {
    console.warn('[AdultCatalog] Fallback dataset fetch failed:', err);
  }

  if (mergedMap.size === 0) {
    throw new Error('No se pudieron cargar transmisiones de modelos (+18)');
  }

  const rawList = Array.from(mergedMap.values());
  const models = rawList.map(normalizeAdultModel);
  cachedModels = models;
  return models;
}
