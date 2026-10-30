/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';

export type DeviceTier = 'smart-tv' | 'mobile' | 'tablet' | 'desktop';

export interface DeviceProfile {
  tier: DeviceTier;
  isSmartTv: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  maxBufferSizeMb: number;
  maxBufferLengthSec: number;
  maxMaxBufferLengthSec: number;
  backBufferLengthSec: number;
  capLevelToPlayerSize: boolean;
  pageSize: number;
  fastFailWatchdogSec: number;
  lowPowerDevice: boolean;
  label: string;
}

const TV_UA_REGEX =
  /smart-tv|smarttv|googletv|appletv|hbbtv|pov_tv|netcast|viera|webos|tizen|firetv|roku|aftt|aftm|aftb|crkey|mibox|bravia|hisense|philipstv/i;
const MOBILE_UA_REGEX = /iphone|ipod|android.*mobile|windows phone|blackberry/i;
const TABLET_UA_REGEX = /ipad|android(?!.*mobile)|tablet/i;

/**
 * Pure function to inspect User Agent and viewport dimensions, returning a robust profile.
 */
export function detectDeviceTier(ua = '', width = 1280, hasCoarsePointer = false): DeviceTier {
  const cleanUa = ua.toLowerCase();

  // 1. Smart TV or TV Dongle
  if (TV_UA_REGEX.test(cleanUa)) {
    return 'smart-tv';
  }

  // 2. Tablets
  if (TABLET_UA_REGEX.test(cleanUa) || (width >= 768 && width <= 1024 && hasCoarsePointer)) {
    return 'tablet';
  }

  // 3. Mobile Phones
  if (MOBILE_UA_REGEX.test(cleanUa) || (width > 0 && width < 768 && hasCoarsePointer)) {
    return 'mobile';
  }

  // 4. Viewport fallback when UA is ambiguous
  if (width > 0 && width < 768) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Returns tailored hardware and buffer configuration for the detected device.
 */
export function getDeviceProfile(customUa?: string, customWidth?: number): DeviceProfile {
  let ua = '';
  let width = 1280;
  let hasCoarse = false;

  if (typeof navigator !== 'undefined') {
    ua = customUa ?? navigator.userAgent;
  } else if (customUa) {
    ua = customUa;
  }

  if (typeof window !== 'undefined') {
    width = customWidth ?? window.innerWidth;
    hasCoarse = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
  } else if (customWidth !== undefined) {
    width = customWidth;
  }

  const tier = detectDeviceTier(ua, width, hasCoarse);

  switch (tier) {
    case 'smart-tv':
      return {
        tier: 'smart-tv',
        isSmartTv: true,
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        maxBufferSizeMb: 15, // Protects against 200MB WebView OOM crash on FireSticks/SmartTVs
        maxBufferLengthSec: 10,
        maxMaxBufferLengthSec: 18,
        backBufferLengthSec: 6, // Fast eviction of played chunks
        capLevelToPlayerSize: true,
        pageSize: 24, // Reduces DOM nodes for smooth remote D-pad scrolling
        fastFailWatchdogSec: 6,
        lowPowerDevice: true,
        label: 'Smart TV',
      };

    case 'mobile':
      return {
        tier: 'mobile',
        isSmartTv: false,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        maxBufferSizeMb: 20, // Prevents battery drain & thermal throttling
        maxBufferLengthSec: 12,
        maxMaxBufferLengthSec: 20,
        backBufferLengthSec: 8,
        capLevelToPlayerSize: true, // Prevents loading 1080p/4K in 390px screens
        pageSize: 24,
        fastFailWatchdogSec: 5,
        lowPowerDevice: true,
        label: 'Móvil',
      };

    case 'tablet':
      return {
        tier: 'tablet',
        isSmartTv: false,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        maxBufferSizeMb: 35,
        maxBufferLengthSec: 20,
        maxMaxBufferLengthSec: 35,
        backBufferLengthSec: 12,
        capLevelToPlayerSize: true,
        pageSize: 30,
        fastFailWatchdogSec: 7,
        lowPowerDevice: false,
        label: 'Tablet',
      };

    case 'desktop':
    default:
      return {
        tier: 'desktop',
        isSmartTv: false,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        maxBufferSizeMb: 60, // Maximum resilience against network jitter
        maxBufferLengthSec: 30,
        maxMaxBufferLengthSec: 50,
        backBufferLengthSec: 20,
        capLevelToPlayerSize: false,
        pageSize: 36,
        fastFailWatchdogSec: 8,
        lowPowerDevice: false,
        label: 'Escritorio',
      };
  }
}

/**
 * React Hook for responsive device profile adaptation
 */
export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(() => getDeviceProfile());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timer: number | null = null;
    const handleResize = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setProfile(getDeviceProfile());
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return profile;
}
