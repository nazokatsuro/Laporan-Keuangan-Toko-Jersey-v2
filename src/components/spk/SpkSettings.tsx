/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SPKCompanySettings } from '../../spkTypes';
import { 
  Building2, 
  Upload, 
  Palette, 
  Save, 
  RotateCcw, 
  Download, 
  FolderUp, 
  Check, 
  Sparkles,
  Phone,
  Instagram,
  MapPin,
  Globe,
  Mail
} from 'lucide-react';
import { DEFAULT_COMPANY_SETTINGS } from '../../spkSampleData';

interface SpkSettingsProps {
  settings: SPKCompanySettings;
  onSaveSettings: (settings: SPKCompanySettings) => void;
  onExportAllData: () => void;
  onImportAllData: (jsonData: string) => void;
}

export const SpkSettings: React.FC<SpkSettingsProps> = ({
  settings,
  onSaveSettings,
  onExportAllData,
  onImportAllData
}) => {
  const [formData, setFormData] = useState<SPKCompanySettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (field: keyof SPKCompanySettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleChange('logoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          onImportAllData(reader.result as string);
          alert('Data berhasil di-restore!');
        } catch (err: any) {
          alert(`Gagal membaca file backup: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan identitas ke default Nomaden Apparel?')) {
      setFormData(DEFAULT_COMPANY_SETTINGS);
      onSaveSettings(DEFAULT_COMPANY_SETTINGS);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Pengaturan Identitas & Konfigurasi SPK
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sesuaikan kop surat, logo apparel, kontak, dan palet warna dokumen SPK
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Default</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Company Identity Box */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#00805F]" />
            <span>Identitas Perusahaan / Konveksi</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Apparel / Konveksi:
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Slogan / Tagline:
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3 text-emerald-500" /> WhatsApp:
              </label>
              <input
                type="text"
                value={formData.wa}
                onChange={(e) => handleChange('wa', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Instagram className="h-3 w-3 text-pink-500" /> Instagram:
              </label>
              <input
                type="text"
                value={formData.ig}
                onChange={(e) => handleChange('ig', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-rose-500" /> Alamat Lengkap:
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Logo Upload */}
            <div className="md:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
              <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 shrink-0">
                {formData.logoUrl ? (
                  <img src={formData.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-xl font-black italic text-[#00805F]">N</div>
                )}
              </div>
              
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Logo Apparel (PNG / SVG Transparan)</span>
                <p className="text-[11px] text-slate-500">Logo akan tampil di bagian kiri atas kop SPK.</p>
                <div className="flex items-center gap-2 pt-1">
                  <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Logo Baru</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange('logoUrl', '')}
                      className="text-xs text-rose-500 hover:underline font-bold"
                    >
                      Hapus Logo (Gunakan Icon N)
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Brand Theme Colors */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Palette className="h-4 w-4 text-indigo-500" />
            <span>Warna Dokumen SPK</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Warna Utama (Primary):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primaryColor || '#00805F'}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300"
                />
                <span className="text-xs font-mono font-bold">{formData.primaryColor || '#00805F'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Warna Header Tabel (Dark):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.darkColor || '#006B50'}
                  onChange={(e) => handleChange('darkColor', e.target.value)}
                  className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300"
                />
                <span className="text-xs font-mono font-bold">{formData.darkColor || '#006B50'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Warna Urgent:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.urgentColor || '#F05B83'}
                  onChange={(e) => handleChange('urgentColor', e.target.value)}
                  className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300"
                />
                <span className="text-xs font-mono font-bold">{formData.urgentColor || '#F05B83'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Warna Peringatan (Warning):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.warningColor || '#F59E0B'}
                  onChange={(e) => handleChange('warningColor', e.target.value)}
                  className="h-8 w-8 rounded-lg cursor-pointer border border-slate-300"
                />
                <span className="text-xs font-mono font-bold">{formData.warningColor || '#F59E0B'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Backup & Restore Data */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Backup & Restore Database SPK</span>
          </h2>
          <p className="text-xs text-slate-500">
            Ekspor seluruh daftar SPK, template, dan pengaturan ke file JSON agar dapat disimpan atau dipindahkan ke komputer lain.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onExportAllData}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Backup Seluruh Data (JSON)</span>
            </button>

            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer">
              <FolderUp className="h-4 w-4 text-indigo-500" />
              <span>Restore dari File Backup</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="h-4 w-4" /> Pengaturan berhasil disimpan!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#00805F] hover:bg-[#006B50] text-white font-black text-xs shadow-md transition-all cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Simpan Perubahan Pengaturan</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};
