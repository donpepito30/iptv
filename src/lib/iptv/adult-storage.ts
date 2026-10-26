/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ADULT_CONSENT_KEY = 'iptv:adult-consent-verified';
const ADULT_EVENT_NAME = 'iptv:adult-consent-changed';

/**
 * Checks if the user has confirmed they are 18+ and consented to view adult content.
 */
export function getAdultConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ADULT_CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets the adult consent flag in localStorage and dispatches a change event.
 */
export function setAdultConsent(consent: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (consent) {
      window.localStorage.setItem(ADULT_CONSENT_KEY, 'true');
    } else {
      window.localStorage.removeItem(ADULT_CONSENT_KEY);
    }
    window.dispatchEvent(new CustomEvent(ADULT_EVENT_NAME, { detail: { consent } }));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Revokes consent and locks the adult section again.
 */
export function revokeAdultConsent(): void {
  setAdultConsent(false);
}

/**
 * Subscribes to adult consent changes.
 */
export function subscribeAdultConsent(callback: (consent: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ consent: boolean }>;
    callback(custom.detail?.consent ?? getAdultConsent());
  };
  window.addEventListener(ADULT_EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(ADULT_EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}
