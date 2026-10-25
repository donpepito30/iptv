/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Hls from 'hls.js';
import React, { useEffect, useRef, useState } from 'react';
import { ChannelWithStream } from '../../lib/iptv/types.ts';

export interface HlsPlayerProps {
  channel: ChannelWithStream | null;
  volume: number;
  muted: boolean;
  isPlaying: boolean;
  lowLatency: boolean;
  onPlayStateChange: (playing: boolean) => void;
  onError: (errorMsg: string | null) => void;
  onBufferingChange: (buffering: boolean) => void;
  onLevelsLoaded?: (levels: { index: number; height: number; bitrate: number }[]) => void;
  selectedLevelIndex?: number;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({
  channel,
  volume,
  muted,
  isPlaying,
  lowLatency,
  onPlayStateChange,
  onError,
  onBufferingChange,
  onLevelsLoaded,
  selectedLevelIndex = -1,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [canAutoplay, setCanAutoplay] = useState(true);

  // Sync volume and mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Sync play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      const promise = video.play();
      if (promise !== undefined) {
        promise.catch((err) => {
          // Autoplay policy might require mute
          if (err.name === 'NotAllowedError') {
            setCanAutoplay(false);
            video.muted = true;
            video.play().catch(() => onPlayStateChange(false));
          } else {
            onPlayStateChange(false);
          }
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying, onPlayStateChange]);

  // Sync manual quality level
  useEffect(() => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = selectedLevelIndex;
    }
  }, [selectedLevelIndex]);

  // Initialize and attach HLS stream
  useEffect(() => {
    const video = videoRef.current;
    const streamUrl = channel?.primaryStreamUrl || channel?.streams?.[0]?.url;

    if (!video || !streamUrl) {
      onError('NO_STREAM');
      return;
    }

    onError(null);
    onBufferingChange(true);

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: lowLatency,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        onBufferingChange(false);
        if (data.levels && onLevelsLoaded) {
          const formatted = data.levels.map((lvl, index) => ({
            index,
            height: lvl.height,
            bitrate: lvl.bitrate,
          }));
          onLevelsLoaded(formatted);
        }

        if (isPlaying) {
          video.play().catch(() => onPlayStateChange(false));
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HlsPlayer] Fatal network error, recovering...', data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HlsPlayer] Fatal media error, recovering...', data);
              hls.recoverMediaError();
              break;
            default:
              console.error('[HlsPlayer] Unrecoverable stream error:', data);
              hls.destroy();
              onError('STREAM_ERROR');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS for Safari/iOS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        onBufferingChange(false);
        if (isPlaying) {
          video.play().catch(() => onPlayStateChange(false));
        }
      });
      video.addEventListener('error', () => {
        onError('STREAM_ERROR');
      });
    } else {
      onError('NOT_SUPPORTED');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [channel, lowLatency]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-contain bg-black"
      playsInline
      onWaiting={() => onBufferingChange(true)}
      onPlaying={() => {
        onBufferingChange(false);
        onPlayStateChange(true);
      }}
      onPause={() => onPlayStateChange(false)}
      onEnded={() => onPlayStateChange(false)}
    />
  );
};
