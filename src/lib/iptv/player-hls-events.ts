/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Hls from 'hls.js';
import React from 'react';
import { classifyError, detectErrorKind, ErrorKind, watchdogMs } from './player-fallback.ts';
import { PlayerAction } from './player-reducer.ts';
import { saveStreamRequiresProxy } from './stream-proxy.ts';
import { CatalogStream } from './types.ts';

export interface SetupHlsEventsOptions {
  hls: Hls;
  video: HTMLVideoElement;
  effectiveUrl: string;
  needsProxy: boolean;
  stream: CatalogStream;
  streamIndex: number;
  isPlaying: boolean;
  dispatch: React.Dispatch<PlayerAction>;
  watchdogTimerRef: React.MutableRefObject<number | null>;
  networkRetryTimerRef: React.MutableRefObject<number | null>;
  networkRecoveryCountRef: React.MutableRefObject<number>;
  mediaRecoveryCountRef: React.MutableRefObject<number>;
  onFailure: (kind: ErrorKind, msg: string, fromIdx: number, wasProxy: boolean) => void;
}

/**
 * Attaches and coordinates all Hls.js events, watchdogs, level telemetry, and error recoveries.
 */
export function setupHlsEventListeners(opts: SetupHlsEventsOptions): void {
  const {
    hls,
    video,
    effectiveUrl,
    needsProxy,
    stream,
    streamIndex,
    isPlaying,
    dispatch,
    watchdogTimerRef,
    networkRetryTimerRef,
    networkRecoveryCountRef,
    mediaRecoveryCountRef,
    onFailure,
  } = opts;

  hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = window.setTimeout(() => {
        onFailure('timeout', classifyError('timeout'), streamIndex, needsProxy);
      }, watchdogMs(needsProxy, true));
    }
    if (data.levels) {
      dispatch({
        type: 'SET_LEVELS',
        levels: data.levels.map((lvl, idx) => ({ index: idx, height: lvl.height, bitrate: lvl.bitrate })),
      });
    }
    if (needsProxy) saveStreamRequiresProxy(stream.url, true);
    if (isPlaying) video.play().catch(() => {});
  });

  hls.on(Hls.Events.FRAG_LOADED, () => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = window.setTimeout(() => {
        onFailure('timeout', classifyError('timeout'), streamIndex, needsProxy);
      }, watchdogMs(needsProxy, true));
    }
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
    if (!data.fatal) return;

    const kind = detectErrorKind(data, effectiveUrl, needsProxy);

    // Fatal Network Error: attempt progressive retry (1s, 3s)
    if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveryCountRef.current < 2) {
      const delay = networkRecoveryCountRef.current === 0 ? 1000 : 3000;
      networkRecoveryCountRef.current += 1;
      networkRetryTimerRef.current = window.setTimeout(() => {
        hls.startLoad();
      }, delay);
      return;
    }

    // Fatal Media Error: media recovery
    if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      mediaRecoveryCountRef.current += 1;
      if (mediaRecoveryCountRef.current === 1) {
        hls.recoverMediaError();
        return;
      }
      if (mediaRecoveryCountRef.current === 2) {
        hls.swapAudioCodec();
        hls.recoverMediaError();
        return;
      }
    }

    onFailure(kind, classifyError(kind), streamIndex, needsProxy);
  });
}
