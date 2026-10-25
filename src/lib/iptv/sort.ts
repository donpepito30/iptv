/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChannelWithStream, SortOption } from './types.ts';

/**
 * Pure function to sort channels without mutating the original array.
 */
export function sortChannels(
  channels: ChannelWithStream[],
  sortBy: SortOption,
  favoriteIds?: Set<string>
): ChannelWithStream[] {
  const copy = [...channels];

  return copy.sort((a, b) => {
    // If favoriteIds is provided, put favorites higher in popular/general views
    if (favoriteIds) {
      const aFav = favoriteIds.has(a.id);
      const bFav = favoriteIds.has(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
    }

    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

      case 'name-desc':
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });

      case 'country': {
        const countryA = a.countryName || a.country || '';
        const countryB = b.countryName || b.country || '';
        const cmp = countryA.localeCompare(countryB);
        return cmp !== 0 ? cmp : a.name.localeCompare(b.name);
      }

      case 'popular':
      default: {
        // Prioritize channels with logos and active streams
        const aHasLogo = a.logo ? 1 : 0;
        const bHasLogo = b.logo ? 1 : 0;
        if (aHasLogo !== bHasLogo) return bHasLogo - aHasLogo;

        const aStreams = a.streams.length;
        const bStreams = b.streams.length;
        if (aStreams !== bStreams) return bStreams - aStreams;

        return a.name.localeCompare(b.name);
      }
    }
  });
}
