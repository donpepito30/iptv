/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Hls from 'hls.js';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  classifyError,
  detectErrorKind,
  ErrorKind,
  nextFallback,
  watchdogMs,
} from './player-fallback.ts';
import {
  filterAndPrepareStreams,
  MAX_STREAMS_PER_CHANNEL,
  saveStreamMethod,
} from './stream-strategy.ts';
import { CatalogChannel } from './types.ts';

export type PlayerState = 'idle' | 'checking' | 'loading' | 'playing' | 'error';

interface State {
  status: PlayerState;
  streamIndex: number;
  errorKind: ErrorKind | null;
  errorMessage: string | null;
  qualityLevels: { index: number; height: number; bitrate: number }[];
  currentLevelIndex: number;
}

type Action =
  | { type: 'START_CHECKING' }
  | { type: 'START_LOADING'; streamIndex: number }
  | { type: 'SET_PLAYING' }
  | { type: 'SET_ERROR'; kind: ErrorKind; message: string }
  | { type: 'SET_LEVELS'; levels: { index: number; height: number; bitrate: number }[] }
  | { type: 'SET_CURRENT_LEVEL'; levelIndex: number };

function playerReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_CHECKING':
      return { ...state, status: 'checking', errorKind: null, errorMessage: null };
    case 'START_LOADING':
      return { ...state, status: 'loading', streamIndex: action.streamIndex, errorKind: null, errorMessage: null };
    case 'SET_PLAYING':
      return { ...state, status: 'playing', errorKind: null, errorMessage: null };
    case 'SET_ERROR':
      return { ...state, status: 'error', errorKind: action.kind, errorMessage: action.message };
    case 'SET_LEVELS':
      return { ...state, qualityLevels: action.levels };
    case 'SET_CURRENT_LEVEL':
      return { ...state, currentLevelIndex: action.levelIndex };
    default:
      return state;
  }
}

export function usePlayerEngine(channel: CatalogChannel | null, isPlaying = true) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shakaRef = useRef<any>(null);
  const watchdogTimerRef = useRef<number | null>(null);

  const { usable: usableStreams, discardedMixedContentCount } = filterAndPrepareStreams(
    channel?.streams || []
  );

  const [state, dispatch] = useReducer(playerReducer, {
    status: 'idle',
    streamIndex: 0,
    errorKind: null,
    errorMessage: null,
    qualityLevels: [],
    currentLevelIndex: -1,
  });

  const clearWatchdog = () => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
  };

  const destroyEngines = () => {
    clearWatchdog();
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (shakaRef.current) {
      shakaRef.current.destroy();
      shakaRef.current = null;
    }
  };

  const loadStreamAtIndex = useCallback(
    async (index: number) => {
      destroyEngines();
      const video = videoRef.current;

      if (!channel || usableStreams.length === 0) {
        const kind = discardedMixedContentCount > 0 ? 'mixed_content' : 'dead';
        dispatch({ type: 'SET_ERROR', kind, message: classifyError(kind) });
        return;
      }

      const stream = usableStreams[index] || usableStreams[0];
      const url = stream.url;
      dispatch({ type: 'START_LOADING', streamIndex: index });

      if (!video) return;

      // Watchdog timeout (8 s)
      watchdogTimerRef.current = window.setTimeout(() => {
        handleFatalError('timeout', classifyError('timeout'), index);
      }, watchdogMs(false));

      // 1. DASH stream (.mpd) -> shaka-player
      if (url.includes('.mpd')) {
        try {
          const shakaModule = await import('shaka-player');
          const shaka = (shakaModule.default || shakaModule) as any;
          shaka.polyfill.installAll();

          if (shaka.Player.isBrowserSupported()) {
            const player = new shaka.Player();
            await player.attach(video);
            shakaRef.current = player;
            player.addEventListener('error', (event: any) => {
              const kind = detectErrorKind(event.detail, url);
              handleFatalError(kind, classifyError(kind, event.detail?.message), index);
            });
            await player.load(url);
            saveStreamMethod(url, 'dash');
            return;
          }
        } catch (dashErr) {
          console.warn('[usePlayerEngine] DASH load failed:', dashErr);
        }
      }

      // 2. HLS stream (hls.js)
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30 });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          if (data.levels) {
            dispatch({
              type: 'SET_LEVELS',
              levels: data.levels.map((lvl, idx) => ({ index: idx, height: lvl.height, bitrate: lvl.bitrate })),
            });
          }
          if (isPlaying) video.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            const kind = detectErrorKind(data, url);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              handleFatalError(kind === 'unknown' ? 'cors' : kind, classifyError(kind === 'unknown' ? 'cors' : kind), index);
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              handleFatalError(kind, classifyError(kind), index);
            }
          }
        });

        saveStreamMethod(url, 'hls');
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS for Safari / iOS
        video.src = url;
        saveStreamMethod(url, 'native');
      } else {
        handleFatalError('format', classifyError('format'), index);
      }
    },
    [channel?.id, usableStreams, isPlaying, discardedMixedContentCount]
  );

  const handleFatalError = (kind: ErrorKind, message: string, fromIndex: number) => {
    destroyEngines();
    if (nextFallback(fromIndex, usableStreams.length, MAX_STREAMS_PER_CHANNEL) === 'next_stream') {
      loadStreamAtIndex(fromIndex + 1);
    } else {
      dispatch({ type: 'SET_ERROR', kind, message });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlaying = () => {
      clearWatchdog();
      dispatch({ type: 'SET_PLAYING' });
    };
    const onTimeUpdate = () => {
      if (video.currentTime > 0) clearWatchdog();
    };
    const onError = () => {
      const kind = detectErrorKind(video.error, usableStreams[state.streamIndex]?.url);
      handleFatalError(kind, classifyError(kind), state.streamIndex);
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('error', onError);
    };
  }, [state.streamIndex, usableStreams]);

  useEffect(() => {
    if (channel) loadStreamAtIndex(0);
    return () => destroyEngines();
  }, [channel?.id]);

  const retry = useCallback(() => loadStreamAtIndex(state.streamIndex), [loadStreamAtIndex, state.streamIndex]);
  const switchStreamIndex = useCallback((idx: number) => loadStreamAtIndex(idx), [loadStreamAtIndex]);
  const setQualityLevel = useCallback((lvlIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = lvlIndex;
      dispatch({ type: 'SET_CURRENT_LEVEL', levelIndex: lvlIndex });
    }
  }, []);

  return {
    videoRef,
    status: state.status,
    currentStreamIndex: state.streamIndex,
    usableStreams,
    currentStream: usableStreams[state.streamIndex] || null,
    errorKind: state.errorKind,
    errorMessage: state.errorMessage,
    qualityLevels: state.qualityLevels,
    currentLevelIndex: state.currentLevelIndex,
    setQualityLevel,
    retry,
    switchStreamIndex,
    discardedMixedContentCount,
  };
}
