/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Hls from 'hls.js';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { getDeviceProfile } from './device-profile.ts';
import { probeTopStreamsParallel } from './parallel-probe.ts';
import { classifyError, detectErrorKind, ErrorKind, nextFallback, watchdogMs } from './player-fallback.ts';
import { canPlayNativeHls, detectStreamFormat, getOptimizedHlsConfig } from './player-formats.ts';
import { setupHlsEventListeners } from './player-hls-events.ts';
import { getReconnectDelayMs, isBrowserOnline } from './player-reconnect.ts';
import { INITIAL_PLAYER_STATE, playerEngineReducer, PlayerState } from './player-reducer.ts';
import { getBufferAhead, getDroppedFrames } from './player-telemetry.ts';
import { loadShakaDash } from './shaka-loader.ts';
import { recordStreamFailure, recordStreamSuccess } from './stream-failures.ts';
import { getLastWorkingStreamIndex, saveLastWorkingStreamIndex } from './stream-preference.ts';
import { getProxiedStreamUrl, requiresProxyFallback, saveStreamRequiresProxy } from './stream-proxy.ts';
import { filterAndPrepareStreams, isMixedContent, MAX_STREAMS_PER_CHANNEL, saveStreamMethod } from './stream-strategy.ts';
import { CatalogChannel } from './types.ts';

export type { PlayerState };

