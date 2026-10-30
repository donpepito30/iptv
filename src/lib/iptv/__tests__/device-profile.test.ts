/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { detectDeviceTier, getDeviceProfile } from '../device-profile.ts';
import { getOptimizedHlsConfig } from '../player-formats.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Running Device Profiling & Hardware Adaptation unit tests...');

// 1. Smart TV Detection (FireStick, Samsung Tizen, LG WebOS, GoogleTV)
const fireStickUa = 'Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7292; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36 FireTV/1.0';
const tizenUa = 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0.3809.146 TV Safari/537.36';
const webOsUa = 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager';

assert(detectDeviceTier(fireStickUa, 1920, false) === 'smart-tv', 'FireStick should detect smart-tv');
assert(detectDeviceTier(tizenUa, 1920, false) === 'smart-tv', 'Tizen should detect smart-tv');
assert(detectDeviceTier(webOsUa, 1920, false) === 'smart-tv', 'LG WebOS should detect smart-tv');

// 2. Mobile Detection (iPhone, Android Mobile)
const iPhoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const androidMobileUa = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

assert(detectDeviceTier(iPhoneUa, 393, true) === 'mobile', 'iPhone should detect mobile');
assert(detectDeviceTier(androidMobileUa, 412, true) === 'mobile', 'Android Mobile should detect mobile');

// 3. Tablet Detection (iPad, Android Tablet)
const iPadUa = 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
assert(detectDeviceTier(iPadUa, 820, true) === 'tablet', 'iPad should detect tablet');

// 4. Desktop Detection (Windows, Mac)
const windowsDesktopUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
assert(detectDeviceTier(windowsDesktopUa, 1920, false) === 'desktop', 'Windows PC should detect desktop');

// 5. Hardware Buffer Caps and OOM Shields
const tvProfile = getDeviceProfile(fireStickUa, 1920);
assert(tvProfile.tier === 'smart-tv', 'tvProfile must have smart-tv tier');
assert(tvProfile.maxBufferSizeMb === 15, 'Smart TV buffer must be capped at 15MB to prevent WebView OOM crashes');
assert(tvProfile.backBufferLengthSec === 6, 'Smart TV back buffer must rapidly evict watched fragments');
assert(tvProfile.capLevelToPlayerSize === true, 'Smart TV must restrict level to avoid GPU decoder overload');
assert(tvProfile.pageSize === 24, 'Smart TV page size should be 24 for D-pad smoothness');

const mobileProfile = getDeviceProfile(iPhoneUa, 390);
assert(mobileProfile.tier === 'mobile', 'mobileProfile must have mobile tier');
assert(mobileProfile.maxBufferSizeMb === 20, 'Mobile buffer must be 20MB for fast response');
assert(mobileProfile.capLevelToPlayerSize === true, 'Mobile must cap quality level to viewport size (no wasting data/CPU)');
assert(mobileProfile.pageSize === 24, 'Mobile page size should be 24');

const desktopProfile = getDeviceProfile(windowsDesktopUa, 1920);
assert(desktopProfile.tier === 'desktop', 'desktopProfile must have desktop tier');
assert(desktopProfile.maxBufferSizeMb === 60, 'Desktop buffer can scale to 60MB for maximum jitter tolerance');
assert(desktopProfile.pageSize === 36, 'Desktop page size should be 36');

// 6. HLS Config integration tests
const tvHlsConfig = getOptimizedHlsConfig(true, false, tvProfile);
assert(tvHlsConfig.maxBufferSize === 15 * 1024 * 1024, 'HLS config maxBufferSize for TV must equal 15MB');
assert(tvHlsConfig.capLevelToPlayerSize === true, 'HLS config capLevelToPlayerSize for TV must be enabled');
assert(tvHlsConfig.backBufferLength === 6, 'HLS config backBufferLength for TV must be 6s');

const mobileHlsConfig = getOptimizedHlsConfig(true, false, mobileProfile);
assert(mobileHlsConfig.maxBufferSize === 20 * 1024 * 1024, 'HLS config maxBufferSize for Mobile must equal 20MB');
assert(mobileHlsConfig.capLevelToPlayerSize === true, 'HLS config capLevelToPlayerSize for Mobile must be enabled');

const desktopHlsConfig = getOptimizedHlsConfig(true, false, desktopProfile);
assert(desktopHlsConfig.maxBufferSize === 60 * 1024 * 1024, 'HLS config maxBufferSize for Desktop must equal 60MB');

console.log('✅ All Device Profiling & Hardware Adaptation unit tests passed successfully!');
