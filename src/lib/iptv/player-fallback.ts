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
 * Watchdog timeout in ms:
 * 8 s with proxy, 5 s without proxy. As there is no proxy in this applet, uses 8 s per attempt.
 */
export function watchdogMs(hasProxy = false): number {
  return hasProxy ? 8000 : 8000;
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
      return 'Tiempo de espera agotado (8 s). La señal no responde. Probando siguiente fuente…';

    case 'cors':
      return 'El stream bloquea el acceso desde navegadores web (CORS). Sin un servidor proxy intermediario no puede reproducirse en el cliente.';

    case 'mixed_content':
      return 'Bloqueado por seguridad del navegador: no se permite cargar contenido HTTP no seguro en una aplicación HTTPS.';

    case 'geo':
      return 'Emisión bloqueada en tu región geográfica por restricciones territoriales del emisor.';

    case 'offline':
      return 'La señal de transmisión está temporalmente fuera del aire o en pausa técnica.';

    case 'format':
      return 'Formato de video o códec de audio/video no soportado por este navegador.';

    case 'dead':
      return 'Fuente de transmisión caída o enlace no encontrado (HTTP 404 / 500).';

    case 'auth':
      return 'La transmisión requiere autenticación o el token de acceso ha expirado.';

    case 'not_media':
      return 'La respuesta del servidor remoto no corresponde a un flujo de video válido.';

    case 'blocked':
      return 'Transmisión bloqueada por el proveedor del contenido o políticas de red.';

    case 'unknown':
    default:
      return detail || 'Error inesperado al intentar reproducir la transmisión.';
  }
}

/**
 * Heuristically detects ErrorKind from HLS/video/network errors.
 */
export function detectErrorKind(error: unknown, streamUrl?: string): ErrorKind {
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    streamUrl?.startsWith('http://')
  ) {
    return 'mixed_content';
  }

  if (typeof error === 'object' && error !== null) {
    const err = error as {
      response?: { status?: number };
      status?: number;
      code?: number;
      type?: string;
      details?: string;
      message?: string;
    };

    const status = err.response?.status || err.status;
    if (status === 403) return 'geo';
    if (status === 401) return 'auth';
    if (status === 404 || status === 410) return 'dead';
    if (status === 502 || status === 503) return 'offline';

    const msg = (err.message || err.details || '').toLowerCase();
    if (msg.includes('cors') || msg.includes('network error') || msg.includes('access-control-allow-origin')) {
      return 'cors';
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return 'timeout';
    }
    if (msg.includes('format') || msg.includes('manifest') || msg.includes('demux')) {
      return 'format';
    }
  }

  return 'unknown';
}
