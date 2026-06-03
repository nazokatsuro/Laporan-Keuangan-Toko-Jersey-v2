/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Pesanan, ShopSettings } from '../types';
import { formatRupiah, safeHtml2canvas } from '../utils';
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
  Send
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

interface ReceiptGeneratorProps {
  pesanan: Pesanan | Pesanan[];
  settings: ShopSettings;
  notaType?: 'pelanggan' | 'sublim' | 'jahit';
  onCancel: () => void;
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

  const totalQty = pesananArray.reduce((acc, curr) => acc + curr.qty, 0);

  // Custom total sums based on invoice type
  const totalHargaSum = React.useMemo(() => {
    if (notaType === 'sublim') {
      return pesananArray.reduce((acc, curr) => acc + getSublimCost(curr), 0);
    }
    if (notaType === 'jahit') {
      return pesananArray.reduce((acc, curr) => acc + getJahitCost(curr), 0);
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
    return pesananArray.reduce((acc, curr) => acc + curr.uangMasuk, 0);
  }, [pesananArray, notaType, settings.cashFlowList]);

  const totalSisaTagihanSum = React.useMemo(() => {
    if (notaType === 'sublim') {
      return pesananArray.reduce((acc, curr) => acc + (isSublimPaid(curr) ? 0 : getSublimCost(curr)), 0);
    }
    if (notaType === 'jahit') {
      return pesananArray.reduce((acc, curr) => acc + (isJahitPaid(curr) ? 0 : getJahitCost(curr)), 0);
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
      const targets = pesananArray.map(item => ({
        id: `invoice-paper-${item.id}`,
        filename: `NOTA-${item.id}-${getVal(item.id, 'namaPo', item.namaPo).replace(/\s+/g, '_')}.jpg`
      }));

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
      const targetIds = pesananArray.map(item => `invoice-paper-${item.id}`);
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
              ? `Pratinjau Batch Nota ${notaType === 'sublim' ? 'Sublim' : notaType === 'jahit' ? 'Jahit' : ''} (${pesananArray.length} Transaksi)` 
              : `Pratinjau Nota ${notaType === 'sublim' ? 'Bayar Sublim' : notaType === 'jahit' ? 'Bayar Jahit' : 'Transaksi'}`
            }
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBatch 
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
                ? `Cetak Semua Nota ${notaType === 'sublim' ? 'Sublim' : notaType === 'jahit' ? 'Jahit' : ''}` 
                : `Cetak Nota ${notaType === 'sublim' ? 'Sublim' : notaType === 'jahit' ? 'Jahit' : ''}`
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
                  : item.totalHarga;

            const currentOrderPaidCost = 
              notaType === 'sublim' 
                ? (isSublimPaid(item) ? getSublimCost(item) : 0) 
                : notaType === 'jahit' 
                  ? (isJahitPaid(item) ? getJahitCost(item) : 0) 
                  : item.uangMasuk;

            const currentOrderUnpaidCost = 
              notaType === 'sublim' 
                ? (isSublimPaid(item) ? 0 : getSublimCost(item)) 
                : notaType === 'jahit' 
                  ? (isJahitPaid(item) ? 0 : getJahitCost(item)) 
                  : item.sisaTagihan;

            const isFullyPaid = currentOrderUnpaidCost === 0;
            return (
              <div 
                key={item.id}
                id={`invoice-paper-${item.id}`}
                className={`w-full max-w-[680px] bg-white p-6 sm:p-10 rounded-xs shadow-md text-slate-805 border border-slate-200/60 font-sans relative invoice-card ${
                  (index < pesananArray.length - 1 || pesananArray.length > 1) ? 'page-break' : ''
                }`}
              >
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
                            value={getVal(item.id, 'tagline', 'Official Apparel Studio')}
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
                            value={getVal(item.id, 'alamat', 'Komp.Taman Bunga Sukamukti,\nKec. Katapang, Kabupaten Bandung, Jawa Barat 40921')}
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
                            value={getVal(item.id, 'whatsapp', 'WhatsApp: +62 851-6666-4161')}
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
                            value={getVal(item.id, 'instagram', 'Instagram: nomadenapparel')}
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
                        value={getVal(item.id, 'labelNota', notaType === 'sublim' ? 'Nota Pembayaran Sublim' : notaType === 'jahit' ? 'Nota Pembayaran Jahit' : 'Nota Bukti Pesanan')}
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
                        value={getVal(item.id, 'labelKlien', notaType === 'sublim' ? 'Detail Vendor Sublim' : notaType === 'jahit' ? 'Detail Vendor Jahit' : 'Informasi Klien')}
                        onChange={(val) => setVal(item.id, 'labelKlien', val)}
                        className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left"
                      />
                    </p>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug text-left">
                      <EditableText
                        isEditing={isEditingTexts}
                        value={getVal(item.id, 'namaPemesan', item.namaPemesan)}
                        onChange={(val) => setVal(item.id, 'namaPemesan', val)}
                        className="font-extrabold text-slate-900 text-sm leading-snug text-left"
                      />
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5 text-left">
                      Tim: <strong className="font-bold text-indigo-700 text-left">
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
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="my-6 space-y-4 text-left">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal(item.id, 'labelDetailRincian', notaType === 'sublim' ? 'Detail Rincian Cetak Sublim' : notaType === 'jahit' ? 'Detail Rincian Ongkos Jahit' : 'Detail Rincian Pembelian')}
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
                          {notaType === 'sublim' ? 'Biaya Sublim' : notaType === 'jahit' ? 'Ongkos Jahit' : 'Harga / pcs'}
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
                      }]).map((subItem, idx) => {
                        const sId = subItem.id || `idx_${idx}`;
                        const unitRate = 
                          notaType === 'sublim' 
                            ? (subItem.printPerPcs ?? item.printPerPcs ?? 0)
                            : notaType === 'jahit'
                              ? (subItem.jahitPerPcs ?? item.jahitPerPcs ?? 0)
                              : subItem.hargaPerPcs;

                        return (
                          <tr key={sId} className="border-b border-slate-100 font-medium table-row text-left">
                            <td className="py-3 pr-3 text-left">
                              <p className="font-bold text-slate-900 text-xs text-left">
                                <EditableText
                                  isEditing={isEditingTexts}
                                  value={getVal(item.id, `subitem_${sId}_namaProduk`, subItem.namaProduk)}
                                  onChange={(val) => setVal(item.id, `subitem_${sId}_namaProduk`, val)}
                                  className="font-bold text-slate-900 text-xs text-left"
                                />
                              </p>
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
                    {item.mockupUrl && (
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
                          value={getVal(item.id, 'labelSubtotal', notaType === 'sublim' ? 'Total Cetak Sublim' : notaType === 'jahit' ? 'Total Ongkos Jahit' : 'Subtotal Harga')}
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
                    
                    <div className="flex justify-between items-center text-slate-505 text-left">
                      <span>
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal(item.id, 'labelUangMasuk', notaType === 'sublim' || notaType === 'jahit' ? 'Jumlah Terbayar ✓' : 'Uang Masuk / Pembayaran DP')}
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
                          value={getVal(item.id, 'labelSisa', notaType === 'sublim' ? 'Sisa Bayar Sublim' : notaType === 'jahit' ? 'Sisa Bayar Jahit' : (isFullyPaid ? 'Status Bayar' : 'Sisa Tagihan'))}
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
                        value={getVal(item.id, 'hormatKamiSign', 'Hormat Kami,')}
                        onChange={(val) => setVal(item.id, 'hormatKamiSign', val)}
                        className="text-slate-400 text-[10px] uppercase font-bold tracking-widest text-center"
                      />
                    </p>
                    
                    {/* Fake stamp decoration for premium official aesthetic */}
                    <div className="absolute top-[30px] right-[25px] h-12 w-12 border-2 border-emerald-555 border-dotted rounded-full flex items-center justify-center opacity-40 transform rotate-12 select-none pointer-events-none">
                      <p className="text-[8px] font-mono leading-none font-bold text-emerald-555">Nomaden<br />Apparel</p>
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
                        value={getVal(item.id, 'roleSign', 'Finance Administration')}
                        onChange={(val) => setVal(item.id, 'roleSign', val)}
                        className="text-[10px] text-slate-400 text-center"
                      />
                    </p>
                  </div>
                </div>
              </div>
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
                          value={getVal('rekap', 'tagline', 'Official Apparel Studio')}
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
                          value={getVal('rekap', 'alamat', 'Komp.Taman Bunga Sukamukti,\nKec. Katapang, Kabupaten Bandung, Jawa Barat 40921')}
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
                          value={getVal('rekap', 'whatsapp', 'WhatsApp: +62 851-6666-4161')}
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
                          value={getVal('rekap', 'instagram', 'Instagram: nomadenapparel')}
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
                      value={getVal('rekap', 'labelInvoicingComp', 'Invoicing Compilation')}
                      onChange={(val) => setVal('rekap', 'labelInvoicingComp', val)}
                      className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest text-left sm:text-right"
                    />
                  </span>
                  <h2 className="text-lg font-black text-slate-900 leading-none">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal('rekap', 'titleRekap', 'REKAP BATCH')}
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
                    value={getVal('rekap', 'descStatusIkhtisar', `Berikut adalah rincian konsolidasi tagihan seluruh pesanan (${pesananArray.length} PO) yang dipilih untuk cetak batch nota.`)}
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
                        <th className="pb-3 text-right w-24">
                          {notaType === 'sublim' ? 'Sublim' : notaType === 'jahit' ? 'Jahit' : 'Subtotal'}
                        </th>
                        <th className="pb-3 text-right w-24">
                          {notaType !== 'pelanggan' ? 'Terbayar' : 'DP Masuk'}
                        </th>
                        <th className="pb-3 text-right w-24 font-extrabold text-indigo-600">
                          {notaType === 'sublim' ? 'Sisa Sublim' : notaType === 'jahit' ? 'Sisa Jahit' : 'Sisa Tagihan'}
                        </th>
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
                              <p className="text-[10px] text-slate-500 text-left">
                                <EditableText
                                  isEditing={isEditingTexts}
                                  value={getVal(`rekap_${recId}`, 'namaPemesan', item.namaPemesan)}
                                  onChange={(val) => setVal(`rekap_${recId}`, 'namaPemesan', val)}
                                  className="text-[10px] text-slate-500 text-left"
                                />
                              </p>
                            </td>
                            <td className="py-3 text-center font-bold text-slate-800">
                              <EditableText
                                isEditing={isEditingTexts}
                                value={getVal(`rekap_${recId}`, 'qty', `${item.qty} pcs`)}
                                onChange={(val) => setVal(`rekap_${recId}`, 'qty', val)}
                                className="text-center font-bold text-slate-800 text-xs"
                              />
                            </td>
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
                          value={getVal('rekap', 'perhatianTitle', 'Perhatian Pelunasan')}
                          onChange={(val) => setVal('rekap', 'perhatianTitle', val)}
                          className="text-[10px] font-bold text-indigo-900 uppercase text-left"
                        />
                      </h6>
                      <div className="text-[10px] text-indigo-700 mt-0.5 leading-relaxed text-left">
                        <EditableText
                          isEditing={isEditingTexts}
                          value={getVal('rekap', 'perhatianText', 'Harap menginstruksikan pelunasan sisa tagihan untuk masing-masing PO di atas sesuai dengan rincian yang tercantum pada lembar nota masing-masing.')}
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
                      value={getVal('rekap', 'ikhtisarDisclaimer', '* Ikhtisar ini disusun otomatis oleh sistem kasir untuk menyederhanakan perhitungan total invoice bagi pemesan rombongan / reseller.')}
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
                        value={getVal('rekap', 'labelTotalNilai', 'Total Nilai PO')}
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
                </div>
              </div>

              {/* Stamp Sign block */}
              <div className="mt-10 flex justify-end gap-12 text-center text-xs">
                <div className="w-40 pt-4 relative">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-10 text-center">
                    <EditableText
                      isEditing={isEditingTexts}
                      value={getVal('rekap', 'hormatKamiSign', 'Hormat Kami,')}
                      onChange={(val) => setVal('rekap', 'hormatKamiSign', val)}
                      className="text-slate-400 text-[10px] uppercase font-bold tracking-widest text-center"
                    />
                  </p>
                  
                  <div className="absolute top-[30px] right-[25px] h-12 w-12 border-2 border-emerald-555 border-dotted rounded-full flex items-center justify-center opacity-40 transform rotate-12 select-none pointer-events-none">
                    <p className="text-[8px] font-mono leading-none font-bold text-emerald-555">Nomaden<br />Apparel</p>
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
                      value={getVal('rekap', 'roleSign', 'Finance Administration')}
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
