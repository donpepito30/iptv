/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildCatalog, getCachedCatalog } from './catalog.ts';
import { CatalogResult } from './types.ts';

export interface UseIptvCatalogState {
  data: CatalogResult | null;
  loading: boolean;
  error: Error | null;
  progress: string;
  attempt: number;
  retry: () => void;
}

const BACKOFF_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s
const MAX_ATTEMPTS = 3;

export function useIptvCatalog(): UseIptvCatalogState {
  const [data, setData] = useState<CatalogResult | null>(() => getCachedCatalog());
  const [loading, setLoading] = useState<boolean>(() => !getCachedCatalog());
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<string>('Iniciando carga del catálogo...');
  const [attempt, setAttempt] = useState<number>(1);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadCatalog = useCallback(async () => {
    // If cached in memory, return immediately
    const cached = getCachedCatalog();
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      setProgress('Catálogo cargado desde memoria');
      return;
    }

    setLoading(true);
    setError(null);

    let currentAttempt = 1;

    while (currentAttempt <= MAX_ATTEMPTS) {
      setAttempt(currentAttempt);
      abortControllerRef.current = new AbortController();

      try {
        setProgress(
          currentAttempt > 1
            ? `Reintentando carga (${currentAttempt} de ${MAX_ATTEMPTS})...`
            : 'Descargando datos de iptv-org...'
        );

        const result = await buildCatalog({
          signal: abortControllerRef.current.signal,
          onProgress: (msg) => setProgress(msg),
        });

        setData(result);
        setLoading(false);
        setError(null);
        setProgress('Catálogo cargado correctamente');
        return;
      } catch (err: unknown) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const isLastAttempt = currentAttempt >= MAX_ATTEMPTS;
        const errObj = err instanceof Error ? err : new Error(String(err));

        if (isLastAttempt) {
          setError(errObj);
          setLoading(false);
          setProgress(`Error tras ${MAX_ATTEMPTS} intentos: ${errObj.message}`);
          return;
        }

        const delay = BACKOFF_DELAYS[currentAttempt - 1] || 4000;
        setProgress(`Error de red. Reintentando en ${delay / 1000}s (intento ${currentAttempt} de ${MAX_ATTEMPTS})...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        currentAttempt += 1;
      }
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadCatalog, retryTrigger]);

  const retry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1);
  }, []);

  return {
    data,
    loading,
    error,
    progress,
    attempt,
    retry,
  };
}
