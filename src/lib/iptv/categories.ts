/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RawChannel, RawStream } from './types.ts';

/**
 * Normalizes text: lowercase, without accents, only alphanumeric and single spaces.
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fixed mapping from iptv-org category IDs to single principal category.
 */
export const IPTV_ORG_CATEGORY_MAP: Record<string, string> = {
  news: 'news', weather: 'news', legislative: 'news',
  sports: 'sports', movies: 'movies', classic: 'movies',
  series: 'series', music: 'music', entertainment: 'entertainment',
  comedy: 'entertainment', interactive: 'entertainment',
  kids: 'kids', animation: 'kids', family: 'kids',
  documentary: 'documentary', religious: 'religious', culture: 'culture',
  education: 'education', science: 'education', lifestyle: 'lifestyle',
  cooking: 'lifestyle', travel: 'lifestyle', shop: 'lifestyle',
  relax: 'lifestyle', auto: 'lifestyle', outdoor: 'lifestyle',
  business: 'business', general: 'general', public: 'general',
};

export interface CategoryMeta {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  keywords: string[];
  subcategories?: Record<string, string[]>;
}

export const MAIN_CATEGORIES: CategoryMeta[] = [
  {
    id: 'news',
    name: 'Noticias',
    emoji: '📰',
    gradient: 'from-blue-600 to-cyan-500',
    keywords: ['noticias', 'news', 'noticiero', 'informa', 'jornal', 'press', 'info', '24h', 'debates', 'actualidad'],
    subcategories: {
      Nacionales: ['nacional', 'locales', 'autonomico', 'regional', 'local', 'comunidad'],
      Internacionales: ['internacional', 'global', 'world', 'mundo', 'europe'],
      Economía: ['economia', 'finanzas', 'mercados', 'finance', 'business'],
      Clima: ['clima', 'tiempo', 'weather', 'meteorologia'],
    },
  },
  {
    id: 'sports',
    name: 'Deportes',
    emoji: '⚽',
    gradient: 'from-emerald-600 to-green-500',
    keywords: ['deportes', 'sports', 'sport', 'futbol', 'football', 'soccer', 'baloncesto', 'basket', 'tenis', 'tennis', 'motor', 'racing', 'box', 'combate', 'golf', 'atletismo'],
    subcategories: {
      Fútbol: ['futbol', 'football', 'soccer', 'laliga', 'fifa', 'uefa', 'gol'],
      Básquet: ['basket', 'basquet', 'nba', 'baloncesto'],
      Tenis: ['tenis', 'tennis', 'atp', 'wta'],
      Motor: ['motor', 'f1', 'formula', 'moto', 'racing', 'rally', 'gp'],
      Combate: ['box', 'boxeo', 'ufc', 'mma', 'lucha', 'wrestling', 'fight'],
    },
  },
  {
    id: 'movies',
    name: 'Cine',
    emoji: '🎬',
    gradient: 'from-rose-600 to-pink-500',
    keywords: ['cine', 'movies', 'cinema', 'pelicula', 'peliculas', 'films', 'classic', 'filmes', 'hollywood'],
    subcategories: {
      Clásicos: ['clasico', 'clasicos', 'classic', 'retro', 'golden'],
      Acción: ['accion', 'action', 'thriller', 'adrenalina'],
      Drama: ['drama', 'romance', 'romantico'],
    },
  },
  {
    id: 'series',
    name: 'Series',
    emoji: '🍿',
    gradient: 'from-purple-600 to-indigo-500',
    keywords: ['series', 'serie', 'novelas', 'telenovelas', 'sitcom', 'drama', 'episodios', 'novela'],
    subcategories: {
      Telenovelas: ['novela', 'novelas', 'telenovela', 'soap'],
      Comedia: ['comedia', 'sitcom', 'humor'],
    },
  },
  {
    id: 'music',
    name: 'Música',
    emoji: '🎵',
    gradient: 'from-violet-600 to-fuchsia-500',
    keywords: ['musica', 'music', 'hits', 'radio', 'rock', 'pop', 'jazz', 'dance', 'reggaeton', 'urbano', 'top40', 'vevo', 'mtv', 'canciones', 'clip'],
    subcategories: {
      'Pop & Rock': ['rock', 'pop', 'indie', 'metal'],
      Urbano: ['urbano', 'reggaeton', 'trap', 'hiphop', 'rap'],
      'Clásica & Jazz': ['jazz', 'clasica', 'classical', 'blues', 'acustico'],
    },
  },
  {
    id: 'entertainment',
    name: 'Entretenimiento',
    emoji: '🎭',
    gradient: 'from-amber-600 to-yellow-500',
    keywords: ['entretenimiento', 'entertainment', 'show', 'variedades', 'humor', 'comedy', 'magazine', 'reality', 'estrellas', 'fama'],
    subcategories: {
      Comedia: ['comedia', 'comedy', 'humor', 'risas', 'chistes'],
      Variedades: ['show', 'talkshow', 'magazine', 'reality', 'fama'],
    },
  },
  {
    id: 'kids',
    name: 'Infantil',
    emoji: '🧸',
    gradient: 'from-orange-500 to-amber-400',
    keywords: ['infantil', 'kids', 'dibujos', 'animacion', 'toons', 'cartoon', 'children', 'disney', 'junior', 'family', 'peques', 'ninos'],
    subcategories: {
      Animación: ['animacion', 'cartoon', 'toons', 'anime'],
      Preescolar: ['junior', 'toddler', 'bebes', 'nursery', 'peques'],
    },
  },
  {
    id: 'documentary',
    name: 'Documentales',
    emoji: '🌍',
    gradient: 'from-teal-600 to-emerald-500',
    keywords: ['documental', 'documentales', 'documentary', 'history', 'historia', 'nature', 'naturaleza', 'wild', 'animals', 'geo', 'discovery', 'planeta'],
    subcategories: {
      Naturaleza: ['naturaleza', 'nature', 'wild', 'fauna', 'animales', 'planeta'],
      Historia: ['historia', 'history', 'war', 'civilizacion', 'antiguo'],
    },
  },
  {
    id: 'religious',
    name: 'Religión',
    emoji: '🙏',
    gradient: 'from-indigo-600 to-blue-500',
    keywords: ['religion', 'religioso', 'catolica', 'cristiano', 'evangelio', 'iglesia', 'gospel', 'islam', 'faith', 'oracion', 'fe', 'biblia'],
    subcategories: {
      Católico: ['catolico', 'catolica', 'vaticano', 'papa', 'misa'],
      'Cristiano Evangélico': ['cristiano', 'evangelico', 'pastor', 'gospel', 'alabanza'],
    },
  },
  {
    id: 'culture',
    name: 'Cultura',
    emoji: '🏛️',
    gradient: 'from-stone-600 to-zinc-500',
    keywords: ['cultura', 'culture', 'arte', 'art', 'teatro', 'museum', 'museo', 'opera', 'patrimonio', 'literatura', 'artes'],
  },
  {
    id: 'education',
    name: 'Educación',
    emoji: '🎓',
    gradient: 'from-sky-600 to-blue-600',
    keywords: ['educacion', 'education', 'ciencia', 'science', 'escuela', 'universidad', 'academia', 'learning', 'tech', 'tecnologia', 'aprender'],
  },
  {
    id: 'lifestyle',
    name: 'Estilo de vida',
    emoji: '🍳',
    gradient: 'from-lime-600 to-emerald-500',
    keywords: ['lifestyle', 'cocina', 'cooking', 'recetas', 'chef', 'viajes', 'travel', 'moda', 'fashion', 'hogar', 'deco', 'outdoor', 'auto', 'salud', 'fitness'],
    subcategories: {
      Cocina: ['cocina', 'cooking', 'food', 'chef', 'recetas', 'gourmet'],
      Viajes: ['viajes', 'travel', 'turismo', 'destinos'],
      'Motor & Autos': ['auto', 'motor', 'tuning', 'mecanica', 'coches'],
    },
  },
  {
    id: 'business',
    name: 'Negocios',
    emoji: '💼',
    gradient: 'from-slate-700 to-slate-900',
    keywords: ['negocios', 'business', 'economia', 'finance', 'finanzas', 'mercados', 'stocks', 'bloomberg', 'wallstreet', 'inversion', 'empresa'],
  },
  {
    id: 'general',
    name: 'General',
    emoji: '📺',
    gradient: 'from-slate-600 to-zinc-600',
    keywords: ['general', 'public', 'canal', 'television', 'tv', 'nacional'],
  },
];

