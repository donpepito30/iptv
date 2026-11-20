/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const FAILS_PREFIX = 'iptv:stream-fails:';
const PENALTY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const PENALTY_THRESHOLD = 3;

interface FailureRecord {
  count: number;
  lastFailedAt: number;
}

/**
 * Returns the failure record for a given stream URL from localStorage.
 */
function getRecord(url: string): FailureRecord | null {
  if (typeof window === 'undefined' || !url) return null;
  try {
    const raw = window.localStorage.getItem(`${FAILS_PREFIX}${url}`);
    if (!raw) return null;
    return JSON.parse(raw) as FailureRecord;
  } catch {
    return null;
  }
}

/**
 * Records a real playback failure for a stream URL.
 */
export function recordStreamFailure(url: string): void {
  if (typeof window === 'undefined' || !url) return;
  try {
    const existing = getRecord(url);
    const count = (existing?.count || 0) + 1;
    const record: FailureRecord = {
      count,
      lastFailedAt: Date.now(),
    };
    window.localStorage.setItem(`${FAILS_PREFIX}${url}`, JSON.stringify(record));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Resets the consecutive failure counter when a stream plays smoothly.
 */
export function recordStreamSuccess(url: string): void {
  if (typeof window === 'undefined' || !url) return;
  try {
    window.localStorage.removeItem(`${FAILS_PREFIX}${url}`);
  } catch {
    // Ignore
  }
}

/**
 * Checks whether a stream is penalized due to 3 or more consecutive failures in the last 24h.
 */
export function isStreamPenalized(url: string): boolean {
  if (typeof window === 'undefined' || !url) return false;
  const record = getRecord(url);
  if (!record) return false;
  const isRecent = Date.now() - record.lastFailedAt < PENALTY_DURATION_MS;
  return record.count >= PENALTY_THRESHOLD && isRecent;
}

/**
 * Returns the consecutive failure count for testing / debugging.
 */
export function getStreamFailureCount(url: string): number {
  const record = getRecord(url);
  return record?.count || 0;
}
