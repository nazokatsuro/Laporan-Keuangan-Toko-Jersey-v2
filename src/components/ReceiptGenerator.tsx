/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Pesanan, ShopSettings } from '../types';
import { formatRupiah, safeHtml2canvas } from '../utils';
import { SpkJahitDocument } from './SpkJahitDocument';
import { 
  Download, 
  Printer, 
  Calendar, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  CheckCircle,
  FileText,
  Clock,
  ArrowLeft,
  Settings2,
  FileImage,
  Layers,
  ChevronRight,
  Instagram,
  MessageSquare,
  Send,
  Scissors,
  Check,
  ImageOff,
  ClipboardList
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface EditableTextProps {
  isEditing: boolean;
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  placeholder?: string;
  isTextArea?: boolean;
  rows?: number;
}

function EditableText({ isEditing, value, onChange, className = '', placeholder = '', isTextArea = false, rows = 2 }: EditableTextProps) {
  if (!isEditing) {
    if (isTextArea) {
      return <p className={`whitespace-pre-wrap ${className}`}>{value}</p>;
    }
    return <span className={className}>{value}</span>;
  }

  const baseInputClass = "bg-amber-50/50 hover:bg-amber-100/80 transition-colors border border-dashed border-amber-300 rounded px-1.5 py-0.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 max-w-full font-inherit inline-block text-left";

  if (isTextArea) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${baseInputClass} w-full resize-y`}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${baseInputClass} w-full`}
    />
  );
}

function CollarGraphic({ type }: { type?: string }) {
  const norm = (type || '').toLowerCase();
  
  if (norm.includes('v-neck') || norm.includes('v neck') || norm.includes('kerah v') || norm.includes('lancip')) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
        <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 0 C40 20, 60 20, 90 0 M20 0 L50 48 L80 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20 0 L50 36 L80 0" stroke="currentColor" strokeWidth="2" strokeDasharray="2,2" />
          <text x="50" y="55" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">V-NECK STYLE</text>
        </svg>
      </div>
    );
  }
  
  if (norm.includes('polo') || norm.includes('wangky') || norm.includes('lipat')) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
        <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 5 L50 35 L80 5" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
          <path d="M20 5 L35 40 L50 35 L65 40 L80 5" fill="currentColor" opacity="0.1" />
          <path d="M50 35 L50 55" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="50" cy="42" r="2" fill="#ef4444" />
          <circle cx="50" cy="50" r="2" fill="#ef4444" />
          <text x="50" y="58" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">POLO STYLE</text>
        </svg>
      </div>
    );
  }
  
  if (norm.includes('shanghai') || norm.includes('koko') || norm.includes('kerah sanghai') || norm.includes('shanghay')) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
        <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25 25 C40 12, 60 12, 75 25" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <path d="M43 18 L50 25 L57 18" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="18" r="2.5" fill="#10b981" />
          <text x="50" y="55" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">SHANGHAI STYLE</text>
        </svg>
      </div>
    );
  }
  
  if (norm.includes('sleting') || norm.includes('resleting') || norm.includes('zipper')) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
        <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 5 C35 15, 65 15, 80 5" stroke="currentColor" strokeWidth="3" />
          <path d="M50 12 L50 48" stroke="currentColor" strokeWidth="4" strokeDasharray="1,1"/>
          <rect x="47" y="16" width="6" height="10" rx="1" fill="#374151" />
          <text x="50" y="58" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">ZIPPER STYLE</text>
        </svg>
      </div>
    );
  }

  // Default Standard O-Neck
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
      <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 5 C30 25, 70 25, 80 5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M20 5 C30 22, 70 22, 80 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
        <text x="50" y="55" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">O-NECK STYLE</text>
      </svg>
    </div>
  );
}

interface ReceiptGeneratorProps {
  pesanan: Pesanan | Pesanan[];
  settings: ShopSettings;
  notaType?: 'pelanggan' | 'sublim' | 'jahit' | 'komisi' | 'spk_jahit';
  onCancel: () => void;
}

interface SpkJahitPageDetail {
  type: 'details' | 'drawings' | 'sizing';
  badge: string;
  sub: string;
  sizingLines?: string[];
  pageLabel: string;
}

export function getSpkJahitPagesContent(item: any): SpkJahitPageDetail[] {
  const pages: SpkJahitPageDetail[] = [];

  // Page 1 is always main details
  pages.push({
    type: 'details',
    badge: 'SPK JAHIT (1/[TOTAL])',
    sub: 'Fokus Kerja & Spesifikasi Jahit',
    pageLabel: 'page1',
  });

  // Page 2 is always drawings (Mockup & Collar) - centered proportionally
  pages.push({
    type: 'drawings',
    badge: 'SPK JAHIT (2/[TOTAL])',
    sub: 'Gambar Mockup & Bentuk Kerah (Collar)',
    pageLabel: 'page2',
  });

  // Page 3+ is for sizing data, if it exists
  const rawLines = item.detailSizeNama 
    ? item.detailSizeNama.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0) 
    : [];

  if (rawLines.length > 0) {
    // Each page can hold up to 60 lines divided into two columns of 30 lines each
    const linesPerPage = 60;
    const chunkedLines: string[][] = [];
    for (let i = 0; i < rawLines.length; i += linesPerPage) {
      chunkedLines.push(rawLines.slice(i, i + linesPerPage));
    }

    chunkedLines.forEach((linesChunk, idx) => {
      pages.push({
        type: 'sizing',
        badge: `SPK JAHIT (${3 + idx}/[TOTAL])`,
        sub: chunkedLines.length > 1 
          ? `Data Sizing & Daftar Nama Konsumen (Bagian ${idx + 1})` 
          : 'Data Sizing & Daftar Nama Konsumen (Lengkap)',
        sizingLines: linesChunk,
        pageLabel: `page3-${idx}`,
      });
    });
  }

  // Update total pages in badges
  const total = pages.length;
  pages.forEach((p) => {
    p.badge = p.badge.replace('[TOTAL]', total.toString());
  });

  return pages;
}

interface InvoicePageInfo {
  id: string;
  suffix: string;
  isSizingPage?: boolean;
}

export function getInvoicePages(item: any, notaType: string): InvoicePageInfo[] {
  if (notaType === 'spk_jahit') {
    return getSpkJahitPagesContent(item).map((p, idx) => ({
      id: `invoice-paper-${item.id}-${p.pageLabel}`,
      suffix: `-PAGE${idx + 1}`
    }));
  }

  // Check if detailSizeNama triggers splitting
  const rawLines = item.detailSizeNama 
    ? item.detailSizeNama.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0) 
    : [];

  // Limit of 12 lines. If exceeded, split!
  if (notaType !== 'jahit' && rawLines.length > 12) {
    return [
      { id: `invoice-paper-${item.id}-page1`, suffix: '-FAKTUR' },
      { id: `invoice-paper-${item.id}-page2`, suffix: '-SIZING', isSizingPage: true }
    ];
  }

  return [
    { id: `invoice-paper-${item.id}`, suffix: '' }
  ];
}

