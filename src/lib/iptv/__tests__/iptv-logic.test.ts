/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getQualityRank } from '../catalog.ts';
import { IPTV_ORG_CATEGORY_MAP, normalizeText, resolveChannelCategories } from '../categories.ts';
import { filterCatalogChannels } from '../channel-filters.ts';
import { CURATED_CHANNELS } from '../curated.ts';
import { getCurrentProgram } from '../epg.ts';
import {
  extractUniqueCategories,
  extractUniqueCountries,
  filterChannels,
  getFallbackCountryFlag,
  getStreamQualityLabel,
  matchesQuery,
} from '../filter.ts';
import { fuzzySearchChannels, isFuzzySubsequence, scoreFieldMatch } from '../fuzzy-search.ts';
import { t, translate } from '../i18n.ts';
import { classifyError, nextFallback, watchdogMs } from '../player-fallback.ts';
import { sortChannels } from '../sort.ts';
import { orderStreamsByHealth } from '../stream-strategy.ts';
import { FilterCriteria } from '../types.ts';
import { calculateRecommendations } from '../useRecommendations.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Running IPTV pure logic unit tests...');

// Test 1: getFallbackCountryFlag
assert(getFallbackCountryFlag('ES') === '🇪🇸', 'ES flag should match 🇪🇸');
assert(getFallbackCountryFlag('US') === '🇺🇸', 'US flag should match 🇺🇸');
assert(getFallbackCountryFlag('') === '🌐', 'Empty country should return globe');

// Test 2: getStreamQualityLabel
assert(getStreamQualityLabel({ url: '', channel: '', quality: '1080p' }) === '1080p', 'Quality label override');
assert(getStreamQualityLabel({ url: '', channel: '', height: 720 }) === '720p', 'Height 720 should be 720p');

// Test 3: matchesQuery
const sample = CURATED_CHANNELS[0];
assert(matchesQuery(sample, '3Cat') || matchesQuery(sample, 'Canal'), 'Should match channel name');
assert(matchesQuery(sample, 'news'), 'Should match news category');

// Test 4: filterChannels
const allCriteria: FilterCriteria = {
  search: '',
  country: 'ALL',
  category: 'ALL',
  language: 'ALL',
  onlyWithLogo: false,
  onlyFavorites: false,
};
const allResult = filterChannels(CURATED_CHANNELS, allCriteria, new Set());
assert(allResult.length === CURATED_CHANNELS.length, 'Should return all channels');

// Test 5: sortChannels
const sortedAsc = sortChannels(CURATED_CHANNELS, 'name-asc');
assert(sortedAsc[0].name <= sortedAsc[1].name, 'Ascending sort check');

// Test 6: getQualityRank ordering
assert(getQualityRank('4K') < getQualityRank('1080p'), '4K before 1080p');
assert(getQualityRank('1080p') < getQualityRank('720p'), '1080p before 720p');

// Test 7: normalizeText & IPTV_ORG_CATEGORY_MAP
assert(normalizeText('¡Fútbol Español!') === 'futbol espanol', 'normalizeText accents');
assert(IPTV_ORG_CATEGORY_MAP['weather'] === 'news', 'weather -> news');
assert(IPTV_ORG_CATEGORY_MAP['cooking'] === 'lifestyle', 'cooking -> lifestyle');

// Test 8: resolveChannelCategories
const sportsResult = resolveChannelCategories({ id: 'espn', name: 'ESPN Fútbol Total', country: 'AR', categories: ['sports'] }, []);
assert(sportsResult.primary_category === 'sports', 'Resolve sports');
assert(sportsResult.subcategory === 'Fútbol', 'Subcategory Fútbol');

