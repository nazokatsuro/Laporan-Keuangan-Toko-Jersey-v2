/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Pesanan, ShopSettings } from '../../types';
import { formatRupiah } from '../../utils';
import { VendorPayablesCard, VendorPayableCategory } from './VendorPayablesCard';
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
  RotateCcw,
  Scissors,
  Layers,
  DollarSign,
  ReceiptText,
  Filter,
  CheckSquare,
  Square,
  Copy,
  Share2,
  Calendar,
  Sparkles,
  Maximize2,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { toPng, toJpeg, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface VendorPayablesModalProps {
  orders: Pesanan[];
  settings: ShopSettings;
  initialCategory?: VendorPayableCategory;
  onClose: () => void;
  onUpdateOrders?: (updatedOrders: Pesanan[]) => void;
}

export function VendorPayablesModal({
  orders,
  settings,
  initialCategory = 'semua',
  onClose,
  onUpdateOrders
}: VendorPayablesModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  const [category, setCategory] = useState<VendorPayableCategory>(initialCategory);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(() => orders.map(o => o.id));
  const [vendorNameFilter, setVendorNameFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Auto-calculate zoom level to fit container width without clipping
  const calculateFitZoom = useCallback(() => {
    if (previewContainerRef.current) {
      const containerWidth = previewContainerRef.current.clientWidth;
      // 840px is document width, leave at least 24px margin
      const targetWidth = Math.max(300, containerWidth - 28);
      const computedZoom = Math.min(100, Math.max(35, Math.floor((targetWidth / 840) * 100)));
      return computedZoom;
    }
    return 100;
  }, []);

  // Compute fit on mount and window/container resize
  useEffect(() => {
    const handleResize = () => {
      if (isAutoFit) {
        setZoomLevel(calculateFitZoom());
      }
    };

    // Initial calculation with a slight delay for modal transition
    const timer = setTimeout(() => {
      handleResize();
    }, 50);

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isAutoFit, calculateFitZoom]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Distinct vendors / tailors / partners present in orders
  const vendorOptions = useMemo(() => {
    const names = new Set<string>();
    orders.forEach(order => {
      if (order.vendorJahit) names.add(order.vendorJahit);
      if (order.vendorSublim) names.add(order.vendorSublim);
      if (order.penerimaKomisi) names.add(order.penerimaKomisi);
      order.items?.forEach(it => {
        if (it.vendorJahit) names.add(it.vendorJahit);
        if (it.vendorSublim) names.add(it.vendorSublim);
        if (it.penerimaKomisi) names.add(it.penerimaKomisi);
      });
    });
    return Array.from(names).filter(Boolean);
  }, [orders]);

  // Filtered orders based on user selection & search
  const activeOrders = useMemo(() => {
    return orders.filter(order => {
      if (!selectedOrderIds.includes(order.id)) return false;
      if (searchTerm) {
        const matchPo = (order.namaPo || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCust = (order.namaPemesan || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchId = (order.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchPo && !matchCust && !matchId) return false;
      }
      return true;
    });
  }, [orders, selectedOrderIds, searchTerm]);

  // Calculation of grand totals for the active selection
  const totals = useMemo(() => {
    let sumJahit = 0;
    let sumSublim = 0;
    let sumKomisi = 0;
    let totalPcs = 0;

    activeOrders.forEach(order => {
      if (order.items && order.items.length > 0) {
        order.items.forEach(it => {
          const qty = Number(it.qty) || 0;
          const isJahitLunas = it.statusBayarJahit === 'Lunas' || order.statusBayarJahit === 'Lunas';
          const isSublimLunas = it.statusBayarSublim === 'Lunas' || order.statusBayarSublim === 'Lunas';
          const isKomisiLunas = it.statusBayarKomisi === 'Lunas' || order.statusBayarKomisi === 'Lunas';

          if (!isJahitLunas) sumJahit += qty * (Number(it.jahitPerPcs ?? order.jahitPerPcs) || 0);
          if (!isSublimLunas) sumSublim += qty * (Number(it.printPerPcs ?? order.printPerPcs) || 0);
          if (!isKomisiLunas) sumKomisi += qty * (Number(it.komisiPerPcs ?? order.komisiPerPcs) || 0);
          totalPcs += qty;
        });
      } else {
        const qty = Number(order.qty) || 0;
        const isJahitLunas = order.statusBayarJahit === 'Lunas';
        const isSublimLunas = order.statusBayarSublim === 'Lunas';
        const isKomisiLunas = order.statusBayarKomisi === 'Lunas';

        if (!isJahitLunas) sumJahit += qty * (Number(order.jahitPerPcs) || 0);
        if (!isSublimLunas) sumSublim += qty * (Number(order.printPerPcs) || 0);
        if (!isKomisiLunas) sumKomisi += qty * (Number(order.komisiPerPcs) || 0);
        totalPcs += qty;
      }
    });

    const grand = category === 'jahit'
      ? sumJahit
      : category === 'sublim'
      ? sumSublim
      : category === 'komisi'
      ? sumKomisi
      : (sumJahit + sumSublim + sumKomisi);

    return { sumJahit, sumSublim, sumKomisi, totalPcs, grand };
  }, [activeOrders, category]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    setIsExportingPng(true);
    try {
      const canvas = await toCanvas(cardRef.current, {
        quality: 1.0,
        pixelRatio: 2.5,
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
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `NOTA_BELUM_LUNAS_${category.toUpperCase()}_${activeOrders.length}_PO_${dateStr}.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 300);
    } catch (e) {
      console.error('Gagal unduh PNG:', e);
      alert('Gagal mengunduh gambar PNG. Silakan coba lagi.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    setIsExportingPdf(true);
    try {
      const canvas = await toCanvas(cardRef.current, {
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
      const contentWidth = pageWidth - (margin * 2); // 194 mm
      const contentHeightPerPage = pageHeight - (margin * 2); // 281 mm

      const totalHeightMm = (canvas.height / canvas.width) * contentWidth;

      if (totalHeightMm <= contentHeightPerPage) {
        // Fits in a single page
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalHeightMm, undefined, 'FAST');
      } else {
        // Multi-page slicing so table rows and signatures are never cut off or squished
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

      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`NOTA_BELUM_LUNAS_${category.toUpperCase()}_${activeOrders.length}_PO_${dateStr}.pdf`);
    } catch (e) {
      console.error('Gagal unduh PDF:', e);
      alert('Gagal mengunduh file PDF. Silakan coba lagi.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const generateSummaryText = () => {
    const categoryTitle = {
      jahit: 'NOTA TAGIHAN ONGKOS JAHIT (BELUM LUNAS)',
      sublim: 'NOTA TAGIHAN ONGKOS SUBLIM (BELUM LUNAS)',
      komisi: 'NOTA TAGIHAN KOMISI & FEE (BELUM LUNAS)',
      semua: 'NOTA REKAP BIAYA PRODUKSI & KOMISI (BELUM LUNAS)'
    }[category];

    const lines = activeOrders.map((o, idx) => {
      const poNum = idx + 1;
      const orderItems = o.items && o.items.length > 0 ? o.items : [
        {
          namaProduk: o.namaProduk || 'Jersey Custom',
          bahan: o.bahan || 'Polyester Dryfit',
          modelKerah: o.modelKerah || 'O-Neck (Standar)',
          qty: o.qty || 0,
          jahitPerPcs: o.jahitPerPcs || 0,
          printPerPcs: o.printPerPcs || 0,
          komisiPerPcs: o.komisiPerPcs || 0,
          catatanJahit: o.catatanJahit || '-'
        }
      ];

      if (orderItems.length === 1) {
        const item = orderItems[0];
        const q = Number(item.qty) || 0;
        const jahitCost = Number(item.jahitPerPcs ?? o.jahitPerPcs ?? 0);
        const printCost = Number(item.printPerPcs ?? o.printPerPcs ?? 0);
        const komisiCost = Number(item.komisiPerPcs ?? o.komisiPerPcs ?? 0);

        let costDetail = '';
        if (category === 'jahit') {
          costDetail = `${q} Pcs @ ${formatRupiah(jahitCost)} = ${formatRupiah(q * jahitCost)}`;
        } else if (category === 'sublim') {
          costDetail = `${q} Pcs @ ${formatRupiah(printCost)} = ${formatRupiah(q * printCost)}`;
        } else if (category === 'komisi') {
          costDetail = `${q} Pcs @ ${formatRupiah(komisiCost)} = ${formatRupiah(q * komisiCost)}`;
        } else {
          const tot = (q * jahitCost) + (q * printCost) + (q * komisiCost);
          costDetail = `${q} Pcs = Total ${formatRupiah(tot)}`;
        }
        const cleanProd = (item.namaProduk || 'Jersey Custom').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim();
        return `${poNum}. PO *${o.namaPo}* (#${o.id}) • Pemesan: ${o.namaPemesan}\n   Produk: ${cleanProd} (${item.bahan || o.bahan || '-'})\n   Rincian: ${costDetail}`;
      } else {
        // Multi-item grouped under 1 PO number
        let poSubtotal = 0;
        let poTotalQty = 0;

        const itemLines = orderItems.map((item) => {
          const q = Number(item.qty) || 0;
          const jahitCost = Number(item.jahitPerPcs ?? o.jahitPerPcs ?? 0);
          const printCost = Number(item.printPerPcs ?? o.printPerPcs ?? 0);
          const komisiCost = Number(item.komisiPerPcs ?? o.komisiPerPcs ?? 0);

          poTotalQty += q;
          let costDetail = '';
          if (category === 'jahit') {
            const sub = q * jahitCost;
            poSubtotal += sub;
            costDetail = `${q} Pcs @ ${formatRupiah(jahitCost)} = ${formatRupiah(sub)}`;
          } else if (category === 'sublim') {
            const sub = q * printCost;
            poSubtotal += sub;
            costDetail = `${q} Pcs @ ${formatRupiah(printCost)} = ${formatRupiah(sub)}`;
          } else if (category === 'komisi') {
            const sub = q * komisiCost;
            poSubtotal += sub;
            costDetail = `${q} Pcs @ ${formatRupiah(komisiCost)} = ${formatRupiah(sub)}`;
          } else {
            const tot = (q * jahitCost) + (q * printCost) + (q * komisiCost);
            poSubtotal += tot;
            costDetail = `${q} Pcs = Total ${formatRupiah(tot)}`;
          }

          const cleanProd = (item.namaProduk || 'Jersey Custom').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim();
          return `   • ${cleanProd} (${item.bahan || '-'}): ${costDetail}`;
        }).join('\n');

        return `${poNum}. PO *${o.namaPo}* (#${o.id}) • Pemesan: ${o.namaPemesan}\n   [${orderItems.length} Item Produk - Total ${poTotalQty} Pcs - Subtotal: ${formatRupiah(poSubtotal)}]\n${itemLines}`;
      }
    }).join('\n\n');

    return `*${categoryTitle}*\n*${settings.namaToko || 'Nomaden Apparel'}*\nTanggal: ${new Date().toLocaleDateString('id-ID')}\n\n` +
      `*Daftar Pesanan (${activeOrders.length} PO / ${totals.totalPcs} Pcs):*\n\n` +
      lines + '\n\n' +
      `==============================\n` +
      `*GRAND TOTAL TAGIHAN: ${formatRupiah(totals.grand)}*\n` +
      `==============================\n\n` +
      `_Status: Belum Lunas_\n` +
      `_Catatan: Dokumen rincian tagihan resmi internal ${settings.namaToko || 'Nomaden Apparel'}._`;
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(generateSummaryText());
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (e) {
      console.error(e);
      alert('Gagal menyalin teks ke clipboard.');
    }
  };

  const handleSendWhatsApp = () => {
    const text = generateSummaryText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  };

  const handleToggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white print:static">
      
      {/* Top Floating Control Bar */}
      <div className="no-print sticky top-2 z-20 w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 mb-4 transition-all">
        
        <div className="flex flex-col gap-3">
          
          {/* Row 1: Modal Header & Close Button */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Nota Tagihan Produksi & Komisi</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Belum Lunas
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tanpa nomor rekening & tanpa kode barcode/QR (Khusus tagihan vendor & mitra)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Row 2: Category Selector Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            
            {/* Category Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setCategory('semua')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  category === 'semua'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ReceiptText className="h-3.5 w-3.5" />
                <span>Semua Biaya</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('jahit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  category === 'jahit'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                <Scissors className="h-3.5 w-3.5" />
                <span>Belum Lunas Jahit</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('sublim')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  category === 'sublim'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-sky-600'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Belum Lunas Sublim</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('komisi')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  category === 'komisi'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Belum Lunas Komisi</span>
              </button>
            </div>

            {/* Quick Vendor Filter dropdown if available */}
            {vendorOptions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={vendorNameFilter}
                  onChange={(e) => setVendorNameFilter(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden"
                >
                  <option value="">Semua Vendor / Mitra</option>
                  {vendorOptions.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

          </div>

          {/* Row 3: Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            
            {/* Left Actions: Selection Toggle & Zoom */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                title="Pilih / Batal Semua PO"
              >
                {selectedOrderIds.length === orders.length ? (
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span>{selectedOrderIds.length}/{orders.length} PO Terpilih</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFit(false);
                    setZoomLevel(prev => Math.max(prev - 10, 35));
                  }}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  title="Perkecil Pratinjau (Zoom Out)"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold px-1 text-slate-600 dark:text-slate-400 min-w-[35px] text-center">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFit(false);
                    setZoomLevel(prev => Math.min(prev + 10, 140));
                  }}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  title="Perbesar Pratinjau (Zoom In)"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFit(true);
                    setZoomLevel(calculateFitZoom());
                  }}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    isAutoFit 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title="Sesuaikan dengan Lebar Layar (Fit Layar)"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span>Fit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAutoFit(false);
                    setZoomLevel(100);
                  }}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-colors cursor-pointer ${
                    !isAutoFit && zoomLevel === 100
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                  title="Ukuran Asli 100%"
                >
                  100%
                </button>
              </div>
            </div>

            {/* Right Actions: Print, PDF, PNG, WhatsApp, Copy */}
            <div className="flex flex-wrap items-center gap-1.5">
              
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                title="Salin rincian tagihan teks ke clipboard"
              >
                {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedText ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all cursor-pointer"
                title="Kirim rincian tagihan via WhatsApp"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Kirim WA</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isExportingPng}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title="Unduh Gambar PNG"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isExportingPng ? 'Memproses...' : 'Unduh PNG'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title="Unduh Dokumen PDF A4"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>{isExportingPdf ? 'Memproses...' : 'Unduh PDF A4'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                title="Cetak Nota A4"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak Nota</span>
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* Main Printable Card Preview Area */}
      <div 
        ref={previewContainerRef}
        className="w-full flex-1 overflow-x-auto overflow-y-visible flex flex-col items-center justify-start pb-20 px-2 sm:px-4"
      >
        {/* Visual Confirmation Banner */}
        <div className="no-print mb-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold shadow-2xs">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Pratinjau Nota A4 (100% Utuh & Siap Unduh) • {activeOrders.length} PO Terpilih</span>
        </div>

        {/* Scaled Preview Frame */}
        <div 
          className="transition-all duration-150 origin-top flex justify-center py-1"
          style={{ 
            width: `${Math.round(840 * (zoomLevel / 100))}px`,
            minWidth: `${Math.round(840 * (zoomLevel / 100))}px`,
            maxWidth: '100%'
          }}
        >
          <div
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              width: '840px',
              minWidth: '840px',
              maxWidth: '840px'
            }}
            className="shadow-2xl rounded-2xl bg-white"
          >
            <VendorPayablesCard
              ref={cardRef}
              orders={activeOrders}
              settings={settings}
              category={category}
              vendorNameFilter={vendorNameFilter}
              customNotes={customNotes}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
