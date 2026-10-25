/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { detectErrorKind, classifyError, ErrorKind } from './player-fallback.ts';

export async function loadShakaDash(
  video: HTMLVideoElement,
  url: string,
  onFatal: (kind: ErrorKind, msg: string) => void
): Promise<any | null> {
  try {
    const shakaModule = await import('shaka-player');
    const shaka = (shakaModule.default || shakaModule) as any;
    shaka.polyfill.installAll();

    if (!shaka.Player.isBrowserSupported()) {
      return null;
    }

    const player = new shaka.Player();
    await player.attach(video);

    player.addEventListener('error', (event: any) => {
      const kind = detectErrorKind(event.detail, url);
      onFatal(kind, classifyError(kind, event.detail?.message));
    });

    await player.load(url);
    return player;
  } catch (err) {
    console.warn('[shaka-loader] Failed to load DASH stream:', err);
    return null;
  }
}
