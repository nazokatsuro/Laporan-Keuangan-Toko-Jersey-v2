/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, X, ArrowRight } from 'lucide-react';

interface SpkValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  issues: { type: 'error' | 'warning'; message: string; field?: string }[];
  actionTitle?: string;
}

export const SpkValidationModal: React.FC<SpkValidationModalProps> = ({
  isOpen,
  onClose,
  onProceed,
  issues,
  actionTitle = 'Export / Cetak'
}) => {
  if (!isOpen) return null;

  const errors = issues.filter(i => i.type === 'error');
  const warnings = issues.filter(i => i.type === 'warning');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center border ${
              errors.length > 0
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              {errors.length > 0 ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                CHECK DATA SEBELUM PRODUKSI
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pemeriksaan kelengkapan dan validasi data order SPK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Issues list */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {errors.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                🔴 Kesalahan Data Kritis ({errors.length}):
              </span>
              <div className="space-y-1.5">
                {errors.map((err, idx) => (
                  <div key={idx} className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-2.5 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-bold flex items-start gap-2">
                    <span className="shrink-0">•</span>
                    <span>{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                ⚠️ Catatan / Peringatan ({warnings.length}):
              </span>
              <div className="space-y-1.5">
                {warnings.map((warn, idx) => (
                  <div key={idx} className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-2.5 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
                    <span className="shrink-0">•</span>
                    <span>{warn.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {issues.length === 0 && (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
              <p className="font-black text-sm text-slate-900 dark:text-white">Semua Data Lengkap & Valid!</p>
              <p className="text-xs text-slate-500 mt-1">Tidak ditemukan duplikasi nomor atau kolom kosong.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Perbaiki Data
          </button>

          <button
            type="button"
            onClick={() => {
              onProceed();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#00805F] hover:bg-[#006B50] text-white font-black text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>Tetap Lanjutkan {actionTitle}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
