/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowLeft, Check, Lock, ShieldAlert } from 'lucide-react';
import React, { useState } from 'react';
import { setAdultConsent } from '../../lib/iptv/adult-storage.ts';

export interface AgeGateModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const [remember, setRemember] = useState(true);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (remember) {
      setAdultConsent(true);
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0f172a] border-2 border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/50 flex flex-col gap-6 text-slate-200">
        {/* Warning Icon Badge */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30 shrink-0">
            <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-black uppercase tracking-wider mb-1">
              <span>+18 Contenido Adulto</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Aviso de Mayoría de Edad
            </h2>
          </div>
        </div>

        {/* Warning Policy / Notice Details */}
        <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          <p>
            Esta sección contiene <strong>transmisiones en vivo clasificadas exclusivamente para mayores de 18 años</strong> (o la edad de mayoría legal aplicable en tu país).
          </p>
          <p className="text-slate-400 text-xs">
            El acceso es de carácter estrictamente privado, voluntario y restringido. Está terminantemente prohibido el acceso a menores de edad.
          </p>
          <div className="flex items-start gap-2.5 pt-1 text-slate-300 text-xs font-medium">
            <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              Al pulsar <strong>&ldquo;Soy mayor de 18 años — Entrar&rdquo;</strong>, certificas bajo tu propia responsabilidad legal que eres mayor de edad y que no vulneras las leyes de tu territorio.
            </span>
          </div>
        </div>

        {/* Remember choice toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-rose-400 focus:ring-offset-slate-900 cursor-pointer"
          />
          <span>Recordar mi confirmación en este navegador</span>
        </label>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al catálogo general</span>
          </button>

          <button
            type="button"
            onClick={handleAccept}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white text-xs font-black transition-all shadow-lg shadow-rose-600/30 hover:scale-[1.02] cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Soy mayor de 18 años — Entrar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
