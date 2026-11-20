/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const LAST_STREAM_PREFIX = 'iptv:last-stream:';

/**
 * Retrieves the index of the stream that previously played successfully for this channel.
 */
export function getLastWorkingStreamIndex(channelId: string, maxStreams: number): number {
  if (typeof window === 'undefined' || !channelId || maxStreams <= 1) {
    return 0;
  }
  try {
    const saved = window.localStorage.getItem(`${LAST_STREAM_PREFIX}${channelId}`);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < maxStreams) {
        return idx;
      }
    }
  } catch {
    // Ignore localStorage access failures
  }
  return 0;
}

/**
 * Persists the index of the stream that is currently playing smoothly.
 */
export function saveLastWorkingStreamIndex(channelId: string, index: number): void {
  if (typeof window === 'undefined' || !channelId || index < 0) {
    return;
  }
  try {
    window.localStorage.setItem(`${LAST_STREAM_PREFIX}${channelId}`, String(index));
  } catch {
    // Ignore storage quota
  }
}