export const CATEGORY_BY_ID = new Map<string, CategoryMeta>(
  MAIN_CATEGORIES.map((cat) => [cat.id, cat])
);

/**
 * Checks if a word exists in normalized text with word boundary (\b).
 */
export function hasWordBoundary(normalizedText: string, keyword: string): boolean {
  if (!normalizedText || !keyword) return false;
  const regex = new RegExp(`(?:^|\\s)${keyword}(?:\\s|$)`, 'i');
  return regex.test(normalizedText);
}

/**
 * Classifies a channel into primary_category, secondary_categories and subcategory.
 */
export function resolveChannelCategories(
  channel: RawChannel,
  streams: RawStream[] = []
): {
  primary_category: string;
  secondary_categories: string[];
  subcategory: string | null;
} {
  const scores: Record<string, number> = {};
  for (const cat of MAIN_CATEGORIES) {
    scores[cat.id] = 0;
  }

  // +10 if iptv-org category maps to it (general/public gives 0)
  if (Array.isArray(channel.categories)) {
    for (const rawCat of channel.categories) {
      const mapped = IPTV_ORG_CATEGORY_MAP[rawCat.toLowerCase().trim()];
      if (mapped && mapped !== 'general') {
        scores[mapped] = (scores[mapped] || 0) + 10;
      }
    }
  }

  const normName = normalizeText(channel.name);
  const normAlt = normalizeText(Array.isArray(channel.alt_names) ? channel.alt_names.join(' ') : '');
  const normNetwork = normalizeText(channel.network);
  const altAndNetwork = `${normAlt} ${normNetwork}`.trim();
  const streamTitles = normalizeText(streams.map((s) => s.title || '').join(' '));

  // Score keywords
  for (const cat of MAIN_CATEGORIES) {
    if (cat.id === 'general') continue; // Do not boost general via keywords

    for (const kw of cat.keywords) {
      // +4 keyword in name
      if (hasWordBoundary(normName, kw)) {
        scores[cat.id] = (scores[cat.id] || 0) + 4;
      }
      // +3 keyword in alt_names or network
      if (altAndNetwork && hasWordBoundary(altAndNetwork, kw)) {
        scores[cat.id] = (scores[cat.id] || 0) + 3;
      }
      // +1 keyword in stream title
      if (streamTitles && hasWordBoundary(streamTitles, kw)) {
        scores[cat.id] = (scores[cat.id] || 0) + 1;
      }
    }
  }

  // Sort categories by score descending
  const sorted = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  let primary = 'general';
  let secondaries: string[] = [];

  if (sorted.length > 0 && sorted[0][1] > 0) {
    primary = sorted[0][0];
    secondaries = sorted.slice(1).map(([id]) => id);
  }

  // Calculate subcategory for primary category
  let subcategory: string | null = null;
  const primaryMeta = CATEGORY_BY_ID.get(primary);
  if (primaryMeta?.subcategories) {
    const fullText = `${normName} ${altAndNetwork} ${streamTitles}`.trim();
    for (const [subName, subKeywords] of Object.entries(primaryMeta.subcategories)) {
      for (const kw of subKeywords) {
        if (hasWordBoundary(fullText, kw)) {
          subcategory = subName;
          break;
        }
      }
      if (subcategory) break;
    }
  }

  return {
    primary_category: primary,
    secondary_categories: secondaries,
    subcategory,
  };
}
