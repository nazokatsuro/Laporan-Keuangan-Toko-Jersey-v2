/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SPKData } from '../../spkTypes';
import { 
  PlusCircle, 
  FileText, 
  Layers, 
  Settings as SettingsIcon, 
  Flame, 
  CheckCircle2, 
  Shirt, 
  Clock, 
  Printer, 
  Eye, 
  Copy, 
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';

interface SpkDashboardProps {
  spkList: SPKData[];
  onNavigate: (tab: 'dashboard' | 'editor' | 'database' | 'templates' | 'settings') => void;
  onOpenSpk: (spk: SPKData) => void;
  onDuplicateSpk: (spk: SPKData) => void;
  onNewSpk: () => void;
  onFullscreenPreview: (spk: SPKData) => void;
}

export const SpkDashboard: React.FC<SpkDashboardProps> = ({
  spkList,
  onNavigate,
  onOpenSpk,
  onDuplicateSpk,
  onNewSpk,
  onFullscreenPreview
}) => {
  const totalSpk = spkList.length;
  const urgentCount = spkList.filter(s => s.status === 'URGENT').length;
  const activeSpk = spkList.filter(s => s.status !== 'SELESAI').length;
  const totalPcs = spkList.reduce((sum, s) => sum + (s.players?.length || 0), 0);

  const recentSpk = spkList.slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Hero Header */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#006B50] via-[#00805F] to-emerald-700 text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative vector patterns */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-6 pointer-events-none">
          <Shirt className="h-64 w-64 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-white text-[11px] font-black tracking-wider uppercase border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Sistem Otomasi SPK Konveksi & Jersey</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Nomaden Apparel — SPK Generator
          </h1>
          
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-medium">
            Generator & Editor Surat Perintah Kerja (SPK) produksi jersey 1 Halaman A4 portrait otomatis. Dilengkapi fitur paste data mentah, auto rekap ukuran, dan preview realtime WYSIWYG.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onNewSpk}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#006B50] font-black text-xs hover:bg-emerald-50 transition-all shadow-md cursor-pointer transform active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ BUAT SPK BARU</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('database')}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold text-xs border border-emerald-500/40 transition-all cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>Daftar SPK ({totalSpk})</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('templates')}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold text-xs border border-emerald-500/40 transition-all cursor-pointer"
            >
              <Layers className="h-4 w-4" />
              <span>Template</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-800/60 hover:bg-emerald-800 text-white font-bold text-xs border border-emerald-500/40 transition-all cursor-pointer"
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Pengaturan Identitas</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: TOTAL SPK */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block">TOTAL SPK</span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 leading-none">
              {totalSpk}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Dokumen tersimpan</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: SPK AKTIF */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block">SPK AKTIF</span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 leading-none">
              {activeSpk}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Dalam produksi</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: URGENT */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block">URGENT</span>
            <p className="text-2xl sm:text-3xl font-black text-[#F05B83] mt-1 leading-none">
              {urgentCount}
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Prioritas tinggi</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-[#F05B83] flex items-center justify-center border border-rose-500/20">
            <Flame className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: TOTAL PESANAN (PCS) */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase block">TOTAL PESANAN</span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 leading-none">
              {totalPcs} <span className="text-sm font-bold text-slate-400">PCS</span>
            </p>
            <span className="text-[11px] text-slate-500 mt-1 block">Total jersey di roster</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Shirt className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Recent SPK List */}
      <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
              SPK Terbaru
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumen Surat Perintah Kerja yang baru saja dibuat atau diedit
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('database')}
            className="text-xs font-bold text-[#00805F] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua SPK</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-black">
              <tr>
                <th className="py-3 px-4">NO SPK</th>
                <th className="py-3 px-4">KONSUMEN</th>
                <th className="py-3 px-4">PO / TIM</th>
                <th className="py-3 px-4 text-center">QTY</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4">DEADLINE</th>
                <th className="py-3 px-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
              {recentSpk.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-4 font-black font-mono text-slate-900 dark:text-white">
                    {item.spkNumber}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 uppercase">
                    {item.customer || '-'}
                  </td>
                  <td className="py-3 px-4 font-black text-[#00805F] dark:text-emerald-400">
                    {item.poName || '-'}
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                      {item.players?.length || 0} PCS
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      item.status === 'URGENT' ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' :
                      item.status === 'PRIORITAS' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' :
                      item.status === 'SELESAI' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' :
                      'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-bold">
                    {item.deadline || '-'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onFullscreenPreview(item)}
                        title="Preview Cetak A4"
                        className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateSpk(item)}
                        title="Gandakan (Duplicate) SPK"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenSpk(item)}
                        className="px-3 py-1.5 rounded-xl bg-[#00805F] hover:bg-[#006B50] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                      >
                        Edit SPK
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {recentSpk.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    Belum ada data SPK tersimpan. Klik "+ Buat SPK Baru" untuk memulai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
