/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { HlsConfig } from 'hls.js';

export type StreamFormat = 'hls' | 'dash' | 'direct-video' | 'audio' | 'unknown';

/**
 * Robust format detection inspecting URL extensions, query strings, and protocols.
 */
export function detectStreamFormat(url: string): StreamFormat {
  if (!url) return 'unknown';

  const cleanUrl = url.split('?')[0].toLowerCase();

  // DASH Manifests
  if (cleanUrl.endsWith('.mpd') || url.includes('.mpd?')) {
    return 'dash';
  }

  // HLS Playlists
  if (cleanUrl.endsWith('.m3u8') || url.includes('.m3u8?') || url.includes('/hls/')) {
    return 'hls';
  }

  // Direct HTML5 Video Containers
  if (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.m4v') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.mkv') ||
    cleanUrl.endsWith('.ts')
  ) {
    return 'direct-video';
  }

  // Direct Audio Streams
  if (
    cleanUrl.endsWith('.mp3') ||
    cleanUrl.endsWith('.aac') ||
    cleanUrl.endsWith('.m4a') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.flac') ||
    cleanUrl.endsWith('.wav')
  ) {
    return 'audio';
  }

  // Default to HLS for generic IPTV streams if unspecified
  return 'hls';
}

/**
 * Returns senior IPTV production configuration for HLS.js
 * tuned for low latency, fMP4 compatibility, and network buffering resilience.
 */
export function getOptimizedHlsConfig(lowLatency: boolean, fastFail = false): Partial<HlsConfig> {
  return {
    enableWorker: true,
    lowLatencyMode: lowLatency,
    backBufferLength: 20,
    maxBufferLength: 25,
    maxMaxBufferLength: 45,
    maxBufferSize: 50 * 1024 * 1024, // 50 MB
    manifestLoadingTimeOut: fastFail ? 4000 : 10000,
    manifestLoadingMaxRetry: fastFail ? 0 : 3,
    manifestLoadingRetryDelay: 1000,
    manifestLoadingMaxRetryTimeout: 15000,
    levelLoadingTimeOut: fastFail ? 4000 : 10000,
    levelLoadingMaxRetry: fastFail ? 0 : 3,
    fragLoadingTimeOut: 12000,
    fragLoadingMaxRetry: 4,
    fragLoadingRetryDelay: 1000,
    startFragPrefetch: true,
    capLevelToPlayerSize: true,
    testBandwidth: true,
    progressive: true,
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 6,
  };
}

/**
 * Detects whether the current user agent is Apple Safari / iOS WebKit.
 */
export function isAppleWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|Android|FxiOS/i.test(ua);
  const isIOS = /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isSafari || isIOS;
}

/**
 * Tests whether the HTMLVideoElement supports native Apple HLS playback.
 */
export function canPlayNativeHls(video: HTMLVideoElement | null): boolean {
  if (!video) return false;
  const canPlay = video.canPlayType('application/vnd.apple.mpegurl');
  return canPlay === 'probably' || canPlay === 'maybe';
}
