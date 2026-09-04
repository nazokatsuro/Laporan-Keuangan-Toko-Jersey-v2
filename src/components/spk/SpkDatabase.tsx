/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SPKData } from '../../spkTypes';
import { exportSpkPdf, exportSpkImage, generateDirectVectorPdf, printSpkDocument } from '../../utils/spkExport';
import { SpkSheetA4 } from './SpkSheetA4';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Eye, 
  Edit3, 
  Copy, 
  Printer, 
  FileDown, 
  Trash2, 
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Flame,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface SpkDatabaseProps {
  spkList: SPKData[];
  onOpenSpk: (spk: SPKData) => void;
  onDuplicateSpk: (spk: SPKData) => void;
  onDeleteSpk: (id: string) => void;
  onNewSpk: () => void;
  onFullscreenPreview: (spk: SPKData) => void;
}

export const SpkDatabase: React.FC<SpkDatabaseProps> = ({
  spkList,
  onOpenSpk,
  onDuplicateSpk,
  onDeleteSpk,
  onNewSpk,
  onFullscreenPreview
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedSpkForExport, setSelectedSpkForExport] = useState<SPKData | null>(null);

  const handleQuickDownloadPdf = async (item: SPKData) => {
    try {
      setDownloadingId(`pdf-${item.id}`);
      setSelectedSpkForExport(item);
      // Allow DOM to render hidden sheet
      await new Promise(r => setTimeout(r, 100));
      await exportSpkPdf(`spk-db-hidden-sheet-${item.id}`, item);
    } catch (err) {
      console.warn('Fallback to vector PDF', err);
      generateDirectVectorPdf(item);
    } finally {
      setDownloadingId(null);
      setSelectedSpkForExport(null);
    }
  };

  const handleQuickDownloadImage = async (item: SPKData) => {
    try {
      setDownloadingId(`img-${item.id}`);
      setSelectedSpkForExport(item);
      // Allow DOM to render hidden sheet
      await new Promise(r => setTimeout(r, 100));
      await exportSpkImage(`spk-db-hidden-sheet-${item.id}`, item, 'png');
    } catch (err: any) {
      alert(`Gagal mengunduh gambar: ${err.message}`);
    } finally {
      setDownloadingId(null);
      setSelectedSpkForExport(null);
    }
  };

  const filteredList = useMemo(() => {
    return spkList.filter(item => {
      const matchSearch = 
        item.spkNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.poName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.collarModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [spkList, searchTerm, statusFilter]);

  const handleDelete = (item: SPKData) => {
    if (window.confirm(`Yakin ingin menghapus dokumen SPK "${item.spkNumber} - ${item.poName}"? Data yang terhapus tidak dapat dikembalikan.`)) {
      onDeleteSpk(item.id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Database Surat Perintah Kerja (SPK)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daftar seluruh arsip SPK konveksi dan jersey yang tersimpan ({spkList.length} dokumen)
          </p>
        </div>

        <button
          type="button"
          onClick={onNewSpk}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#00805F] hover:bg-[#006B50] text-white font-black text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>+ Buat SPK Baru</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nomor SPK, nama konsumen, nama PO/tim, bahan..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-44 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-hidden"
          >
            <option value="ALL">Semua Status</option>
            <option value="NORMAL">Normal</option>
            <option value="PRIORITAS">Prioritas</option>
            <option value="URGENT">Urgent</option>
            <option value="SELESAI">Selesai</option>
            <option value="HOLD">Hold</option>
          </select>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-black border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3.5 px-4">NO SPK</th>
                <th className="py-3.5 px-4">KONSUMEN</th>
                <th className="py-3.5 px-4">PO / TIM</th>
                <th className="py-3.5 px-4 text-center">QTY</th>
                <th className="py-3.5 px-4">BAHAN & MODEL</th>
                <th className="py-3.5 px-4 text-center">STATUS</th>
                <th className="py-3.5 px-4">DEADLINE</th>
                <th className="py-3.5 px-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
              {filteredList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                  
                  {/* NO SPK */}
                  <td className="py-3.5 px-4 font-black font-mono text-slate-900 dark:text-white">
                    {item.spkNumber}
                  </td>

                  {/* KONSUMEN */}
                  <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-200 uppercase">
                    {item.customer || '-'}
                  </td>

                  {/* PO */}
                  <td className="py-3.5 px-4 font-black text-[#00805F] dark:text-emerald-400">
                    {item.poName || '-'}
                  </td>

                  {/* QTY */}
                  <td className="py-3.5 px-4 text-center font-bold">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#00805F] dark:text-emerald-300 font-extrabold">
                      {item.players?.length || 0} PCS
                    </span>
                  </td>

                  {/* BAHAN & MODEL */}
                  <td className="py-3.5 px-4 text-[11px] text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-200">{item.material || '-'}</span>
                      <span className="text-slate-400"> • </span>
                      <span>{item.collarModel || '-'}</span>
                    </div>
                  </td>

                  {/* STATUS */}
                  <td className="py-3.5 px-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      item.status === 'URGENT' ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900' :
                      item.status === 'PRIORITAS' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900' :
                      item.status === 'SELESAI' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' :
                      item.status === 'HOLD' ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' :
                      'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}>
                      {item.status}
                    </span>
                  </td>

                  {/* DEADLINE */}
                  <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-black">
                    {item.deadline || '-'}
                  </td>

                  {/* ACTIONS */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Unduh PDF Direct */}
                      <button
                        type="button"
                        onClick={() => handleQuickDownloadPdf(item)}
                        disabled={downloadingId === `pdf-${item.id}`}
                        title="Unduh SPK (PDF)"
                        className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        {downloadingId === `pdf-${item.id}` ? (
                          <RotateCcw className="h-4 w-4 animate-spin text-indigo-600" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                      </button>

                      {/* Unduh Gambar PNG */}
                      <button
                        type="button"
                        onClick={() => handleQuickDownloadImage(item)}
                        disabled={downloadingId === `img-${item.id}`}
                        title="Unduh SPK (Gambar PNG)"
                        className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                      >
                        {downloadingId === `img-${item.id}` ? (
                          <RotateCcw className="h-4 w-4 animate-spin text-emerald-600" />
                        ) : (
                          <ImageIcon className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onFullscreenPreview(item)}
                        title="Lihat Pratinjau A4"
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
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        title="Hapus SPK"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    Tidak ditemukan data SPK yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Offscreen Container for Background Exports */}
      {selectedSpkForExport && (
        <div style={{ position: 'fixed', left: '-99999px', top: '0', opacity: 0, pointerEvents: 'none' }}>
          <SpkSheetA4
            elementId={`spk-db-hidden-sheet-${selectedSpkForExport.id}`}
            data={selectedSpkForExport}
          />
        </div>
      )}

    </div>
  );
};
