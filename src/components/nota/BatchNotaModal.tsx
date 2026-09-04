/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Pesanan, ShopSettings } from '../../types';
import { formatRupiah } from '../../utils';
import { NotaCard } from './NotaCard';
import { BatchRekapCard } from './BatchRekapCard';
import { 
  Printer, 
  Download, 
  MessageSquare, 
  X, 
  FileText, 
  FileDown, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  CheckSquare, 
  Square, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  PackageCheck,
  Archive,
  FileSpreadsheet
} from 'lucide-react';
import { toJpeg, toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

interface BatchNotaModalProps {
  orders: Pesanan[];
  settings: ShopSettings;
  onClose: () => void;
}

export function BatchNotaModal({ orders, settings, onClose }: BatchNotaModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Set of active order IDs in this batch
  const [selectedIds, setSelectedIds] = useState<string[]>(() => orders.map(o => o.id));
  
  // View mode: 'all' (continuous scroll with print page breaks) vs 'single' (tab/carousel navigation)
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [activeSingleIndex, setActiveSingleIndex] = useState<number>(0);

  const [zoomLevel, setZoomLevel] = useState<number>(95);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Filter active orders based on selection
  const activeOrders = orders.filter(o => selectedIds.includes(o.id));

  // Batch Aggregates
  const totalOrdersCount = activeOrders.length;
  const totalBatchQty = activeOrders.reduce((acc, order) => {
    const qty = order.items && order.items.length > 0
      ? order.items.reduce((sum, it) => sum + (it.qty || 0), 0)
      : (order.qty || 0);
    return acc + qty;
  }, 0);
  const totalBatchHarga = activeOrders.reduce((acc, order) => acc + (Number(order.totalHarga) || 0), 0);
  const totalBatchUangMasuk = activeOrders.reduce((acc, order) => acc + (Number(order.uangMasuk) || 0), 0);
  const totalBatchSisaTagihan = activeOrders.reduce((acc, order) => acc + (Number(order.sisaTagihan) || 0), 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleSelectOrder = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) {
          alert('Minimal 1 pesanan harus dipilih untuk batch nota.');
          return prev;
        }
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectAll = () => setSelectedIds(orders.map(o => o.id));
  const deselectAllExceptCurrent = () => {
    if (orders.length > 0) {
      setSelectedIds([orders[0].id]);
    }
  };

  const handleBatchPrint = () => {
    window.print();
  };

  const handleBatchDownloadPdf = async () => {
    if (activeOrders.length === 0) return;
    setIsExportingPdf(true);
    setExportProgress(`Menyiapkan 1 dari ${activeOrders.length} nota...`);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const maxPdfWidth = pageWidth - (margin * 2);
      const maxPdfHeight = pageHeight - (margin * 2);

      // 1. Process all individual PO Nota pages
      for (let i = 0; i < activeOrders.length; i++) {
        const order = activeOrders[i];
        setExportProgress(`Memproses nota PO ${i + 1} dari ${activeOrders.length} (${order.namaPo})...`);

        const elem = cardRefs.current.get(order.id);
        if (!elem) continue;

        const imgData = await toJpeg(elem, {
          quality: 0.96,
          pixelRatio: 2.2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          skipFonts: false
        });

        const img = new Image();
        img.src = imgData;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        const ratio = Math.min(maxPdfWidth / imgWidth, maxPdfHeight / imgHeight);

        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;
        const posX = margin + (maxPdfWidth - finalWidth) / 2;
        const posY = margin + (maxPdfHeight - finalHeight) / 2;

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        pdf.addImage(imgData, 'JPEG', posX, posY, finalWidth, finalHeight, undefined, 'FAST');
      }

      // 2. Process the Final Summary Sheet (Rekapitulasi Tiap PO & Grand Total)
      const rekapElem = cardRefs.current.get('batch-rekap');
      if (rekapElem) {
        setExportProgress('Memproses lembar rekapitulasi akhir batch...');
        const rekapImgData = await toJpeg(rekapElem, {
          quality: 0.96,
          pixelRatio: 2.2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          skipFonts: false
        });

        const rImg = new Image();
        rImg.src = rekapImgData;
        await new Promise((resolve, reject) => {
          rImg.onload = resolve;
          rImg.onerror = reject;
        });

        const rImgWidth = rImg.naturalWidth || rImg.width;
        const rImgHeight = rImg.naturalHeight || rImg.height;
        const rRatio = Math.min(maxPdfWidth / rImgWidth, maxPdfHeight / rImgHeight);

        const rFinalWidth = rImgWidth * rRatio;
        const rFinalHeight = rImgHeight * rRatio;
        const rPosX = margin + (maxPdfWidth - rFinalWidth) / 2;
        const rPosY = margin + (maxPdfHeight - rFinalHeight) / 2;

        pdf.addPage('a4', 'portrait');
        pdf.addImage(rekapImgData, 'JPEG', rPosX, rPosY, rFinalWidth, rFinalHeight, undefined, 'FAST');
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`BATCH_NOTA_${activeOrders.length}_PO_${dateStr}.pdf`);
    } catch (e) {
      console.error('Gagal membuat batch PDF nota:', e);
      alert('Terjadi kesalahan saat mengekspor Batch PDF. Silakan coba lagi.');
    } finally {
      setIsExportingPdf(false);
      setExportProgress('');
    }
  };

  const handleBatchDownloadZip = async () => {
    if (activeOrders.length === 0) return;
    setIsExportingZip(true);
    setExportProgress(`Mengonversi 1 dari ${activeOrders.length} PNG...`);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`BATCH_NOTA_${new Date().toISOString().slice(0, 10)}`);

      // 1. Process all individual PO Nota images
      for (let i = 0; i < activeOrders.length; i++) {
        const order = activeOrders[i];
        setExportProgress(`Mengonversi gambar ${i + 1} dari ${activeOrders.length} (${order.namaPo})...`);

        const elem = cardRefs.current.get(order.id);
        if (!elem) continue;

        const dataUrl = await toPng(elem, {
          quality: 1.0,
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          cacheBust: true,
          skipFonts: false
        });

        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        const cleanPo = (order.namaPo || 'PO').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        const pageNum = String(i + 1).padStart(2, '0');
        folder?.file(`NOTA-${pageNum}-${order.id}-${cleanPo}.png`, base64Data, { base64: true });
      }

      // 2. Process the Final Summary Sheet image
      const rekapElem = cardRefs.current.get('batch-rekap');
      if (rekapElem) {
        setExportProgress('Mengonversi lembar rekapitulasi batch PNG...');
        const rekapDataUrl = await toPng(rekapElem, {
          quality: 1.0,
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          cacheBust: true,
          skipFonts: false
        });
        const rekapBase64 = rekapDataUrl.replace(/^data:image\/png;base64,/, '');
        folder?.file(`00_LEMBAR_REKAPITULASI_BATCH_${activeOrders.length}_PO.png`, rekapBase64, { base64: true });
      }

      setExportProgress('Membuat file arsip ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `BATCH_NOTA_${activeOrders.length}_PO_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error('Gagal mengekspor ZIP nota:', e);
      alert('Gagal mengunduh ZIP. Silakan coba lagi.');
    } finally {
      setIsExportingZip(false);
      setExportProgress('');
    }
  };

  const handleSendSingleWhatsApp = (order: Pesanan) => {
    const phone = (order.noTelepon || '').replace(/[^0-9]/g, '');
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;

    const orderQty = order.items && order.items.length > 0 
      ? order.items.reduce((acc, it) => acc + (it.qty || 0), 0) 
      : (order.qty || 0);

    const isFullyPaid = (Number(order.sisaTagihan) || 0) <= 0;

    const itemsSummary = order.items && order.items.length > 0
      ? order.items.map(it => `• ${it.namaProduk} (${it.qty} Pcs @ ${formatRupiah(it.hargaPerPcs)})`).join('\n')
      : `• ${order.namaProduk} (${order.qty} Pcs @ ${formatRupiah(order.hargaPerPcs)})`;

    const text = `Halo Kak *${order.namaPemesan}*,\n\nBerikut adalah Faktur / Nota Transaksi PO *${order.namaPo}* di *${settings.namaToko || 'Nomaden Apparel'}*:\n\n` +
      `No. Nota: *${order.id}*\n` +
      `Tanggal: ${new Date(order.createdAt).toLocaleDateString('id-ID')}\n` +
      `Deadline: ${order.deadline}\n\n` +
      `*Rincian Pesanan:*\n${itemsSummary}\n` +
      `Total Qty: *${orderQty} Pcs*\n\n` +
      `Total Tagihan: *${formatRupiah(order.totalHarga)}*\n` +
      `Uang Masuk / DP: ${formatRupiah(order.uangMasuk)}\n` +
      `Sisa Tagihan: *${formatRupiah(order.sisaTagihan)}*\n` +
      `Status: *${isFullyPaid ? 'LUNAS ✓' : 'BELUM LUNAS (Harap Dilunasi)'}*\n\n` +
      `Terima kasih telah mempercayakan pembuatan jersey di *${settings.namaToko}*! 🙏`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 140));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 60));
  const resetZoom = () => setZoomLevel(95);

  const currentSingleOrder = activeOrders[activeSingleIndex] || activeOrders[0];

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto nota-print-modal"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[96vh] overflow-hidden animate-fade-in transition-all duration-300 print:max-h-none print:border-none print:shadow-none print:w-full print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header Actions */}
        <div className="flex flex-col gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm no-print shrink-0">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Title & Batch Summary */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-600/20 shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Batch Generator Nota A4</span>
                    <span className="text-[11px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold border border-indigo-200 dark:border-indigo-800">
                      {totalOrdersCount} PO Dipilih
                    </span>
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500">
                  Cetak massal, ekspor multi-halaman PDF, atau unduh paket gambar PNG seluruh pesanan.
                </p>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              
              {/* Zoom Controls */}
              <div className="hidden lg:flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-xl mr-1">
                <button
                  onClick={zoomOut}
                  disabled={zoomLevel <= 60}
                  title="Perkecil"
                  className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold px-1 text-slate-600 dark:text-slate-300 min-w-[38px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  onClick={zoomIn}
                  disabled={zoomLevel >= 140}
                  title="Perbesar"
                  className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={resetZoom}
                  title="Reset Zoom"
                  className="p-1 rounded text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-slate-200/70 dark:bg-slate-800/70 p-1 rounded-xl mr-1">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'all'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Tampilkan semua nota berurutan beserta lembar rekap"
                >
                  Semua Halaman ({activeOrders.length} Nota + Rekap)
                </button>
                <button
                  onClick={() => setViewMode('single')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'single'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Lihat satu per satu per tab PO"
                >
                  {activeSingleIndex >= activeOrders.length
                    ? 'Lembar Rekap Akhir'
                    : `Per Halaman (${activeSingleIndex + 1}/${activeOrders.length + 1})`}
                </button>
              </div>

              {/* Unduh ZIP (PNG) */}
              <button
                onClick={handleBatchDownloadZip}
                disabled={isExportingZip || activeOrders.length === 0}
                title="Unduh seluruh nota dalam paket gambar ZIP"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800 disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isExportingZip ? 'Menyiapkan...' : 'Unduh ZIP (PNG)'}</span>
                <span className="sm:hidden font-mono text-[10px]">ZIP</span>
              </button>

              {/* Unduh Batch PDF Multi-Halaman */}
              <button
                onClick={handleBatchDownloadPdf}
                disabled={isExportingPdf || activeOrders.length === 0}
                title="Unduh satu file PDF gabungan berisi seluruh nota A4"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-indigo-600/20 disabled:opacity-50"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isExportingPdf ? 'Mengekspor PDF...' : 'Unduh PDF Gabungan'}</span>
                <span className="sm:hidden font-mono text-[10px]">PDF</span>
              </button>

              {/* Cetak Semua Sekaligus */}
              <button
                onClick={handleBatchPrint}
                title="Cetak Seluruh Nota A4 ke Printer / PDF Browser"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-emerald-600/20"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="font-extrabold">Cetak Semua ({totalOrdersCount})</span>
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer ml-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

          </div>

          {/* Aggregate KPI Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-indigo-50/60 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total PO</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{totalOrdersCount} Pesanan</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Qty Jersey</span>
              <span className="font-black text-indigo-700 dark:text-indigo-400 font-mono text-sm">{totalBatchQty} Pcs</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Tagihan</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{formatRupiah(totalBatchHarga)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total DP Masuk</span>
              <span className="font-bold text-emerald-600 font-mono">{formatRupiah(totalBatchUangMasuk)}</span>
            </div>
            <div className="flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sisa Tagihan</span>
              <span className={`font-black font-mono ${totalBatchSisaTagihan <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalBatchSisaTagihan <= 0 ? 'LUNAS (Rp 0)' : formatRupiah(totalBatchSisaTagihan)}
              </span>
            </div>
          </div>

          {/* Interactive Selection Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
              >
                Pilih Semua ({orders.length})
              </button>
              <button
                type="button"
                onClick={deselectAllExceptCurrent}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors"
              >
                Reset
              </button>
            </div>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {orders.map((o, idx) => {
                const isSelected = selectedIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      if (viewMode === 'single') {
                        setActiveSingleIndex(activeOrders.findIndex(ao => ao.id === o.id) >= 0 ? activeOrders.findIndex(ao => ao.id === o.id) : 0);
                      }
                      toggleSelectOrder(o.id);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                    <span>{o.namaPo}</span>
                    <span className="opacity-75 font-mono text-[9.5px]">({o.id})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Progress Bar Banner */}
          {(isExportingPdf || isExportingZip) && (
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-950/80 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 animate-pulse">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>{exportProgress}</span>
            </div>
          )}

        </div>

        {/* Scrollable Receipt Area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-slate-100/90 dark:bg-slate-950 flex flex-col items-center print:p-0 print:bg-white print:overflow-visible print:block"
        >
          
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-150 flex flex-col items-center w-full space-y-8 print:space-y-0 print:block print:transform-none"
          >
            
            {/* Mode 1: ALL PAGES (Stacked A4 cards with page-breaks) */}
            {viewMode === 'all' && (
              <div className="w-full flex flex-col items-center space-y-10 print:space-y-0 print:block">
                {activeOrders.map((order, idx) => (
                  <div 
                    key={order.id}
                    className="w-full flex flex-col items-center space-y-2 print:space-y-0 print:break-after-page"
                    style={{ breakAfter: 'page', pageBreakAfter: 'always' }}
                  >
                    {/* Screen Page Badge Header */}
                    <div className="no-print w-full max-w-2xl flex items-center justify-between text-xs text-slate-500 px-2">
                      <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block"></span>
                        Nota {idx + 1} dari {activeOrders.length}: <span className="text-indigo-600 dark:text-indigo-400">{order.namaPo}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSendSingleWhatsApp(order)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                      >
                        <MessageSquare className="h-3 w-3" />
                        <span>Kirim WA</span>
                      </button>
                    </div>

                    {/* Single Printable Nota Card Component */}
                    <NotaCard
                      ref={(el) => {
                        if (el) cardRefs.current.set(order.id, el);
                        else cardRefs.current.delete(order.id);
                      }}
                      order={order}
                      settings={settings}
                      onLightboxImage={setLightboxImage}
                    />
                  </div>
                ))}

                {/* Final Summary Card / Lembar Rekapitulasi at the end of Batch */}
                <div 
                  className="w-full flex flex-col items-center space-y-2 print:space-y-0 print:break-before-page pt-4"
                  style={{ breakBefore: 'page', pageBreakBefore: 'always' }}
                >
                  <div className="no-print w-full max-w-4xl flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-2">
                    <span className="font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                      <span>Lembar Akhir: Rekapitulasi Tiap PO & Total Keseluruhan ({activeOrders.length} PO)</span>
                    </span>
                    <span className="text-[11px] text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2.5 py-0.5 rounded-md">
                      Halaman Penutup / Rekapan
                    </span>
                  </div>

                  <BatchRekapCard
                    ref={(el) => {
                      if (el) cardRefs.current.set('batch-rekap', el);
                      else cardRefs.current.delete('batch-rekap');
                    }}
                    orders={activeOrders}
                    settings={settings}
                    onLightboxImage={setLightboxImage}
                  />
                </div>

              </div>
            )}

            {/* Mode 2: SINGLE PAGE CAROUSEL VIEW */}
            {viewMode === 'single' && (
              <div className="w-full flex flex-col items-center space-y-4">
                
                {/* Carousel Navigation Toolbar */}
                <div className="no-print flex flex-wrap items-center justify-between gap-2 w-full max-w-4xl bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <button
                    type="button"
                    disabled={activeSingleIndex <= 0}
                    onClick={() => setActiveSingleIndex(prev => Math.max(prev - 1, 0))}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="text-center">
                    {activeSingleIndex < activeOrders.length ? (
                      <>
                        <p className="text-xs font-black text-slate-800 dark:text-white">
                          Halaman {activeSingleIndex + 1} dari {activeOrders.length + 1}
                        </p>
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                          PO: {currentSingleOrder?.namaPo} (#{currentSingleOrder?.id})
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 flex items-center justify-center gap-1">
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span>Halaman {activeOrders.length + 1} dari {activeOrders.length + 1}: Lembar Rekapitulasi</span>
                        </p>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          Ringkasan Seluruh {activeOrders.length} Pesanan & Grand Total
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {activeSingleIndex < activeOrders.length ? (
                      <>
                        {currentSingleOrder && (
                          <button
                            type="button"
                            onClick={() => handleSendSingleWhatsApp(currentSingleOrder)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Kirim WA</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveSingleIndex(activeOrders.length)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
                          title="Lompat ke lembar rekapitulasi batch"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Ke Rekap</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveSingleIndex(0)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Ke Nota #1</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={activeSingleIndex >= activeOrders.length}
                      onClick={() => setActiveSingleIndex(prev => Math.min(prev + 1, activeOrders.length))}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <span>Berikutnya</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Printable Content Component based on active page index */}
                {activeSingleIndex < activeOrders.length && currentSingleOrder ? (
                  <NotaCard
                    ref={(el) => {
                      if (el) cardRefs.current.set(currentSingleOrder.id, el);
                    }}
                    order={currentSingleOrder}
                    settings={settings}
                    onLightboxImage={setLightboxImage}
                  />
                ) : (
                  <BatchRekapCard
                    ref={(el) => {
                      if (el) cardRefs.current.set('batch-rekap', el);
                    }}
                    orders={activeOrders}
                    settings={settings}
                    onLightboxImage={setLightboxImage}
                  />
                )}

                {/* Invisible background mounting container for offscreen cards so PDF/ZIP exports capture all pages */}
                <div className="no-print pointer-events-none fixed -left-[9999px] top-0 opacity-0" aria-hidden="true">
                  {activeOrders.map(order => (
                    <NotaCard
                      key={`offscreen-${order.id}`}
                      ref={(el) => {
                        if (el) cardRefs.current.set(order.id, el);
                      }}
                      order={order}
                      settings={settings}
                    />
                  ))}
                  <BatchRekapCard
                    ref={(el) => {
                      if (el) cardRefs.current.set('batch-rekap', el);
                    }}
                    orders={activeOrders}
                    settings={settings}
                  />
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

      {/* Full-Screen Image Lightbox Preview Modal */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col p-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 text-white border-b border-slate-800">
              <span className="font-bold text-sm truncate">{lightboxImage.title}</span>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px]">
              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.title} 
                className="max-h-[75vh] max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