export default function ReceiptGenerator({ pesanan, settings, notaType = 'pelanggan', onCancel }: ReceiptGeneratorProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [isEditingTexts, setIsEditingTexts] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});

  const getVal = (itemId: string, key: string, fallback: string) => {
    return (overrides[itemId] && overrides[itemId][key] !== undefined)
      ? overrides[itemId][key]
      : fallback;
  };

  const setVal = (itemId: string, key: string, value: string) => {
    setOverrides(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || {}),
        [key]: value
      }
    }));
  };

  const pesananArray = Array.isArray(pesanan) ? pesanan : [pesanan];
  const isBatch = Array.isArray(pesanan);

  // Helper to calculate sublim cost for an individual PO/order
  const getSublimCost = (item: Pesanan) => {
    return (item.items && item.items.length > 0)
      ? item.items.reduce((sum, it) => sum + (it.qty * (it.printPerPcs || 0)), 0)
      : (item.qty * (item.printPerPcs || 0));
  };

  // Helper to check if sublim is paid
  const isSublimPaid = (item: Pesanan) => {
    return settings.cashFlowList?.some(cf => 
      cf.keterangan.includes(`Bayar Sublim/Print PO ${item.namaPo}`)
    ) || false;
  };

  // Helper to calculate jahit cost for an individual PO/order
  const getJahitCost = (item: Pesanan) => {
    return (item.items && item.items.length > 0)
      ? item.items.reduce((sum, it) => sum + (it.qty * (it.jahitPerPcs || 0)), 0)
      : (item.qty * (item.jahitPerPcs || 0));
  };

  // Helper to check if jahit is paid
  const isJahitPaid = (item: Pesanan) => {
    return settings.cashFlowList?.some(cf => 
      cf.keterangan.includes(`Bayar Jahit PO ${item.namaPo}`)
    ) || false;
  };

  // Helper to calculate commission cost for an individual PO/order
  const getKomisiCost = (item: Pesanan) => {
    const baseKomisi = item.komisiPerPcs || 0;
    if (item.items && item.items.length > 0) {
      return item.items.reduce((sum, it) => {
        const itemRate = it.komisiPerPcs !== undefined ? it.komisiPerPcs : baseKomisi;
        return sum + (it.qty * itemRate);
      }, 0);
    }
    return item.qty * baseKomisi;
  };

  // Helper to check if commission is paid via cash flow
  const isKomisiPaid = (item: Pesanan) => {
    return settings.cashFlowList?.some(cf => 
      cf.keterangan.toLowerCase().includes(`komisi`) && cf.keterangan.includes(item.namaPo)
    ) || false;
  };

  const totalQty = pesananArray.reduce((acc, curr) => acc + curr.qty, 0);

  // Custom total sums based on invoice type
  const totalHargaSum = React.useMemo(() => {
    if (notaType === 'sublim') {
      return pesananArray.reduce((acc, curr) => acc + getSublimCost(curr), 0);
    }
    if (notaType === 'jahit') {
      return pesananArray.reduce((acc, curr) => acc + getJahitCost(curr), 0);
    }
    if (notaType === 'komisi') {
      return pesananArray.reduce((acc, curr) => acc + getKomisiCost(curr), 0);
    }
    return pesananArray.reduce((acc, curr) => acc + curr.totalHarga, 0);
  }, [pesananArray, notaType, settings.cashFlowList]);

  const totalUangMasukSum = React.useMemo(() => {
    if (notaType === 'sublim') {
      return pesananArray.reduce((acc, curr) => acc + (isSublimPaid(curr) ? getSublimCost(curr) : 0), 0);
    }
    if (notaType === 'jahit') {
      return pesananArray.reduce((acc, curr) => acc + (isJahitPaid(curr) ? getJahitCost(curr) : 0), 0);
    }
    if (notaType === 'komisi') {
      return pesananArray.reduce((acc, curr) => acc + (isKomisiPaid(curr) ? getKomisiCost(curr) : 0), 0);
    }
    return pesananArray.reduce((acc, curr) => acc + curr.uangMasuk, 0);
  }, [pesananArray, notaType, settings.cashFlowList]);

  const totalSisaTagihanSum = React.useMemo(() => {
    if (notaType === 'sublim') {
      return pesananArray.reduce((acc, curr) => acc + (isSublimPaid(curr) ? 0 : getSublimCost(curr)), 0);
    }
    if (notaType === 'jahit') {
      return pesananArray.reduce((acc, curr) => acc + (isJahitPaid(curr) ? 0 : getJahitCost(curr)), 0);
    }
    if (notaType === 'komisi') {
      return pesananArray.reduce((acc, curr) => acc + (isKomisiPaid(curr) ? 0 : getKomisiCost(curr)), 0);
    }
    return pesananArray.reduce((acc, curr) => acc + curr.sisaTagihan, 0);
  }, [pesananArray, notaType, settings.cashFlowList]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Setting':
        return 'text-indigo-600';
      case 'Print Press':
        return 'text-pink-600';
      case 'Jahit':
        return 'text-amber-600';
      case 'Tinggal Kirim':
        return 'text-teal-600';
      case 'Beres':
        return 'text-emerald-600';
      default:
        return 'text-slate-600';
    }
  };

  // Convert receipts to JPG (HD resolution files downloaded sequentially with a brief delay)
  const downloadJPG = async () => {
    const wasEditing = isEditingTexts;
    if (wasEditing) {
      setIsEditingTexts(false);
      // Let the DOM update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setExporting(true);
    try {
      const targets: { id: string; filename: string }[] = [];
      for (const item of pesananArray) {
        const pages = getInvoicePages(item, notaType);
        const poNameNorm = getVal(item.id, 'namaPo', item.namaPo).replace(/\s+/g, '_');
        const prefix = notaType === 'spk_jahit' ? 'SPK' : 'NOTA';
        pages.forEach((p) => {
          targets.push({
            id: p.id,
            filename: `${prefix}-${item.id}-${poNameNorm}${p.suffix}.jpg`
          });
        });
      }

      if (pesananArray.length > 1) {
        targets.push({
          id: 'invoice-paper-batch-summary',
          filename: `REKAP-BATCH-${pesananArray.length}_TRANSAKSI.jpg`
        });
      }

      for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const element = document.getElementById(target.id);
        if (!element) continue;

        const canvas = await safeHtml2canvas(element, {
          scale: 3, // High scale for HD output without blurring text
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff', // Force clean white canvas backplate
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const link = document.createElement('a');
        link.href = imgData;
        link.download = target.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Crucial 500ms delay to prevent browsers from blocking bulk simultaneous downloads
        if (i < targets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Gagal export JPG:', error);
      alert('Gagal mendownload JPEG. Mohon coba lagi.');
    } finally {
      setExporting(false);
      if (wasEditing) {
        setIsEditingTexts(true);
      }
    }
  };

  // Convert receipts to PDF (perfectly scaled continuous pages combined into one document)
  const downloadPDF = async () => {
    const wasEditing = isEditingTexts;
    if (wasEditing) {
      setIsEditingTexts(false);
      // Let the DOM update
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setExporting(true);
    try {
      let pdf: jsPDF | null = null;
      const targetIds: string[] = [];
      for (const item of pesananArray) {
        const pages = getInvoicePages(item, notaType);
        pages.forEach(p => {
          targetIds.push(p.id);
        });
      }
      if (pesananArray.length > 1) {
        targetIds.push('invoice-paper-batch-summary');
      }

      for (let i = 0; i < targetIds.length; i++) {
        const id = targetIds[i];
        const element = document.getElementById(id);
        if (!element) continue;

        const canvas = await safeHtml2canvas(element, {
          scale: 3, // Prevent blur
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const imgWidth = 210; // mm standard A4 width
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i === 0) {
          pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [imgWidth, imgHeight]
          });
        } else if (pdf) {
          pdf.addPage([imgWidth, imgHeight], 'portrait');
        }

        if (pdf) {
          // Draw image occupying 100% of the calculated page surface
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        }
      }

      if (pdf) {
        const firstPo = getVal(pesananArray[0].id, 'namaPo', pesananArray[0].namaPo);
        const filename = isBatch 
          ? `BATCH-NOTA-${pesananArray.length}_TRANSAKSI.pdf`
          : `NOTA-${pesananArray[0].id}-${firstPo.replace(/\s+/g, '_')}.pdf`;
        pdf.save(filename);
      }
    } catch (error) {
      console.error('Gagal export PDF:', error);
      alert('Gagal mendownload PDF. Mohon coba lagi.');
    } finally {
      setExporting(false);
      if (wasEditing) {
        setIsEditingTexts(true);
      }
    }
  };

  // Print system default
  const handlePrint = async () => {
    const wasEditing = isEditingTexts;
    if (wasEditing) {
      setIsEditingTexts(false);
      // Let the DOM update
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    window.print();
    if (wasEditing) {
      setIsEditingTexts(true);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in no-print">
      
      {/* Dynamic Style Injection for Perfect Page Breaks & Printing Aesthetics */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          body, html {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #invoice-paper-container {
            background: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .invoice-card {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 10mm 15mm !important;
            max-width: 100% !important;
            width: 100% !important;
            background-color: #ffffff !important;
          }
          .no-print-gap {
            gap: 0 !important;
          }
          input, textarea {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            outline: none !important;
            box-shadow: none !important;
            width: auto !important;
            resize: none !important;
          }
        }
      `}</style>
      
      {/* Top Controller header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Daftar Pesanan
          </button>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            {isBatch 
              ? `Pratinjau Batch ${notaType === 'spk_jahit' ? 'SPK Kerja' : notaType === 'sublim' ? 'Nota Sublim' : notaType === 'jahit' ? 'Nota Jahit' : 'Nota'} (${pesananArray.length} Transaksi)` 
              : `Pratinjau ${notaType === 'spk_jahit' ? 'SPK Deskripsi Kerja Jahit' : notaType === 'sublim' ? 'Nota Bayar Sublim' : notaType === 'jahit' ? 'Nota Bayar Jahit' : 'Nota Transaksi'}`
            }
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {notaType === 'spk_jahit'
              ? 'Formulir perintah kerja produksi khusus untuk diserahkan ke penjahit (tanpa rincian harga / keuangan).'
              : isBatch 
                ? `Preview batch ${pesananArray.length} transaksi pembayaran vendor. Unduh JPG massal, gabung satu PDF, atau cetak sekaligus.`
                : `Preview, ubah rincian bayar secara manual, unduh JPG/PDF HD, atau print langsung sebagai bukti pembayaran.`
            }
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Manual Text Edit */}
          <button
            onClick={() => setIsEditingTexts(!isEditingTexts)}
            className={`flex items-center gap-1.5 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all cursor-pointer border ${
              isEditingTexts 
                ? 'bg-amber-500 hover:bg-amber-600 border-amber-550 text-white shadow-xs' 
                : 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-755 border-slate-205 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Aktifkan mode edit teks manual langsung di nota"
          >
            <Settings2 className={`h-4 w-4 ${isEditingTexts ? 'animate-spin' : ''}`} />
            {isEditingTexts ? 'Selesai Edit' : 'Edit Teks Nota'}
          </button>

          {/* Download JPEG */}
          <button
            onClick={downloadJPG}
            disabled={exporting}
            className="flex items-center gap-1 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-755 border border-slate-205 dark:border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            <FileImage className="h-4 w-4 text-emerald-500" />
            {exporting ? 'Memproses...' : isBatch ? 'Download Semua (JPG)' : 'Export JPG'}
          </button>

          {/* Download PDF */}
          <button
            onClick={downloadPDF}
            disabled={exporting}
            className="flex items-center gap-1 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-755 border border-slate-205 dark:border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-rose-500" />
            {exporting ? 'Memproses...' : isBatch ? 'Gabung ke PDF' : 'Export PDF'}
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>
              {isBatch 
                ? `Cetak Semua ${notaType === 'spk_jahit' ? 'SPK Jahit' : notaType === 'sublim' ? 'Nota Sublim' : notaType === 'jahit' ? 'Nota Jahit' : 'Nota'}` 
                : `Cetak ${notaType === 'spk_jahit' ? 'SPK Deskripsi Jahit' : notaType === 'sublim' ? 'Nota Sublim' : notaType === 'jahit' ? 'Nota Jahit' : 'Nota'}`
              }
            </span>
          </button>
        </div>
      </div>

      {/* WhatsApp Reminders (Single Order only) */}
      {!isBatch && pesananArray.length > 0 && pesananArray[0].noTelepon && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in no-print shadow-4xs">
          <div className="flex items-center gap-2.5">
            <span className="text-xl shrink-0">📱</span>
            <div>
              <strong className="font-extrabold text-xs text-slate-900 dark:text-white">Pengingat WhatsApp Otomatis</strong>
              <p className="text-[11px] text-slate-500 mt-0.5">Kirim penagihan sisa pembayaran atau estimasi selesainya pengerjaan jersey langsung ke nomor pelanggan.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${pesananArray[0].noTelepon.replace(/[^0-9]/g, '').startsWith('0') ? '62' + pesananArray[0].noTelepon.replace(/[^0-9]/g, '').substring(1) : pesananArray[0].noTelepon.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak,\n\nMengingatkan sisa pembayaran PO:\n\n*${pesananArray[0].namaPo}*\n\nSisa Tagihan:\n*${formatRupiah(pesananArray[0].sisaTagihan)}*\n\nTerima kasih.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-3xs"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WA Tagihan</span>
            </a>
            <a
              href={`https://wa.me/${pesananArray[0].noTelepon.replace(/[^0-9]/g, '').startsWith('0') ? '62' + pesananArray[0].noTelepon.replace(/[^0-9]/g, '').substring(1) : pesananArray[0].noTelepon.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak,\n\nPesanan *${pesananArray[0].namaPo}* sedang dalam proses produksi.\n\nEstimasi selesai:\n*${pesananArray[0].deadline}*\n\nTerima kasih.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-3xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>WA Deadline</span>
            </a>
          </div>
        </div>
      )}

      {/* Info Warning Banner when Manual Edit is Engaged */}
      {isEditingTexts && (
        <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5 animate-fade-in shadow-xs">
          <span className="text-base leading-none shrink-0">✍️</span>
          <div>
            <strong className="font-bold">Mode Edit Teks Aktif!</strong>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              Silakan klik pada kolom teks bergaris putus-putus kuning di dalam nota di bawah ini untuk menggantinya secara manual. Semua perubahan bersifat sementara untuk keperluan cetak/unduh saat ini dan tidak akan merubah database utama.
            </p>
          </div>
        </div>
      )}

      {/* Invoice Container with subtle card layout */}
      <div id="invoice-paper-container" className="bg-slate-100 dark:bg-slate-900 p-2 sm:p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex justify-center">
        
        {/* Actual Paper block container to be generated */}
        <div 
          ref={receiptRef}
          className="w-full flex flex-col items-center gap-6 no-print-gap"
        >
          {pesananArray.map((item, index) => {
            const currentOrderSubtotalCost = 
              notaType === 'sublim' 
                ? getSublimCost(item) 
                : notaType === 'jahit' 
                  ? getJahitCost(item) 
                  : notaType === 'komisi'
                    ? getKomisiCost(item)
                    : item.totalHarga;

            const currentOrderPaidCost = 
              notaType === 'sublim' 
                ? (isSublimPaid(item) ? getSublimCost(item) : 0) 
                : notaType === 'jahit' 
                  ? (isJahitPaid(item) ? getJahitCost(item) : 0) 
                  : notaType === 'komisi'
                    ? (isKomisiPaid(item) ? getKomisiCost(item) : 0)
                    : item.uangMasuk;

            const currentOrderUnpaidCost = 
              notaType === 'sublim' 
                ? (isSublimPaid(item) ? 0 : getSublimCost(item)) 
                : notaType === 'jahit' 
                  ? (isJahitPaid(item) ? 0 : getJahitCost(item)) 
                  : notaType === 'komisi'
                    ? (isKomisiPaid(item) ? 0 : getKomisiCost(item))
                    : item.sisaTagihan;

            const isFullyPaid = currentOrderUnpaidCost === 0;

            if (notaType === 'spk_jahit') {
              return (
                <SpkJahitDocument
                  key={item.id}
                  item={item}
                  index={index}
                  pesananArray={pesananArray}
                  settings={settings}
                />
              );
            }

            if ((notaType as any) === 'spk_jahit' && item.detailSizeNama) {
              return (
                <React.Fragment key={item.id}>
                  {/* Page 1: Main SPK specifications */}
                  <div 
                    id={`invoice-paper-${item.id}-page1`}
                    className="w-full max-w-[680px] bg-white p-6 sm:p-10 rounded-xs shadow-md text-slate-805 border border-slate-200/60 font-sans relative invoice-card page-break text-left"
                  >
                    <div className="space-y-6 text-left relative">
                      {/* Decorative header */}
                      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                        <div>
                          <h1 className="text-xl font-black tracking-tight text-indigo-900">
                            SURAT PERINTAH KERJA (SPK) PRODUCTION
                          </h1>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 animate-pulse">
                            Fokus Jahit &amp; Spesifikasi Pola Kerja
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] bg-violet-100 text-violet-800 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                            SPK JAHIT (1/2)
                          </span>
                          <h2 className="text-xs font-black text-slate-500 mt-1">NO: #{item.id}</h2>
                        </div>
                      </div>

                      {/* Metadata bar */}
                      <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama Konsumen / Pemesan</span>
                          <strong className="text-xs text-slate-800">{item.namaPemesan || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama PO / Tim</span>
                          <strong className="text-xs text-slate-800">{item.namaPo || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Target Selesai (Deadline)</span>
                          <strong className="text-xs text-rose-600 font-black">
                            {new Date(item.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </strong>
                        </div>
                      </div>

                      {/* Layout Specification Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-5">
                          {/* 1. Detail Bahan */}
                          <div className="p-3.5 bg-indigo-50/20 rounded-xl border border-indigo-100/70">
                            <span className="block text-[9px] font-extrabold text-indigo-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <Scissors className="h-3 w-3 text-indigo-600" /> Bahan Jersey Pelanggan
                            </span>
                            <p className="text-xs font-semibold text-slate-850">
                              {item.items && item.items.length > 0
                                ? item.items.map(it => `${it.namaProduk} (${it.bahan})`).join(', ')
                                : (item.bahan || 'Bahan Jersey')}
                            </p>
                          </div>

                          {/* 2. Item Qty List and Miscellaneous */}
                          <div className="p-3.5 bg-teal-50/20 rounded-xl border border-teal-100/70">
                            <span className="block text-[9px] font-extrabold text-teal-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <ShoppingBag className="h-3 w-3 text-teal-600" /> Jenis Produk &amp; Total Qty
                            </span>
                            <div className="text-xs space-y-1 text-slate-755">
                              {((item.items && item.items.length > 0) ? item.items : [{
                                namaProduk: item.namaProduk,
                                qty: item.qty
                              }]).map((p, pIdx) => (
                                <div key={pIdx} className="flex justify-between border-b border-dashed border-slate-150 py-1">
                                  <span className="font-medium text-slate-800">{p.namaProduk}</span>
                                  <span className="font-bold text-slate-950">{p.qty} pcs</span>
                                </div>
                              ))}
                              <div className="flex justify-between font-black pt-1.5 text-indigo-900 text-xs">
                                <span>TOTAL KESELURUHAN</span>
                                <span>{item.qty} pcs</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-5">
                          {/* 3. Deskripsi Jahit */}
                          <div className="p-3.5 bg-amber-50/20 rounded-xl border border-amber-200/50 h-full flex flex-col space-y-4">
                            <span className="block text-[9px] font-extrabold text-amber-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-amber-100 pb-1.5">
                              <ClipboardList className="h-3 w-3 text-amber-600" /> Deskripsi Kerja &amp; Catatan Jahit
                            </span>

                            {/* Catatan Khusus Jahit */}
                            <div>
                              <span className="block text text-[8px] font-extrabold text-amber-850 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Catatan Khusus Penjahit
                              </span>
                              <div className="text-[11px] text-slate-900 font-bold whitespace-pre-wrap leading-relaxed">
                                {item.items && item.items.length > 0
                                  ? item.items.map(it => `${it.namaProduk}: ${it.catatanJahit || '(Tanpa Catatan Khusus)'}`).join('\n')
                                  : (item.catatanJahit || '(Tanpa Catatan Khusus)')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer / Signoffs for factory tracking */}
                      <div className="grid grid-cols-3 gap-6 font-bold text-center text-[10px] uppercase tracking-wider pt-8 text-slate-500">
                        <div className="border-t border-slate-200 pt-3">
                          <span className="block text-[8px] text-slate-400 font-normal">Operator Desain/SPK</span>
                          <div className="h-10" />
                          <p className="text-slate-800 font-bold">{settings.namaToko || 'Nomaden Apparel'}</p>
                        </div>
                        <div className="border-t border-slate-200 pt-3">
                          <span className="block text-[8px] text-slate-400 font-normal">Penerima Kerja (Penjahit)</span>
                          <div className="h-10" />
                          <p className="border-b border-dashed border-slate-350 mx-auto w-32"></p>
                        </div>
                        <div className="border-t border-slate-200 pt-3">
                          <span className="block text-[8px] text-slate-400 font-normal">Kepala Produksi (QC)</span>
                          <div className="h-10" />
                          <p className="border-b border-dashed border-slate-350 mx-auto w-32"></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Page 2: Sizing Details and Names only */}
                  <div
                    id={`invoice-paper-${item.id}-page2`}
                    className={`w-full max-w-[680px] bg-white p-6 sm:p-10 rounded-xs shadow-md text-slate-805 border border-slate-200/60 font-sans relative invoice-card text-left ${
                      (index < pesananArray.length - 1 || pesananArray.length > 1) ? 'page-break' : ''
                    }`}
                  >
                    <div className="space-y-6 text-left relative">
                      {/* Decorative header */}
                      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                        <div>
                          <h1 className="text-xl font-black tracking-tight text-indigo-900">
                            SURAT PERINTAH KERJA (SPK) PRODUCTION
                          </h1>
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">
                            DATA SIZING &amp; DAFTAR NAMA KONSUMEN
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] bg-amber-100 text-amber-805 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                            SPK JAHIT (2/2)
                          </span>
                          <h2 className="text-xs font-black text-slate-500 mt-1">NO: #{item.id}</h2>
                        </div>
                      </div>

                      {/* Metadata bar */}
                      <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama Konsumen / Pemesan</span>
                          <strong className="text-xs text-slate-800">{item.namaPemesan || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama PO / Tim</span>
                          <strong className="text-xs text-slate-800">{item.namaPo || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Target Selesai (Deadline)</span>
                          <strong className="text-xs text-rose-600 font-black">
                            {new Date(item.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                          </strong>
                        </div>
                      </div>

                      {/* Layout Specification Columns on Page 2 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-4">
                          {/* Sizing Data Box */}
                          <div className="p-3.5 bg-amber-50/20 rounded-xl border border-amber-250/70 flex flex-col h-full min-h-[440px]">
                            <span className="block text-[9px] font-extrabold text-amber-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5 text-amber-650" /> Data Sizing &amp; Daftar Nama Konsumen (Lengkap)
                            </span>
                            <div 
                              className={`text-[10px] text-slate-850 font-mono leading-relaxed bg-white p-3 rounded-lg border border-amber-105 flex-1 min-h-[380px] ${
                                item.detailSizeNama && item.detailSizeNama.split('\n').filter(Boolean).length > 15 
                                  ? 'columns-2 gap-x-4 [column-fill:auto]' 
                                  : ''
                              }`}
                            >
                              {item.detailSizeNama ? item.detailSizeNama.split('\n').map((line, lIdx) => (
                                <div key={lIdx} className="break-inside-avoid whitespace-pre text-[9.5px]">
                                  {line || ' '}
                                </div>
                              )) : (
                                <span className="text-slate-400 italic">Data sizing kosong</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {/* Jersey Mockup */}
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="block text-[9px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5">
                              Gambar Mockup Desain Jersey (PO)
                            </span>
                            {item.mockupUrl ? (
                              <div className="h-44 w-full bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden p-1">
                                <img 
                                  src={item.mockupUrl} 
                                  alt="Jersey Mockup" 
                                  className="max-h-full max-w-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <div className="h-44 w-full bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 p-3">
                                <ImageOff className="h-8 w-8 text-slate-300" />
                                <span className="text-[10px] font-semibold">Mockup desain tidak tersedia</span>
                              </div>
                            )}
                          </div>

                          {/* Bentuk Kerah */}
                          <div className="p-3 bg-indigo-50/20 rounded-xl border border-indigo-100/70">
                            <span className="block text-[9px] font-extrabold text-indigo-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                              <Layers className="h-3 w-3 text-indigo-600" /> Bentuk Kerah (Collar)
                            </span>
                            <p className="text-xs font-semibold text-slate-850 mb-1">
                              {item.items && item.items.length > 0
                                ? item.items.map(it => `${it.modelKerah || 'O-Neck (Standar)'}`).join(', ')
                                : (item.modelKerah || 'O-Neck (Standar)')}
                            </p>
                            {/* Collar Graphic / Custom Photo */}
                            <div className="pt-1 select-none flex justify-center">
                              {item.fotoKerahUrl ? (
                                <div className="flex flex-col items-center justify-center p-1.5 bg-white border border-slate-250 rounded-lg h-24 w-24 shadow-xs overflow-hidden">
                                  <img
                                    src={item.fotoKerahUrl}
                                    alt="Custom Collar"
                                    className="max-h-full max-w-full object-contain rounded"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              ) : (
                                <CollarGraphic type={item.modelKerah || (item.items && item.items[0]?.modelKerah)} />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer / Signoffs for factory tracking */}
                      <div className="grid grid-cols-3 gap-6 font-bold text-center text-[10px] uppercase tracking-wider pt-8 text-slate-500">
                        <div className="border-t border-slate-200 pt-3">
                          <span className="block text-[8px] text-slate-400 font-normal">Operator Desain/SPK</span>
                          <div className="h-10" />
                          <p className="text-slate-800 font-bold">{settings.namaToko || 'Nomaden Apparel'}</p>
                        </div>
                        <div className="border-t border-slate-200 pt-3">
                          <span className="block text-[8px] text-slate-400 font-normal">Penerima Kerja (Penjahit)</span>
                          <div className="h-10" />
                          <p className="border-b border-dashed border-slate-350 mx-auto w-32"></p>
                        </div>
                        <div className="border-t border-slate-200 pt-3">
                          <span className="block text-[8px] text-slate-400 font-normal">Kepala Produksi (QC)</span>
                          <div className="h-10" />
                          <p className="border-b border-dashed border-slate-350 mx-auto w-32"></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            }

            const pages = getInvoicePages(item, notaType);
            const rawLines = item.detailSizeNama 
              ? item.detailSizeNama.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0) 
              : [];

            return (
              <React.Fragment key={item.id}>
                {pages.map((p, pIdx) => {
                  const isLastPageOfThisItem = pIdx === pages.length - 1;
                  const isLastItemOfAll = index === pesananArray.length - 1;
                  const shouldBreakPage = !isLastPageOfThisItem || !isLastItemOfAll;

                  if (p.isSizingPage) {
                    return (
                      <div
                        key={`${item.id}-${p.id}`}
                        id={p.id}
                        className={`w-full max-w-[680px] bg-white p-6 sm:p-10 rounded-xs shadow-md text-slate-805 border border-slate-200/60 font-sans relative invoice-card text-left ${
                          shouldBreakPage ? 'page-break' : ''
                        }`}
                      >
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 to-indigo-600 no-print" />
                  
                        <div className="space-y-6 text-left relative pt-2">
                          {/* Header */}
                          <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4">
                            <div>
                              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase font-sans">
                                Lampiran Detail Sizing &amp; Nama Konsumen
                              </h1>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                Invoice No: #{item.id} — Kelengkapan Bukti Pesanan
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] bg-amber-105 text-amber-800 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider inline-block">
                                TM / Sizing Halaman 2/2
                              </span>
                            </div>
                          </div>

                          {/* Metadata summary */}
                          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                            <div>
                              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama Pemesan</span>
                              <strong className="text-slate-800">{item.namaPemesan || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama PO / Tim</span>
                              <strong className="text-slate-800">{item.namaPo || 'N/A'}</strong>
                            </div>
                            <div>
                              <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Total Qty</span>
                              <strong className="text-slate-800">{item.qty} Pcs</strong>
                            </div>
                          </div>

                          {/* Sizing list in 2 columns */}
                          <div className="p-4 bg-amber-50/25 rounded-md border border-amber-200/50 flex flex-col h-full min-h-[440px]">
                            <span className="block text-[9px] font-extrabold text-amber-800 uppercase tracking-widest mb-3 flex items-center gap-1.5 justify-start">
                              <Check className="h-3.5 w-3.5 text-amber-600" /> Daftar Lengkap Nama &amp; Ukuran
                            </span>
                            <div className="bg-white p-4 rounded-lg border border-amber-100 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 font-mono select-all flex-1 text-[10px]">
                              {/* Column 1 */}
                              <div className="space-y-1 text-left">
                                {rawLines.slice(0, Math.ceil(rawLines.length / 2)).map((line, lIdx) => (
                                  <div key={`col1-${lIdx}`} className="whitespace-pre py-0.5 border-b border-dashed border-slate-100 text-slate-800 text-[10.5px]">
                                    {line}
                                  </div>
                                ))}
                              </div>
                              {/* Column 2 */}
                              <div className="space-y-1 text-left">
                                {rawLines.slice(Math.ceil(rawLines.length / 2)).map((line, lIdx) => (
                                  <div key={`col2-${lIdx}`} className="whitespace-pre py-0.5 border-b border-dashed border-slate-100 text-slate-800 text-[10.5px]">
                                    {line}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Footer branding and verification */}
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans pt-6 border-t border-slate-150">
                            <div>
                              <span>Dicetak secara otomatis oleh <strong>{settings.namaToko || 'Nomaden Apparel'}</strong></span>
                            </div>
                            <div className="flex gap-10 text-center uppercase text-[8px] tracking-wider text-slate-500 font-bold font-sans">
                              <div className="w-24">
                                <span>Operator</span>
                                <div className="h-6" />
                                <span className="border-t border-slate-200 block pt-1 text-slate-700">Staff Produksi</span>
                              </div>
                              <div className="w-24">
                                <span>Pemesan</span>
                                <div className="h-6" />
                                <span className="border-t border-slate-200 block pt-1 text-slate-700">PJ Lapangan</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Non-sizing page, this is Page 1 (Main standard invoice)
                  return (
                    <div 
                      key={`${item.id}-${p.id}`}
                      id={p.id}
                      className={`w-full max-w-[680px] bg-white p-6 sm:p-10 rounded-xs shadow-md text-slate-805 border border-slate-200/60 font-sans relative invoice-card text-left ${
                        shouldBreakPage ? 'page-break' : ''
                      }`}
                    >
                {(notaType as any) === 'spk_jahit' ? (
                  <div className="space-y-6 text-left relative">
                    {/* Decorative header */}
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                      <div>
                        <h1 className="text-xl font-black tracking-tight text-indigo-900">
                          SURAT PERINTAH KERJA (SPK) PRODUCTION
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 animate-pulse">
                          Fokus Jahit &amp; Spesifikasi Pola Kerja
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] bg-violet-100 text-violet-800 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          SPK JAHIT
                        </span>
                        <h2 className="text-xs font-black text-slate-500 mt-1">NO: #{item.id}</h2>
                      </div>
                    </div>

                    {/* Metadata bar */}
                    <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama Konsumen / Pemesan</span>
                        <strong className="text-xs text-slate-800">{item.namaPemesan || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama PO / Tim</span>
                        <strong className="text-xs text-slate-800">{item.namaPo || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Target Selesai (Deadline)</span>
                        <strong className="text-xs text-rose-600 font-black">
                          {new Date(item.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </strong>
                      </div>
                    </div>

                    {/* Layout Specification Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-5">
                        {/* 1. Detail Bahan */}
                        <div className="p-3.5 bg-indigo-50/20 rounded-xl border border-indigo-100/70">
                          <span className="block text-[9px] font-extrabold text-indigo-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Scissors className="h-3 w-3 text-indigo-600" /> Bahan Jersey Pelanggan
                          </span>
                          <p className="text-xs font-semibold text-slate-850">
                            {item.items && item.items.length > 0
                              ? item.items.map(it => `${it.namaProduk} (${it.bahan})`).join(', ')
                              : (item.bahan || 'Bahan Jersey')}
                          </p>
                        </div>

                        {/* 2. Bentuk Kerah */}
                        <div className="p-3.5 bg-indigo-50/20 rounded-xl border border-indigo-100/70">
                          <span className="block text-[9px] font-extrabold text-indigo-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <Layers className="h-3 w-3 text-indigo-600" /> Bentuk Kerah (Collar)
                          </span>
                          <p className="text-xs font-semibold text-slate-850 mb-2">
                            {item.items && item.items.length > 0
                              ? item.items.map(it => `${it.modelKerah || 'O-Neck (Standar)'}`).join(', ')
                              : (item.modelKerah || 'O-Neck (Standar)')}
                          </p>
                          {/* Collar Graphic / Custom Photo */}
                          <div className="pt-1 select-none">
                            {item.fotoKerahUrl ? (
                              <div className="flex flex-col items-center justify-center p-1.5 bg-white border border-slate-250 rounded-lg h-28 w-28 mx-auto shadow-xs overflow-hidden">
                                <img
                                  src={item.fotoKerahUrl}
                                  alt="Custom Collar"
                                  className="max-h-full max-w-full object-contain rounded"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <CollarGraphic type={item.modelKerah || (item.items && item.items[0]?.modelKerah)} />
                            )}
                          </div>
                        </div>

                        {/* 3. Deskripsi Jahit */}
                        <div className="p-3.5 bg-amber-50/20 rounded-xl border border-amber-200/50 h-full flex flex-col space-y-4">
                          <span className="block text-[9px] font-extrabold text-amber-900 uppercase tracking-widest flex items-center gap-1.5 border-b border-amber-100 pb-1.5">
                            <ClipboardList className="h-3 w-3 text-amber-600" /> Deskripsi Kerja &amp; Catatan Jahit
                          </span>

                          {/* Catatan Khusus Jahit */}
                          <div>
                            <span className="block text text-[8px] font-extrabold text-amber-850 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Catatan Khusus Penjahit
                            </span>
                            <div className="text-[11px] text-slate-900 font-bold whitespace-pre-wrap leading-relaxed">
                              {item.items && item.items.length > 0
                                ? item.items.map(it => `${it.namaProduk}: ${it.catatanJahit || '(Tanpa Catatan Khusus)'}`).join('\n')
                                : (item.catatanJahit || '(Tanpa Catatan Khusus)')}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        {/* 4. Jersey Mockup */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="block text-[9px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5">
                            Gambar Mockup Desain Jersey (PO)
                          </span>
                          {item.mockupUrl ? (
                            <div className="h-44 w-full bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden p-1">
                              <img 
                                src={item.mockupUrl} 
                                alt="Jersey Mockup" 
                                className="max-h-full max-w-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="h-44 w-full bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 p-3">
                              <ImageOff className="h-8 w-8 text-slate-300" />
                              <span className="text-[10px] font-semibold">Mockup desain tidak tersedia</span>
                            </div>
                          )}
                        </div>

                        {/* 5. Item Qty List and Miscellaneous */}
                        <div className="p-3.5 bg-teal-50/20 rounded-xl border border-teal-100/70">
                          <span className="block text-[9px] font-extrabold text-teal-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <ShoppingBag className="h-3 w-3 text-teal-600" /> Jenis Produk &amp; Total Qty
                          </span>
                          <div className="text-xs space-y-1 text-slate-755">
                            {((item.items && item.items.length > 0) ? item.items : [{
                              namaProduk: item.namaProduk,
                              qty: item.qty
                            }]).map((p, pIdx) => (
                              <div key={pIdx} className="flex justify-between border-b border-dashed border-slate-150 py-1">
                                <span className="font-medium text-slate-800">{p.namaProduk}</span>
                                <span className="font-bold text-slate-950">{p.qty} pcs</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-black pt-1.5 text-indigo-900 text-xs">
                              <span>TOTAL KESELURUHAN</span>
                              <span>{item.qty} pcs</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sizing Data Box */}
                    {item.detailSizeNama && (
                      <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-250/70 text-left mt-4 w-full">
                        <span className="block text-[9px] font-extrabold text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-amber-605" /> Data Sizing &amp; Daftar Nama Konsumen
                        </span>
                        <div className="text-[11px] text-slate-850 whitespace-pre-wrap font-mono leading-relaxed bg-white p-3 rounded-lg border border-amber-105">
                          {item.detailSizeNama}
                        </div>
                      </div>
                    )}

                    {/* Footer / Signoffs for factory tracking */}
                    <div className="grid grid-cols-3 gap-6 font-bold text-center text-[10px] uppercase tracking-wider pt-8 text-slate-500">
                      <div className="border-t border-slate-200 pt-3">
                        <span className="block text-[8px] text-slate-400 font-normal">Operator Desain/SPK</span>
                        <div className="h-10" />
                        <p className="text-slate-800 font-bold">{settings.namaToko || 'Nomaden Apparel'}</p>
                      </div>
                      <div className="border-t border-slate-200 pt-3">
                        <span className="block text-[8px] text-slate-400 font-normal">Penerima Kerja (Penjahit)</span>
                        <div className="h-10" />
                        <p className="border-b border-dashed border-slate-350 mx-auto w-32"></p>
                      </div>
                      <div className="border-t border-slate-200 pt-3">
                        <span className="block text-[8px] text-slate-400 font-normal">Kepala Produksi (QC)</span>
                        <div className="h-10" />
                        <p className="border-b border-dashed border-slate-350 mx-auto w-32"></p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Decorative invoice background stripes */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 no-print" />
                
                {/* Invoice Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-slate-200 pb-6 gap-6 pt-2">
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {settings.logoUrl ? (
                        <img 
                          src={settings.logoUrl} 
                          alt="Logo Toko" 
                          className="max-h-12 max-w-[120px] object-contain rounded-lg border border-slate-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-xs font-black">
                          JT
                        </div>
                      )}
                      <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'namaToko', settings.namaToko || 'Toko Jersey')}
                            onChange={(val) => setVal(item.id, 'namaToko', val)}
                            className="font-bold text-slate-900 text-xl"
                          />
                        </h1>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'tagline', settings.taglineToko || 'Official Apparel Studio')}
                            onChange={(val) => setVal(item.id, 'tagline', val)}
                            className="font-bold text-indigo-700 uppercase"
                          />
                        </span>
                      </div>
                    </div>

                    {/* Standard contact address template */}
                    <div className="text-xs text-slate-500 space-y-1 pt-1 text-left">
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-1 shrink-0" />
                        <div className="flex-1">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'alamat', settings.alamatToko || 'Komp.Taman Bunga Sukamukti,\nKec. Katapang, Kabupaten Bandung, Jawa Barat 40921')}
                            onChange={(val) => setVal(item.id, 'alamat', val)}
                            isTextArea={true}
                            rows={2}
                            className="text-slate-500 text-left"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="flex-1">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'whatsapp', settings.noWaToko ? 'WhatsApp: ' + settings.noWaToko : 'WhatsApp: +62 851-6666-4161')}
                            onChange={(val) => setVal(item.id, 'whatsapp', val)}
                            className="text-slate-500"
                          />
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Instagram className="h-3 w-3 shrink-0" />
                        <span className="flex-1">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'instagram', settings.igToko ? 'Instagram: ' + settings.igToko : 'Instagram: nomadenapparel')}
                            onChange={(val) => setVal(item.id, 'instagram', val)}
                            className="text-slate-500"
                          />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Note Metadata */}
                  <div className="text-left sm:text-right space-y-1.5 min-w-[170px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block w-full">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'labelNota', notaType === 'sublim' ? 'Nota Pembayaran Sublim' : notaType === 'jahit' ? 'Nota Pembayaran Jahit' : notaType === 'komisi' ? 'Nota Pembayaran Komisi' : 'Nota Bukti Pesanan')}
                        onChange={(val) => setVal(item.id, 'labelNota', val)}
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left sm:text-right"
                      />
                    </span>
                    <h2 className="text-lg font-black text-slate-900 leading-none">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'notaId', item.id)}
                        onChange={(val) => setVal(item.id, 'notaId', val)}
                        className="text-lg font-black text-slate-900 leading-none text-left sm:text-right"
                      />
                    </h2>
                    
                    <div className="text-xs text-slate-500 pt-1 space-y-1">
                      <div className="flex sm:justify-end items-center gap-1">
                        <span>Tgl Masuk:</span>
                        <strong className="font-semibold text-slate-755">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'tglMasuk', new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }))}
                            onChange={(val) => setVal(item.id, 'tglMasuk', val)}
                            className="font-semibold text-slate-755 text-left sm:text-right"
                          />
                        </strong>
                      </div>
                      <div className="flex sm:justify-end items-center gap-1">
                        <span>Deadline:</span>
                        <strong className="font-semibold text-slate-755">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'tglDeadline', new Date(item.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }))}
                            onChange={(val) => setVal(item.id, 'tglDeadline', val)}
                            className="font-semibold text-slate-755 text-rose-600 font-bold text-left sm:text-right"
                          />
                        </strong>
                      </div>
                      <div className="flex items-center sm:justify-end gap-1.5 mt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
                        <span className={`text-[12px] font-black uppercase tracking-wide ${getStatusColor(item.statusProduksi)}`}>
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'status', item.statusProduksi)}
                            onChange={(val) => setVal(item.id, 'status', val)}
                            className="font-black uppercase tracking-wide text-[12px] text-left sm:text-right"
                          />
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Customer Metadata Block */}
                <div className="my-6 bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:justify-between gap-4 text-left">
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-left">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'labelKlien', notaType === 'sublim' ? 'Detail Vendor Sublim' : notaType === 'jahit' ? 'Detail Vendor Jahit' : notaType === 'komisi' ? 'Penerima Komisi' : 'Informasi Klien')}
                        onChange={(val) => setVal(item.id, 'labelKlien', val)}
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left"
                      />
                    </p>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug text-left">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'namaPemesan', notaType === 'komisi' ? (item.penerimaKomisi || 'N/A (Belum Diisi)') : item.namaPemesan)}
                        onChange={(val) => setVal(item.id, 'namaPemesan', val)}
                        className="font-extrabold text-slate-900 text-sm leading-snug text-left"
                      />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 text-left">
                      {notaType === 'komisi' ? 'Proyek PO: ' : 'Tim: '}<strong className="font-bold text-indigo-700 text-left">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'namaPo', item.namaPo)}
                          onChange={(val) => setVal(item.id, 'namaPo', val)}
                          className="font-bold text-indigo-700 text-xs text-left"
                        />
                      </strong>
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 text-left">
                      Mbl: <span className="font-mono text-slate-500 text-xs text-left">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'noTelepon', item.noTelepon || '-')}
                          onChange={(val) => setVal(item.id, 'noTelepon', val)}
                          className="font-mono text-slate-500 text-xs text-left"
                        />
                      </span>
                    </p>
                  </div>

                  <div className="sm:text-right text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-left sm:text-right">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'labelSpek', 'Spesifikasi Kustom')}
                        onChange={(val) => setVal(item.id, 'labelSpek', val)}
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left sm:text-right"
                      />
                    </p>
                    <p className="text-xs text-slate-800 font-bold text-left sm:text-right">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'namaProdukHeader', (item.items && item.items.length > 1 ? `${item.items.length} Jenis Jersey (PO)` : item.namaProduk))}
                        onChange={(val) => setVal(item.id, 'namaProdukHeader', val)}
                        className="text-xs text-slate-800 font-bold text-left sm:text-right shadow-transparent"
                      />
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 text-left sm:text-right">
                      Bahan: <strong className="font-medium text-slate-700 text-left sm:text-right">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'bahanHeader', item.bahan || 'Bahan Standar')}
                          onChange={(val) => setVal(item.id, 'bahanHeader', val)}
                          className="font-medium text-slate-700 text-xs text-left sm:text-right"
                        />
                      </strong>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 text-left sm:text-right">
                      Model Kerah: <strong className="font-medium text-slate-700 text-left sm:text-right">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'modelKerahHeader', item.modelKerah || 'O-Neck (Standar)')}
                          onChange={(val) => setVal(item.id, 'modelKerahHeader', val)}
                          className="font-medium text-slate-700 text-xs text-left sm:text-right"
                        />
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="my-6 space-y-4 text-left">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal(item.id, 'labelDetailRincian', notaType === 'sublim' ? 'Detail Rincian Cetak Sublim' : notaType === 'jahit' ? 'Detail Rincian Ongkos Jahit' : notaType === 'komisi' ? 'Detail Rincian Pembayaran Komisi' : 'Detail Rincian Pembelian')}
                      onChange={(val) => setVal(item.id, 'labelDetailRincian', val)}
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left"
                    />
                  </h5>
                  
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-350 text-slate-440 uppercase text-[10px] font-bold tracking-wider float-none table-row text-left">
                        <th className="pb-3 width-auto text-left">Deskripsi Item</th>
                        <th className="pb-3 text-center w-24">Bahan</th>
                        <th className="pb-3 text-center w-12">Qty</th>
                        <th className="pb-3 text-right w-28">
                          {notaType === 'sublim' ? 'Biaya Sublim' : notaType === 'jahit' ? 'Ongkos Jahit' : notaType === 'komisi' ? 'Komisi / pcs' : 'Harga / pcs'}
                        </th>
                        <th className="pb-3 text-right w-28">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((item.items && item.items.length > 0) ? item.items : [{
                        id: 'default',
                        namaProduk: item.namaProduk,
                        bahan: item.bahan,
                        keterangan: item.keterangan,
                        qty: item.qty,
                        hargaPerPcs: item.hargaPerPcs,
                        printPerPcs: item.printPerPcs,
                        jahitPerPcs: item.jahitPerPcs,
                        modelKerah: item.modelKerah,
                      }]).map((subItem, idx) => {
                        const sId = subItem.id || `idx_${idx}`;
                        const unitRate = 
                          notaType === 'sublim' 
                            ? (subItem.printPerPcs ?? item.printPerPcs ?? 0)
                            : notaType === 'jahit'
                              ? (subItem.jahitPerPcs ?? item.jahitPerPcs ?? 0)
                              : notaType === 'komisi'
                                ? (subItem.komisiPerPcs !== undefined ? subItem.komisiPerPcs : (item.komisiPerPcs ?? 0))
                                : subItem.hargaPerPcs;

                        return (
                          <tr key={sId} className="border-b border-slate-100 font-medium table-row text-left">
                            <td className="py-3 pr-3 text-left">
                              <div className="flex items-center gap-2 flex-wrap text-left">
                                <span className="font-bold text-slate-900 text-xs text-left">
                                  <EditableText
                                    isEditing={isEditingTexts}
                                    value={getVal(item.id, `subitem_${sId}_namaProduk`, subItem.namaProduk)}
                                    onChange={(val) => setVal(item.id, `subitem_${sId}_namaProduk`, val)}
                                    className="font-bold text-slate-900 text-xs text-left"
                                  />
                                </span>
                                <span className="text-[9px] bg-slate-50 text-indigo-600 px-1 py-0.5 rounded border border-indigo-100/60 font-semibold select-none">
                                  Kerah: <EditableText
                                    isEditing={isEditingTexts}
                                    value={getVal(item.id, `subitem_${sId}_modelKerah`, subItem.modelKerah || 'O-Neck (Standar)')}
                                    onChange={(val) => setVal(item.id, `subitem_${sId}_modelKerah`, val)}
                                    className="font-semibold text-[9px] text-indigo-600 inline-block"
                                  />
                                </span>
                              </div>
                              {(subItem.keterangan || isEditingTexts) && (
                                <p className="text-[11px] text-slate-550 mt-1 italic tracking-wide max-w-[280px] whitespace-pre-wrap flex items-start gap-1 text-left">
                                  <span className="shrink-0 text-[11px] text-slate-500 italic">Catatan:</span>
                                  <span className="flex-1 text-left text-[11px]">
                                    <EditableText
                                      isEditing={isEditingTexts}
                                      value={getVal(item.id, `subitem_${sId}_keterangan`, subItem.keterangan || '')}
                                      onChange={(val) => setVal(item.id, `subitem_${sId}_keterangan`, val)}
                                      className="text-[11px] text-slate-500 italic text-left"
                                    />
                                  </span>
                                </p>
                              )}
                            </td>
                            <td className="py-3 text-center text-slate-655 font-medium">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal(item.id, `subitem_${sId}_bahan`, subItem.bahan || 'Standar')}
                                onChange={(val) => setVal(item.id, `subitem_${sId}_bahan`, val)}
                                className="text-center text-slate-655 text-xs"
                              />
                            </td>
                            <td className="py-3 text-center font-bold text-slate-900">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal(item.id, `subitem_${sId}_qty`, String(subItem.qty))}
                                onChange={(val) => setVal(item.id, `subitem_${sId}_qty`, val)}
                                className="text-center font-bold text-slate-900 text-xs"
                              />
                            </td>
                            <td className="py-3 text-right text-slate-655 font-medium">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal(item.id, `subitem_${sId}_hargaPerPcs`, formatRupiah(unitRate))}
                                onChange={(val) => setVal(item.id, `subitem_${sId}_hargaPerPcs`, val)}
                                className="text-right text-slate-655 text-xs"
                              />
                            </td>
                            <td className="py-3 text-right font-bold text-slate-900">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal(item.id, `subitem_${sId}_jumlah`, formatRupiah(subItem.qty * unitRate))}
                                onChange={(val) => setVal(item.id, `subitem_${sId}_jumlah`, val)}
                                className="text-right font-bold text-slate-900 text-xs"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Summary Financials */}
                <div className="flex flex-col sm:flex-row sm:justify-between items-start pt-4 border-t border-slate-200 gap-6 text-left">
                  
                  {/* Payment status badge / notes */}
                  <div className="flex-1 max-w-sm space-y-3 w-full text-left">
                    {item.detailSizeNama && notaType !== 'jahit' && (
                      <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/80 text-left">
                        <span className="block text-[8.5px] font-extrabold text-amber-800 uppercase tracking-wider mb-1 text-left font-sans">
                          Detail Sizing &amp; Daftar Nama Konsumen
                        </span>
                        <div className="text-[10px] text-slate-800 whitespace-pre-wrap font-mono leading-normal bg-white p-2 rounded-md border border-amber-100 text-left">
                          {pages.length > 1
                            ? rawLines.slice(0, 10).join('\n')
                            : item.detailSizeNama
                          }
                        </div>
                        {pages.length > 1 && (
                          <div className="mt-1.5 text-center text-[8px] bg-amber-100/70 border border-amber-200 text-amber-800 py-1 px-2 rounded font-bold uppercase tracking-wider font-sans">
                            📋 {rawLines.length - 10} Nama Lainnya Terlampir di Halaman Sizing (Lampiran)
                          </div>
                        )}
                      </div>
                    )}

                    {item.mockupUrl && notaType !== 'jahit' && (
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-left">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1 text-left">
                          Mockup Desain Jersey (PO)
                        </span>
                        <div className="h-40 w-full bg-white rounded-md border border-slate-100 flex items-center justify-center overflow-hidden">
                          <img 
                            src={item.mockupUrl} 
                            alt="Mockup Desain" 
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center gap-3 text-left">
                      <span className="p-1.5 bg-indigo-650 rounded-full text-white shrink-0">
                        <ShoppingBag className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 min-w-0 text-left">
                        <h6 className="text-[10px] font-bold text-indigo-900 uppercase text-left font-sans">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'jaminanTitle', 'Jaminan Kualitas')}
                            onChange={(val) => setVal(item.id, 'jaminanTitle', val)}
                            className="text-[10px] font-bold text-indigo-900 uppercase text-left"
                          />
                        </h6>
                        <div className="text-[10px] text-indigo-700 mt-0.5 leading-relaxed text-left">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal(item.id, 'jaminanText', 'Jersey ini dibuat kustom menggunakan teknologi sublimation press HD anti luntur berkualitas premium.')}
                            onChange={(val) => setVal(item.id, 'jaminanText', val)}
                            isTextArea={true}
                            rows={2}
                            className="text-[10px] text-indigo-700 mt-0.5 leading-relaxed text-left"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Terms and conditions */}
                    <div className="text-[9px] text-slate-400 leading-relaxed italic block w-full text-left font-sans">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'terms', '* Syarat & Ketentuan:\n1. Pesanan (PO) akan langsung masuk antrean PRE-ORDER dan mulai diproduksi (siap cetak) setelah kami menerima Down Payment (DP) minimal 50% dari total tagihan.\n2. Barang yang sudah diproduksi tidak dapat dibatalkan atau direvisi.\n3. Pelunasan sisa tagihan wajib diselesaikan saat pengambilan/pengiriman.')}
                        onChange={(val) => setVal(item.id, 'terms', val)}
                        isTextArea={true}
                        rows={3}
                        className="text-[9px] text-slate-400 leading-relaxed italic text-left"
                      />
                    </div>
                  </div>

                  {/* Financial aggregations block */}
                  <div className="w-full sm:w-64 text-xs space-y-2 text-left">
                    <div className="flex justify-between items-center text-slate-500 text-left">
                      <span>
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'labelSubtotal', notaType === 'sublim' ? 'Total Cetak Sublim' : notaType === 'jahit' ? 'Total Ongkos Jahit' : notaType === 'komisi' ? 'Total Uang Komisi' : 'Subtotal Harga')}
                          onChange={(val) => setVal(item.id, 'labelSubtotal', val)}
                          className="text-slate-505"
                        />
                      </span>
                      <span className="font-semibold text-slate-800 text-right">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'valSubtotal', formatRupiah(currentOrderSubtotalCost))}
                          onChange={(val) => setVal(item.id, 'valSubtotal', val)}
                          className="font-semibold text-slate-800"
                        />
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-slate-550 text-left">
                      <span>
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'labelUangMasuk', notaType === 'sublim' || notaType === 'jahit' || notaType === 'komisi' ? 'Jumlah Terbayar ✓' : 'Uang Masuk / Pembayaran DP')}
                          onChange={(val) => setVal(item.id, 'labelUangMasuk', val)}
                          className="text-slate-505"
                        />
                      </span>
                      <span className="font-semibold text-emerald-600 text-right">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'valUangMasuk', formatRupiah(currentOrderPaidCost))}
                          onChange={(val) => setVal(item.id, 'valUangMasuk', val)}
                          className="font-semibold text-emerald-650"
                        />
                      </span>
                    </div>

                    <div className="border-t border-slate-100 my-1" />

                    {/* Sisa Tagihan highlight */}
                    <div className={`p-3 rounded-lg flex justify-between items-center ${
                      isFullyPaid 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-800 border border-rose-100 font-bold'
                    }`}>
                      <span className="text-[10px] uppercase font-bold tracking-wider">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'labelSisa', notaType === 'sublim' ? 'Sisa Bayar Sublim' : notaType === 'jahit' ? 'Sisa Bayar Jahit' : notaType === 'komisi' ? 'Sisa Komisi' : (isFullyPaid ? 'Status Bayar' : 'Sisa Tagihan'))}
                          onChange={(val) => setVal(item.id, 'labelSisa', val)}
                          className="text-[10px] uppercase font-bold tracking-wider"
                        />
                      </span>
                      <span className="text-sm font-black">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'valSisa', isFullyPaid ? 'LUNAS ✓' : formatRupiah(currentOrderUnpaidCost))}
                          onChange={(val) => setVal(item.id, 'valSisa', val)}
                          className="text-sm font-black"
                        />
                      </span>
                    </div>
                  </div>

                </div>

                {/* Stamp Sign block */}
                <div className="mt-10 flex justify-end gap-12 text-center text-xs">
                  <div className="w-40 pt-4 relative">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-10 text-center">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'hormatKamiSign', settings.hormatKamiToko || 'Hormat Kami,')}
                        onChange={(val) => setVal(item.id, 'hormatKamiSign', val)}
                        className="text-slate-400 text-[10px] uppercase font-bold tracking-widest text-center"
                      />
                    </p>
                    
                    {/* Fake stamp decoration for premium official aesthetic */}
                    <div className="absolute top-[30px] right-[25px] h-12 w-12 border-2 border-emerald-555 border-dotted rounded-full flex items-center justify-center opacity-40 transform rotate-12 select-none pointer-events-none">
                      <p className="text-[8px] font-mono leading-none font-bold text-emerald-555 text-center">
                        {settings.stempelTokoText || 'Nomaden'}<br />
                        {settings.stempelTokoSubtext || 'Apparel'}
                      </p>
                    </div>

                    <div className="border-b border-slate-300 w-full mx-auto" />
                    <p className="font-bold text-slate-800 mt-1 text-center">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'namaTokoSign', settings.namaToko || 'Toko Jersey')}
                        onChange={(val) => setVal(item.id, 'namaTokoSign', val)}
                        className="font-bold text-slate-800 text-xs text-center"
                      />
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 text-center">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'roleSign', settings.roleSignToko || 'Finance Administration')}
                        onChange={(val) => setVal(item.id, 'roleSign', val)}
                        className="text-[10px] text-slate-400 text-center"
                      />
                    </p>
                  </div>
                </div>
                  </>
                )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Compilation/Batch Summary Page (ONLY rendered for multiple selected receipts) */}
          {pesananArray.length > 1 && (
            <div 
              id="invoice-paper-batch-summary"
              className="w-full max-w-[680px] bg-white p-6 sm:p-10 rounded-xs shadow-md text-slate-805 border border-slate-200/60 font-sans relative invoice-card text-left"
            >
              {/* Decorative invoice background stripes */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 no-print" />
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-slate-200 pb-6 gap-6 pt-2 text-left">
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    {settings.logoUrl ? (
                      <img 
                        src={settings.logoUrl} 
                        alt="Logo Toko" 
                        className="max-h-12 max-w-[120px] object-contain rounded-lg border border-slate-100"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-xs font-black">
                        JT
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-bold tracking-tight text-slate-900">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'namaToko', settings.namaToko || 'Toko Jersey')}
                          onChange={(val) => setVal('rekap', 'namaToko', val)}
                          className="font-bold text-slate-900 text-xl"
                        />
                      </h1>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider inline-block">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'tagline', settings.taglineToko || 'Official Apparel Studio')}
                          onChange={(val) => setVal('rekap', 'tagline', val)}
                          className="font-bold text-indigo-700 uppercase"
                        />
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 pt-1 text-left">
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-1 shrink-0" />
                      <div className="flex-1">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'alamat', settings.alamatToko || 'Komp.Taman Bunga Sukamukti,\nKec. Katapang, Kabupaten Bandung, Jawa Barat 40921')}
                          onChange={(val) => setVal('rekap', 'alamat', val)}
                          isTextArea={true}
                          rows={2}
                          className="text-slate-500 text-left"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="flex-1">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'whatsapp', settings.noWaToko ? 'WhatsApp: ' + settings.noWaToko : 'WhatsApp: +62 851-6666-4161')}
                          onChange={(val) => setVal('rekap', 'whatsapp', val)}
                          className="text-slate-500"
                        />
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Instagram className="h-3 w-3 shrink-0" />
                      <span className="flex-1">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'instagram', settings.igToko ? 'Instagram: ' + settings.igToko : 'Instagram: nomadenapparel')}
                          onChange={(val) => setVal('rekap', 'instagram', val)}
                          className="text-slate-500"
                        />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1.5 min-w-[170px]">
                  <span className="text-[10px] font-bold text-indigo-600 tracking-widest block w-full uppercase">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal('rekap', 'labelInvoicingComp', notaType === 'komisi' ? 'Commission Compilation' : 'Invoicing Compilation')}
                      onChange={(val) => setVal('rekap', 'labelInvoicingComp', val)}
                      className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest text-left sm:text-right"
                    />
                  </span>
                  <h2 className="text-lg font-black text-slate-900 leading-none">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal('rekap', 'titleRekap', notaType === 'komisi' ? 'REKAP KOMISI' : 'REKAP BATCH')}
                      onChange={(val) => setVal('rekap', 'titleRekap', val)}
                      className="text-lg font-black text-slate-900 leading-none text-left sm:text-right"
                    />
                  </h2>
                  <div className="text-xs text-slate-500 pt-1 space-y-1">
                    <div className="flex sm:justify-end items-center gap-1">
                      <span>Tanggal Rekap:</span>
                      <strong className="font-semibold text-slate-755">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'tanggalRekapValue', new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }))}
                          onChange={(val) => setVal('rekap', 'tanggalRekapValue', val)}
                          className="font-semibold text-slate-755 text-left sm:text-right"
                        />
                      </strong>
                    </div>
                    <div className="flex sm:justify-end items-center gap-1">
                      <span>Total Transaksi:</span>
                      <strong className="font-semibold text-slate-755">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'totalTransValue', `${pesananArray.length} PO`)}
                          onChange={(val) => setVal('rekap', 'totalTransValue', val)}
                          className="font-semibold text-slate-755 text-left sm:text-right"
                        />
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compiled Title / Notice banner */}
              <div className="my-6 bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 text-left">
                  <EditableText
                    isEditing={isEditingTexts}
                    value={getVal('rekap', 'labelStatusIkhtisar', 'Status Ikhtisar Batch')}
                    onChange={(val) => setVal('rekap', 'labelStatusIkhtisar', val)}
                    className="text-xs font-bold text-slate-400 uppercase tracking-widest text-left"
                  />
                </h4>
                <div className="text-xs text-slate-650 leading-relaxed text-left">
                  <EditableText
                    isEditing={isEditingTexts}
                    value={getVal('rekap', 'descStatusIkhtisar', notaType === 'komisi' ? `Berikut adalah rincian konsolidasi komisi broker/sales seluruh pesanan (${pesananArray.length} PO) yang dipilih untuk cetak batch nota.` : `Berikut adalah rincian konsolidasi tagihan seluruh pesanan (${pesananArray.length} PO) yang dipilih untuk cetak batch nota.`)}
                    onChange={(val) => setVal('rekap', 'descStatusIkhtisar', val)}
                    isTextArea={true}
                    rows={2}
                    className="text-xs text-slate-650 leading-relaxed text-left"
                  />
                </div>
              </div>

              {/* Table of Batch Items */}
              <div className="my-6 space-y-3 text-left">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Daftar PO & Rincian Pembayaran</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-350 text-slate-450 uppercase text-[10px] font-bold tracking-wider text-left">
                        <th className="pb-3 w-20 text-left">ID</th>
                        <th className="pb-3 text-left">PO / Tim & Pemesan</th>
                        <th className="pb-3 text-center w-12">Qty</th>
                        {notaType === 'komisi' ? (
                          <>
                            <th className="pb-3 text-right w-28">Komisi / pcs</th>
                            <th className="pb-3 text-right w-28 font-extrabold text-indigo-600">Total Komisi</th>
                          </>
                        ) : (
                          <>
                            <th className="pb-3 text-right w-24">
                              {notaType === 'sublim' ? 'Sublim' : notaType === 'jahit' ? 'Jahit' : 'Subtotal'}
                            </th>
                            <th className="pb-3 text-right w-24">
                              {notaType !== 'pelanggan' ? 'Terbayar' : 'DP Masuk'}
                            </th>
                            <th className="pb-3 text-right w-24 font-extrabold text-indigo-600">
                              {notaType === 'sublim' ? 'Sisa Sublim' : notaType === 'jahit' ? 'Sisa Jahit' : 'Sisa Tagihan'}
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {pesananArray.map((item) => {
                        const recId = item.id;
                        const rowSubtotal = 
                          notaType === 'sublim' 
                            ? getSublimCost(item) 
                            : notaType === 'jahit' 
                              ? getJahitCost(item) 
                              : item.totalHarga;

                        const rowPaidValue = 
                          notaType === 'sublim' 
                            ? (isSublimPaid(item) ? getSublimCost(item) : 0) 
                            : notaType === 'jahit' 
                              ? (isJahitPaid(item) ? getJahitCost(item) : 0) 
                              : item.uangMasuk;

                        const rowUnpaidValue = 
                          notaType === 'sublim' 
                            ? (isSublimPaid(item) ? 0 : getSublimCost(item)) 
                            : notaType === 'jahit' 
                              ? (isJahitPaid(item) ? 0 : getJahitCost(item)) 
                              : item.sisaTagihan;

                        return (
                          <tr key={recId} className="border-b border-slate-100 font-medium text-left">
                            <td className="py-3 font-mono text-indigo-650 font-bold">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal(`rekap_${recId}`, 'id', item.id)}
                                onChange={(val) => setVal(`rekap_${recId}`, 'id', val)}
                                className="font-mono text-indigo-650 font-bold text-xs"
                              />
                            </td>
                            <td className="py-3 text-left">
                              <p className="font-bold text-slate-900 text-xs text-left">
                                <EditableText
                                  isEditing={isEditingTexts}
                                  value={getVal(`rekap_${recId}`, 'namaPo', item.namaPo)}
                                  onChange={(val) => setVal(`rekap_${recId}`, 'namaPo', val)}
                                  className="font-bold text-slate-900 text-xs text-left"
                                />
                              </p>
                              <p className="text-[10px] text-slate-500 text-left mb-1">
                                <EditableText
                                  isEditing={isEditingTexts}
                                  value={getVal(`rekap_${recId}`, 'namaPemesan', notaType === 'komisi' ? `Broker: ${item.penerimaKomisi || 'N/A'}` : item.namaPemesan)}
                                  onChange={(val) => setVal(`rekap_${recId}`, 'namaPemesan', val)}
                                  className="text-[10px] text-slate-500 text-left"
                                />
                              </p>

                              {/* Rincian Deskripsi Item PO */}
                              <div className="mt-1.5 space-y-1 block max-w-xs">
                                {((item.items && item.items.length > 0) ? item.items : [{
                                  id: 'default',
                                  namaProduk: item.namaProduk,
                                  bahan: item.bahan,
                                  keterangan: item.keterangan || '',
                                  qty: item.qty,
                                  hargaPerPcs: item.hargaPerPcs,
                                  printPerPcs: item.printPerPcs,
                                  jahitPerPcs: item.jahitPerPcs,
                                  komisiPerPcs: item.komisiPerPcs,
                                  modelKerah: item.modelKerah,
                                }]).map((sub, sIdx) => {
                                  const s_Id = sub.id || `rekap_sub_${sIdx}`;
                                  const unitRate = 
                                    notaType === 'sublim' 
                                      ? (sub.printPerPcs ?? item.printPerPcs ?? 0)
                                      : notaType === 'jahit'
                                        ? (sub.jahitPerPcs ?? item.jahitPerPcs ?? 0)
                                        : notaType === 'komisi'
                                          ? (sub.komisiPerPcs !== undefined ? sub.komisiPerPcs : (item.komisiPerPcs ?? 0))
                                          : (sub.hargaPerPcs ?? item.hargaPerPcs ?? 0);

                                  return (
                                    <div key={s_Id} className="pl-1.5 border-l border-indigo-100 text-[10px] text-slate-600 space-y-0.5">
                                      <div className="flex items-center gap-1 text-left flex-wrap">
                                        <span className="font-bold text-indigo-400">●</span>
                                        <span className="font-semibold text-slate-700">
                                          <EditableText
                                            isEditing={isEditingTexts}
                                            value={getVal(item.id, `subitem_${s_Id}_namaProduk_rekap`, sub.namaProduk)}
                                            onChange={(val) => setVal(item.id, `subitem_${s_Id}_namaProduk_rekap`, val)}
                                            className="font-semibold text-slate-700 text-[10px]"
                                          />
                                        </span>
                                        <span className="text-slate-500 text-[10px]">
                                          (
                                          <EditableText
                                            isEditing={isEditingTexts}
                                            value={getVal(item.id, `subitem_${s_Id}_qty_rekap`, `${sub.qty} pcs`)}
                                            onChange={(val) => setVal(item.id, `subitem_${s_Id}_qty_rekap`, val)}
                                            className="text-slate-500 text-[10px]"
                                          />
                                          )
                                        </span>
                                        {(sub.bahan || isEditingTexts) && (
                                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded truncate max-w-[80px]">
                                            <EditableText
                                              isEditing={isEditingTexts}
                                              value={getVal(item.id, `subitem_${s_Id}_bahan_rekap`, sub.bahan || 'Standar')}
                                              onChange={(val) => setVal(item.id, `subitem_${s_Id}_bahan_rekap`, val)}
                                              className="text-[9px] text-slate-500"
                                            />
                                          </span>
                                        )}
                                        {(sub.modelKerah || isEditingTexts) && (
                                          <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1 rounded truncate max-w-[100px] border border-indigo-100/60 font-semibold select-none">
                                            Kerah: <EditableText
                                              isEditing={isEditingTexts}
                                              value={getVal(item.id, `subitem_${s_Id}_modelKerah_rekap`, sub.modelKerah || 'O-Neck (Standar)')}
                                              onChange={(val) => setVal(item.id, `subitem_${s_Id}_modelKerah_rekap`, val)}
                                              className="text-[9px] text-indigo-600 font-semibold"
                                            />
                                          </span>
                                        )}
                                      </div>

                                      {/* Baris Informasi Harga Satuan & Total Subitem */}
                                      <div className="flex items-center gap-1.5 pl-3 text-[9px] text-slate-500 flex-wrap">
                                        <span className="text-slate-400">@</span>
                                        <EditableText
                                          isEditing={isEditingTexts}
                                          value={getVal(item.id, `subitem_${s_Id}_hargaPerPcs_rekap`, formatRupiah(unitRate))}
                                          onChange={(val) => setVal(item.id, `subitem_${s_Id}_hargaPerPcs_rekap`, val)}
                                          className="text-slate-500 text-[9px]"
                                        />
                                        <span className="text-slate-400">=</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                          <EditableText
                                            isEditing={isEditingTexts}
                                            value={getVal(item.id, `subitem_${s_Id}_jumlah_rekap`, formatRupiah(sub.qty * unitRate))}
                                            onChange={(val) => setVal(item.id, `subitem_${s_Id}_jumlah_rekap`, val)}
                                            className="font-bold text-slate-700 dark:text-slate-300 text-[9px]"
                                          />
                                        </span>
                                      </div>

                                      {(sub.keterangan || isEditingTexts) && (
                                        <p className="text-[9px] text-slate-450 italic leading-none pl-3 whitespace-pre-wrap text-left">
                                          <EditableText
                                            isEditing={isEditingTexts}
                                            value={getVal(item.id, `subitem_${s_Id}_keterangan_rekap`, sub.keterangan || '')}
                                            onChange={(val) => setVal(item.id, `subitem_${s_Id}_keterangan_rekap`, val)}
                                            className="text-[9px] text-slate-450 italic text-left"
                                          />
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-3 text-center font-bold text-slate-800">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal(`rekap_${recId}`, 'qty', `${item.qty} pcs`)}
                                onChange={(val) => setVal(`rekap_${recId}`, 'qty', val)}
                                className="text-center font-bold text-slate-800 text-xs"
                              />
                            </td>
                            {notaType === 'komisi' ? (
                              <>
                                <td className="py-3 text-right text-slate-700 font-medium">
                                  <EditableText
                                    isEditing={isEditingTexts}
                                    value={getVal(`rekap_${recId}`, 'komisiPerPcs', formatRupiah(item.komisiPerPcs ?? 0))}
                                    onChange={(val) => setVal(`rekap_${recId}`, 'komisiPerPcs', val)}
                                    className="text-right text-slate-705 text-xs font-semibold"
                                  />
                                </td>
                                <td className="py-3 text-right font-bold text-indigo-600">
                                  <EditableText
                                    isEditing={isEditingTexts}
                                    value={getVal(`rekap_${recId}`, 'totalKomisi', formatRupiah(getKomisiCost(item)))}
                                    onChange={(val) => setVal(`rekap_${recId}`, 'totalKomisi', val)}
                                    className="text-right font-bold text-indigo-600 text-xs"
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-3 text-right text-slate-700 font-medium">
                                  <EditableText
                                    isEditing={isEditingTexts}
                                    value={getVal(`rekap_${recId}`, 'totalHarga', formatRupiah(rowSubtotal))}
                                    onChange={(val) => setVal(`rekap_${recId}`, 'totalHarga', val)}
                                    className="text-right text-slate-705 text-xs"
                                  />
                                </td>
                                <td className="py-3 text-right font-semibold text-emerald-600">
                                  <EditableText
                                    isEditing={isEditingTexts}
                                    value={getVal(`rekap_${recId}`, 'uangMasuk', formatRupiah(rowPaidValue))}
                                    onChange={(val) => setVal(`rekap_${recId}`, 'uangMasuk', val)}
                                    className="text-right font-semibold text-emerald-600 text-xs"
                                  />
                                </td>
                                <td className="py-3 text-right font-bold text-rose-600">
                                  <EditableText
                                    isEditing={isEditingTexts}
                                    value={getVal(`rekap_${recId}`, 'sisaTagihan', formatRupiah(rowUnpaidValue))}
                                    onChange={(val) => setVal(`rekap_${recId}`, 'sisaTagihan', val)}
                                    className="text-right font-bold text-rose-600 text-xs"
                                  />
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {/* Grand Total Row */}
                      <tr className="bg-slate-50/80 font-black border-t-2 border-slate-300 text-left">
                        <td className="py-3 pl-2 text-left font-black" colSpan={2}>
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal('rekap', 'labelGrandTotal', 'GRAND TOTAL KONSOLIDASI')}
                            onChange={(val) => setVal('rekap', 'labelGrandTotal', val)}
                            className="font-black text-slate-900 text-xs text-left"
                          />
                        </td>
                        <td className="py-3 text-center text-slate-900 font-black">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal('rekap', 'valGrandQty', `${totalQty} pcs`)}
                            onChange={(val) => setVal('rekap', 'valGrandQty', val)}
                            className="font-black text-center text-slate-900 text-xs"
                          />
                        </td>
                        {notaType === 'komisi' ? (
                          <>
                            <td className="py-3 text-right text-slate-400"></td>
                            <td className="py-3 text-right text-indigo-650 font-black">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal('rekap', 'valGrandSubtotal', formatRupiah(totalHargaSum))}
                                onChange={(val) => setVal('rekap', 'valGrandSubtotal', val)}
                                className="font-black text-right text-indigo-650 text-xs"
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 text-right text-indigo-650 font-black">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal('rekap', 'valGrandSubtotal', formatRupiah(totalHargaSum))}
                                onChange={(val) => setVal('rekap', 'valGrandSubtotal', val)}
                                className="font-black text-right text-indigo-650 text-xs"
                              />
                            </td>
                            <td className="py-3 text-right text-emerald-700 font-black">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal('rekap', 'valGrandDP', formatRupiah(totalUangMasukSum))}
                                onChange={(val) => setVal('rekap', 'valGrandDP', val)}
                                className="font-black text-right text-emerald-700 text-xs"
                              />
                            </td>
                            <td className="py-3 text-right text-rose-700 pr-2 font-black">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal('rekap', 'valGrandSisa', formatRupiah(totalSisaTagihanSum))}
                                onChange={(val) => setVal('rekap', 'valGrandSisa', val)}
                                className="font-black text-right text-rose-700 text-xs"
                              />
                            </td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Konsolidasi Ringkasan */}
              <div className="flex flex-col sm:flex-row sm:justify-between items-start pt-4 border-t border-slate-200 gap-6 text-left">
                <div className="flex-1 max-w-sm space-y-3 text-left w-full">
                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center gap-3 text-left">
                    <span className="p-1.5 bg-indigo-650 rounded-full text-white shrink-0">
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0 text-left">
                      <h6 className="text-[10px] font-bold text-indigo-900 uppercase text-left">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'perhatianTitle', notaType === 'komisi' ? 'Catatan Komisi' : 'Perhatian Pelunasan')}
                          onChange={(val) => setVal('rekap', 'perhatianTitle', val)}
                          className="text-[10px] font-bold text-indigo-900 uppercase text-left"
                        />
                      </h6>
                      <div className="text-[10px] text-indigo-700 mt-0.5 leading-relaxed text-left">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'perhatianText', notaType === 'komisi' ? 'Total komisi yang dihitung di atas wajib disalurkan kepada broker/penerima komisi yang bersangkutan sebagai imbalan jasa penjualan.' : 'Harap menginstruksikan pelunasan sisa tagihan untuk masing-masing PO di atas sesuai dengan rincian yang tercantum pada lembar nota masing-masing.')}
                          onChange={(val) => setVal('rekap', 'perhatianText', val)}
                          isTextArea={true}
                          rows={2}
                          className="text-[10px] text-indigo-700 mt-0.5 leading-relaxed text-left"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-400 leading-relaxed italic text-left">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal('rekap', 'ikhtisarDisclaimer', notaType === 'komisi' ? '* Ikhtisar ini disusun otomatis oleh sistem untuk rincian komisi broker/sales dari kumpulan PO.' : '* Ikhtisar ini disusun otomatis oleh sistem kasir untuk menyederhanakan perhitungan total invoice bagi pemesan rombongan / reseller.')}
                      onChange={(val) => setVal('rekap', 'ikhtisarDisclaimer', val)}
                      isTextArea={true}
                      rows={2}
                      className="text-[9px] text-slate-400 leading-relaxed italic text-left"
                    />
                  </div>
                </div>

                {/* Total Aggregation */}
                <div className="w-full sm:w-64 text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100 text-left">
                  <div className="flex justify-between items-center text-slate-500 font-bold text-left">
                    <span>
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal('rekap', 'labelTotalNilai', notaType === 'komisi' ? 'Total Komisi' : 'Total Nilai PO')}
                        onChange={(val) => setVal('rekap', 'labelTotalNilai', val)}
                        className="text-slate-500 font-bold"
                      />
                    </span>
                    <span className="font-bold text-slate-700">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal('rekap', 'valTotalNilai', formatRupiah(totalHargaSum))}
                        onChange={(val) => setVal('rekap', 'valTotalNilai', val)}
                        className="font-bold text-slate-700 text-right"
                      />
                    </span>
                  </div>
                  {notaType !== 'komisi' && (
                    <>
                      <div className="flex justify-between items-center text-slate-500 font-bold text-left">
                        <span>
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal('rekap', 'labelTotalDP', 'Total DP Masuk')}
                            onChange={(val) => setVal('rekap', 'labelTotalDP', val)}
                            className="text-slate-500 font-bold"
                          />
                        </span>
                        <span className="text-emerald-600 font-bold">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal('rekap', 'valTotalDP', formatRupiah(totalUangMasukSum))}
                            onChange={(val) => setVal('rekap', 'valTotalDP', val)}
                            className="text-emerald-600 font-bold text-right"
                          />
                        </span>
                      </div>
                      <div className="border-t border-slate-200 my-1" />
                      <div className="flex justify-between items-center text-rose-850 font-black text-left">
                        <span className="text-[10px] uppercase tracking-wider">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal('rekap', 'labelSisaBatch', 'SISA TAGIHAN BATCH')}
                            onChange={(val) => setVal('rekap', 'labelSisaBatch', val)}
                            className="text-[10px] uppercase tracking-wider font-black"
                          />
                        </span>
                        <span className="text-sm font-black">
                          <EditableText
                            isEditing={isEditingTexts}
                            value={getVal('rekap', 'valSisaBatch', formatRupiah(totalSisaTagihanSum))}
                            onChange={(val) => setVal('rekap', 'valSisaBatch', val)}
                            className="text-sm font-black text-right"
                          />
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stamp Sign block */}
              <div className="mt-10 flex justify-end gap-12 text-center text-xs">
                <div className="w-40 pt-4 relative">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-10 text-center">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal('rekap', 'hormatKamiSign', settings.hormatKamiToko || 'Hormat Kami,')}
                      onChange={(val) => setVal('rekap', 'hormatKamiSign', val)}
                      className="text-slate-400 text-[10px] uppercase font-bold tracking-widest text-center"
                    />
                  </p>
                  
                  <div className="absolute top-[30px] right-[25px] h-12 w-12 border-2 border-emerald-555 border-dotted rounded-full flex items-center justify-center opacity-40 transform rotate-12 select-none pointer-events-none">
                    <p className="text-[8px] font-mono leading-none font-bold text-emerald-555 text-center">
                      {settings.stempelTokoText || 'Nomaden'}<br />
                      {settings.stempelTokoSubtext || 'Apparel'}
                    </p>
                  </div>

                  <div className="border-b border-slate-300 w-full mx-auto" />
                  <p className="font-bold text-slate-800 mt-1 text-center">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal('rekap', 'namaTokoSign', settings.namaToko || 'Toko Jersey')}
                      onChange={(val) => setVal('rekap', 'namaTokoSign', val)}
                      className="font-bold text-slate-800 text-xs text-center"
                    />
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 text-center">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal('rekap', 'roleSign', settings.roleSignToko || 'Finance Administration')}
                      onChange={(val) => setVal('rekap', 'roleSign', val)}
                      className="text-[10px] text-slate-400 text-center"
                    />
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
