/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlayerTelemetry {
  bitrateKbps: number;
  resolution: string;
  fps: number;
  bufferSec: number;
  droppedFrames: number;
  isProxy: boolean;
  engineName: string;
  isAudioOnly: boolean;
}

export const INITIAL_TELEMETRY: PlayerTelemetry = {
  bitrateKbps: 0,
  resolution: '--',
  fps: 0,
  bufferSec: 0,
  droppedFrames: 0,
  isProxy: false,
  engineName: '--',
  isAudioOnly: false,
};

/**
 * Calculates buffered time ahead of current playback position
 */
export function getBufferAhead(video: HTMLVideoElement | null): number {
  if (!video || !video.buffered.length) return 0;
  const current = video.currentTime;
  for (let i = 0; i < video.buffered.length; i++) {
    const start = video.buffered.start(i);
    const end = video.buffered.end(i);
    if (current >= start && current <= end) {
      return Math.max(0, Math.round((end - current) * 10) / 10);
    }
  }
  return 0;
}

/**
 * Reads dropped video frames from standard video playback quality API
 */
export function getDroppedFrames(video: HTMLVideoElement | null): number {
  if (!video) return 0;
  if ('getVideoPlaybackQuality' in video) {
    const q = (video as any).getVideoPlaybackQuality();
    return q?.droppedVideoFrames || 0;
  }
  if ('webkitDroppedFrameCount' in video) {
    return (video as any).webkitDroppedFrameCount || 0;
  }
  return 0;
}