// Test 9: filterCatalogChannels
const testChannels = [
  { id: 'ch-1', name: 'Teledeporte', country: 'ES', country_name: 'España', country_flag: '🇪🇸', region: 'Europe', primary_category: 'sports', categories: ['sports'], streams: [{ url: 'https://test/1.m3u8', quality: '1080p' }], best_quality: '1080p' },
  { id: 'ch-2', name: '24 Horas Noticias', country: 'ES', country_name: 'España', country_flag: '🇪🇸', region: 'Europe', primary_category: 'news', categories: ['news'], streams: [{ url: 'https://test/2.m3u8', quality: '720p' }], best_quality: '720p' },
  { id: 'ch-3', name: 'CNN USA', country: 'US', country_name: 'Estados Unidos', country_flag: '🇺🇸', region: 'Americas', primary_category: 'news', categories: ['news'], streams: [{ url: 'https://test/3.m3u8', quality: '480p' }], best_quality: '480p' },
];
assert(filterCatalogChannels(testChannels, { search: '', country: 'ALL', region: 'Europe', category: 'ALL', minQuality: 'ALL', onlyFavorites: false, onlyLive: false }).length === 2, 'Region filter');
assert(filterCatalogChannels(testChannels, { search: '', country: 'ALL', region: 'ALL', category: 'ALL', minQuality: '1080p', onlyFavorites: false, onlyLive: false }).length === 1, 'Min quality 1080p');

// Test 10: player fallback & stream ordering
assert(watchdogMs(false) === 8000, 'watchdogMs 8000ms');
assert(nextFallback(0, 3, 5) === 'next_stream', 'next stream');
assert(nextFallback(4, 10, 5) === 'give_up', 'give up after 5');
assert(classifyError('timeout').includes('Tiempo de espera'), 'timeout msg');

const testStreams = [
  { url: 'https://test/dead.m3u8', status: 'dead' },
  { url: 'https://test/live.m3u8', status: 'live' },
  { url: 'https://test/degraded.m3u8', status: 'degraded' },
];
const orderedStreams = orderStreamsByHealth(testStreams);
assert(orderedStreams[0].status === 'live', 'Live first');

// Test 11: fuzzy search scoring (+1000 startsWith, +500 contains, +50 fuzzy)
assert(scoreFieldMatch('Teledeporte', 'tele') === 1000, 'Prefix score +1000');
assert(scoreFieldMatch('RTVE Teledeporte', 'tele') === 500, 'Contains score +500');
assert(isFuzzySubsequence('teledeporte', 'tldp'), 'Subsequence match');
assert(scoreFieldMatch('Teledeporte', 'tldp') === 50, 'Fuzzy score +50');
assert(scoreFieldMatch('Teledeporte', 'xyz') === 0, 'No match score 0');

const searchResults = fuzzySearchChannels(testChannels, 'noticias', 30);
assert(searchResults.length === 1 && searchResults[0].id === 'ch-2', 'Fuzzy search finds 24 Horas Noticias');

// Test 12: Simulated EPG
const epgProg = getCurrentProgram(testChannels[0], new Date());
assert(epgProg.title.length > 0, 'EPG title exists');
assert(epgProg.timeSlot.includes(':'), 'EPG timeslot formatted');
assert(epgProg.progress >= 0 && epgProg.progress <= 100, 'EPG progress percentage valid');

// Test 13: calculateRecommendations (affine channels)
const recs = calculateRecommendations(testChannels, ['ch-1'], 12);
assert(recs.recommended.length > 0, 'Recommendations should return channels');
assert(recs.stats.topCategories.includes('sports'), 'Top category should be sports');
assert(recs.stats.topCountries.includes('ES'), 'Top country should be ES');

// Test 14: i18n translate and params interpolation
assert(translate('es', 'navHome') === 'Inicio', 'ES translation');
assert(translate('en', 'navHome') === 'Home', 'EN translation');
assert(translate('pt', 'navHome') === 'Início', 'PT translation');
assert(t('es', 'channelsFound') === 'canales encontrados', 't shortcut');

// Test 15: Stream Proxy & Relay URL generation
import { getProxiedStreamUrl, isProxiedStreamUrl } from '../stream-proxy.ts';
const rawStreamUrl = 'http://edge.broadcast.net/live/channel.m3u8';
const proxiedUrl = getProxiedStreamUrl(rawStreamUrl);
assert(isProxiedStreamUrl(proxiedUrl), 'isProxiedStreamUrl must return true for proxied url');
assert(proxiedUrl.includes(encodeURIComponent(rawStreamUrl)), 'Proxied url must encode target stream');

console.log('✅ All IPTV pure logic unit tests passed successfully!');
