/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Returns progressive reconnect delay: 1s (attempt 1), 3s (attempt 2), 6s (attempt 3).
 */
export function getReconnectDelayMs(attempt: number): number {
  if (attempt <= 1) return 1000;
  if (attempt === 2) return 3000;
  return 6000;
}

/**
 * Checks if browser environment is currently online.
 */
export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}
