/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Pesanan, StatusProduksi } from '../types';
import { formatRupiah } from '../utils';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Activity, 
  Wallet, 
  AlertTriangle,
  Clock, 
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  MessageSquare,
  Send
} from 'lucide-react';
import { ShopSettings } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';

import FraudScanner from './FraudScanner';

interface DashboardProps {
  pesananList: Pesanan[];
  onNavigate: (tab: string) => void;
  onSelectOrder: (pesanan: Pesanan) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  settings: ShopSettings;
  onUpdateSettings: (updates: Partial<ShopSettings>) => void;
}

export default function Dashboard({ 
  pesananList, 
  onNavigate, 
  onSelectOrder,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  settings,
  onUpdateSettings
}: DashboardProps) {
  // Config states for targets editing on Dashboard
  const [isEditingOmset, setIsEditingOmset] = useState(false);
  const [tempOmset, setTempOmset] = useState(settings.targetOmset || 100000000);
  const [isEditingProduksi, setIsEditingProduksi] = useState(false);
  const [tempProduksi, setTempProduksi] = useState(settings.targetProduksi || 1000);

  // Compute average monthly operational outflows (historical)
  const averageMonthlyExpenseGlobal = useMemo(() => {
    const monthlyExpensesMap: Record<string, number> = {};

    pesananList.forEach(po => {
      const dateStr = po.createdAt ? po.createdAt.substring(0, 7) : new Date().toISOString().substring(0, 7);
      const sublimCost = po.qty * (po.printPerPcs || 0);
      const jahitCost = po.qty * (po.jahitPerPcs || 0);
      const otherCost = po.biayaLainnya || 0;
      const totalPoExpense = sublimCost + jahitCost + otherCost;
      if (totalPoExpense > 0) {
        monthlyExpensesMap[dateStr] = (monthlyExpensesMap[dateStr] || 0) + totalPoExpense;
      }
    });

    const manualList = settings.cashFlowList || [];
    manualList.forEach(tx => {
      if (tx.jenis === 'keluar') {
        const dateStr = tx.tanggal.substring(0, 7);
        monthlyExpensesMap[dateStr] = (monthlyExpensesMap[dateStr] || 0) + tx.nominal;
      }
    });

    const months = Object.keys(monthlyExpensesMap);
    const totalOutflow = Object.values(monthlyExpensesMap).reduce((sum, curr) => sum + curr, 0);

    if (months.length === 0) {
      return 6500000;
    }
    return totalOutflow / months.length;
  }, [pesananList, settings.cashFlowList]);

  // Derive unique years from actual transaction history
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    // Allow an unrestricted continuous sequence of years
    for (let yr = 2020; yr <= currentYear + 10; yr++) {
      years.add(String(yr));
    }
    pesananList.forEach(item => {
      const dtStr = item.createdAt || new Date().toISOString();
      const yr = dtStr.substring(0, 4);
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

  const selectedMonthName = useMemo(() => {
    if (selectedMonth === 'Semua') return 'Semua Bulan';
    const found = MONTHS_LIST.find(m => m.value === selectedMonth);
    return found ? found.name : '';
  }, [selectedMonth]);

  const stats = useMemo(() => {
    let rawOmsetThisMonth = 0;
    let rawModalThisMonth = 0;
    let rawProfitThisMonth = 0;

    let totalProduksi = 0;
    let totalUangMasuk = 0;
    let totalSisaTagihan = 0;
    let pesananBelumLunasCount = 0;
    let filteredOrdersCount = 0;

    pesananList.forEach(item => {
      const dtStr = item.createdAt || new Date().toISOString();
      const itemYear = dtStr.substring(0, 4);
      const itemMonth = dtStr.substring(5, 7); // "MM"
      
      const yearMatches = selectedYear === 'Semua' || itemYear === selectedYear;
      const monthMatches = selectedMonth === 'Semua' || itemMonth === selectedMonth;

      if (yearMatches && monthMatches) {
        rawOmsetThisMonth += item.totalHarga;
        rawModalThisMonth += item.totalModal;
        rawProfitThisMonth += item.profit;
        
        totalProduksi += item.qty;
        totalUangMasuk += item.uangMasuk;
        totalSisaTagihan += item.sisaTagihan;
        if (item.sisaTagihan > 0) {
          pesananBelumLunasCount++;
        }
        filteredOrdersCount++;
      }
    });

    return {
      omsetBulanIni: rawOmsetThisMonth,
      modalBulanIni: rawModalThisMonth,
      profitBulanIni: rawProfitThisMonth,
      totalProduksi,
      totalPesanan: filteredOrdersCount,
      totalUangMasuk,
      totalSisaTagihan,
      pesananBelumLunas: pesananBelumLunasCount,
    };
  }, [pesananList, selectedMonth, selectedYear]);

  // Production Status Distribution stats
  const statusStats = useMemo(() => {
    const counts: Record<StatusProduksi, number> = {
      'Setting': 0,
      'Print Press': 0,
      'Jahit': 0,
      'Tinggal Kirim': 0,
      'Beres': 0
    };

    pesananList.forEach(item => {
      if (counts[item.statusProduksi] !== undefined) {
        counts[item.statusProduksi]++;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [pesananList]);

  // Colors for each status
  const COLORS = {
    'Setting': '#6366f1',      // Indigo
    'Print Press': '#ec4899',  // Pink
    'Jahit': '#f59e0b',        // Amber
    'Tinggal Kirim': '#14b8a6',// Teal
    'Beres': '#10b981'         // Emerald
  };

  // Group by month helper for the area chart
  const monthlyData = useMemo(() => {
    const monthlyGroups: Record<string, { omset: number; modal: number; profit: number }> = {};
    
    // Seed at least the last 4 months so the chart has beautiful data even with low entries
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyGroups[mKey] = { omset: 0, modal: 0, profit: 0 };
    }

    pesananList.forEach(item => {
      const dtStr = item.createdAt || new Date().toISOString();
      const mKey = dtStr.substring(0, 7);
      if (!monthlyGroups[mKey]) {
        monthlyGroups[mKey] = { omset: 0, modal: 0, profit: 0 };
      }
      monthlyGroups[mKey].omset += item.totalHarga;
      monthlyGroups[mKey].modal += item.totalModal;
      monthlyGroups[mKey].profit += item.profit;
    });

    return Object.entries(monthlyGroups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        const [yr, mn] = key.split('-');
        const dateObj = new Date(parseInt(yr), parseInt(mn) - 1, 1);
        const name = dateObj.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
        return {
          name,
          Omset: value.omset,
          Modal: value.modal,
          Profit: value.profit
        };
      });
  }, [pesananList]);

  // Urgent Notifications / Alert system
  const warningList = useMemo(() => {
    const list: Array<{ id: string; type: string; title: string; message: string; severity: 'high' | 'medium'; order: Pesanan }> = [];
    const today = new Date();

    pesananList.forEach(item => {
      const dtStr = item.createdAt || new Date().toISOString();
      const itemYear = dtStr.substring(0, 4);
      const itemMonth = dtStr.substring(5, 7);
      
      const yearMatches = selectedYear === 'Semua' || itemYear === selectedYear;
      const monthMatches = selectedMonth === 'Semua' || itemMonth === selectedMonth;

      if (yearMatches && monthMatches) {
        // 1. Debt alert
        if (item.sisaTagihan > 0) {
          list.push({
            id: `${item.id}-unpaid`,
            type: 'unpaid',
            title: `Sisa Tagihan: ${item.namaPo}`,
            message: `Pemesan ${item.namaPemesan} memiliki sisa tagihan senilai ${formatRupiah(item.sisaTagihan)}. (${item.noTelepon})`,
            severity: 'medium',
            order: item
          });
        }

        // 2. Deadline alert
        if (item.statusProduksi !== 'Beres') {
          const dlParts = item.deadline.split('-');
          let dlDate = new Date(item.deadline);
          if (dlParts.length === 3) {
            dlDate = new Date(parseInt(dlParts[0]), parseInt(dlParts[1]) - 1, parseInt(dlParts[2]));
          }
          // Calculate difference in days
          const diffTime = dlDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 3 && diffDays >= 0) {
            list.push({
              id: `${item.id}-deadline`,
              type: 'deadline',
              title: `Deadline Dekat: ${item.namaPo}`,
              message: `Pesanan harus siap dlm ${diffDays} hari (${item.deadline}) - Status: ${item.statusProduksi}`,
              severity: 'high',
              order: item
            });
          } else if (diffDays < 0) {
            list.push({
              id: `${item.id}-overdue`,
              type: 'overdue',
              title: `Deadline Lewati Batas: ${item.namaPo}`,
              message: `Pesanan terlambat ${Math.abs(diffDays)} hari! Segera selesaikan pengerjaan jersey.`,
              severity: 'high',
              order: item
            });
          }
        }
      }
    });

    return list.slice(0, 6); // Limit to top 6 notifications for brevity
  }, [pesananList, selectedMonth, selectedYear]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* KPI Stats Header with Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Ringkasan Finansial & Produksi
          </h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Periode Laporan: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{selectedMonthName} {selectedYear === 'Semua' ? 'Semua Tahun' : selectedYear}</span>
          </p>
        </div>

        {/* Month & Year Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar Icon Label */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-201/40 dark:border-slate-800 shrink-0 select-none">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Pilih Periode:</span>
          </div>

          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-505 cursor-pointer appearance-none pr-8"
              id="dashboard_select_month"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <svg className="fill-current h-3 w-3 font-bold" xmlns="http://www.w3.org/2013/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-slate-805 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-505 cursor-pointer appearance-none pr-8"
              id="dashboard_select_year"
            >
              <option value="Semua">Semua Tahun</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <svg className="fill-current h-3 w-3 font-bold" xmlns="http://www.w3.org/2013/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omset Bulan Terpilih */}
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15 group-hover:scale-110 transition-transform duration-300">
            <TrendingUp className="h-28 w-28" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-indigo-100 text-sm font-medium tracking-wide">Omset {selectedMonthName}</span>
            <span className="p-2 bg-indigo-400/30 rounded-xl">
              <TrendingUp className="h-5 w-5 text-white" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold leading-none">{formatRupiah(stats.omsetBulanIni)}</h3>
            <p className="text-indigo-100 text-xs mt-1">Bruto periode {selectedMonthName} '{selectedYear.substring(2)}</p>
          </div>
        </div>

        {/* Card 2: Modal Bulan Terpilih */}
        <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15 group-hover:scale-110 transition-transform duration-300">
            <Wallet className="h-28 w-28" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-rose-100 text-sm font-medium tracking-wide">Modal {selectedMonthName}</span>
            <span className="p-2 bg-rose-400/30 rounded-xl">
              <Wallet className="h-5 w-5 text-white" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold leading-none">{formatRupiah(stats.modalBulanIni)}</h3>
            <p className="text-rose-100 text-xs mt-1">Estimasi modal {selectedMonthName} '{selectedYear.substring(2)}</p>
          </div>
        </div>

        {/* Card 3: Keuntungan Bulan Terpilih */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15 group-hover:scale-110 transition-transform duration-300">
            <DollarSign className="h-28 w-28" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-emerald-100 text-sm font-medium tracking-wide">Profit {selectedMonthName}</span>
            <span className="p-2 bg-emerald-400/30 rounded-xl">
              <DollarSign className="h-5 w-5 text-white" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold leading-none">{formatRupiah(stats.profitBulanIni)}</h3>
            <p className="text-emerald-100 text-xs mt-1">Nett profit {selectedMonthName} '{selectedYear.substring(2)}</p>
          </div>
        </div>

        {/* Card 4: Produksi */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-md relative overflow-hidden group hover:shadow-lg transition-all duration-300">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-15 group-hover:scale-110 transition-transform duration-300">
            <ShoppingBag className="h-28 w-28" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-amber-100 text-sm font-medium tracking-wide">Total Produksi</span>
            <span className="p-2 bg-amber-400/30 rounded-xl">
              <ShoppingBag className="h-5 w-5 text-white" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold leading-none">{stats.totalProduksi} Pcs</h3>
            <p className="text-amber-100 text-xs mt-1">Akumulasi {stats.totalPesanan} Pesanan</p>
          </div>
        </div>
      </div>

      {/* KPI TARGETS & EMERGENCY FUNDS (FITUR 1, 3, 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        
        {/* Widget 1: Target Omset Bulanan */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/60 pb-3 mb-3">
            <div>
              <h4 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider">Target Omset Bulanan</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Periode {selectedMonthName}</p>
            </div>
            <span className="p-2 bg-indigo-500/10 text-indigo-505 dark:text-indigo-400 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-slate-500 dark:text-slate-400 font-bold text-[11px]">
              <span>Capaian: <b className="text-slate-800 dark:text-white font-extrabold">{formatRupiah(stats.omsetBulanIni)}</b></span>
              <span>Target: <b className="text-slate-800 dark:text-white font-extrabold">{formatRupiah(settings.targetOmset || 100000000)}</b></span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full p-[2px] overflow-hidden border border-slate-205/40 dark:border-slate-850">
                <div 
                  className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((stats.omsetBulanIni / (settings.targetOmset || 100000000)) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-450 tracking-wider">
                <span>{Math.min(100, Math.round((stats.omsetBulanIni / (settings.targetOmset || 100000000)) * 100))}% Tercapai</span>
                {Math.max(0, (settings.targetOmset || 100000000) - stats.omsetBulanIni) > 0 ? (
                  <span className="text-rose-500 font-bold">Sisa: -{formatRupiah((settings.targetOmset || 100000000) - stats.omsetBulanIni)}</span>
                ) : (
                  <span className="text-emerald-500 font-black">Target Terlampaui! 🎉</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-50 dark:border-slate-700/60 flex items-center justify-between">
              {isEditingOmset ? (
                <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    className="px-2 py-1 text-[10px] font-extrabold border border-indigo-500 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-md w-full focus:outline-hidden"
                    placeholder="Contoh: 100000000"
                    value={tempOmset}
                    onChange={(e) => setTempOmset(Number(e.target.value))}
                  />
                  <button
                    onClick={() => {
                      onUpdateSettings({ targetOmset: Math.max(0, tempOmset) });
                      setIsEditingOmset(false);
                    }}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setIsEditingOmset(false)}
                    className="px-2 py-1 text-slate-455 font-bold text-[10px] hover:underline"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-[10px] text-slate-455 font-bold">Atur target manual:</span>
                  <button
                    onClick={() => {
                      setTempOmset(settings.targetOmset || 100000000);
                      setIsEditingOmset(true);
                    }}
                    className="text-[10.5px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    ✎ Ubah Target
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Widget 2: Target Produksi Bulanan */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/60 pb-3 mb-3">
            <div>
              <h4 className="font-extrabold text-xs uppercase text-slate-400 tracking-wider">Target Qty Produksi</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Periode {selectedMonthName}</p>
            </div>
            <span className="p-2 bg-amber-500/10 text-amber-500 dark:text-amber-450 rounded-lg">
              <ShoppingBag className="h-4 w-4" />
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-slate-500 dark:text-slate-400 font-bold text-[11px]">
              <span>Capaian: <b className="text-slate-800 dark:text-white font-extrabold">{stats.totalProduksi} Pcs</b></span>
              <span>Target: <b className="text-slate-800 dark:text-white font-extrabold">{settings.targetProduksi || 1000} Pcs</b></span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-900 rounded-full p-[2px] overflow-hidden border border-slate-205/40 dark:border-slate-850">
                <div 
                  className="h-full rounded-full bg-amber-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((stats.totalProduksi / (settings.targetProduksi || 1000)) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black uppercase text-slate-455 tracking-wider">
                <span>{Math.min(100, Math.round((stats.totalProduksi / (settings.targetProduksi || 1000)) * 100))}% Tercapai</span>
                {Math.max(0, (settings.targetProduksi || 1000) - stats.totalProduksi) > 0 ? (
                  <span className="text-amber-600 dark:text-amber-450 font-bold">Sisa: -{(settings.targetProduksi || 1000) - stats.totalProduksi} Pcs</span>
                ) : (
                  <span className="text-emerald-500 font-black">Target Terlampaui! 🎉</span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-50 dark:border-slate-700/60 flex items-center justify-between">
              {isEditingProduksi ? (
                <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="number"
                    className="px-2 py-1 text-[10px] font-extrabold border border-amber-500 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white rounded-md w-full focus:outline-hidden"
                    placeholder="Contoh: 1000"
                    value={tempProduksi}
                    onChange={(e) => setTempProduksi(Number(e.target.value))}
                  />
                  <button
                    onClick={() => {
                      onUpdateSettings({ targetProduksi: Math.max(0, tempProduksi) });
                      setIsEditingProduksi(false);
                    }}
                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] rounded-lg cursor-pointer"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setIsEditingProduksi(false)}
                    className="px-2 py-1 text-slate-455 font-bold text-[10px] hover:underline"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-[10px] text-slate-455 font-bold">Atur target manual:</span>
                  <button
                    onClick={() => {
                      setTempProduksi(settings.targetProduksi || 1000);
                      setIsEditingProduksi(true);
                    }}
                    className="text-[10.5px] font-black text-amber-655 dark:text-amber-455 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    ✎ Ubah Target
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Secondary Row Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl">
            <Layers className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Pesanan</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{stats.totalPesanan}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Uang Masuk</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{formatRupiah(stats.totalUangMasuk)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl">
            <Wallet className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Sisa Tagihan</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{formatRupiah(stats.totalSisaTagihan)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 p-4 rounded-xl shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Belum Lunas</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">{stats.pesananBelumLunas} Pesanan</p>
          </div>
        </div>
      </div>

      {/* Charts & Interactive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Financial Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">Tren Keuangan Keuntungan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perbandingan Bulanan Omset, Modal, & Profit Bersih</p>
            </div>
            <button 
              onClick={() => onNavigate('laporan')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Lihat Detail Laporan &rarr;
            </button>
          </div>
          
          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOmset" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
                    return val;
                  }}
                />
                <Tooltip 
                  formatter={(value: any) => [formatRupiah(Number(value)), '']}
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '0.75rem', 
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                <Area type="monotone" dataKey="Omset" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOmset)" />
                <Area type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Production Chart */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">Status Produksi Aktif</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total sebaran tahapan produksi jersey</p>
          </div>

          <div className="h-56 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusStats.filter(s => s.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusStats.filter(s => s.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as StatusProduksi]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '0.5rem', 
                    border: 'none', 
                    color: '#fff',
                    fontSize: '11px' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute text-center">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Pesanan</span>
              <p className="text-3xl font-black text-slate-800 dark:text-white">{pesananList.length}</p>
            </div>
          </div>

          {/* Detailed Custom Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {statusStats.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 px-1 py-0.5">
                <span 
                  className="h-2.5 w-2.5 rounded-full shrink-0" 
                  style={{ backgroundColor: COLORS[item.name as StatusProduksi] }} 
                />
                <span className="text-slate-600 dark:text-slate-300 truncate">{item.name}</span>
                <span className="font-bold text-slate-900 dark:text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom Alert Tray & Near Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Near Deadlines Alert list */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-100 dark:bg-amber-950/40 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </span>
              <h3 className="font-bold text-slate-800 dark:text-white">Peringatan Deadline & Tagihan</h3>
            </div>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full font-semibold">
              {warningList.length} Peringatan Aktif
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {warningList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Semua Berjalan Lancar!</p>
                <p className="text-xs">Tidak ada sisa tagihan maupun deadline mendesak.</p>
              </div>
            ) : (
              warningList.map((alert) => (
                <div 
                  key={alert.id}
                  onClick={() => onSelectOrder(alert.order)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border cursor-pointer hover:scale-[1.01] hover:shadow-sm transition-all duration-200 ${
                    alert.severity === 'high' 
                      ? 'bg-rose-50/70 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40 text-slate-800 dark:text-slate-200' 
                      : 'bg-amber-50/70 border-amber-100 dark:bg-amber-950/15 dark:border-amber-900/30 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 shrink-0">
                      {alert.severity === 'high' ? (
                        <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 animate-pulse" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                      )}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{alert.title}</h4>
                      <p className="text-xs mt-0.5 opacity-90 leading-relaxed text-slate-600 dark:text-slate-300">
                        {alert.message}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 sm:mt-0 flex flex-wrap items-center gap-2 justify-end no-print">
                    {alert.order.noTelepon && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {alert.type === 'unpaid' && (
                          <a
                            href={`https://wa.me/${alert.order.noTelepon.replace(/[^0-9]/g, '').startsWith('0') ? '62' + alert.order.noTelepon.replace(/[^0-9]/g, '').substring(1) : alert.order.noTelepon.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak,\n\nMengingatkan sisa pembayaran PO:\n\n*${alert.order.namaPo}*\n\nSisa Tagihan:\n*${formatRupiah(alert.order.sisaTagihan)}*\n\nTerima kasih.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg shadow-3xs flex items-center gap-1 cursor-pointer select-none"
                            title="Kirim WA Tagihan"
                          >
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            <span>Kirim WA Tagihan</span>
                          </a>
                        )}
                        {(alert.type === 'deadline' || alert.type === 'overdue') && (
                          <a
                            href={`https://wa.me/${alert.order.noTelepon.replace(/[^0-9]/g, '').startsWith('0') ? '62' + alert.order.noTelepon.replace(/[^0-9]/g, '').substring(1) : alert.order.noTelepon.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak,\n\nPesanan *${alert.order.namaPo}* sedang dalam proses produksi.\n\nEstimasi selesai:\n*${alert.order.deadline}*\n\nTerima kasih.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-sky-600 hover:bg-sky-700 text-white font-extrabold px-3 py-1.5 rounded-lg shadow-3xs flex items-center gap-1 cursor-pointer select-none"
                            title="Kirim WA Deadline"
                          >
                            <Send className="h-3 w-3 shrink-0" />
                            <span>Kirim WA Deadline</span>
                          </a>
                        )}
                      </div>
                    )}
                    <span className="text-[10px] bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg shadow-3xs font-bold text-slate-700 dark:text-slate-350 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 shrink-0 select-none">
                      Detail &rarr;
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Help & Guidelines */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <span>💡</span> Alur Pengerjaan Jersey
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Tekan label status jersey pada menu transaksi untuk merubah tahapan sesuai pengerjaan produksi workshop Anda:
            </p>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="font-mono bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 h-5 w-5 rounded-full flex items-center justify-center font-bold shrink-0">1</span>
                <div>
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200">Setting Desain</h5>
                  <p className="text-slate-500 dark:text-slate-400">Pengecekan mockup, layout pola jersey sesuai ukuran & nama tim.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="font-mono bg-pink-100 dark:bg-pink-950/75 text-pink-700 dark:text-pink-300 h-5 w-5 rounded-full flex items-center justify-center font-bold shrink-0">2</span>
                <div>
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200">Print Press</h5>
                  <p className="text-slate-500 dark:text-slate-400">Pencetakan gambar ke kertas sublim & pengepresan ke kain dryfit jersey.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="font-mono bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 h-5 w-5 rounded-full flex items-center justify-center font-bold shrink-0">3</span>
                <div>
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200">Jahit</h5>
                  <p className="text-slate-500 dark:text-slate-400">Proses jahit obras, jahit rantai, rib leher, hingga pemasangan apparel.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="font-mono bg-teal-100 dark:bg-teal-950/75 text-teal-700 dark:text-teal-300 h-5 w-5 rounded-full flex items-center justify-center font-bold shrink-0">4</span>
                <div>
                  <h5 className="font-semibold text-slate-800 dark:text-slate-200">Tinggal Kirim / Selesai</h5>
                  <p className="text-slate-500 dark:text-slate-400">Quality Control (QC), packing plastik, & menunggu pengambilan pelanggan.</p>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => onNavigate('formulir')}
            className="mt-5 w-full bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white py-2.5 rounded-xl font-medium text-xs transition duration-200"
          >
            + Buat Pesanan Baru
          </button>
        </div>

      </div>

      {/* Fraud Detection & Auditor AI Feature */}
      <div className="mt-8 relative z-20">
        <FraudScanner
          pesananList={pesananList}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onSelectOrder={(order) => {
            onSelectOrder(order);
            onNavigate('transaksi'); // Switch to order view
          }}
        />
      </div>

    </div>
  );
}
