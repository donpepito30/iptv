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
  INITIAL_PLAYER_STATE,
  playerEngineReducer,
  PlayerState,
} from './player-reducer.ts';
import {
  getBufferAhead,
  getDroppedFrames,
} from './player-telemetry.ts';
import { loadShakaDash } from './shaka-loader.ts';
import {
  getProxiedStreamUrl,
  requiresProxyFallback,
  saveStreamRequiresProxy,
} from './stream-proxy.ts';
import {
  filterAndPrepareStreams,
  isMixedContent,
  MAX_STREAMS_PER_CHANNEL,
  saveStreamMethod,
} from './stream-strategy.ts';
import { CatalogChannel } from './types.ts';

export type { PlayerState };

export function usePlayerEngine(channel: CatalogChannel | null, isPlaying = true) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shakaRef = useRef<any>(null);
  const watchdogTimerRef = useRef<number | null>(null);
  const telemetryTimerRef = useRef<number | null>(null);

  const { usable: usableStreams, discardedMixedContentCount } = filterAndPrepareStreams(
    channel?.streams || []
  );

  const [state, dispatch] = useReducer(playerEngineReducer, INITIAL_PLAYER_STATE);

  const clearTimers = () => {
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    if (telemetryTimerRef.current) clearInterval(telemetryTimerRef.current);
    watchdogTimerRef.current = null;
    telemetryTimerRef.current = null;
  };

  const destroyEngines = () => {
    clearTimers();
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

      if (!channel || usableStreams.length === 0) {
        const kind = discardedMixedContentCount > 0 ? 'mixed_content' : 'dead';
        dispatch({ type: 'SET_ERROR', kind, message: classifyError(kind) });
        return;
      }

      const stream = usableStreams[index] || usableStreams[0];
      const needsProxy = forceProxy || isMixedContent(stream.url) || requiresProxyFallback(stream.url);
      const effectiveUrl = needsProxy
        ? getProxiedStreamUrl(stream.url, stream.referrer, stream.user_agent)
        : stream.url;

      dispatch({ type: 'START_LOADING', streamIndex: index, usingProxy: needsProxy });
      if (!video) return;

      watchdogTimerRef.current = window.setTimeout(() => {
        handleFailure('timeout', classifyError('timeout'), index, needsProxy);
      }, watchdogMs(needsProxy));

      // 1. DASH stream (.mpd)
      if (effectiveUrl.includes('.mpd')) {
        const player = await loadShakaDash(video, effectiveUrl, (kind, msg) => {
          handleFailure(kind, msg, index, needsProxy);
        });
        if (player) {
          shakaRef.current = player;
          saveStreamMethod(stream.url, 'dash');
          dispatch({ type: 'UPDATE_TELEMETRY', telemetry: { engineName: 'Shaka DASH', isProxy: needsProxy } });
          return;
        }
      }

      // 2. HLS stream (hls.js)
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 15,
          maxBufferLength: 20,
          maxMaxBufferLength: 40,
          maxBufferSize: 30 * 1000 * 1000,
          manifestLoadingTimeOut: 8000,
          manifestLoadingMaxRetry: 2,
          fragLoadingTimeOut: 8000,
          fragLoadingMaxRetry: 3,
          capLevelToPlayerSize: true,
        });
        hlsRef.current = hls;
        hls.loadSource(effectiveUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          if (data.levels) {
            dispatch({
              type: 'SET_LEVELS',
              levels: data.levels.map((lvl, idx) => ({ index: idx, height: lvl.height, bitrate: lvl.bitrate })),
            });
          }
          if (needsProxy) saveStreamRequiresProxy(stream.url, true);
          if (isPlaying) video.play().catch(() => {});
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const lvl = hls.levels[data.level];
          if (lvl) {
            dispatch({
              type: 'UPDATE_TELEMETRY',
              telemetry: {
                bitrateKbps: Math.round(lvl.bitrate / 1000),
                resolution: `${lvl.width || '--'}x${lvl.height}`,
              },
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            const kind = detectErrorKind(data, effectiveUrl, needsProxy);
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              handleFailure(kind, classifyError(kind), index, needsProxy);
            }
          }
        });

        saveStreamMethod(stream.url, 'hls');
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = effectiveUrl;
        saveStreamMethod(stream.url, 'native');
      } else {
        handleFailure('format', classifyError('format'), index, needsProxy);
      }
    },
    [channel?.id, usableStreams, isPlaying, discardedMixedContentCount]
  );

  const handleFailure = (kind: ErrorKind, message: string, fromIndex: number, wasProxy: boolean) => {
    destroyEngines();
    const stream = usableStreams[fromIndex];

    // If direct attempt failed (e.g. CORS/mixed content/network block), transparently retry via proxy relay!
    if (!wasProxy && stream?.url) {
      saveStreamRequiresProxy(stream.url, true);
      loadStreamAtIndex(fromIndex, true);
      return;
    }

    // If proxy also failed or wasn't applicable, cascade to next stream candidate of this channel
    if (nextFallback(fromIndex, usableStreams.length, MAX_STREAMS_PER_CHANNEL) === 'next_stream') {
      loadStreamAtIndex(fromIndex + 1, false);
    } else {
      dispatch({ type: 'SET_ERROR', kind, message });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlaying = () => {
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
      dispatch({ type: 'SET_PLAYING' });
    };
    const onTimeUpdate = () => {
      if (video.currentTime > 0 && watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
      }
    };
    const onError = () => {
      const kind = detectErrorKind(video.error, usableStreams[state.streamIndex]?.url, state.usingProxy);
      handleFailure(kind, classifyError(kind), state.streamIndex, state.usingProxy);
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('error', onError);

    telemetryTimerRef.current = window.setInterval(() => {
      if (video && !video.paused) {
        dispatch({
          type: 'UPDATE_TELEMETRY',
          telemetry: {
            bufferSec: getBufferAhead(video),
            droppedFrames: getDroppedFrames(video),
            resolution: video.videoWidth ? `${video.videoWidth}x${video.videoHeight}` : '--',
            isAudioOnly: video.videoWidth === 0 && video.currentTime > 2,
          },
        });
      }
    }, 1500);

    return () => {
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('error', onError);
      if (telemetryTimerRef.current) clearInterval(telemetryTimerRef.current);
    };
  }, [state.streamIndex, state.usingProxy, usableStreams]);

  useEffect(() => {
    if (channel) loadStreamAtIndex(0, false);
    return () => destroyEngines();
  }, [channel?.id]);

  const retry = useCallback(() => loadStreamAtIndex(state.streamIndex, false), [loadStreamAtIndex, state.streamIndex]);
  const retryWithProxy = useCallback(() => {
    if (usableStreams[state.streamIndex]?.url) {
      saveStreamRequiresProxy(usableStreams[state.streamIndex].url, true);
    }
    loadStreamAtIndex(state.streamIndex, true);
  }, [loadStreamAtIndex, state.streamIndex, usableStreams]);
  const switchStreamIndex = useCallback((idx: number) => loadStreamAtIndex(idx, false), [loadStreamAtIndex]);
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
    usingProxy: state.usingProxy,
    currentStream: usableStreams[state.streamIndex] || null,
    errorKind: state.errorKind,
    errorMessage: state.errorMessage,
    qualityLevels: state.qualityLevels,
    currentLevelIndex: state.currentLevelIndex,
    telemetry: state.telemetry,
    setQualityLevel,
    retry,
    retryWithProxy,
    switchStreamIndex,
    discardedMixedContentCount,
  };
}
