/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { isValidHlsManifest } from '../parallel-probe.ts';
import { getLastWorkingStreamIndex, saveLastWorkingStreamIndex } from '../stream-preference.ts';
import { rewriteM3u8Content, validateTargetUrl } from '../../../server/proxy-utils.ts';
import { watchdogMs } from '../player-fallback.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Running Playback Enhancement & Security unit tests...');

// 1. SSRF & Localhost blocking (validateTargetUrl)
assert(!validateTargetUrl('http://localhost:8080/stream.m3u8').ok, 'Block localhost');
assert(!validateTargetUrl('http://127.0.0.1:3000/stream.m3u8').ok, 'Block 127.0.0.1');
assert(!validateTargetUrl('http://10.0.0.1/stream.m3u8').ok, 'Block 10.x private network');
assert(!validateTargetUrl('http://172.20.0.5/stream.m3u8').ok, 'Block 172.16-31 private network');
assert(!validateTargetUrl('http://192.168.1.100/stream.m3u8').ok, 'Block 192.168 private network');
assert(!validateTargetUrl('http://169.254.169.254/latest/meta-data').ok, 'Block 169.254 link-local / AWS metadata');
assert(!validateTargetUrl('ftp://example.com/stream.m3u8').ok, 'Block non-http protocols');
assert(validateTargetUrl('https://edge.broadcast.net/live/channel.m3u8').ok, 'Allow valid public HTTPS stream');
assert(validateTargetUrl('http://stream.cdn.iptv.com:8080/hls/live.m3u8').ok, 'Allow valid public HTTP stream');

// 2. Manifest rewriting (selective proxy for manifests & keys vs direct segments when CORS enabled)
const sampleM3u8 = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-KEY:METHOD=AES-128,URI="key.php"
#EXTINF:6.0,
segment1.ts
#EXTINF:6.0,
https://cdn.other.com/segment2.ts`;

// Case A: Origin allows CORS -> Keys proxied, segments direct
const rewrittenCors = rewriteM3u8Content(sampleM3u8, 'https://cdn.origin.com/live/playlist.m3u8', undefined, undefined, true);
assert(rewrittenCors.includes('URI="/api/stream-proxy?url='), 'Keys must always be proxied');
assert(rewrittenCors.includes('https://cdn.origin.com/live/segment1.ts'), 'Segments must remain direct when origin allows CORS');
assert(rewrittenCors.includes('https://cdn.other.com/segment2.ts'), 'Absolute segments must remain direct when origin allows CORS');

// Case B: Origin does NOT allow CORS -> All segments proxied
const rewrittenNoCors = rewriteM3u8Content(sampleM3u8, 'https://cdn.origin.com/live/playlist.m3u8', undefined, undefined, false);
assert(rewrittenNoCors.includes('/api/stream-proxy?url=' + encodeURIComponent('https://cdn.origin.com/live/segment1.ts')), 'Segments must be proxied when origin has no CORS');

// 3. Valid HLS manifest detection (isValidHlsManifest)
assert(isValidHlsManifest('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1280000\nlow.m3u8'), 'Detect #EXTM3U');
assert(isValidHlsManifest('  #EXTM3U\n#EXTINF:10.0\nseg1.ts'), 'Detect #EXTM3U with whitespace');
assert(isValidHlsManifest('#EXT-X-VERSION:4\n#EXTINF:10.0\nseg1.ts'), 'Detect #EXT-X-VERSION');
assert(!isValidHlsManifest('<html><body>404 Not Found</body></html>'), 'Reject HTML error page');
assert(!isValidHlsManifest('{"error": "Unauthorized"}'), 'Reject JSON error response');

// 4. Stream preference storage (getLastWorkingStreamIndex / saveLastWorkingStreamIndex)
const mockChannelId = 'test-channel-alpha';
assert(getLastWorkingStreamIndex(mockChannelId, 3) === 0, 'Default to index 0 when no prior history');

// 5. Watchdog ms verification
assert(watchdogMs(false, false) === 5000, 'Direct manifest timeout is 5s');
assert(watchdogMs(false, true) === 7000, 'Direct first fragment timeout is 7s');
assert(watchdogMs(true, false) === 9000, 'Proxy manifest timeout is 9s');
assert(watchdogMs(true, true) === 9000, 'Proxy fragment timeout is 9s');

console.log('✅ All Playback Enhancement & Security tests passed successfully!');
