/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Pesanan, ShopSettings } from '../../types';
import { formatRupiah, checkOrderPaymentStatus } from '../../utils';
import { VendorPayablesCard, VendorPayableCategory, VendorStatusFilter } from './VendorPayablesCard';
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
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { saveElementToSmartMultiPagePdf } from '../../utils/pdfExportHelper';

interface VendorPayablesModalProps {
  orders: Pesanan[];
  settings: ShopSettings;
  initialCategory?: VendorPayableCategory;
  onClose: () => void;
  onUpdateOrders?: (updatedOrders: Pesanan[]) => void;
}

export function VendorPayablesModal({
  orders: initialOrders,
  settings,
  initialCategory = 'semua',
  onClose,
  onUpdateOrders
}: VendorPayablesModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  // Local state for orders to allow immediate interactive updates
  const [localOrders, setLocalOrders] = useState<Pesanan[]>(initialOrders);
  
  useEffect(() => {
    setLocalOrders(initialOrders);
  }, [initialOrders]);

  const [category, setCategory] = useState<VendorPayableCategory>(initialCategory);
  const [statusFilter, setStatusFilter] = useState<VendorStatusFilter>('semua');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(() => initialOrders.map(o => o.id));
  const [vendorNameFilter, setVendorNameFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [isQuickManageOpen, setIsQuickManageOpen] = useState<boolean>(false);
  
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Auto-calculate zoom level to fit container width without clipping
  const calculateFitZoom = useCallback(() => {
    if (previewContainerRef.current) {
      const containerWidth = previewContainerRef.current.clientWidth;
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
    localOrders.forEach(order => {
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
  }, [localOrders]);

  // Filtered orders based on user selection & search
  const activeOrders = useMemo(() => {
    return localOrders.filter(order => {
      if (!selectedOrderIds.includes(order.id)) return false;
      if (searchTerm) {
        const matchPo = (order.namaPo || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCust = (order.namaPemesan || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchId = (order.id || '').toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchPo && !matchCust && !matchId) return false;
      }
      return true;
    });
  }, [localOrders, selectedOrderIds, searchTerm]);

  // Calculation of grand totals (Total Transaksi, Sudah Lunas, Sisa Tagihan)
  const totals = useMemo(() => {
    let totalBiayaAll = 0;
    let totalLunasAll = 0;
    let totalSisaAll = 0;
    let totalPcs = 0;
    let paidOrdersCount = 0;
    let unpaidOrdersCount = 0;

    activeOrders.forEach(order => {
      let orderBiaya = 0;
      let orderLunas = 0;

      const items = order.items && order.items.length > 0 ? order.items : [{
        qty: order.qty || 0,
        jahitPerPcs: order.jahitPerPcs || 0,
        printPerPcs: order.printPerPcs || 0,
        komisiPerPcs: order.komisiPerPcs || 0,
        statusBayarJahit: order.statusBayarJahit,
        statusBayarSublim: order.statusBayarSublim,
        statusBayarKomisi: order.statusBayarKomisi,
        vendorJahit: order.vendorJahit,
        vendorSublim: order.vendorSublim,
        penerimaKomisi: order.penerimaKomisi
      }];

      items.forEach(it => {
        const q = Number(it.qty) || 0;
        totalPcs += q;

        const jCost = q * (Number(it.jahitPerPcs ?? order.jahitPerPcs) || 0);
        const sCost = q * (Number(it.printPerPcs ?? order.printPerPcs) || 0);
        const kCost = q * (Number(it.komisiPerPcs ?? order.komisiPerPcs) || 0);

        const paymentStatus = checkOrderPaymentStatus(order, settings.cashFlowList, localOrders);
        const isJLunas = it.statusBayarJahit === 'Lunas' || (it.statusBayarJahit !== 'Belum Lunas' && (order.statusBayarJahit === 'Lunas' || (order.statusBayarJahit !== 'Belum Lunas' && paymentStatus.isJahitPaid)));
        const isSLunas = it.statusBayarSublim === 'Lunas' || (it.statusBayarSublim !== 'Belum Lunas' && (order.statusBayarSublim === 'Lunas' || (order.statusBayarSublim !== 'Belum Lunas' && paymentStatus.isSublimPaid)));
        const isKLunas = it.statusBayarKomisi === 'Lunas' || (it.statusBayarKomisi !== 'Belum Lunas' && (order.statusBayarKomisi === 'Lunas' || (order.statusBayarKomisi !== 'Belum Lunas' && paymentStatus.isKomisiPaid)));

        if (category === 'jahit') {
          orderBiaya += jCost;
          if (isJLunas) orderLunas += jCost;
        } else if (category === 'sublim') {
          orderBiaya += sCost;
          if (isSLunas) orderLunas += sCost;
        } else if (category === 'komisi') {
          orderBiaya += kCost;
          if (isKLunas) orderLunas += kCost;
        } else {
          // 'semua'
          orderBiaya += (jCost + sCost + kCost);
          if (isJLunas) orderLunas += jCost;
          if (isSLunas) orderLunas += sCost;
          if (isKLunas) orderLunas += kCost;
        }
      });

      const orderSisa = orderBiaya - orderLunas;
      totalBiayaAll += orderBiaya;
      totalLunasAll += orderLunas;
      totalSisaAll += orderSisa;

      if (orderSisa <= 0 && orderBiaya > 0) {
        paidOrdersCount++;
      } else if (orderSisa > 0) {
        unpaidOrdersCount++;
      }
    });

    return {
      totalBiayaAll,
      totalLunasAll,
      totalSisaAll,
      totalPcs,
      paidOrdersCount,
      unpaidOrdersCount
    };
  }, [activeOrders, category, settings.cashFlowList, localOrders]);

  // Quick toggle payment status for an order
  const handleToggleOrderPayment = (orderId: string, type: 'jahit' | 'sublim' | 'komisi') => {
    const next = localOrders.map(o => {
      if (o.id !== orderId) return o;
      const paymentStatus = checkOrderPaymentStatus(o, settings.cashFlowList, localOrders);

      if (type === 'jahit') {
        const currentLunas = o.statusBayarJahit === 'Lunas' || (o.statusBayarJahit !== 'Belum Lunas' && paymentStatus.isJahitPaid);
        const newStatus = currentLunas ? 'Belum Lunas' : 'Lunas';
        const newItems = o.items?.map(it => ({ ...it, statusBayarJahit: newStatus }));
        return { ...o, statusBayarJahit: newStatus, items: newItems };
      }
      if (type === 'sublim') {
        const currentLunas = o.statusBayarSublim === 'Lunas' || (o.statusBayarSublim !== 'Belum Lunas' && paymentStatus.isSublimPaid);
        const newStatus = currentLunas ? 'Belum Lunas' : 'Lunas';
        const newItems = o.items?.map(it => ({ ...it, statusBayarSublim: newStatus }));
        return { ...o, statusBayarSublim: newStatus, items: newItems };
      }
      if (type === 'komisi') {
        const currentLunas = o.statusBayarKomisi === 'Lunas' || (o.statusBayarKomisi !== 'Belum Lunas' && paymentStatus.isKomisiPaid);
        const newStatus = currentLunas ? 'Belum Lunas' : 'Lunas';
        const newItems = o.items?.map(it => ({ ...it, statusBayarKomisi: newStatus }));
        return { ...o, statusBayarKomisi: newStatus, items: newItems };
      }
      return o;
    });

    setLocalOrders(next);
    if (onUpdateOrders) {
      onUpdateOrders(next);
    }
  };

  // Bulk mark all active orders as Lunas or Belum Lunas
  const handleBulkSetStatus = (targetStatus: 'Lunas' | 'Belum Lunas') => {
    const next = localOrders.map(o => {
      if (!selectedOrderIds.includes(o.id)) return o;

      let updated = { ...o };
      if (category === 'jahit' || category === 'semua') {
        updated.statusBayarJahit = targetStatus;
        if (updated.items) {
          updated.items = updated.items.map(it => ({ ...it, statusBayarJahit: targetStatus }));
        }
      }
      if (category === 'sublim' || category === 'semua') {
        updated.statusBayarSublim = targetStatus;
        if (updated.items) {
          updated.items = updated.items.map(it => ({ ...it, statusBayarSublim: targetStatus }));
        }
      }
      if (category === 'komisi' || category === 'semua') {
        updated.statusBayarKomisi = targetStatus;
        if (updated.items) {
          updated.items = updated.items.map(it => ({ ...it, statusBayarKomisi: targetStatus }));
        }
      }
      return updated;
    });

    setLocalOrders(next);
    if (onUpdateOrders) {
      onUpdateOrders(next);
    }
  };

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
      a.download = `NOTA_TAGIHAN_VENDOR_${category.toUpperCase()}_${statusFilter.toUpperCase()}_${activeOrders.length}_PO_${dateStr}.png`;
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
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `NOTA_TAGIHAN_VENDOR_${category.toUpperCase()}_${statusFilter.toUpperCase()}_${activeOrders.length}_PO_${dateStr}.pdf`;
      
      await saveElementToSmartMultiPagePdf(cardRef.current, {
        filename,
        pixelRatio: 2.2,
        pdfQuality: 0.98,
        marginMm: 8,
        elementWidthPx: 840,
      });
    } catch (e) {
      console.error('Gagal unduh PDF:', e);
      alert('Gagal mengunduh file PDF. Silakan coba lagi.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const generateSummaryText = () => {
    const categoryTitle = {
      jahit: 'NOTA REKAP ONGKOS JAHIT (STATUS & SISA TAGIHAN)',
      sublim: 'NOTA REKAP ONGKOS SUBLIM (STATUS & SISA TAGIHAN)',
      komisi: 'NOTA REKAP KOMISI & MARKETING FEE (STATUS & SISA TAGIHAN)',
      semua: 'NOTA REKAP BIAYA PRODUKSI & KOMISI VENDOR (STATUS & SISA TAGIHAN)'
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
          statusBayarJahit: o.statusBayarJahit,
          statusBayarSublim: o.statusBayarSublim,
          statusBayarKomisi: o.statusBayarKomisi
        }
      ];

      if (orderItems.length === 1) {
        const item = orderItems[0];
        const q = Number(item.qty) || 0;
        const jCost = Number(item.jahitPerPcs ?? o.jahitPerPcs ?? 0) * q;
        const sCost = Number(item.printPerPcs ?? o.printPerPcs ?? 0) * q;
        const kCost = Number(item.komisiPerPcs ?? o.komisiPerPcs ?? 0) * q;

        const paymentStatus = checkOrderPaymentStatus(o, settings.cashFlowList, localOrders);
        const isJL = item.statusBayarJahit === 'Lunas' || (item.statusBayarJahit !== 'Belum Lunas' && (o.statusBayarJahit === 'Lunas' || (o.statusBayarJahit !== 'Belum Lunas' && paymentStatus.isJahitPaid)));
        const isSL = item.statusBayarSublim === 'Lunas' || (item.statusBayarSublim !== 'Belum Lunas' && (o.statusBayarSublim === 'Lunas' || (o.statusBayarSublim !== 'Belum Lunas' && paymentStatus.isSublimPaid)));
        const isKL = item.statusBayarKomisi === 'Lunas' || (item.statusBayarKomisi !== 'Belum Lunas' && (o.statusBayarKomisi === 'Lunas' || (o.statusBayarKomisi !== 'Belum Lunas' && paymentStatus.isKomisiPaid)));

        let costDetail = '';
        let statusBadge = '';
        let sisaDetail = '';

        if (category === 'jahit') {
          costDetail = `Biaya: ${formatRupiah(jCost)}`;
          statusBadge = isJL ? '[LUNAS ✓]' : '[BELUM LUNAS]';
          sisaDetail = isJL ? 'Sisa: Rp 0' : `Sisa: ${formatRupiah(jCost)}`;
        } else if (category === 'sublim') {
          costDetail = `Biaya: ${formatRupiah(sCost)}`;
          statusBadge = isSL ? '[LUNAS ✓]' : '[BELUM LUNAS]';
          sisaDetail = isSL ? 'Sisa: Rp 0' : `Sisa: ${formatRupiah(sCost)}`;
        } else if (category === 'komisi') {
          costDetail = `Biaya: ${formatRupiah(kCost)}`;
          statusBadge = isKL ? '[LUNAS ✓]' : '[BELUM LUNAS]';
          sisaDetail = isKL ? 'Sisa: Rp 0' : `Sisa: ${formatRupiah(kCost)}`;
        } else {
          const tot = jCost + sCost + kCost;
          const paid = (isJL ? jCost : 0) + (isSL ? sCost : 0) + (isKL ? kCost : 0);
          const sisa = tot - paid;
          costDetail = `Total: ${formatRupiah(tot)} (Jahit: ${formatRupiah(jCost)} ${isJL ? '✓' : '✗'} | Sublim: ${formatRupiah(sCost)} ${isSL ? '✓' : '✗'} | Komisi: ${formatRupiah(kCost)} ${isKL ? '✓' : '✗'})`;
          statusBadge = sisa <= 0 ? '[LUNAS ✓]' : (paid > 0 ? '[SEBAGIAN LUNAS]' : '[BELUM LUNAS]');
          sisaDetail = sisa <= 0 ? 'Sisa: Rp 0' : `Sisa: ${formatRupiah(sisa)}`;
        }

        const cleanProd = (item.namaProduk || 'Jersey Custom').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim();
        return `${poNum}. PO *${o.namaPo}* (#${o.id}) • Pemesan: ${o.namaPemesan}\n   Produk: ${cleanProd} (${q} Pcs)\n   ${costDetail}\n   Status: ${statusBadge} • ${sisaDetail}`;
      } else {
        // Multi-item
        let poTotal = 0;
        let poPaid = 0;
        let poQty = 0;

        const itemLines = orderItems.map(item => {
          const q = Number(item.qty) || 0;
          poQty += q;
          const jCost = Number(item.jahitPerPcs ?? o.jahitPerPcs ?? 0) * q;
          const sCost = Number(item.printPerPcs ?? o.printPerPcs ?? 0) * q;
          const kCost = Number(item.komisiPerPcs ?? o.komisiPerPcs ?? 0) * q;

          const paymentStatus = checkOrderPaymentStatus(o, settings.cashFlowList, localOrders);
          const isJL = item.statusBayarJahit === 'Lunas' || (item.statusBayarJahit !== 'Belum Lunas' && (o.statusBayarJahit === 'Lunas' || (o.statusBayarJahit !== 'Belum Lunas' && paymentStatus.isJahitPaid)));
          const isSL = item.statusBayarSublim === 'Lunas' || (item.statusBayarSublim !== 'Belum Lunas' && (o.statusBayarSublim === 'Lunas' || (o.statusBayarSublim !== 'Belum Lunas' && paymentStatus.isSublimPaid)));
          const isKL = item.statusBayarKomisi === 'Lunas' || (item.statusBayarKomisi !== 'Belum Lunas' && (o.statusBayarKomisi === 'Lunas' || (o.statusBayarKomisi !== 'Belum Lunas' && paymentStatus.isKomisiPaid)));

          let itCost = 0;
          let itPaid = 0;
          let itLabel = '';

          if (category === 'jahit') {
            itCost = jCost;
            itPaid = isJL ? jCost : 0;
            itLabel = `${formatRupiah(jCost)} [${isJL ? 'LUNAS ✓' : 'BELUM'}]`;
          } else if (category === 'sublim') {
            itCost = sCost;
            itPaid = isSL ? sCost : 0;
            itLabel = `${formatRupiah(sCost)} [${isSL ? 'LUNAS ✓' : 'BELUM'}]`;
          } else if (category === 'komisi') {
            itCost = kCost;
            itPaid = isKL ? kCost : 0;
            itLabel = `${formatRupiah(kCost)} [${isKL ? 'LUNAS ✓' : 'BELUM'}]`;
          } else {
            itCost = jCost + sCost + kCost;
            itPaid = (isJL ? jCost : 0) + (isSL ? sCost : 0) + (isKL ? kCost : 0);
            itLabel = `${formatRupiah(itCost)} [${itCost - itPaid <= 0 ? 'LUNAS ✓' : 'BELUM'}]`;
          }

          poTotal += itCost;
          poPaid += itPaid;
          const cleanProd = (item.namaProduk || 'Jersey Custom').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim();
          return `   • ${cleanProd} (${q} Pcs): ${itLabel}`;
        }).join('\n');

        const poSisa = poTotal - poPaid;
        const poBadge = poSisa <= 0 ? '[LUNAS ✓]' : (poPaid > 0 ? '[SEBAGIAN LUNAS]' : '[BELUM LUNAS]');

        return `${poNum}. PO *${o.namaPo}* (#${o.id}) • Pemesan: ${o.namaPemesan}\n   [${orderItems.length} Item - ${poQty} Pcs] - Total: ${formatRupiah(poTotal)} • Status: ${poBadge} • Sisa: ${formatRupiah(poSisa)}\n${itemLines}`;
      }
    }).join('\n\n');

    return `*${categoryTitle}*\n*${settings.namaToko || 'Nomaden Apparel'}*\nTanggal: ${new Date().toLocaleDateString('id-ID')}\n\n` +
      `*DAFTAR TRANSAKSI (${activeOrders.length} PO / ${totals.totalPcs} Pcs):*\n\n` +
      lines + '\n\n' +
      `==============================\n` +
      `*RINGKASAN STATUS PEMBAYARAN:*\n` +
      `• Total Nilai Transaksi: ${formatRupiah(totals.totalBiayaAll)}\n` +
      `• Sudah Lunas: ${formatRupiah(totals.totalLunasAll)} (${totals.paidOrdersCount} PO)\n` +
      `• *SISA TAGIHAN (BELUM LUNAS): ${formatRupiah(totals.totalSisaAll)}* (${totals.unpaidOrdersCount} PO)\n` +
      `==============================\n\n` +
      `_Catatan: Rekapitulasi resmi pembayaran mitra & vendor konveksi ${settings.namaToko || 'Nomaden Apparel'}._`;
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
    if (selectedOrderIds.length === localOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(localOrders.map(o => o.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white print:static">
      
      {/* Top Floating Control Bar */}
      <div className="no-print sticky top-2 z-20 w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 mb-4 transition-all">
        
        <div className="flex flex-col gap-3">
          
          {/* Row 1: Modal Header & Close Button + Live KPIs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Nota Tagihan Vendor & Mitra Produksi</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Lunas & Sisa Tagihan
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Transparan: Memperlihatkan transaksi lunas vs belum lunas beserta total sisa tagihannya
                </p>
              </div>
            </div>

            {/* KPI Badges on top bar */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <div className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-right">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Transaksi</span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">{formatRupiah(totals.totalBiayaAll)}</span>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg text-right">
                <span className="text-[9px] uppercase font-bold text-emerald-600 block">Sudah Lunas</span>
                <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">{formatRupiah(totals.totalLunasAll)}</span>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-lg text-right">
                <span className="text-[9px] uppercase font-black text-amber-700 dark:text-amber-300 block">Sisa Tagihan</span>
                <span className="text-xs font-mono font-black text-amber-800 dark:text-amber-200">{formatRupiah(totals.totalSisaAll)}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-1"
                title="Tutup (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Row 2: Category Selector & Status Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            
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
                <span>Ongkos Jahit</span>
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
                <span>Ongkos Sublim</span>
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
                <span>Komisi Fee</span>
              </button>
            </div>

            {/* Status Filter Tabs (Semua / Belum Lunas / Lunas) */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter('semua')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'semua'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Tampilkan semua transaksi baik yang lunas maupun belum lunas"
              >
                Semua ({totals.paidOrdersCount + totals.unpaidOrdersCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('belum_lunas')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'belum_lunas'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
                title="Hanya tampilkan transaksi yang belum lunas (ada sisa tagihan)"
              >
                <AlertCircle className="h-3 w-3" />
                <span>Belum Lunas ({totals.unpaidOrdersCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('lunas')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'lunas'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
                title="Hanya tampilkan transaksi yang sudah lunas"
              >
                <CheckCircle2 className="h-3 w-3" />
                <span>Lunas ({totals.paidOrdersCount})</span>
              </button>
            </div>

            {/* Vendor Filter dropdown */}
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
            
            {/* Left Actions: Selection Toggle, Quick Status Manage, & Zoom */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                title="Pilih / Batal Semua PO"
              >
                {selectedOrderIds.length === localOrders.length ? (
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                ) : (
                  <Square className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span>{selectedOrderIds.length}/{localOrders.length} PO Terpilih</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQuickManageOpen(!isQuickManageOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isQuickManageOpen
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                }`}
                title="Buka panel cepat untuk menandai transaksi Lunas / Belum Lunas"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Ubah Status Cepat</span>
                {isQuickManageOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
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

          {/* Quick Management Drawer for Payment Status */}
          {isQuickManageOpen && (
            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Edit3 className="h-4 w-4 text-amber-600" />
                  <span>Kelola Status Bayar Transaksi ({activeOrders.length} PO)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleBulkSetStatus('Lunas')}
                    className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] hover:bg-emerald-200 cursor-pointer"
                  >
                    Tandai Semua Lunas
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkSetStatus('Belum Lunas')}
                    className="px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold text-[11px] hover:bg-rose-200 cursor-pointer"
                  >
                    Tandai Semua Belum Lunas
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {activeOrders.map(order => {
                  const paymentStatus = checkOrderPaymentStatus(order, settings.cashFlowList, localOrders);
                  const isJL = order.statusBayarJahit === 'Lunas' || (order.statusBayarJahit !== 'Belum Lunas' && paymentStatus.isJahitPaid);
                  const isSL = order.statusBayarSublim === 'Lunas' || (order.statusBayarSublim !== 'Belum Lunas' && paymentStatus.isSublimPaid);
                  const isKL = order.statusBayarKomisi === 'Lunas' || (order.statusBayarKomisi !== 'Belum Lunas' && paymentStatus.isKomisiPaid);

                  return (
                    <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{order.namaPo}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">#{order.id} • {order.namaPemesan}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleOrderPayment(order.id, 'jahit')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                            isJL ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 hover:bg-amber-100'
                          }`}
                        >
                          Jahit: {isJL ? 'Lunas ✓' : 'Belum'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleOrderPayment(order.id, 'sublim')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                            isSL ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 hover:bg-sky-100'
                          }`}
                        >
                          Sublim: {isSL ? 'Lunas ✓' : 'Belum'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleOrderPayment(order.id, 'komisi')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                            isKL ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 hover:bg-emerald-100'
                          }`}
                        >
                          Komisi: {isKL ? 'Lunas ✓' : 'Belum'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
              statusFilter={statusFilter}
              vendorNameFilter={vendorNameFilter}
              customNotes={customNotes}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
