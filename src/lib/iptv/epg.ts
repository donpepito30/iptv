/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CatalogChannel } from './types.ts';

export interface SimulatedProgram {
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  timeSlot: string;
  progress: number; // 0 to 100
  durationMinutes: number;
}

const CATEGORY_PROGRAMS: Record<string, string[]> = {
  news: [
    'Telediario 24 Horas',
    'Noticias al Minuto',
    'Debate & Actualidad Global',
    'Mundo Hoy en Directo',
    'Crónicas del Día',
    'Economía y Clima',
  ],
  sports: [
    'Tribuna Deportiva',
    'Resumen de la Jornada',
    'Fútbol Internacional en Directo',
    'Zona de Combate & Motor',
    'Deportes Extremos',
    'La Previa del Partido',
  ],
  movies: [
    'Cine Estelar: Acción Total',
    'Noche de Película',
    'Cine de Autor & Festivales',
    'Grandes Clásicos Inolvidables',
    'Thriller de Medianoche',
    'Aventura en Familia',
  ],
  series: [
    'Maratón de Series',
    'Capítulo Estreno: Investigación',
    'Misterios Urbanos',
    'Drama Médico',
    'Comedia en Familia',
    'Crímenes Reales',
  ],
  music: [
    'Top Éxitos del Momento',
    'Sesión Acústica en Vivo',
    'Grandes Conciertos del Mundo',
    'Ritmos Urbanos & Pop',
    'Clásicos de Colección',
    'Vibra Latina & Dance',
  ],
  kids: [
    'Aventuras Animadas',
    'El Club Infantil',
    'Mundo de Dibujos & Risas',
    'Pequeños Científicos',
    'Hora de Fantasía',
    'Historias de Animales',
  ],
  documentary: [
    'Planeta Salvaje',
    'Enigmas del Universo',
    'Secretos de la Historia',
    'Civilizaciones Perdidas',
    'Océanos Profundos',
    'Ciencia al Límite',
  ],
  entertainment: [
    'El Gran Show de la Tarde',
    'Noche de Comedia y Variedades',
    'Talento en Vivo',
    'Magazine Estelar',
    'Entrevistas Exclusivas',
    'Farándula y Cine',
  ],
  lifestyle: [
    'Cocina del Mundo',
    'Rutas y Destinos',
    'Hogar & Diseño Interior',
    'Sabores Tradicionales',
    'Vida Sana y Bienestar',
    'Mundo Motor',
  ],
  business: [
    'Mercados Globales al Cierre',
    'Economía & Negocios Hoy',
    'Finanzas y Criptoactivo',
    'Emprendedores del Futuro',
    'Pulso Bursátil',
  ],
  general: [
    'Magazine de la Mañana',
    'Tarde en Directo',
    'Prime Time Informativo',
    'Especial de la Semana',
    'Conexión Directa',
  ],
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns a deterministic simulated current program for any channel based on the current time.
 */
export function getCurrentProgram(
  channel: CatalogChannel | null,
  referenceDate: Date = new Date()
): SimulatedProgram {
  if (!channel) {
    return {
      title: 'Transmisión en directo',
      category: 'General',
      startTime: '00:00',
      endTime: '23:59',
      timeSlot: '00:00 - 23:59',
      progress: 50,
      durationMinutes: 60,
    };
  }

  const categoryKey = channel.primary_category?.toLowerCase() || 'general';
  const programList = CATEGORY_PROGRAMS[categoryKey] || CATEGORY_PROGRAMS.general;

  const currentHour = referenceDate.getHours();
  const currentMinutes = referenceDate.getMinutes();

  // Channels have 45 or 60 minute slots
  const channelHash = hashString(channel.id);
  const slotDuration = channelHash % 2 === 0 ? 60 : 45;
  const totalDayMinutes = currentHour * 60 + currentMinutes;
  const slotIndex = Math.floor(totalDayMinutes / slotDuration);
  const programIndex = (channelHash + slotIndex) % programList.length;

  const title = programList[programIndex];

  const slotStartTotalMin = slotIndex * slotDuration;
  const slotEndTotalMin = slotStartTotalMin + slotDuration;

  const startH = Math.floor(slotStartTotalMin / 60) % 24;
  const startM = slotStartTotalMin % 60;
  const endH = Math.floor(slotEndTotalMin / 60) % 24;
  const endM = slotEndTotalMin % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const startTime = `${pad(startH)}:${pad(startM)}`;
  const endTime = `${pad(endH)}:${pad(endM)}`;
  const timeSlot = `${startTime} - ${endTime}`;

  const elapsed = totalDayMinutes - slotStartTotalMin;
  const progress = Math.min(100, Math.max(5, Math.round((elapsed / slotDuration) * 100)));

  return {
    title,
    category: channel.primary_category || 'General',
    startTime,
    endTime,
    timeSlot,
    progress,
    durationMinutes: slotDuration,
  };
}
