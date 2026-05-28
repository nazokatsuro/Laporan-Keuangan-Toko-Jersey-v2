/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Pesanan } from '../types';
import { formatRupiah, safeHtml2canvas } from '../utils';
import { 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Layers, 
  FileImage,
  Filter,
  CheckCircle,
  FileText,
  PieChart as PieIcon,
  ChevronsUpDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface FinancialReportsProps {
  pesananList: Pesanan[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

export default function FinancialReports({ 
  pesananList,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}: FinancialReportsProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // Derive unique years and months from actual transaction history
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    // Allow an unrestricted continuous sequence of years
    for (let yr = 2020; yr <= currentYear + 10; yr++) {
      years.add(String(yr));
    }
    pesananList.forEach(item => {
      const yr = item.createdAt.substring(0, 4);
      if (yr) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [pesananList]);

  // Months listing helper
  const MONTHS_LIST = [
    { value: 'Semua', name: 'Semua Bulan' },
    { value: '01', name: 'Januari' },
    { value: '02', name: 'Februari' },
    { value: '03', name: 'Maret' },
    { value: '04', name: 'April' },
    { value: '05', name: 'Mei' },
    { value: '06', name: 'Juni' },
    { value: '07', name: 'Juli' },
    { value: '08', name: 'Agustus' },
    { value: '09', name: 'September' },
    { value: '10', name: 'Oktober' },
    { value: '11', name: 'November' },
    { value: '12', name: 'Desember' }
  ];



  // Active compiled statistical aggregates for the selected target period
  const reportStats = useMemo(() => {
    let omset = 0;
    let modal = 0;
    let profit = 0;
    let totalProduksi = 0;
    let filteredOrders: Pesanan[] = [];

    pesananList.forEach(item => {
      const itemYear = item.createdAt.substring(0, 4);
      const itemMonth = item.createdAt.substring(5, 7); // "MM"
      
      const yearMatches = selectedYear === 'Semua' || itemYear === selectedYear;
      const monthMatches = selectedMonth === 'Semua' || itemMonth === selectedMonth;

      if (yearMatches && monthMatches) {
        omset += item.totalHarga;
        modal += item.totalModal;
        profit += item.profit;
        totalProduksi += item.qty;
        filteredOrders.push(item);
      }
    });

    return {
      omset,
      modal,
      profit,
      totalProduksi,
      totalPesanan: filteredOrders.length,
      orders: filteredOrders
    };
  }, [pesananList, selectedMonth, selectedYear]);

  // Export report area as High-Resolution JPG (Supporting gorgeous Dark Mode output)
  const exportJPG = async () => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const canvas = await safeHtml2canvas(reportRef.current, {
        scale: 3, // HD quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020617', // Force dark backplate matching dark:bg-slate-950
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `LAPORAN-FINANSIAL-${selectedYear}-${selectedMonth}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Gagal mendownload JPEG.');
    } finally {
      setExporting(false);
    }
  };

  // Export report area as high-res continuous PDF layout containing all charts & tables
  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);

    try {
      const canvas = await safeHtml2canvas(reportRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#020617', // Force dark backplate matching dark:bg-slate-950
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const imgWidth = 210; // Standard format base width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width; // Continuously calculated height
      
      // Instantiate PDF with exact canvas responsive height to prevent cut-offs
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [imgWidth, imgHeight]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`LAPORAN-${selectedYear}-${selectedMonth}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Gagal mendownload PDF.');
    } finally {
      setExporting(false);
    }
  };

  const selectedMonthName = useMemo(() => {
    if (selectedMonth === 'Semua') return 'Semua Bulan';
    return MONTHS_LIST.find(m => m.value === selectedMonth)?.name || '';
  }, [selectedMonth]);

  // Chart data representation
  const chartData = [
    { name: 'Omset Jual', Rupiah: reportStats.omset, fill: '#4f46e5' },
    { name: 'Biaya Modal (HPP)', Rupiah: reportStats.modal, fill: '#ef4444' },
    { name: 'Keuntungan Bersih', Rupiah: reportStats.profit, fill: '#10b981' }
  ];

  return (
    <div className="space-y-6 animate-fade-in no-print">
      
      {/* Filters & Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-705 shadow-2xs">
        
        {/* Filters block selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350">
            <Calendar className="h-4 w-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer font-bold"
            >
              {MONTHS_LIST.map(m => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-350">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer font-bold"
            >
              <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">Semua Tahun</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Download reports buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportJPG}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-755 border border-slate-205 dark:border-slate-700 font-extrabold text-xs px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            <FileImage className="h-4 w-4 text-indigo-500" />
            Download Laporan JPG
          </button>

          <button
            onClick={exportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4 text-white" />
            Download PDF HD
          </button>
        </div>
      </div>

      {/* Target visual printable compiled canvas */}
      <div 
        ref={reportRef}
        id="financial-report-paper"
        className="bg-[#0b0f19] p-6 sm:p-8 rounded-2xl border border-slate-800 text-slate-200 space-y-6"
      >
        
        {/* Title area */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-800 pb-5 gap-4">
          <div>
            <h3 className="text-xl font-black text-white tracking-wide">LAPORAN AKTIVITAS KEUANGAN JERSEY</h3>
            <p className="text-xs text-slate-400 mt-1">
              Periode Pembukuan: <strong className="text-indigo-400 font-extrabold">{selectedMonthName} {selectedYear}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Metode Hitung</span>
            <p className="font-extrabold text-slate-200 mt-0.5">Sistem Kas Mandiri (HPP Bulanan)</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Disusun otomatis oleh Local Data</p>
          </div>
        </div>

        {/* Aggregated visual cards for the compiled month */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-[#111827] p-4 rounded-xl border border-slate-800">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Sisa Omset</span>
            <p className="text-lg font-black text-indigo-400 mt-1">{formatRupiah(reportStats.omset)}</p>
            <span className="text-[10px] text-slate-400 block mt-1">Bruto jersey dipesan</span>
          </div>

          <div className="bg-[#111827] p-4 rounded-xl border border-slate-800">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Biaya Modal (HPP)</span>
            <p className="text-lg font-black text-rose-400 mt-1">{formatRupiah(reportStats.modal)}</p>
            <span className="text-[10px] text-slate-400 block mt-1">Total pengeluaran tim</span>
          </div>

          <div className="bg-[#111827] p-4 rounded-xl border border-emerald-500/30 ring-2 ring-emerald-500/10">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hasil Untung Bersih</span>
            <p className="text-lg font-black text-emerald-400 mt-1">{formatRupiah(reportStats.profit)}</p>
            <span className="text-[10px] text-emerald-500 block mt-1 font-semibold">Estimasi profit bersih</span>
          </div>

          <div className="bg-[#111827] p-4 rounded-xl border border-slate-800">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kuantitas Produksi</span>
            <p className="text-lg font-black text-slate-100 mt-1">{reportStats.totalProduksi} Pcs</p>
            <span className="text-[10px] text-slate-400 block mt-1">Banyak jersey terbuat</span>
          </div>

          <div className="bg-[#111827] p-4 rounded-xl border border-slate-800">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Transaksi</span>
            <p className="text-lg font-black text-slate-100 mt-1">{reportStats.totalPesanan} Pesanan</p>
            <span className="text-[10px] text-slate-400 block mt-1">Frekuensi pesanan</span>
          </div>

        </div>

        {/* Visualizer charts strictly for this target selected period */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-[#111827] p-5 rounded-2xl border border-slate-800">
            <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-4">Grafik Sebaran Nominal Periode</h4>
            
            <div className="h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                  <YAxis 
                    fontSize={10} 
                    stroke="#94a3b8" 
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                      return val;
                    }}
                  />
                  <Tooltip 
                    formatter={(val) => [formatRupiah(Number(val)), '']}
                    contentStyle={{ borderRadius: '0.5rem', backgroundColor: '#111827', border: '1px solid #374151', color: '#fff' }}
                  />
                  <Bar dataKey="Rupiah" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Guidelines notes panel */}
          <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-3">Persentase Laba Kotor</h4>
              {reportStats.omset > 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <p className="text-4xl font-extrabold text-[#10b981]">
                      {((reportStats.profit / reportStats.omset) * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">Rasio Margin Keuntungan</p>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Margin Laba Bersih</span>
                      <span className="font-bold text-[#10b981]">{formatRupiah(reportStats.profit)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">HPP / Ongkos Modal</span>
                      <span className="font-bold text-rose-400">{formatRupiah(reportStats.modal)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <DollarSign className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs">Uang kas bersih sedang kosong pada periode ini.</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-4 text-[10px] text-slate-400 leading-relaxed italic">
              * Perhitungan laba rugi di atas dikalkulasikan secara seketika berdasarkan penginputan status modal pengerjaan per kaos jersey.
            </div>
          </div>

        </div>

        {/* Detailed Transactions belonging to selected filter */}
        <div className="bg-[#111827] p-5 rounded-2xl border border-slate-800">
          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest mb-3">Daftar Transaksi Masuk Periode Ini</h4>
          
          <div className="overflow-x-auto">
            {reportStats.orders.length === 0 ? (
              <p className="text-xs text-center py-6 text-slate-400">Tidak ada riwayat rincian jersey dipesan bulan ini.</p>
            ) : (
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5">ID</th>
                    <th className="py-2.5 text-indigo-400">Nama Pemesan / PO Tim</th>
                    <th className="py-2.5 text-center">Bahan</th>
                    <th className="py-2.5 text-center font-bold">Qty</th>
                    <th className="py-2.5 text-right">Modal</th>
                    <th className="py-2.5 text-right">Omset</th>
                    <th className="py-2.5 text-right">Margin Bersih</th>
                  </tr>
                </thead>
                <tbody>
                  {reportStats.orders.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                      <td className="py-3 font-mono text-indigo-400 font-bold">{item.id}</td>
                      <td className="py-3">
                        <strong className="block text-slate-100 font-extrabold text-[13px]">{item.namaPo}</strong>
                        <span className="text-[10px] text-slate-400 font-semibold">{item.namaPemesan}</span>
                      </td>
                      <td className="py-3 text-center text-slate-300">{item.bahan || '-'}</td>
                      <td className="py-3 text-center font-extrabold text-slate-100">{item.qty} Pcs</td>
                      <td className="py-3 text-right text-rose-400 font-semibold">{formatRupiah(item.totalModal)}</td>
                      <td className="py-3 text-right text-slate-100 font-black">{formatRupiah(item.totalHarga)}</td>
                      <td className="py-3 text-right text-emerald-400 font-black">+{formatRupiah(item.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
