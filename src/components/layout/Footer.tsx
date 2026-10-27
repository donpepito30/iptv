/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface FooterProps {
  onOpenShortcuts: () => void;
  onOpenCustomModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenShortcuts, onOpenCustomModal }) => {
  return (
    <footer className="mt-auto border-t border-[#1e293b] py-6 text-center text-xs text-[#94a3b8]">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© {new Date().getFullYear()} IPTV Studio Hub · Canales en vivo de iptv-org</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Atajos de teclado (?)
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onOpenCustomModal}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Añadir stream propio
          </button>
        </div>
      </div>
    </footer>
  );
};
