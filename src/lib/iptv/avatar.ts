/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const AVATAR_GRADIENTS = [
  'from-emerald-600 to-teal-500',
  'from-blue-600 to-cyan-500',
  'from-violet-600 to-purple-500',
  'from-rose-600 to-pink-500',
  'from-amber-600 to-orange-500',
  'from-indigo-600 to-sky-500',
  'from-fuchsia-600 to-pink-500',
  'from-teal-600 to-emerald-500',
  'from-cyan-600 to-blue-500',
  'from-red-600 to-rose-500',
];

/**
 * Generates deterministic initials and gradient from a channel name.
 */
export function getChannelAvatar(name: string): { initials: string; gradient: string } {
  if (!name) return { initials: 'TV', gradient: AVATAR_GRADIENTS[0] };

  // Calculate simple hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  const gradient = AVATAR_GRADIENTS[index];

  // Extract initials
  const words = name.trim().split(/\s+/).filter(Boolean);
  let initials = 'TV';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    initials = words[0].slice(0, 2).toUpperCase();
  }

  return { initials, gradient };
}
