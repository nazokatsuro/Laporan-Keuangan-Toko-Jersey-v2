/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Pesanan, ShopSettings } from '../../types';
import { formatRupiah } from '../../utils';
import { NotaCard } from './NotaCard';
import { 
  Printer, 
  Download, 
  MessageSquare, 
  X, 
  Check, 
  FileText, 
  FileDown, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw
} from 'lucide-react';
import { toPng, toJpeg, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface NotaModalProps {
  order: Pesanan;
  settings: ShopSettings;
  onUpdateSettings?: (updates: Partial<ShopSettings>) => void;
  onClose: () => void;
}

export function NotaModal({ order, settings, onClose }: NotaModalProps) {
  const notaRef = useRef<HTMLDivElement>(null);
  
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const isFullyPaid = (Number(order.sisaTagihan) || 0) <= 0;

  const totalQty = order.items && order.items.length > 0 
    ? order.items.reduce((acc, it) => acc + (it.qty || 0), 0) 
    : (order.qty || 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const cleanPoName = (order.namaPo || 'PO').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

  const handleDownloadPng = async () => {
    if (!notaRef.current) return;
    setIsExportingPng(true);
    try {
      const canvas = await toCanvas(notaRef.current, {
        quality: 1.0,
        pixelRatio: 2.8,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: false,
        style: {
          transform: 'none',
          width: '840px',
          minWidth: '840px',
          maxWidth: '840px',
          margin: '0',
        }
      });
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const a = document.createElement('a');
      a.download = `NOTA-${order.id}-${cleanPoName}.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 300);
    } catch (e) {
      console.error('Gagal mengunduh gambar nota:', e);
      alert('Gagal mengunduh gambar PNG. Silakan coba lagi.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!notaRef.current) return;
    setIsExportingPdf(true);
    try {
      const canvas = await toCanvas(notaRef.current, {
        quality: 1.0,
        pixelRatio: 2.2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: false,
        style: {
          transform: 'none',
          width: '840px',
          minWidth: '840px',
          maxWidth: '840px',
          margin: '0',
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeightPerPage = pageHeight - (margin * 2);

      const totalHeightMm = (canvas.height / canvas.width) * contentWidth;

      if (totalHeightMm <= contentHeightPerPage) {
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalHeightMm, undefined, 'FAST');
      } else {
        const sliceHeightPx = Math.floor((contentHeightPerPage / contentWidth) * canvas.width);
        let renderedY = 0;
        let pageIndex = 0;

        while (renderedY < canvas.height) {
          const remainingHeightPx = canvas.height - renderedY;
          const currentSliceHeightPx = Math.min(sliceHeightPx, remainingHeightPx);

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = currentSliceHeightPx;

          const sliceCtx = sliceCanvas.getContext('2d');
          if (sliceCtx) {
            sliceCtx.fillStyle = '#ffffff';
            sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            sliceCtx.drawImage(
              canvas,
              0,
              renderedY,
              canvas.width,
              currentSliceHeightPx,
              0,
              0,
              canvas.width,
              currentSliceHeightPx
            );
          }

          const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', 0.98);
          const currentHeightMm = (currentSliceHeightPx / canvas.width) * contentWidth;

          if (pageIndex > 0) {
            pdf.addPage('a4', 'portrait');
          }

          pdf.addImage(sliceDataUrl, 'JPEG', margin, margin, contentWidth, currentHeightMm, undefined, 'FAST');

          renderedY += currentSliceHeightPx;
          pageIndex++;
        }
      }

      pdf.save(`NOTA-${order.id}-${cleanPoName}.pdf`);
    } catch (e) {
      console.error('Gagal mengunduh PDF nota:', e);
      alert('Gagal mengunduh PDF nota. Silakan coba lagi.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSendWhatsApp = () => {
    const phone = (order.noTelepon || '').replace(/[^0-9]/g, '');
    const formattedPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;

    const itemsSummary = order.items && order.items.length > 0
      ? order.items.map(it => `• ${it.namaProduk} (${it.qty} Pcs @ ${formatRupiah(it.hargaPerPcs)})`).join('\n')
      : `• ${order.namaProduk} (${order.qty} Pcs @ ${formatRupiah(order.hargaPerPcs)})`;

    const text = `Halo Kak *${order.namaPemesan}*,\n\nBerikut adalah Faktur / Nota Transaksi PO *${order.namaPo}* di *${settings.namaToko || 'Nomaden Apparel'}*:\n\n` +
      `No. Nota: *${order.id}*\n` +
      `Tanggal: ${new Date(order.createdAt).toLocaleDateString('id-ID')}\n` +
      `Deadline: ${order.deadline}\n\n` +
      `*Rincian Pesanan:*\n${itemsSummary}\n` +
      `Total Qty: *${totalQty} Pcs*\n\n` +
      `Total Tagihan: *${formatRupiah(order.totalHarga)}*\n` +
      `Uang Masuk / DP: ${formatRupiah(order.uangMasuk)}\n` +
      `Sisa Tagihan: *${formatRupiah(order.sisaTagihan)}*\n` +
      `Status: *${isFullyPaid ? 'LUNAS ✓' : 'BELUM LUNAS (Harap Dilunasi)'}*\n\n` +
      `Terima kasih telah mempercayakan pembuatan jersey di *${settings.namaToko}*! 🙏`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 140));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 70));
  const resetZoom = () => setZoomLevel(100);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto nota-print-modal"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[94vh] overflow-hidden animate-fade-in transition-all duration-300 print:max-h-none print:border-none print:shadow-none print:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm no-print">
          
          {/* Title & PO info */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-sm shadow-indigo-600/20">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Preview Nota Transaksi (A4)
                </h3>
                <span className={`inline-flex items-center justify-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                  isFullyPaid 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                }`}>
                  {isFullyPaid ? (
                    <>
                      <span>Lunas</span>
                      <Check className="h-3 w-3 stroke-[3]" />
                    </>
                  ) : (
                    <span>Belum Lunas</span>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                PO: <span className="font-bold text-indigo-600 dark:text-indigo-400">{order.namaPo}</span> • ID: <span className="font-mono text-slate-600 dark:text-slate-400">{order.id}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons (PNG, PDF, Print, WA, Close) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Zoom Controls */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-200/50 dark:bg-slate-800/60 p-1 rounded-xl mr-1">
              <button
                onClick={zoomOut}
                disabled={zoomLevel <= 70}
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

            {/* Download PNG */}
            <button
              onClick={handleDownloadPng}
              disabled={isExportingPng}
              title="Unduh Gambar Nota (PNG Resolusi Tinggi)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 text-xs font-bold transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isExportingPng ? 'Menyimpan...' : 'Unduh PNG'}</span>
              <span className="sm:hidden font-mono text-[10px]">PNG</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              title="Unduh Dokumen Nota (PDF Siap Cetak)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-indigo-600/20 disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isExportingPdf ? 'Menyimpan...' : 'Unduh PDF'}</span>
              <span className="sm:hidden font-mono text-[10px]">PDF</span>
            </button>

            {/* Cetak */}
            <button
              onClick={handlePrint}
              title="Cetak Nota / Print"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Cetak</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleSendWhatsApp}
              title="Kirim Nota via WhatsApp"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-emerald-600/20"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Kirim WA</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-slate-100/80 dark:bg-slate-950 flex justify-center items-start print:p-0 print:bg-white">
          
          <div 
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="transition-transform duration-150 flex justify-center w-full"
          >
            <NotaCard
              ref={notaRef}
              order={order}
              settings={settings}
              onLightboxImage={setLightboxImage}
            />
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
