/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogChannel, CatalogStream } from './types.ts';

export interface AdultModelRaw {
  id: number;
  displayName?: string;
  username: string;
  avatarUrl?: string;
  avatar?: string;
  snapshotUrl?: string;
  popularSnapshotUrl?: string;
  streamUrl?: string;
  hlsUrl?: string;
  videoUrl?: string;
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
  isLive?: boolean;
  iframeEmbedUrl?: string;
  embedUrl?: string;
  age?: number;
  tags?: string[];
}

export interface AdultModelItem {
  id: number;
  channelId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  snapshotUrl: string;
  streamUrl: string;
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
  CO: 'Colombia',
  BR: 'Brasil',
  FR: 'Francia',
  RO: 'Rumania',
  DE: 'Alemania',
  IN: 'India',
  IT: 'Italia',
  JP: 'Japón',
  VN: 'Vietnam',
  UA: 'Ucrania',
  PE: 'Perú',
  HU: 'Hungría',
  AR: 'Argentina',
  GB: 'Reino Unido',
  US: 'Estados Unidos',
  MX: 'México',
  ES: 'España',
};

export function normalizeAdultModel(raw: AdultModelRaw): AdultModelItem {
  const code = (raw.modelsCountry || raw.countryCode || raw.country || 'INT').toUpperCase();
  const cName = COUNTRY_NAMES[code] || (code !== 'INT' ? code : 'Internacional');
  const dName = raw.displayName || raw.username || `Modelo ${raw.id}`;
  const primaryStream =
    raw.streamUrl ||
    raw.hlsUrl ||
    raw.stream?.url ||
    raw.stream?.urls?.['480p'] ||
    raw.stream?.urls?.['original'] ||
    '';
  const embed = raw.iframeEmbedUrl || raw.embedUrl || `https://stripchat.com/embed/${raw.username}`;
  const avatar = raw.avatarUrl || raw.avatar || raw.snapshotUrl || '';
  const snapshot = raw.snapshotUrl || raw.popularSnapshotUrl || raw.avatarUrl || '';

  return {
    id: raw.id,
    channelId: `adult-${raw.id}`,
    displayName: dName,
    username: raw.username,
    avatarUrl: avatar,
    snapshotUrl: snapshot,
    streamUrl: primaryStream,
    embedUrl: embed,
    viewersCount: raw.viewersCount || 0,
    countryCode: code,
    countryName: cName,
    languages: Array.isArray(raw.languages) ? raw.languages : ['es'],
    isHD: Boolean(raw.broadcastHD),
    isLive: raw.isLive !== false,
    age: raw.age || 18,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}

export function transformModelToCatalogChannel(model: AdultModelItem): CatalogChannel {
  const streams: CatalogStream[] = [
    {
      url: model.streamUrl,
      quality: model.isHD ? '720p HD' : '480p',
      title: `${model.displayName} (HLS Live)`,
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
    streams,
    logo: model.avatarUrl,
    website: model.embedUrl,
    isCustom: true,
    primaryStreamUrl: model.streamUrl,
    qualityLabel: model.isHD ? 'HD 720p' : 'SD 480p',
  };
}

let cachedModels: AdultModelItem[] | null = null;

export async function loadAdultModels(): Promise<AdultModelItem[]> {
  if (cachedModels && cachedModels.length > 0) {
    return cachedModels;
  }

  const path = '/assets/aistudio/2redex69_50_modelos_variadas_2026-10-26_6eec6bcf.json';
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Error al cargar lista de modelos (+18): HTTP ${response.status}`);
  }

  const rawList: AdultModelRaw[] = await response.json();
  const models = rawList.map(normalizeAdultModel);
  cachedModels = models;
  return models;
}
