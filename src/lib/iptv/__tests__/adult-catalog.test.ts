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

console.log('Running adult catalog unit tests...');

// Test 1: normalizeAdultModel with basic raw object
const sampleRaw: AdultModelRaw = {
  id: 97970164,
  username: 'alicee16',
  displayName: 'Alice Star',
  avatarUrl: 'https://static-proxy.strpst.com/avatars/test.jpg',
  snapshotUrl: 'https://img.doppiocdn.com/thumbs/test.jpg',
  streamUrl: 'https://edge-hls.saawsedge.com/hls/97970164/master/97970164_480p.m3u8',
  viewersCount: 828,
  modelsCountry: 'co',
  languages: ['es'],
  broadcastHD: true,
  isLive: true,
  age: 18,
};

const normalized = normalizeAdultModel(sampleRaw);
assert(normalized.id === 97970164, 'Model ID should be preserved');
assert(normalized.channelId === 'adult-97970164', 'Channel ID should have adult- prefix');
assert(normalized.countryCode === 'CO', 'Country code should be uppercase');
assert(normalized.countryName === 'Colombia', 'Country name should resolve to Colombia');
assert(normalized.isHD === true, 'isHD should be true');
assert(normalized.viewersCount === 828, 'viewers count matches');

// Test 2: transformModelToCatalogChannel
const catalogChannel = transformModelToCatalogChannel(normalized);
assert(catalogChannel.id === 'adult-97970164', 'Catalog channel ID matches');
assert(catalogChannel.primary_category === 'adult', 'Primary category should be adult');
assert(catalogChannel.categories.includes('adult'), 'Categories includes adult');
assert(catalogChannel.streams.length === 1, 'Stream attached');
assert(catalogChannel.streams[0].url === sampleRaw.streamUrl, 'Stream URL preserved');
assert(catalogChannel.primaryStreamUrl === sampleRaw.streamUrl, 'Primary stream URL matches');

// Test 3: Load attached JSON file and verify all 50 models
const jsonPath = path.resolve('public/assets/aistudio/2redex69_50_modelos_variadas_2026-10-26_6eec6bcf.json');
assert(fs.existsSync(jsonPath), 'JSON attachment file must exist');

const fileContent = fs.readFileSync(jsonPath, 'utf-8');
const parsedData: AdultModelRaw[] = JSON.parse(fileContent);
assert(Array.isArray(parsedData), 'Data must be an array');
assert(parsedData.length === 50, `Expected 50 models, got ${parsedData.length}`);

let verifiedCount = 0;
for (const item of parsedData) {
  const norm = normalizeAdultModel(item);
  assert(norm.id > 0, `Model id must be positive: ${norm.id}`);
  assert(norm.displayName.length > 0, `Display name must not be empty`);
  assert(norm.streamUrl.startsWith('http'), `Stream URL must be valid: ${norm.streamUrl}`);
  verifiedCount++;
}
assert(verifiedCount === 50, 'All 50 models normalized successfully');

console.log('✅ All adult catalog unit tests passed successfully!');