export function usePlayerEngine(channel: CatalogChannel | null, isPlaying = true) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shakaRef = useRef<any>(null);
  const watchdogTimerRef = useRef<number | null>(null);
  const telemetryTimerRef = useRef<number | null>(null);
  const networkRetryTimerRef = useRef<number | null>(null);
  const stallTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const mediaRecoveryCountRef = useRef<number>(0);
  const networkRecoveryCountRef = useRef<number>(0);

  const handleFailureRef = useRef<(kind: ErrorKind, msg: string, fromIdx: number, wasProxy: boolean) => void>(() => {});
  const loadStreamAtIndexRef = useRef<(index: number, forceProxy?: boolean) => Promise<void>>(async () => {});

  const { usable: usableStreams, discardedMixedContentCount } = useMemo(() => {
    const list = channel?.streams?.length
      ? channel.streams
      : channel?.primaryStreamUrl
      ? [{ url: channel.primaryStreamUrl, status: 'online' as const }]
      : [];
    return filterAndPrepareStreams(list);
  }, [channel?.id]);

  const [state, dispatch] = useReducer(playerEngineReducer, INITIAL_PLAYER_STATE);

  const clearTimers = () => {
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    if (telemetryTimerRef.current) clearInterval(telemetryTimerRef.current);
    if (networkRetryTimerRef.current) clearTimeout(networkRetryTimerRef.current);
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    watchdogTimerRef.current = null;
    telemetryTimerRef.current = null;
    networkRetryTimerRef.current = null;
    stallTimerRef.current = null;
    reconnectTimerRef.current = null;
  };

  const destroyEngines = () => {
    clearTimers();
    mediaRecoveryCountRef.current = 0;
    networkRecoveryCountRef.current = 0;
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
    async (index: number, forceProxy = false) => {
      destroyEngines();
      const video = videoRef.current;

      if (!isBrowserOnline()) {
        dispatch({ type: 'SET_ERROR', kind: 'offline', message: 'Sin conexión a internet' });
        return;
      }

      if (!channel || usableStreams.length === 0) {
        const kind = discardedMixedContentCount > 0 ? 'mixed_content' : 'dead';
        dispatch({ type: 'SET_ERROR', kind, message: classifyError(kind) });
        return;
      }

      const stream = usableStreams[index] || usableStreams[0];
      const hasCustomHeaders = Boolean(stream.referrer || stream.user_agent);
      const needsProxy = forceProxy || isMixedContent(stream.url) || requiresProxyFallback(stream.url) || hasCustomHeaders;
      const effectiveUrl = needsProxy ? getProxiedStreamUrl(stream.url, stream.referrer, stream.user_agent) : stream.url;

      dispatch({ type: 'START_LOADING', streamIndex: index, usingProxy: needsProxy });
      if (!video) return;

      watchdogTimerRef.current = window.setTimeout(() => {
        handleFailureRef.current('timeout', classifyError('timeout'), index, needsProxy);
      }, watchdogMs(needsProxy, false));

      const format = detectStreamFormat(effectiveUrl);

      // 1. Direct HTML5 Video
      if (format === 'direct-video' || format === 'audio') {
        video.src = effectiveUrl;
        video.load();
        if (isPlaying) video.play().catch(() => {});
        saveStreamMethod(stream.url, 'direct');
        dispatch({ type: 'UPDATE_TELEMETRY', telemetry: { engineName: 'HTML5 Direct', isProxy: needsProxy } });
        return;
      }

      // 2. DASH stream
      if (format === 'dash') {
        const player = await loadShakaDash(video, effectiveUrl, (kind, msg) => {
          handleFailureRef.current(kind, msg, index, needsProxy);
        });
        if (player) {
          shakaRef.current = player;
          saveStreamMethod(stream.url, 'dash');
          dispatch({ type: 'UPDATE_TELEMETRY', telemetry: { engineName: 'Shaka DASH', isProxy: needsProxy } });
          return;
        }
      }

      // 3. HLS stream
      if (Hls.isSupported()) {
        const deviceProfile = getDeviceProfile();
        const hls = new Hls(getOptimizedHlsConfig(true, !needsProxy, deviceProfile));
        hlsRef.current = hls;
        hls.loadSource(effectiveUrl);
        hls.attachMedia(video);

        setupHlsEventListeners({
          hls,
          video,
          effectiveUrl,
          needsProxy,
          stream,
          streamIndex: index,
          isPlaying,
          dispatch,
          watchdogTimerRef,
          networkRetryTimerRef,
          networkRecoveryCountRef,
          mediaRecoveryCountRef,
          onFailure: (k, m, i, p) => handleFailureRef.current(k, m, i, p),
        });

        saveStreamMethod(stream.url, 'hls');
      } else if (canPlayNativeHls(video)) {
        video.src = effectiveUrl;
        video.load();
        if (isPlaying) video.play().catch(() => {});
        saveStreamMethod(stream.url, 'native');
      } else {
        handleFailureRef.current('format', classifyError('format'), index, needsProxy);
      }
    },
    [channel?.id, usableStreams, isPlaying, discardedMixedContentCount]
  );

  const reconnectCurrentStream = useCallback(() => {
    if (!isBrowserOnline()) {
      dispatch({ type: 'SET_ERROR', kind: 'offline', message: 'Sin conexión a internet' });
      return;
    }
    if (reconnectAttemptRef.current < 3) {
      const attempt = ++reconnectAttemptRef.current;
      const delay = getReconnectDelayMs(attempt);
      dispatch({ type: 'START_RECONNECTING', attempt, maxAttempts: 3 });
      reconnectTimerRef.current = window.setTimeout(() => {
        loadStreamAtIndexRef.current(state.streamIndex, state.usingProxy);
      }, delay);
    } else {
      reconnectAttemptRef.current = 0;
      const s = usableStreams[state.streamIndex];
      if (s?.url) recordStreamFailure(s.url);
      handleFailureRef.current('timeout', classifyError('timeout'), state.streamIndex, state.usingProxy);
    }
  }, [state.streamIndex, state.usingProxy, usableStreams]);

  const handleFailure = useCallback((kind: ErrorKind, message: string, fromIndex: number, wasProxy: boolean) => {
    destroyEngines();
    const stream = usableStreams[fromIndex];
    if (stream?.url) recordStreamFailure(stream.url);

    if (!wasProxy && stream?.url) {
      saveStreamRequiresProxy(stream.url, true);
      loadStreamAtIndexRef.current(fromIndex, true);
      return;
    }

    if (nextFallback(fromIndex, usableStreams.length, MAX_STREAMS_PER_CHANNEL) === 'next_stream') {
      reconnectAttemptRef.current = 0;
      loadStreamAtIndexRef.current(fromIndex + 1, false);
    } else {
      dispatch({ type: 'SET_ERROR', kind, message });
    }
  }, [usableStreams]);

  handleFailureRef.current = handleFailure;
  loadStreamAtIndexRef.current = loadStreamAtIndex;

  // Video element events & freeze watchdog
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlaying = () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
      reconnectAttemptRef.current = 0;
      const s = usableStreams[state.streamIndex];
      if (s?.url) recordStreamSuccess(s.url);
      if (channel?.id) saveLastWorkingStreamIndex(channel.id, state.streamIndex);
      dispatch({ type: 'SET_PLAYING' });
    };

    const onStallOrWait = () => {
      if (!stallTimerRef.current && !video.paused && isPlaying) {
        stallTimerRef.current = window.setTimeout(() => {
          if (video && !video.paused && getBufferAhead(video) <= 0.2) {
            reconnectCurrentStream();
          }
          stallTimerRef.current = null;
        }, 6000);
      }
    };

    const onError = () => {
      const kind = detectErrorKind(video.error, usableStreams[state.streamIndex]?.url, state.usingProxy);
      handleFailureRef.current(kind, classifyError(kind), state.streamIndex, state.usingProxy);
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('waiting', onStallOrWait);
    video.addEventListener('stalled', onStallOrWait);
    video.addEventListener('error', onError);

    telemetryTimerRef.current = window.setInterval(() => {
      if (video && !video.paused) {
        const prof = getDeviceProfile();
        dispatch({
          type: 'UPDATE_TELEMETRY',
          telemetry: {
            bufferSec: getBufferAhead(video),
            droppedFrames: getDroppedFrames(video),
            resolution: video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : '--',
            isAudioOnly: video.videoWidth === 0 && video.currentTime > 2,
            deviceTier: prof.label,
            bufferCapMb: prof.maxBufferSizeMb,
          },
        });
      }
    }, 1500);

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('waiting', onStallOrWait);
      video.removeEventListener('stalled', onStallOrWait);
      video.removeEventListener('error', onError);
      if (telemetryTimerRef.current) clearInterval(telemetryTimerRef.current);
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
  }, [state.streamIndex, state.usingProxy, usableStreams, channel?.id, isPlaying, reconnectCurrentStream]);

  // Online / Visibility automatic recovery
  useEffect(() => {
    const handleOnline = () => {
      if (state.status === 'error' || state.status === 'reconnecting') {
        reconnectAttemptRef.current = 0;
        loadStreamAtIndexRef.current(state.streamIndex, false);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (state.status === 'error' || state.status === 'reconnecting')) {
        loadStreamAtIndexRef.current(state.streamIndex, state.usingProxy);
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [state.status, state.streamIndex, state.usingProxy]);

  // Initial playback: activate checking & parallel probe
  useEffect(() => {
    let cancelled = false;
    if (!channel || usableStreams.length === 0) {
      destroyEngines();
      return;
    }

    dispatch({ type: 'START_CHECKING' });
    const preferred = getLastWorkingStreamIndex(channel.id, usableStreams.length);

    probeTopStreamsParallel(usableStreams, preferred).then(({ selectedIndex, forceProxy }) => {
      if (!cancelled) {
        loadStreamAtIndexRef.current(selectedIndex, forceProxy);
      }
    });

    return () => {
      cancelled = true;
      destroyEngines();
    };
  }, [channel?.id, usableStreams]);

  return {
    videoRef,
    status: state.status,
    currentStreamIndex: state.streamIndex,
    usableStreams,
    usingProxy: state.usingProxy,
    currentStream: usableStreams[state.streamIndex] || null,
    errorKind: state.errorKind,
    errorMessage: state.errorMessage,
    qualityLevels: state.qualityLevels,
    currentLevelIndex: state.currentLevelIndex,
    reconnectAttempt: state.reconnectAttempt,
    maxAttempts: state.maxAttempts,
    telemetry: state.telemetry,
    setQualityLevel: useCallback((idx: number) => {
      if (hlsRef.current) {
        hlsRef.current.currentLevel = idx;
        dispatch({ type: 'SET_CURRENT_LEVEL', levelIndex: idx });
      }
    }, []),
    retry: useCallback(() => loadStreamAtIndexRef.current(state.streamIndex, false), [state.streamIndex]),
    retryWithProxy: useCallback(() => {
      const s = usableStreams[state.streamIndex];
      if (s?.url) saveStreamRequiresProxy(s.url, true);
      loadStreamAtIndexRef.current(state.streamIndex, true);
    }, [state.streamIndex, usableStreams]),
    switchStreamIndex: useCallback((idx: number) => loadStreamAtIndexRef.current(idx, false), []),
    discardedMixedContentCount,
  };
}
