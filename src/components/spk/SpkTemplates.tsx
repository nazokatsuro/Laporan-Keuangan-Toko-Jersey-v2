/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SPKTemplate, SPKData } from '../../spkTypes';
import { Layers, Plus, Check, Trash2, ArrowRight, Sparkles, Shirt } from 'lucide-react';

interface SpkTemplatesProps {
  templates: SPKTemplate[];
  currentSpk: SPKData;
  onApplyTemplate: (template: SPKTemplate) => void;
  onSaveAsTemplate: (name: string, description: string, category: string) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export const SpkTemplates: React.FC<SpkTemplatesProps> = ({
  templates,
  currentSpk,
  onApplyTemplate,
  onSaveAsTemplate,
  onDeleteTemplate
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [category, setCategory] = useState('Jersey');

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    onSaveAsTemplate(templateName.trim(), templateDesc.trim(), category);
    setTemplateName('');
    setTemplateDesc('');
    setShowSaveModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Sistem Template SPK
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gunakan template siap pakai untuk mempercepat pembuatan SPK jersey sepakbola, basket, jaket, atau buat template custom sendiri.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#00805F] hover:bg-[#006B50] text-white font-black text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Simpan SPK Saat Ini Sebagai Template</span>
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map(tmpl => (
          <div
            key={tmpl.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-500/50 transition-all group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#00805F] dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
                  {tmpl.category}
                </span>
                
                {tmpl.id.startsWith('custom-') && (
                  <button
                    type="button"
                    onClick={() => onDeleteTemplate(tmpl.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                    title="Hapus template custom"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm group-hover:text-[#00805F] dark:group-hover:text-emerald-400 transition-colors">
                  {tmpl.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                  {tmpl.description}
                </p>
              </div>

              {/* Template Specs Mini Preview */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3 text-[11px] space-y-1 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Model:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{tmpl.data.productModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kerah:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{tmpl.data.collarModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bahan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{tmpl.data.material}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jahitan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{tmpl.data.sewingModel}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => onApplyTemplate(tmpl)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-[#00805F] dark:hover:bg-[#00805F] text-white font-black text-xs transition-colors cursor-pointer"
              >
                <span>Gunakan Template Ini</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save Current as Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-[#00805F] dark:text-emerald-400 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  Simpan Template Baru
                </h2>
                <p className="text-xs text-slate-500">
                  Simpan format spesifikasi SPK aktif ke dalam daftar template
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveCurrent} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Template:
                </label>
                <input
                  type="text"
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Contoh: SPK Jersey Voli Printing"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold focus:outline-hidden"
                >
                  <option value="Jersey">Jersey / Setelan</option>
                  <option value="Jaket">Jaket / Hoodie</option>
                  <option value="Kaos">Kaos / T-Shirt</option>
                  <option value="Celana">Celana / Training</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Catatan Template:
                </label>
                <textarea
                  rows={3}
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Keterangan singkat tentang template ini..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white rounded-xl bg-[#00805F] hover:bg-[#006B50] shadow-sm"
                >
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
