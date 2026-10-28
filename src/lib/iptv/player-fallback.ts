/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ErrorKind =
  | 'unknown'
  | 'timeout'
  | 'cors'
  | 'geo'
  | 'offline'
  | 'format'
  | 'dead'
  | 'auth'
  | 'not_media'
  | 'blocked'
  | 'mixed_content';

/**
 * Watchdog timeout in ms: 8000ms per attempt.
 */
export function watchdogMs(hasProxy = false): number {
  return hasProxy ? 8000 : 5000;
}

/**
 * Determines whether to attempt the next stream source or give up.
 * If there are more streams and fewer than 5 have been attempted -> 'next_stream', else 'give_up'.
 */
export function nextFallback(
  currentIndex: number,
  totalStreams: number,
  maxStreams = 5
): 'next_stream' | 'give_up' {
  if (currentIndex + 1 < totalStreams && currentIndex + 1 < maxStreams) {
    return 'next_stream';
  }
  return 'give_up';
}

/**
 * Returns a clear, honest explanation in Spanish according to the error kind.
 */
export function classifyError(kind: ErrorKind, detail?: string): string {
  switch (kind) {
    case 'timeout':
      return 'Tiempo de espera agotado (8 s). La señal de origen no responde al flujo de datos.';

    case 'cors':
      return 'Señal con restricción de origen cruzado (CORS). Requiere túnel proxy para reproducir en navegador.';

    case 'mixed_content':
      return 'Señal HTTP no cifrada. Se transmite mediante túnel proxy SSL seguro.';

    case 'geo':
      return 'Emisión con bloqueo geográfico territorial (HTTP 403). La emisora restringe el acceso a su país de origen.';

    case 'offline':
      return 'Servidor de transmisión fuera del aire o en pausa técnica por mantenimiento (HTTP 502/503).';

    case 'format':
      return 'Códec de audio/video o perfil de transporte no soportado por este navegador.';

    case 'dead':
      return 'Fuente de transmisión caída o enlace caducado por el proveedor de contenido (HTTP 404 / Inactivo).';

    case 'auth':
      return 'La transmisión requiere autenticación o token de acceso con clave privada.';

    case 'not_media':
      return 'La respuesta del servidor no corresponde a un flujo de video o lista HLS válida.';

    case 'blocked':
      return 'Transmisión bloqueada por el proveedor o políticas de red del emisor.';

    case 'unknown':
    default:
      return detail || 'No se pudo establecer conexión con la transmisión.';
  }
}

/**
 * Heuristically detects ErrorKind from HLS/video/network errors.
 */
export function detectErrorKind(error: unknown, streamUrl?: string, isProxy = false): ErrorKind {
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    streamUrl?.startsWith('http://') &&
    !isProxy
  ) {
    return 'mixed_content';
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as {
      response?: { code?: number; status?: number; text?: string };
      status?: number;
      code?: number;
      type?: string;
      details?: string;
      message?: string;
    };

    const status = err.response?.code || err.response?.status || err.status || err.code;
    if (status === 403) return 'geo';
    if (status === 401) return 'auth';
    if (status === 404 || status === 410) return 'dead';
    if (status === 502 || status === 503) return 'offline';
    if (status === 504) return 'timeout';

    const msg = (err.message || err.details || '').toLowerCase();
    if (msg.includes('cors') || msg.includes('access-control-allow-origin')) {
      return 'cors';
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return 'timeout';
    }
    if (msg.includes('format') || msg.includes('manifest') || msg.includes('demux')) {
      return 'format';
    }
    if (status === 0 || msg.includes('network error') || msg.includes('failed to fetch')) {
      return isProxy ? 'dead' : 'cors';
    }
  }

  return 'unknown';
}
