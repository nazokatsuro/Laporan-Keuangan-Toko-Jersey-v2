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
  Instagram
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ReceiptGeneratorProps {
  pesanan: Pesanan | Pesanan[];
  settings: ShopSettings;
  onCancel: () => void;
}

export default function ReceiptGenerator({ pesanan, settings, onCancel }: ReceiptGeneratorProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const pesananArray = Array.isArray(pesanan) ? pesanan : [pesanan];
  const isBatch = Array.isArray(pesanan);

  const totalQty = pesananArray.reduce((acc, curr) => acc + curr.qty, 0);
  const totalHargaSum = pesananArray.reduce((acc, curr) => acc + curr.totalHarga, 0);
  const totalUangMasukSum = pesananArray.reduce((acc, curr) => acc + curr.uangMasuk, 0);
  const totalSisaTagihanSum = pesananArray.reduce((acc, curr) => acc + curr.sisaTagihan, 0);

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
    setExporting(true);
    try {
      const targets = pesananArray.map(item => ({
        id: `invoice-paper-${item.id}`,
        filename: `NOTA-${item.id}-${item.namaPo.replace(/\s+/g, '_')}.jpg`
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
    }
  };

  // Convert receipts to PDF (perfectly scaled continuous pages combined into one document)
  const downloadPDF = async () => {
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
        const filename = isBatch 
          ? `BATCH-NOTA-${pesananArray.length}_TRANSAKSI.pdf`
          : `NOTA-${pesananArray[0].id}-${pesananArray[0].namaPo.replace(/\s+/g, '_')}.pdf`;
        pdf.save(filename);
      }
    } catch (error) {
      console.error('Gagal export PDF:', error);
      alert('Gagal mendownload PDF. Mohon coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  // Print system default
  const handlePrint = () => {
    window.print();
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
            {isBatch ? `Pratinjau Batch Nota (${pesananArray.length} Transaksi)` : 'Pratinjau Nota Transaksi'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isBatch 
              ? `Preview batch ${pesananArray.length} transaksi. Unduh JPG massal, gabung satu PDF, atau cetak sekaligus.`
              : 'Preview, unduh JPG/PDF HD, atau print langsung sebagai bukti transaksi klien.'
            }
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2">
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
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            {isBatch ? 'Cetak Semua Nota' : 'Cetak Nota'}
          </button>
        </div>
      </div>

      {/* Invoice Container with subtle card layout */}
      <div id="invoice-paper-container" className="bg-slate-100 dark:bg-slate-900 p-2 sm:p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800 flex justify-center">
        
        {/* Actual Paper block container to be generated */}
        <div 
          ref={receiptRef}
          className="w-full flex flex-col items-center gap-6 no-print-gap"
        >
          {pesananArray.map((item, index) => {
            const isFullyPaid = item.sisaTagihan === 0;
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
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">{settings.namaToko || 'Toko Jersey'}</h1>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Official Apparel Studio
                        </span>
                      </div>
                    </div>

                    {/* Standard contact address template */}
                    <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>
                        Komp.Taman Bunga Sukamukti,<br />
                        Kec. Katapang, Kabupaten Bandung, Jawa Barat 40921
                        </span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>WhatsApp: +62 851-6666-4161</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Instagram className="h-3 w-3" />
                        <span>Instagram: nomadenapparel</span>
                      </p>
                    </div>
                  </div>

                  {/* Note Metadata */}
                  <div className="text-left sm:text-right space-y-1.5 min-w-[170px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nota Bukti Pesanan</span>
                    <h2 className="text-lg font-black text-slate-900 leading-none">{item.id}</h2>
                    
                    <div className="text-xs text-slate-500 pt-1 space-y-0.5">
                      <p>
                        <span>Tgl Masuk:</span> <strong className="font-semibold text-slate-755">{new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                      </p>
                      <p>
                        <span>Deadline:</span> <strong className="font-semibold text-slate-755">{new Date(item.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                      </p>
                      <p className="flex items-center sm:justify-end gap-1.5 mt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
                        <span className={`text-[12px] font-black uppercase tracking-wide ${getStatusColor(item.statusProduksi)}`}>
                          {item.statusProduksi}
                        </span>
                      </p>
                    </div>
                  </div>

                </div>

                {/* Customer Metadata Block */}
                <div className="my-6 bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Informasi Klien</p>
                    <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{item.namaPemesan}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Tim: <strong className="font-bold text-indigo-700">{item.namaPo}</strong></p>
                    {item.noTelepon && (
                      <p className="text-xs text-slate-500 font-mono mt-0.5">Mbl: {item.noTelepon}</p>
                    )}
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Spesifikasi Kustom</p>
                    <p className="text-xs text-slate-800 font-bold">
                      {item.items && item.items.length > 1 ? `${item.items.length} Jenis Jersey (PO)` : item.namaProduk}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Bahan: <strong className="font-medium text-slate-700">{item.bahan || 'Bahan Standar'}</strong></p>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="my-6 space-y-4">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detail Rincian Pembelian</h5>
                  
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-350 text-slate-450 uppercase text-[10px] font-bold tracking-wider float-none table-row">
                        <th className="pb-3 width-auto">Deskripsi Item</th>
                        <th className="pb-3 text-center w-24">Bahan</th>
                        <th className="pb-3 text-center w-12">Qty</th>
                        <th className="pb-3 text-right w-28">Harga / pcs</th>
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
                      }]).map((subItem, idx) => (
                        <tr key={subItem.id || idx} className="border-b border-slate-100 font-medium table-row">
                          <td className="py-3 pr-3">
                            <p className="font-bold text-slate-900">{subItem.namaProduk}</p>
                            {subItem.keterangan && (
                              <p className="text-[11px] text-slate-500 mt-1 italic tracking-wide max-w-[280px] whitespace-pre-wrap">
                                Catatan: {subItem.keterangan}
                              </p>
                            )}
                          </td>
                          <td className="py-3 text-center text-slate-600">{subItem.bahan || 'Standar'}</td>
                          <td className="py-3 text-center font-bold text-slate-900">{subItem.qty}</td>
                          <td className="py-3 text-right text-slate-600">{formatRupiah(subItem.hargaPerPcs)}</td>
                          <td className="py-3 text-right font-bold text-slate-900">{formatRupiah(subItem.qty * subItem.hargaPerPcs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Summary Financials */}
                <div className="flex flex-col sm:flex-row sm:justify-between items-start pt-4 border-t border-slate-200 gap-6">
                  
                  {/* Payment status badge / notes */}
                  <div className="flex-1 max-w-sm space-y-3">
                    {item.mockupUrl && (
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">
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

                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center gap-3">
                      <span className="p-1.5 bg-indigo-650 rounded-full text-white">
                        <ShoppingBag className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <h6 className="text-[10px] font-bold text-indigo-900 uppercase">Jaminan Kualitas</h6>
                        <p className="text-[10px] text-indigo-700 mt-0.5 leading-relaxed">
                          Jersey ini dibuat kustom menggunakan teknologi sublimation press HD anti luntur berkualitas premium.
                        </p>
                      </div>
                    </div>

                    {/* Terms and conditions */}
                    <p className="text-[9px] text-slate-400 leading-relaxed italic">
                      * Syarat & Ketentuan:<br />
                      1. Barang yang sudah diproduksi tidak dapat dibatalkan atau direvisi.<br />
                      2. Pelunasan sisa tagihan wajib diselesaikan saat pengambilan/pengiriman jersey.
                    </p>
                  </div>

                  {/* Financial aggregations block */}
                  <div className="w-full sm:w-64 text-xs space-y-2">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal Harga</span>
                      <span>{formatRupiah(item.totalHarga)}</span>
                    </div>
                    
                    <div className="flex justify-between text-slate-500">
                      <span>Uang Masuk / Pembayaran DP</span>
                      <span className="font-semibold text-emerald-600">{formatRupiah(item.uangMasuk)}</span>
                    </div>

                    <div className="border-t border-slate-100 my-1" />

                    {/* Sisa Tagihan highlight */}
                    <div className={`p-3 rounded-lg flex justify-between items-center ${
                      isFullyPaid 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                        : 'bg-rose-50 text-rose-800 border border-rose-100 font-bold'
                    }`}>
                      <span className="text-[10px] uppercase font-bold tracking-wider">
                        {isFullyPaid ? 'Status Bayar' : 'Sisa Tagihan'}
                      </span>
                      <span className="text-sm font-black">
                        {isFullyPaid ? 'LUNAS ✓' : formatRupiah(item.sisaTagihan)}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Stamp Sign block */}
                <div className="mt-10 flex justify-end gap-12 text-center text-xs">
                  <div className="w-40 pt-4 relative">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-10">Hormat Kami,</p>
                    
                    {/* Fake stamp decoration for premium official aesthetic */}
                    <div className="absolute top-[30px] right-[25px] h-12 w-12 border-2 border-emerald-555 border-dotted rounded-full flex items-center justify-center opacity-40 transform rotate-12 select-none pointer-events-none">
                      <p className="text-[8px] font-mono leading-none font-bold text-emerald-555">Nomaden<br />Apparel</p>
                    </div>

                    <div className="border-b border-slate-300 w-full mx-auto" />
                    <p className="font-bold text-slate-800 mt-1">{settings.namaToko || 'Toko Jersey'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Finance Administration</p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Compilation/Batch Summary Page (ONLY rendered for multiple selected receipts) */}
          {pesananArray.length > 1 && (
            <div 
              id="invoice-paper-batch-summary"
              className="w-full max-w-[680px] bg-white p-6 sm:p-10 rounded-xs shadow-md text-slate-805 border border-slate-200/60 font-sans relative invoice-card"
            >
              {/* Decorative invoice background stripes */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 no-print" />
              
              {/* Header */}
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
                      <h1 className="text-xl font-bold tracking-tight text-slate-900">{settings.namaToko || 'Toko Jersey'}</h1>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Official Apparel Studio
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>
                      Komp.Taman Bunga Sukamukti,<br />
                      Kec. Katapang, Kabupaten Bandung, Jawa Barat 40921
                      </span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>WhatsApp: +62 851-6666-4161</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Instagram className="h-3 w-3" />
                      <span>Instagram: nomadenapparel</span>
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1.5 min-w-[170px]">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Invoicing Compilation</span>
                  <h2 className="text-lg font-black text-slate-900 leading-none">REKAP BATCH</h2>
                  <div className="text-xs text-slate-500 pt-1 space-y-0.5">
                    <p>
                      <span>Tanggal Rekap:</span> <strong className="font-semibold text-slate-755">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                    </p>
                    <p>
                      <span>Total Transaksi:</span> <strong className="font-semibold text-slate-755">{pesananArray.length} PO</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Compiled Title / Notice banner */}
              <div className="my-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Status Ikhtisar Batch</h4>
                <p className="text-xs text-slate-650 leading-relaxed">
                  Berikut adalah rincian konsolidasi tagihan seluruh pesanan ({pesananArray.length} PO) yang dipilih untuk cetak batch nota.
                </p>
              </div>

              {/* Table of Batch Items */}
              <div className="my-6 space-y-3">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daftar PO & Rincian Pembayaran</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-350 text-slate-450 uppercase text-[10px] font-bold tracking-wider">
                        <th className="pb-3 w-20">ID</th>
                        <th className="pb-3">PO / Tim & Pemesan</th>
                        <th className="pb-3 text-center w-12">Qty</th>
                        <th className="pb-3 text-right w-24">Subtotal</th>
                        <th className="pb-3 text-right w-24">DP Masuk</th>
                        <th className="pb-3 text-right w-24 font-extrabold text-indigo-600">Sisa Tagihan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pesananArray.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 font-medium">
                          <td className="py-3 font-mono text-indigo-650 font-bold">{item.id}</td>
                          <td className="py-3">
                            <p className="font-bold text-slate-900">{item.namaPo}</p>
                            <p className="text-[10px] text-slate-500">{item.namaPemesan}</p>
                          </td>
                          <td className="py-3 text-center font-bold text-slate-800">{item.qty} pcs</td>
                          <td className="py-3 text-right text-slate-700">{formatRupiah(item.totalHarga)}</td>
                          <td className="py-3 text-right font-semibold text-emerald-600">{formatRupiah(item.uangMasuk)}</td>
                          <td className="py-3 text-right font-bold text-rose-600">{formatRupiah(item.sisaTagihan)}</td>
                        </tr>
                      ))}
                      {/* Grand Total Row */}
                      <tr className="bg-slate-50/80 font-black border-t-2 border-slate-300">
                        <td className="py-3 pl-2" colSpan={2}>GRAND TOTAL KONSOLIDASI</td>
                        <td className="py-3 text-center text-slate-900">{totalQty} pcs</td>
                        <td className="py-3 text-right text-indigo-650">{formatRupiah(totalHargaSum)}</td>
                        <td className="py-3 text-right text-emerald-700">{formatRupiah(totalUangMasukSum)}</td>
                        <td className="py-3 text-right text-rose-700 pr-2">{formatRupiah(totalSisaTagihanSum)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Konsolidasi Ringkasan */}
              <div className="flex flex-col sm:flex-row sm:justify-between items-start pt-4 border-t border-slate-200 gap-6">
                <div className="flex-1 max-w-sm space-y-3">
                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center gap-3">
                    <span className="p-1.5 bg-indigo-650 rounded-full text-white">
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h6 className="text-[10px] font-bold text-indigo-900 uppercase">Perhatian Pelunasan</h6>
                      <p className="text-[10px] text-indigo-700 mt-0.5 leading-relaxed">
                        Harap menginstruksikan pelunasan sisa tagihan untuk masing-masing PO di atas sesuai dengan rincian yang tercantum pada lembar nota masing-masing.
                      </p>
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-relaxed italic">
                    * Ikhtisar ini disusun otomatis oleh sistem kasir untuk menyederhanakan perhitungan total invoice bagi pemesan rombongan / reseller.
                  </p>
                </div>

                {/* Total Aggregation */}
                <div className="w-full sm:w-64 text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-slate-500 font-bold">
                    <span>Total Nilai PO</span>
                    <span>{formatRupiah(totalHargaSum)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-bold">
                    <span>Total DP Masuk</span>
                    <span className="text-emerald-600">{formatRupiah(totalUangMasukSum)}</span>
                  </div>
                  <div className="border-t border-slate-200 my-1" />
                  <div className="flex justify-between items-center text-rose-850 font-black">
                    <span className="text-[10px] uppercase tracking-wider">SISA TAGIHAN BATCH</span>
                    <span className="text-sm">{formatRupiah(totalSisaTagihanSum)}</span>
                  </div>
                </div>
              </div>

              {/* Stamp Sign block */}
              <div className="mt-10 flex justify-end gap-12 text-center text-xs">
                <div className="w-40 pt-4 relative">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-10">Hormat Kami,</p>
                  
                  <div className="absolute top-[30px] right-[25px] h-12 w-12 border-2 border-emerald-555 border-dotted rounded-full flex items-center justify-center opacity-40 transform rotate-12 select-none pointer-events-none">
                    <p className="text-[8px] font-mono leading-none font-bold text-emerald-555">Nomaden<br />Apparel</p>
                  </div>

                  <div className="border-b border-slate-300 w-full mx-auto" />
                  <p className="font-bold text-slate-800 mt-1">{settings.namaToko || 'Toko Jersey'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Finance Administration</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
