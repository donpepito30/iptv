/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  AdultModelRaw,
  normalizeAdultModel,
  transformModelToCatalogChannel,
} from '../adult-catalog.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Running adult catalog unit tests with updated 2redex69_models attachment...');

// Test 1: normalizeAdultModel with basic raw object
const sampleRaw: AdultModelRaw = {
  id: '72250054',
  username: 'roouse',
  displayName: 'roouse',
  avatarUrl: 'https://static-proxy.strpst.com/avatars/test.jpg',
  snapshotUrl: 'https://img.doppiocdn.com/thumbs/test.jpg',
  videoUrl: 'https://edge-hls.saawsedge.com/hls/72250054/master/72250054_480p.m3u8',
  streamUrls: {
    '480p': 'https://edge-hls.saawsedge.com/hls/72250054/master/72250054_480p.m3u8',
    '240p': 'https://edge-hls.saawsedge.com/hls/72250054/master/72250054_240p.m3u8',
  },
  iframeEmbedUrl: 'https://stripchat.com/embed/roouse',
  viewersCount: 9862,
  country: 'co',
  languages: ['en', 'es'],
  isHd: true,
  isLive: true,
  age: 18,
};

const normalized = normalizeAdultModel(sampleRaw);
assert(normalized.id === '72250054', 'Model ID preserved');
assert(normalized.channelId === 'adult-72250054', 'Channel ID prefix matches');
assert(normalized.countryCode === 'CO', 'Country code is uppercase');
assert(normalized.countryName === 'Colombia', 'Country name resolves to Colombia');
assert(normalized.isHD === true, 'isHD is true');
assert(normalized.viewersCount === 9862, 'viewers count matches');
assert(normalized.embedUrl === 'https://stripchat.com/embed/roouse', 'embedUrl matches');

// Test 2: transformModelToCatalogChannel generates multi-quality streams
const catalogChannel = transformModelToCatalogChannel(normalized);
assert(catalogChannel.id === 'adult-72250054', 'Catalog channel ID matches');
assert(catalogChannel.primary_category === 'adult', 'Primary category should be adult');
assert(catalogChannel.categories.includes('adult'), 'Categories includes adult');
assert(catalogChannel.streams.length >= 2, 'Primary and backup 240p streams attached');
assert(catalogChannel.streams[0].url === sampleRaw.videoUrl, 'Primary stream URL matches');
assert(catalogChannel.streams[0].referrer === 'https://stripchat.com/', 'Smart Referer set on stream');
assert(catalogChannel.embedUrl === 'https://stripchat.com/embed/roouse', 'embedUrl attached to channel');

// Test 3: Load new attached JSON file (300 models)
const newJsonPath = path.resolve('public/assets/aistudio/2redex69_models_2026-10-27__1___1__8193a58f.json');
assert(fs.existsSync(newJsonPath), 'New JSON attachment file must exist');

const newFileContent = fs.readFileSync(newJsonPath, 'utf-8');
const newParsedData: AdultModelRaw[] = JSON.parse(newFileContent);
assert(Array.isArray(newParsedData), 'Data must be an array');
assert(newParsedData.length === 300, `Expected 300 models in new file, got ${newParsedData.length}`);

let verifiedCount = 0;
for (const item of newParsedData) {
  const norm = normalizeAdultModel(item);
  assert(Boolean(norm.id), `Model id must exist: ${norm.id}`);
  assert(norm.displayName.length > 0, `Display name must not be empty`);
  assert(norm.streamUrl.startsWith('http'), `Stream URL must be valid: ${norm.streamUrl}`);
  verifiedCount++;
}
assert(verifiedCount === 300, 'All 300 models in new dataset normalized successfully');

// Test 4: Deduplicated merge with previous dataset
const oldJsonPath = path.resolve('public/assets/aistudio/2redex69_50_modelos_variadas_2026-10-26_6eec6bcf.json');
assert(fs.existsSync(oldJsonPath), 'Old JSON attachment file must exist');
const oldParsedData: AdultModelRaw[] = JSON.parse(fs.readFileSync(oldJsonPath, 'utf-8'));

const dedupeMap = new Map<string, AdultModelRaw>();
for (const item of newParsedData) {
  dedupeMap.set(String(item.id || item.username), item);
}
for (const item of oldParsedData) {
  const key = String(item.id || item.username);
  if (!dedupeMap.has(key)) {
    dedupeMap.set(key, item);
  }
}
assert(dedupeMap.size === 349, `Expected 349 total unique models merged, got ${dedupeMap.size}`);

console.log(`✅ All adult catalog unit tests passed! Verified ${dedupeMap.size} unique models across both datasets.`);
