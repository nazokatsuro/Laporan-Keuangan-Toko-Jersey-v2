/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SPKData } from '../../spkTypes';
import { SpkSheetA4 } from './SpkSheetA4';
import { exportSpkPdf, exportSpkImage, printSpkDocument } from '../../utils/spkExport';
import { 
  X, 
  Printer, 
  FileDown, 
  Image as ImageIcon, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Loader2,
  CheckCircle,
  Eye,
  Layers
} from 'lucide-react';

interface SpkFullscreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SPKData;
}

export const SpkFullscreenModal: React.FC<SpkFullscreenModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const [scale, setScale] = useState<number>(0.95);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [activePageTab, setActivePageTab] = useState<'all' | string>('all');

  const totalPlayers = data.players?.length || 0;
  const rawMaxPage1 = data.layout?.maxPlayersPerPage;
  const maxPage1Rows = typeof rawMaxPage1 === 'number' && rawMaxPage1 >= 20 ? rawMaxPage1 : 50;

  const rawContinuation = data.layout?.continuationPageSize;
  const continuationPageSize = typeof rawContinuation === 'number' && rawContinuation >= 20 ? rawContinuation : 50;

  const totalPages = useMemo(() => {
    if (data.layout?.pageMode === '1page') return 1;
    if (totalPlayers <= maxPage1Rows) return 1;
    if (data.layout?.pageMode === '2page') return 2;
    return 1 + Math.ceil((totalPlayers - maxPage1Rows) / continuationPageSize);
  }, [totalPlayers, maxPage1Rows, continuationPageSize, data.layout?.pageMode]);

  if (!isOpen) return null;

  const handlePrint = () => {
    printSpkDocument();
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('PDF');
      await exportSpkPdf('spk-fullscreen-a4-document', data);
    } catch (err: any) {
      alert(`Gagal mengekspor PDF: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportImage = async (format: 'png' | 'jpeg') => {
    try {
      setIsExporting(format.toUpperCase());
      await exportSpkImage('spk-fullscreen-a4-document', data, format);
    } catch (err: any) {
      alert(`Gagal mengekspor Gambar: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md animate-fadeIn select-none">
      
      {/* Top Floating Pro Toolbar */}
      <div className="h-16 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10 shrink-0">
        
        {/* Document Info */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/30">
            A4
          </div>
          <div>
            <h2 className="text-sm font-black text-white leading-tight flex items-center gap-2">
              <span>{data.spkNumber || 'SPK-2026-006'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-bold">{data.poName || 'SOLIDARITAS'}</span>
            </h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Dokumen SPK {totalPages} Halaman A4</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-semibold">{totalPlayers} Pemain</span>
            </p>
          </div>
        </div>

        {/* Page Switcher Tabs (if multiple pages) */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActivePageTab('all')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activePageTab === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              Semua ({totalPages} Hal)
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setActivePageTab(String(pageNum))}
                className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activePageTab === String(pageNum)
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                {pageNum === 1 ? 'Hal 1 (Spek)' : `Hal ${pageNum}`}
              </button>
            ))}
          </div>
        )}

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.1, 0.4))}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-300 px-2 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(prev => Math.min(prev + 0.1, 1.6))}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setScale(0.95)}
            className="px-2 py-1 text-[11px] font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            Fit A4
          </button>
        </div>

        {/* Actions (Export & Print & Close) */}
        <div className="flex items-center gap-2">
          
          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors shadow-xs"
          >
            <Printer className="h-4 w-4 text-slate-300" />
            <span>Cetak A4</span>
          </button>

          {/* Export PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-emerald-900/30 shadow-md cursor-pointer disabled:opacity-50"
          >
            {isExporting === 'PDF' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            <span>PDF ({totalPages} Hal)</span>
          </button>

          {/* Export Image PNG Button */}
          <button
            type="button"
            onClick={() => handleExportImage('png')}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-indigo-900/30 shadow-md cursor-pointer disabled:opacity-50"
          >
            {isExporting === 'PNG' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            <span>PNG</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
            title="Tutup (Esc)"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

      </div>

      {/* Main Viewport Workspace */}
      <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
        <div 
          className="transition-transform duration-150 ease-out origin-top my-4"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center'
          }}
        >
          <SpkSheetA4
            elementId="spk-fullscreen-a4-document"
            data={data}
            showSafeArea={false}
            scale={1}
            activePageTab={activePageTab}
          />
        </div>
      </div>

    </div>
  );
};
