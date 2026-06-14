/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Pesanan, ShopSettings, CashFlowTransaction } from '../types';
import { formatRupiah } from '../utils';
import { 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PlusCircle, 
  Trash2, 
  Calendar, 
  Filter, 
  Wallet,
  DollarSign,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Legend,
  CartesianGrid
} from 'recharts';

interface CashFlowProps {
  pesananList: Pesanan[];
  settings: ShopSettings;
  onUpdateSettings: (updates: Partial<ShopSettings>) => void;
  selectedMonth?: string;
  setSelectedMonth?: (month: string) => void;
  selectedYear?: string;
  setSelectedYear?: (year: string) => void;
}

type FilterType = 'Harian' | 'Mingguan' | 'Bulanan' | 'Tahunan';

export default function CashFlow({ 
  pesananList, 
  settings, 
  onUpdateSettings,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}: CashFlowProps) {
  const [filterType, setFilterType] = useState<FilterType>(() => {
    return (localStorage.getItem('laporan_jersey_cf_filter_type') as FilterType) || 'Bulanan';
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Sync filterType to localStorage
  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_cf_filter_type', filterType);
  }, [filterType]);
  
  // Local fallback states if not passed as props
  const [localMonth, setLocalMonth] = useState<string>(() => {
    return localStorage.getItem('laporan_jersey_filter_month') || String(new Date().getMonth() + 1).padStart(2, '0');
  });
  const [localYear, setLocalYear] = useState<string>(() => {
    return localStorage.getItem('laporan_jersey_filter_year') || String(new Date().getFullYear());
  });

  const activeMonth = selectedMonth !== undefined ? selectedMonth : localMonth;
  const activeYear = selectedYear !== undefined ? selectedYear : localYear;

  const handleMonthChange = (month: string) => {
    if (setSelectedMonth) {
      setSelectedMonth(month);
    } else {
      setLocalMonth(month);
    }
    localStorage.setItem('laporan_jersey_filter_month', month);
  };

  const handleYearChange = (year: string) => {
    if (setSelectedYear) {
      setSelectedYear(year);
    } else {
      setLocalYear(year);
    }
    localStorage.setItem('laporan_jersey_filter_year', year);
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    for (let yr = 2020; yr <= currentYear + 5; yr++) {
      years.add(String(yr));
    }
    pesananList.forEach(item => {
      const dtStr = item.createdAt || new Date().toISOString();
      const yr = dtStr.substring(0, 4);
      if (yr) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [pesananList]);

  const MONTHS_LIST = useMemo(() => [
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
  ], []);

  // Form States
  const [tanggal, setTanggal] = useState(new Date().toISOString().substring(0, 10));
  const [jenis, setJenis] = useState<'masuk' | 'keluar'>('masuk');
  const [kategori, setKategori] = useState('DP pelanggan');
  const [keterangan, setKeterangan] = useState('');
  const [nominal, setNominal] = useState<number>(0);

  // Initialize cashFlowList if missing
  const manualList = useMemo(() => {
    return settings.cashFlowList || [];
  }, [settings.cashFlowList]);

  // Merge automated PO cash flow with manual cash flow to achieve seamless integrity
  const allTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      tanggal: string;
      kategori: string;
      keterangan: string;
      jenis: 'masuk' | 'keluar';
      nominal: number;
    }> = [];

    // 1. Process automated transactions from PO List
    pesananList.forEach(po => {
      const dateStr = po.createdAt ? po.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
      
      // A. DP (Uang Masuk)
      if (po.uangMasuk > 0) {
        const isLunas = po.sisaTagihan <= 0 || po.uangMasuk >= po.totalHarga;
        list.push({
          id: `AUTO-DP-${po.id}`,
          tanggal: dateStr,
          kategori: isLunas ? 'Pelunasan pelanggan' : 'DP pelanggan',
          keterangan: isLunas 
            ? `Pelunasan PO ${po.namaPo} (${po.namaPemesan})`
            : `DP PO ${po.namaPo} (${po.namaPemesan})`,
          jenis: 'masuk',
          nominal: po.uangMasuk
        });
      }
    });

    // 2. Append manual transactions
    manualList.forEach(item => {
      list.push({
        id: item.id,
        tanggal: item.tanggal,
        kategori: item.kategori,
        keterangan: item.keterangan,
        jenis: item.jenis,
        nominal: item.nominal
      });
    });

    // Sort chronologically ascending (to resolve running balances correctly)
    return list.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [pesananList, manualList]);

  // Compute stats and run ledger after filtering
  const filteredTransactions = useMemo(() => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    
    return allTransactions.filter(t => {
      const parts = t.tanggal.split('-');
      if (parts.length !== 3) return false;
      const transYear = parseInt(parts[0], 10);
      const transMonth = parseInt(parts[1], 10);
      const transDay = parseInt(parts[2], 10);
      
      if (filterType === 'Harian') {
        return transYear === todayYear && transMonth === todayMonth && transDay === todayDay;
      } else if (filterType === 'Mingguan') {
        const tDate = new Date(transYear, transMonth - 1, transDay);
        const currentDate = new Date(todayYear, todayMonth - 1, todayDay);
        const diffDays = (currentDate.getTime() - tDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      } else if (filterType === 'Bulanan') {
        const yearMatches = transYear === parseInt(activeYear, 10);
        const monthMatches = activeMonth === 'Semua' || transMonth === parseInt(activeMonth, 10);
        return yearMatches && monthMatches;
      } else if (filterType === 'Tahunan') {
        return transYear === parseInt(activeYear, 10);
      }
      return true;
    });
  }, [allTransactions, filterType, activeMonth, activeYear]);

  // Calculate Running Balance for the filtered ledger
  const transactionsWithBalance = useMemo(() => {
    let runningBalance = 0;
    
    // Note: To show true running balance, we must calculate the balance up to the starting date as Saldo Awal,
    // but the user wants to see Saldo Awal, Total Masuk, Total Keluar, and Saldo Akhir.
    // Let's compute running balance from the entire transaction list so the saldo is mathematically continuous!
    const withBalance = allTransactions.map((tx) => {
      if (tx.jenis === 'masuk') {
        runningBalance += tx.nominal;
      } else {
        runningBalance -= tx.nominal;
      }
      return {
        ...tx,
        runningBalance
      };
    });

    // Now filter this computed continuous list so the balances displayed on screen remain historically accurate!
    const filteredIds = new Set(filteredTransactions.map(t => t.id));
    return withBalance.filter(tx => filteredIds.has(tx.id));
  }, [allTransactions, filteredTransactions]);

  // Totals for current filter
  const financialSummary = useMemo(() => {
    let totalMasuk = 0;
    let totalKeluar = 0;

    filteredTransactions.forEach(tx => {
      if (tx.jenis === 'masuk') {
        totalMasuk += tx.nominal;
      } else {
        totalKeluar += tx.nominal;
      }
    });

    // Saldo awal is the continuous running balance prior to the first transaction in this filtered lists
    // Or we can define/let the user supply a baseline. Let's make it intuitive:
    const earliestFilteredDate = filteredTransactions.length > 0 ? filteredTransactions[0].tanggal : '';
    
    let saldoAwal = 0;
    if (earliestFilteredDate) {
      allTransactions.forEach(tx => {
        if (tx.tanggal < earliestFilteredDate) {
          if (tx.jenis === 'masuk') {
            saldoAwal += tx.nominal;
          } else {
            saldoAwal -= tx.nominal;
          }
        }
      });
    }

    const saldoAkhir = saldoAwal + totalMasuk - totalKeluar;

    return {
      saldoAwal,
      totalMasuk,
      totalKeluar,
      saldoAkhir
    };
  }, [allTransactions, filteredTransactions]);

  // Chart dataset based on selected filter
  const chartData = useMemo(() => {
    const datesMap: Record<string, { tanggal: string; Masuk: number; Keluar: number }> = {};

    filteredTransactions.forEach(tx => {
      const dateLabel = tx.tanggal; 
      if (!datesMap[dateLabel]) {
        datesMap[dateLabel] = {
          tanggal: dateLabel,
          Masuk: 0,
          Keluar: 0
        };
      }
      if (tx.jenis === 'masuk') {
        datesMap[dateLabel].Masuk += tx.nominal;
      } else {
        datesMap[dateLabel].Keluar += tx.nominal;
      }
    });

    return Object.values(datesMap).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [filteredTransactions]);

  // Handle adding new custom transaction
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (nominal <= 0) return;

    const newTx: CashFlowTransaction = {
      id: 'CF-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      tanggal,
      jenis,
      kategori,
      keterangan: keterangan || `${jenis === 'masuk' ? 'Pendapatan' : 'Pengeluaran'} - ${kategori}`,
      nominal
    };

    onUpdateSettings({
      cashFlowList: [...manualList, newTx]
    });

    // Reset Form
    setKeterangan('');
    setNominal(0);
    setShowAddForm(false);
  };

  // Handle deletion of custom transaction
  const handleDeleteTransaction = (id: string) => {
    const filtered = manualList.filter(item => item.id !== id);
    onUpdateSettings({
      cashFlowList: filtered
    });
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <TrendingUp className="h-5 w-5" />
            </span>
            Arus Kas Bisnis (Cash Flow)
          </h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            Pantau perputaran uang masuk, pengeluaran produksi, biaya operasional, dan sisa saldo secara real-time.
          </p>
        </div>

        {/* Filter & Add Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar Selection Toggles */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
            {(['Harian', 'Mingguan', 'Bulanan', 'Tahunan'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  filterType === type 
                    ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-3xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Month & Year Selectors, shown only when relevant */}
          {filterType === 'Bulanan' && (
            <select
              value={activeMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-105 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              {MONTHS_LIST.map((m) => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {m.name}
                </option>
              ))}
            </select>
          )}

          {(filterType === 'Bulanan' || filterType === 'Tahunan') && (
            <select
              value={activeYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-105 dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                  {y}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              // auto select appropriate category according to type
              setKategori(jenis === 'masuk' ? 'DP pelanggan' : 'Sublim');
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            Catat Kas Manual
          </button>
        </div>
      </div>

      {/* Manual Input Drawer / Collapsible Form */}
      {showAddForm && (
        <form onSubmit={handleAddTransaction} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/65 dark:border-slate-700/80 shadow-xs space-y-4 animate-fade-in relative z-10">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="h-4 w-4 text-indigo-500" />
              Pencatatan Baru Arus Kas Manual
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {/* Tanggal */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Tanggal</label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Jenis */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Jenis Transaksi</label>
              <select
                value={jenis}
                onChange={(e) => {
                  const val = e.target.value as 'masuk' | 'keluar';
                  setJenis(val);
                  setKategori(val === 'masuk' ? 'DP pelanggan' : 'Sublim');
                }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-4xs"
              >
                <option value="masuk">Masuk (Inflow)</option>
                <option value="keluar">Keluar (Outflow)</option>
              </select>
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-4xs"
              >
                {jenis === 'masuk' ? (
                  <>
                    <option value="DP pelanggan">DP pelanggan</option>
                    <option value="Pelunasan pelanggan">Pelunasan pelanggan</option>
                    <option value="Pendapatan lain">Pendapatan lain</option>
                  </>
                ) : (
                  <>
                    <option value="Sublim">Sublim</option>
                    <option value="Jahit">Jahit</option>
                    <option value="Ongkir">Ongkir</option>
                    <option value="Pembelian bahan">Pembelian bahan</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Ambil Keuntungan">Ambil Keuntungan</option>
                    <option value="Pengeluaran lain">Pengeluaran lain</option>
                  </>
                )}
              </select>
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Keterangan / Memo</label>
              <input
                type="text"
                placeholder="Pembayaran listrik, beli packaging..."
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Nominal */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Nominal (Rp)</label>
              <input
                type="number"
                min="0"
                required
                placeholder="CONTOH: 500000"
                value={nominal || ''}
                onChange={(e) => setNominal(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-black focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-1 bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-xs"
            >
              Simpan Transaksi Kas
            </button>
          </div>
        </form>
      )}

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Awal */}
        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-750/70 bg-white dark:bg-slate-800 relative overflow-hidden shadow-3xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo Awal</span>
          <h3 className="text-lg md:text-xl font-extrabold text-slate-700 dark:text-slate-300 mt-2">
            {formatRupiah(financialSummary.saldoAwal)}
          </h3>
          <p className="text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 mt-1">Saldo kumulatif sebelum periode ini</p>
          <div className="absolute right-4 bottom-4 text-slate-200 dark:text-slate-700/50">
            <Wallet className="h-6 w-6 stroke-[1.5]" />
          </div>
        </div>

        {/* Card 2: Total Uang Masuk */}
        <div className="p-5 rounded-2xl border border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/15 dark:bg-emerald-950/10 relative overflow-hidden shadow-3xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">T. UANG MASUK (INFLOW)</span>
          <h3 className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {formatRupiah(financialSummary.totalMasuk)}
          </h3>
          <p className="text-[9.5px] font-semibold text-emerald-600/70 dark:text-emerald-500 mt-1">Selesai dihimpun selama periode</p>
          <div className="absolute right-4 bottom-4 text-emerald-500/20">
            <ArrowDownLeft className="h-7 w-7" />
          </div>
        </div>

        {/* Card 3: Total Uang Keluar */}
        <div className="p-5 rounded-2xl border border-rose-100 dark:border-rose-950/40 bg-rose-50/15 dark:bg-rose-950/10 relative overflow-hidden shadow-3xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400">T. UANG KELUAR (OUTFLOW)</span>
          <h3 className="text-xl md:text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {formatRupiah(financialSummary.totalKeluar)}
          </h3>
          <p className="text-[9.5px] font-semibold text-rose-600/70 dark:text-rose-500 mt-1">Total pengeluaran & operasional</p>
          <div className="absolute right-4 bottom-4 text-rose-500/20">
            <ArrowUpRight className="h-7 w-7" />
          </div>
        </div>

        {/* Card 4: Saldo Akhir */}
        <div className="p-5 rounded-2xl border border-indigo-150 dark:border-indigo-950/50 bg-indigo-50/15 dark:bg-indigo-950/10 relative overflow-hidden shadow-3xs">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">SALDO AKHIR</span>
          <h3 className="text-xl md:text-2xl font-black text-indigo-650 dark:text-indigo-300 mt-2">
            {formatRupiah(financialSummary.saldoAkhir)}
          </h3>
          <p className="text-[9.5px] font-semibold text-indigo-500 dark:text-indigo-500/90 mt-1">Sisa kas yang tersedia sekarang</p>
          <div className="absolute right-4 bottom-4 text-indigo-500/20">
            <DollarSign className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Cash Flow Visual Analytics (Recharts Area/Bar Chart Combination) */}
      <div className="bg-white dark:bg-slate-805 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-750/70 shadow-3xs">
        <div className="flex items-center justify-between border-b border-slate-105 dark:border-slate-700/60 pb-4 mb-4">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 select-none">
            Grafik Fluktuasi Arus Kas ({filterType === 'Bulanan' ? `${MONTHS_LIST.find(m => m.value === activeMonth)?.name || ''} ${activeYear}` : filterType === 'Tahunan' ? activeYear : filterType})
          </h3>
          <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
            Tervisualisasi Real-time
          </span>
        </div>

        <div className="h-56 sm:h-72 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <AlertCircle className="h-8 w-8 stroke-[1.5] mb-2" />
              <p className="text-xs font-semibold">Tidak ada data transaksi kas pada periode terpilih.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3" stroke="#334155" opacity={0.12} />
                <XAxis 
                  dataKey="tanggal" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickLine={false}
                  tickFormatter={(val) => {
                    try {
                      const d = new Date(val);
                      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                    } catch (e) {
                      return val;
                    }
                  }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  fontWeight="bold"
                  tickLine={false}
                  tickFormatter={(val) => `Rp ${val / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                  labelFormatter={(label) => `Tanggal: ${label}`}
                  formatter={(value: any) => [formatRupiah(Number(value)), '']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="Masuk" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" name="Uang Masuk / Inflow" />
                <Area type="monotone" dataKey="Keluar" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" name="Uang Keluar / Outflow" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Ledger Transaction Database Table */}
      <div className="bg-white dark:bg-slate-805 rounded-2xl border border-slate-100 dark:border-slate-750/70 shadow-3xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-105 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-450">Histori Transaksi Utama</h3>
          <span className="text-[10px] font-bold text-slate-400">{filteredTransactions.length} baris dicatat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-105 dark:border-slate-700/60 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/30 dark:bg-slate-800/20 select-none">
                <th className="px-5 py-3.5">Tanggal</th>
                <th className="px-5 py-3.5">Kategori</th>
                <th className="px-5 py-3.5">Keterangan</th>
                <th className="px-5 py-3.5 text-right">Masuk (+)</th>
                <th className="px-5 py-3.5 text-right">Keluar (-)</th>
                <th className="px-5 py-3.5 text-right">Saldo Kas</th>
                <th className="px-5 py-3.5 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-750/50 text-xs font-semibold">
              {transactionsWithBalance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 dark:text-slate-500 italic">
                    Belum ada transaksi di periode ini.
                  </td>
                </tr>
              ) : (
                // Walk backwards to display latest transactions first
                [...transactionsWithBalance].reverse().map((tx) => {
                  const isAuto = tx.id.startsWith('AUTO-');
                  
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {tx.tanggal}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border ${
                          tx.jenis === 'masuk'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {tx.kategori}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-[280px]">
                        <p className="truncate text-slate-700 dark:text-slate-200" title={tx.keterangan}>
                          {tx.keterangan}
                        </p>
                        {isAuto && (
                          <span className="text-[8px] text-indigo-500 dark:text-indigo-400 font-extrabold tracking-widest block uppercase mt-0.5">
                            Otomatis Dari PO
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {tx.jenis === 'masuk' ? formatRupiah(tx.nominal) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-black text-rose-600 dark:text-rose-400 tabular-nums">
                        {tx.jenis === 'keluar' ? formatRupiah(tx.nominal) : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatRupiah(tx.runningBalance)}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isAuto ? (
                          <span className="text-[9px] text-slate-400 italic">Sistem Lock</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1 px-2 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Hapus pencatatan manual"
                          >
                            <Trash2 className="h-3.5 w-3.5 mx-auto" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
