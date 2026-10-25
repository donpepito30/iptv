/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Keyboard, X } from 'lucide-react';
import React from 'react';
import { t } from '../../lib/iptv/i18n.ts';
import { AppLanguage } from '../../lib/iptv/types.ts';

export interface ShortcutsModalProps {
  isOpen: boolean;
  language: AppLanguage;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  language,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: t('shortcutsSpace', language) },
    { key: 'M', desc: t('shortcutsM', language) },
    { key: 'F', desc: t('shortcutsF', language) },
    { key: '↑ / ↓', desc: 'Ajustar volumen (10%)' },
    { key: '← / →', desc: 'Canal anterior / Canal siguiente' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-[#111c2f] border border-[#1e293b] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
          <div className="flex items-center gap-2 text-emerald-400">
            <Keyboard className="w-5 h-5" />
            <h3 className="text-sm font-bold text-[#e2e8f0]">
              {t('keyboardShortcuts', language)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 mt-4">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-1.5 px-2 rounded-xl bg-slate-900/60 border border-slate-800"
            >
              <span className="text-xs text-[#94a3b8]">{s.desc}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono font-semibold bg-slate-800 text-slate-200 border border-slate-700 rounded-md shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
