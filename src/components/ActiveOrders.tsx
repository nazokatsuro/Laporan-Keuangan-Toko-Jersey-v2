/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Pesanan, StatusProduksi, ShopSettings, CashFlowTransaction } from '../types';
import { formatRupiah } from '../utils';
import { 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  Edit2, 
  Trash2, 
  Check, 
  Clock, 
  AlertCircle,
  TrendingDown,
  User,
  Plus,
  Play,
  CheckCircle,
  MoreVertical,
  XSquare,
  ArrowUpDown,
  Eye,
  MessageSquare,
  Send,
  AlertTriangle,
  DollarSign,
  Printer,
  Scissors,
  Copy,
  Clipboard
} from 'lucide-react';

interface ActiveOrdersProps {
  pesananList: Pesanan[];
  settings: ShopSettings;
  onLogToCashFlow: (kategori: string, jenis: 'masuk'|'keluar', nominal: number, keterangan: string) => void;
  onAddNew: () => void;
  onEdit: (pesanan: Pesanan) => void;
  onDelete: (id: string) => void;
  onGenerateNota: (pesanan: Pesanan | Pesanan[], type?: 'pelanggan' | 'sublim' | 'jahit' | 'komisi' | 'spk_jahit') => void;
  onUpdateStatus: (id: string, newStatus: StatusProduksi) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

const ALL_STATUSES = ['Semua', 'Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres', 'Belum Bayar Sublim', 'Belum Bayar Jahit', 'Belum Bayar Komisi', 'Belum Ambil Keuntungan', 'Sudah Ambil Keuntungan'];

export default function ActiveOrders({ 
  pesananList, 
  settings,
  onLogToCashFlow,
  onAddNew, 
  onEdit, 
  onDelete, 
  onGenerateNota,
  onUpdateStatus,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}: ActiveOrdersProps) {
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('laporan_jersey_tx_search') || '');
  const [progressFilter, setProgressFilter] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_progress') || 'Semua');
  const [paymentFilter, setPaymentFilter] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_payment') || 'Semua');
  const [deadlineFilter, setDeadlineFilter] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_deadline') || 'Semua');
  const [customerFilter, setCustomerFilter] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_customer') || 'Semua');
  const [tableMonth, setTableMonth] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_month') || 'Semua');
  const [tableYear, setTableYear] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_year') || 'Semua');
  
  const [sortBy, setSortBy] = useState<'deadline' | 'qty' | 'totalHarga' | 'sisaTagihan' | 'createdAt'>(() => (localStorage.getItem('laporan_jersey_tx_sort_by') as any) || 'deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (localStorage.getItem('laporan_jersey_tx_sort_order') as any) || 'asc');

  // Sync states to localStorage
  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_search', searchTerm);
  }, [searchTerm]);

  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_progress', progressFilter);
  }, [progressFilter]);

  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_payment', paymentFilter);
  }, [paymentFilter]);

  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_deadline', deadlineFilter);
  }, [deadlineFilter]);

  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_customer', customerFilter);
  }, [customerFilter]);

  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_month', tableMonth);
  }, [tableMonth]);

  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_year', tableYear);
  }, [tableYear]);

  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_sort_by', sortBy);
  }, [sortBy]);

  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_sort_order', sortOrder);
  }, [sortOrder]);
  
  // Selection state for batch receipts
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal state for deletion confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // State to confirm profit extraction safely without breaking sandboxed iframes
  const [confirmProfitId, setConfirmProfitId] = useState<string | null>(null);

  // State for copying feedback
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const handleCopyTailorDescription = (item: Pesanan) => {
    const lines = [
      `Nama Konsumen : ${item.namaPemesan || ''}`,
      `Nama PO/Tim   : ${item.namaPo || ''}`,
      `Bahan         : ${item.items && item.items.length > 0 ? item.items.map(it => `${it.namaProduk} (${it.bahan})`).join(', ') : (item.bahan || '')}`,
      `Tgl Deadline  : ${item.deadline || ''}`,
      `Bentuk Kerah  : ${item.items && item.items.length > 0 ? item.items.map(it => `${it.namaProduk} (${it.modelKerah || ''})`).join(', ') : (item.modelKerah || '')}`,
      `Catatan Konsumen (Desain/Spesifikasi) :\n${item.items && item.items.length > 0 ? item.items.map(it => `- ${it.namaProduk}: ${it.keterangan || '(Tanpa Catatan)'}`).join('\n') : (item.keterangan || '(Tanpa Catatan)')}`,
      `Catatan Khusus Jahit (Penjahit) :\n${item.items && item.items.length > 0 ? item.items.map(it => `- ${it.namaProduk}: ${it.catatanJahit || '(Tanpa Catatan Khusus)'}`).join('\n') : (item.catatanJahit || '(Tanpa Catatan Khusus)')}`,
      `Data size atau data nama nama dari konsumen :\n${item.detailSizeNama || '(Belum Ada Data Size / Nama)'}`
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedOrderId(item.id);
      setTimeout(() => setCopiedOrderId(null), 2500);
    }).catch(err => {
      console.error("Gagal menyalin teks:", err);
    });
  };

  // Derive unique customer list dynamically for filtering
  const uniqueCustomers = useMemo(() => {
    const names = new Set<string>();
    pesananList.forEach(item => {
      if (item.namaPemesan && item.namaPemesan.trim()) {
        names.add(item.namaPemesan.trim());
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'id'));
  }, [pesananList]);

  // Derive unique years from actual transaction history
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
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

  const handleToggleSort = (field: 'deadline' | 'qty' | 'totalHarga' | 'sisaTagihan' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      if (field === 'totalHarga' || field === 'sisaTagihan') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (filteredOrdersCount: number, filteredOrderIds: string[]) => {
    if (selectedIds.length === filteredOrdersCount) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrderIds);
    }
  };

  const handleGenerateBatchNota = (type: 'pelanggan' | 'sublim' | 'jahit' | 'komisi' = 'pelanggan') => {
    const filteredOrderIds = filteredAndSortedList.map(o => o.id);
    const selectedOrders = pesananList.filter(o => selectedIds.includes(o.id) && filteredOrderIds.includes(o.id));
    if (selectedOrders.length > 0) {
      onGenerateNota(selectedOrders, type);
    }
  };

  // Process sorting & filtering
  const filteredAndSortedList = useMemo(() => {
    return pesananList
      .filter(item => {
        // 1. Search term (case insensitive search matches multiple fields)
        const safeSearch = searchTerm.toLowerCase().trim();
        let matchesSearch = true;
        if (safeSearch) {
          const itemMatch = 
            (item.namaPemesan || '').toLowerCase().includes(safeSearch) ||
            (item.namaPo || '').toLowerCase().includes(safeSearch) ||
            (item.id || '').toLowerCase().includes(safeSearch) ||
            (item.namaProduk || '').toLowerCase().includes(safeSearch) ||
            (item.bahan || '').toLowerCase().includes(safeSearch) ||
            (item.keterangan || '').toLowerCase().includes(safeSearch) ||
            (item.catatanJahit || '').toLowerCase().includes(safeSearch) ||
            (item.modelKerah || '').toLowerCase().includes(safeSearch) ||
            (item.noTelepon || '').includes(safeSearch);

          const itemsMatch = item.items && item.items.some(it => 
            (it.namaProduk || '').toLowerCase().includes(safeSearch) ||
            (it.bahan || '').toLowerCase().includes(safeSearch) ||
            (it.keterangan || '').toLowerCase().includes(safeSearch) ||
            (it.catatanJahit || '').toLowerCase().includes(safeSearch) ||
            (it.modelKerah || '').toLowerCase().includes(safeSearch)
          );

          matchesSearch = itemMatch || !!itemsMatch;
        }

        // 2. Month and Year from creation date
        const dtStr = item.createdAt || '';
        const itemYear = dtStr.substring(0, 4);
        const itemMonth = dtStr.substring(5, 7); // "MM"

        const yearMatches = tableYear === 'Semua' || itemYear === tableYear;
        const monthMatches = tableMonth === 'Semua' || itemMonth === tableMonth;

        // 3. Progress status filter
        const matchesProgress = progressFilter === 'Semua' || item.statusProduksi === progressFilter;

        // 4. Payment/Finance status filter
        let matchesPayment = true;
        const cleanPoName = (item.namaPo || '').toLowerCase().trim();
        const isFullyPaid = (Number(item.sisaTagihan) || 0) <= 0;

        const sublimCost = item.items && item.items.length > 0
          ? item.items.reduce((sum, it) => sum + (it.qty * (it.printPerPcs || 0)), 0)
          : (item.qty * (item.printPerPcs || 0));
        const hasPaidSublim = settings.cashFlowList?.some(cf => {
          const desc = (cf.keterangan || '').toLowerCase();
          return desc.includes('sublim') && desc.includes(cleanPoName);
        });

        const jahitCost = item.items && item.items.length > 0
          ? item.items.reduce((sum, it) => sum + (it.qty * (it.jahitPerPcs || 0)), 0)
          : (item.qty * (item.jahitPerPcs || 0));
        const hasPaidJahit = settings.cashFlowList?.some(cf => {
          const desc = (cf.keterangan || '').toLowerCase();
          return desc.includes('jahit') && desc.includes(cleanPoName);
        });

        const baseKomisi = item.komisiPerPcs || 0;
        const hasPenerimaKomisi = !!item.penerimaKomisi?.trim();
        const komisiCost = hasPenerimaKomisi
          ? (item.items && item.items.length > 0
              ? item.items.reduce((sum, it) => sum + (it.qty * (it.komisiPerPcs !== undefined ? it.komisiPerPcs : baseKomisi)), 0)
              : item.qty * baseKomisi)
          : 0;
        const hasPaidKomisi = settings.cashFlowList?.some(cf => {
          const desc = (cf.keterangan || '').toLowerCase();
          return desc.includes('komisi') && desc.includes(cleanPoName);
        });

        const hasTakenProfit = settings.cashFlowList?.some(cf => {
          const desc = (cf.keterangan || '').toLowerCase();
          return desc.includes('ambil keuntungan') && desc.includes(cleanPoName);
        });

        if (paymentFilter !== 'Semua') {
          if (paymentFilter === 'Lunas') {
            matchesPayment = isFullyPaid;
          } else if (paymentFilter === 'Belum Lunas') {
            matchesPayment = !isFullyPaid;
          } else if (paymentFilter === 'Belum Bayar Sublim') {
            matchesPayment = sublimCost > 0 && !hasPaidSublim;
          } else if (paymentFilter === 'Belum Bayar Jahit') {
            matchesPayment = jahitCost > 0 && !hasPaidJahit;
          } else if (paymentFilter === 'Belum Bayar Komisi') {
            matchesPayment = komisiCost > 0 && !hasPaidKomisi;
          } else if (paymentFilter === 'Belum Ambil Keuntungan') {
            matchesPayment = item.profit > 0 && !hasTakenProfit;
          } else if (paymentFilter === 'Sudah Ambil Keuntungan') {
            matchesPayment = item.profit > 0 && hasTakenProfit;
          }
        }

        // 5. Deadline status filter
        let matchesDeadline = true;
        if (deadlineFilter !== 'Semua') {
          const isFinished = item.statusProduksi === 'Beres';
          const diff = new Date(item.deadline).getTime() - new Date().getTime();
          const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
          const isOverdue = diffDays < 0 && !isFinished;
          const isNear = diffDays >= 0 && diffDays <= 3 && !isFinished;

          if (deadlineFilter === 'Mendesak (≤ 3 Hari)') {
            matchesDeadline = isNear;
          } else if (deadlineFilter === 'Lewat Deadline') {
            matchesDeadline = isOverdue;
          } else if (deadlineFilter === 'Aman (> 3 Hari)') {
            matchesDeadline = !isOverdue && !isNear;
          }
        }

        // 6. Customer filter
        const matchesCustomer = customerFilter === 'Semua' || (item.namaPemesan || '').trim() === customerFilter;

        return matchesSearch && yearMatches && monthMatches && matchesProgress && matchesPayment && matchesDeadline && matchesCustomer;
      })
      .sort((a, b) => {
        let valueA: any = a[sortBy];
        let valueB: any = b[sortBy];

        if (sortBy === 'deadline' || sortBy === 'createdAt') {
          valueA = new Date(valueA).getTime();
          valueB = new Date(valueB).getTime();
        }

        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [pesananList, searchTerm, progressFilter, paymentFilter, deadlineFilter, customerFilter, tableMonth, tableYear, sortBy, sortOrder, settings.cashFlowList]);

  // Color mapping function
  const getStatusStyle = (status: StatusProduksi) => {
    switch (status) {
      case 'Setting':
        return 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-905 text-indigo-700 dark:text-indigo-300';
      case 'Print Press':
        return 'bg-pink-50 border-pink-100 dark:bg-pink-950/40 dark:border-pink-905 text-pink-700 dark:text-pink-300';
      case 'Jahit':
        return 'bg-amber-50 border-amber-100 dark:bg-amber-950/45 dark:border-amber-900/40 text-amber-700 dark:text-amber-300';
      case 'Tinggal Kirim':
        return 'bg-teal-50 border-teal-100 dark:bg-teal-950/40 dark:border-teal-905 text-teal-700 dark:text-teal-300';
      case 'Beres':
        return 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-905 text-emerald-700 dark:text-emerald-300';
    }
  };

  // Next status cycle trigger
  const triggerNextStatus = (item: Pesanan) => {
    const sequence: StatusProduksi[] = ['Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'];
    const idx = sequence.indexOf(item.statusProduksi);
    if (idx !== -1 && idx < sequence.length - 1) {
      onUpdateStatus(item.id, sequence[idx + 1]);
    }
  };

  const isNearDeadline = (deadlineStr: string, isFinished: boolean) => {
    if (isFinished) return false;
    const diff = new Date(deadlineStr).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top action & advanced filters panel */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs space-y-4">
        
        {/* Row 1: Search, Sort and Add Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari Pesanan (Nama Konsumen, PO/Tim, ID PO, Bahan, Kerah, Keterangan, No HP)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-705 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort trigger panel */}
            <div className="flex items-center gap-1 bg-slate-55 dark:bg-slate-905 border border-slate-155 dark:border-slate-705/85 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => handleToggleSort('deadline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'deadline' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Urut: Deadline {sortBy === 'deadline' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                type="button"
                onClick={() => handleToggleSort('sisaTagihan')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'sisaTagihan' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Urut: Sisa Tagihan {sortBy === 'sisaTagihan' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                type="button"
                onClick={() => handleToggleSort('totalHarga')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sortBy === 'totalHarga' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                Urut: Total Tagihan {sortBy === 'totalHarga' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>

            <button
              type="button"
              onClick={onAddNew}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-600/10 hover:shadow-lg transition-transform cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Jersey Baru</span>
            </button>
          </div>
        </div>

        {/* Row 2: Advanced filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 pt-4 border-t border-slate-100 dark:border-slate-750/70">
          
          {/* 1. Filter Bulan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bulan Produksi</label>
            <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <select
                value={tableMonth}
                onChange={(e) => setTableMonth(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer w-full"
              >
                {MONTHS_LIST.map(m => (
                  <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Filter Tahun */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tahun Produksi</label>
            <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <select
                value={tableYear}
                onChange={(e) => setTableYear(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer w-full"
              >
                <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Semua Tahun</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Filter Progress */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Progress Produksi</label>
            <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Filter className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <select
                value={progressFilter}
                onChange={(e) => setProgressFilter(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer w-full"
              >
                <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Semua Progress</option>
                <option value="Setting" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Setting</option>
                <option value="Print Press" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Print Press</option>
                <option value="Jahit" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Jahit</option>
                <option value="Tinggal Kirim" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Tinggal Kirim</option>
                <option value="Beres" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Beres</option>
              </select>
            </div>
          </div>

          {/* 4. Filter Tagihan */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status Tagihan</label>
            <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
              <DollarSign className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer w-full"
              >
                <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Semua Status Bayar</option>
                <option value="Lunas" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Lunas</option>
                <option value="Belum Lunas" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Lunas</option>
                <option value="Belum Bayar Sublim" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Bayar Sublim</option>
                <option value="Belum Bayar Jahit" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Bayar Jahit</option>
                <option value="Belum Bayar Komisi" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Bayar Komisi</option>
                <option value="Belum Ambil Keuntungan" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Ambil Untung</option>
                <option value="Sudah Ambil Keuntungan" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Sudah Ambil Untung</option>
              </select>
            </div>
          </div>

          {/* 5. Filter Deadline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Batas Waktu (Deadline)</label>
            <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <select
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer w-full"
              >
                <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Semua Deadline</option>
                <option value="Mendesak (≤ 3 Hari)" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">⚡ Mendesak (≤ 3 Hari)</option>
                <option value="Lewat Deadline" className="bg-white dark:bg-slate-900 text-rose-500 font-bold dark:text-rose-400">⚠️ Lewat Deadline</option>
                <option value="Aman (> 3 Hari)" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">✓ Aman (&gt; 3 Hari)</option>
              </select>
            </div>
          </div>

          {/* 6. Filter Nama Konsumen */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nama Konsumen</label>
            <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
              <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="bg-transparent focus:outline-hidden cursor-pointer w-full"
              >
                <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Semua Konsumen</option>
                {uniqueCustomers.map(cust => (
                  <option key={cust} value={cust} className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">
                    {cust}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Clear Filter Toolbar summary */}
        {(searchTerm || tableMonth !== 'Semua' || tableYear !== 'Semua' || progressFilter !== 'Semua' || paymentFilter !== 'Semua' || deadlineFilter !== 'Semua' || customerFilter !== 'Semua') && (
          <div className="flex items-center justify-between pt-2.5 text-xs text-indigo-650 dark:text-indigo-400 bg-indigo-500/5 px-3 py-2 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
            <div className="font-medium truncate flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-indigo-505 animate-pulse shrink-0" />
              <span>Filter aktif: Menampilkan {filteredAndSortedList.length} pesanan hasil penyaringan.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setTableMonth('Semua');
                setTableYear('Semua');
                setProgressFilter('Semua');
                setPaymentFilter('Semua');
                setDeadlineFilter('Semua');
                setCustomerFilter('Semua');
              }}
              className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg shadow-3xs cursor-pointer transition-all"
            >
              Reset Filter
            </button>
          </div>
        )}

      </div>

      {/* Orders count label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Menampilkan <span className="text-slate-800 dark:text-white font-bold">{filteredAndSortedList.length}</span> dari {pesananList.length} total list pesanan
        </p>
        
        {/* Bulk select operations */}
        {filteredAndSortedList.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleToggleSelectAll(filteredAndSortedList.length, filteredAndSortedList.map(o => o.id))}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition cursor-pointer"
            >
              {selectedIds.length === filteredAndSortedList.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
                <button
                  onClick={() => handleGenerateBatchNota('pelanggan')}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer border-none"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Batch Nota ({selectedIds.length})</span>
                </button>
                <button
                  onClick={() => handleGenerateBatchNota('sublim')}
                  className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer border-none"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Batch Sublim ({selectedIds.length})</span>
                </button>
                <button
                  onClick={() => handleGenerateBatchNota('jahit')}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer border-none"
                >
                  <Scissors className="h-3.5 w-3.5" />
                  <span>Batch Jahit ({selectedIds.length})</span>
                </button>
                <button
                  onClick={() => handleGenerateBatchNota('komisi')}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer border-none"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Batch Komisi ({selectedIds.length})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary orders renderer (Lists/Cards for hybrid responsiveness) */}
      {filteredAndSortedList.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-16 text-center text-slate-400">
          <XSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-300">Data Pesanan Tidak Ditemukan</p>
          <p className="text-xs mt-1">Coba sesuaikan kata pencarian atau buat transaksi baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAndSortedList.map((item) => {
            const nearDeadline = isNearDeadline(item.deadline, item.statusProduksi === 'Beres');
            const isFullyPaid = (Number(item.sisaTagihan) || 0) <= 0;
            
            const cellPoName = (item.namaPo || '').toLowerCase().trim();
            const sublimCost = item.items && item.items.length > 0
              ? item.items.reduce((sum, it) => sum + (it.qty * (it.printPerPcs || 0)), 0)
              : (item.qty * (item.printPerPcs || 0));
            const hasPaidSublim = settings.cashFlowList?.some(cf => {
              const desc = (cf.keterangan || '').toLowerCase();
              return desc.includes('sublim') && desc.includes(cellPoName);
            });
            const jahitCost = item.items && item.items.length > 0
              ? item.items.reduce((sum, it) => sum + (it.qty * (it.jahitPerPcs || 0)), 0)
              : (item.qty * (item.jahitPerPcs || 0));
            const hasPaidJahit = settings.cashFlowList?.some(cf => {
              const desc = (cf.keterangan || '').toLowerCase();
              return desc.includes('jahit') && desc.includes(cellPoName);
            });

            const baseKomisi = item.komisiPerPcs || 0;
            const hasPenerimaKomisi = !!item.penerimaKomisi?.trim();
            const komisiCost = hasPenerimaKomisi
              ? (item.items && item.items.length > 0
                  ? item.items.reduce((sum, it) => sum + (it.qty * (it.komisiPerPcs !== undefined ? it.komisiPerPcs : baseKomisi)), 0)
                  : item.qty * baseKomisi)
              : 0;
            const hasPaidKomisi = settings.cashFlowList?.some(cf => {
              const desc = (cf.keterangan || '').toLowerCase();
              return desc.includes('komisi') && desc.includes(cellPoName);
            });

            const hasTakenProfit = settings.cashFlowList?.some(cf => {
              const desc = (cf.keterangan || '').toLowerCase();
              return desc.includes('ambil keuntungan') && desc.includes(cellPoName);
            });

            return (
              <div 
                key={item.id}
                className={`group bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden ${
                  nearDeadline 
                    ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/5' 
                    : 'border-slate-100 dark:border-slate-750'
                }`}
              >
                {/* Decorative deadline warning sash */}
                {nearDeadline && (
                  <div className="absolute top-0 right-0 bg-rose-600 text-[10px] text-white px-3 py-1 font-bold rounded-bl-xl uppercase tracking-widest flex items-center gap-1">
                    <Clock className="h-3 w-3 animate-pulse" />
                    Mendesak
                  </div>
                )}

                {/* Beautiful Grid Layout inside Card */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                  
                  {/* Left Column (Cols 1-2): ID & Basic identities with checkbox select */}
                  <div className="lg:col-span-2 flex items-start gap-2.5 min-w-0">
                    <div className="pt-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleToggleSelect(item.id)}
                        className="h-4 w-4 rounded-md border-slate-300 dark:border-slate-755 bg-slate-50 dark:bg-slate-900 text-indigo-600 focus:ring-indigo-505 cursor-pointer accent-indigo-600"
                      />
                    </div>
                    
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md shrink-0">
                          {item.id}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold shrink-0">
                          {new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white leading-snug line-clamp-2 break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={item.namaPo}>
                        {item.namaPo}
                      </h4>

                      {/* Contact details: Susunan Vertikal */}
                      <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                          <span className="truncate font-semibold text-slate-700 dark:text-slate-350">
                            {item.namaPemesan}
                          </span>
                        </div>
                        {item.noTelepon && (
                          <div className="flex flex-col gap-1 pl-5 mt-0.5">
                            <div className="font-mono text-[11px] text-slate-450 dark:text-slate-400 leading-none">
                              {item.noTelepon}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 no-print">
                              <a
                                href={`https://wa.me/${item.noTelepon.replace(/[^0-9]/g, '').startsWith('0') ? '62' + item.noTelepon.replace(/[^0-9]/g, '').substring(1) : item.noTelepon.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak,\n\nMengingatkan sisa pembayaran PO:\n\n*${item.namaPo}*\n\nSisa Tagihan:\n*${formatRupiah(item.sisaTagihan)}*\n\nTerima kasih.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-4xs shrink-0 select-none"
                                title="Kirim WA Pengingat Sisa Pembayaran Tagihan"
                              >
                                <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                                <span>WA Tagihan</span>
                              </a>
                              <a
                                href={`https://wa.me/${item.noTelepon.replace(/[^0-9]/g, '').startsWith('0') ? '62' + item.noTelepon.replace(/[^0-9]/g, '').substring(1) : item.noTelepon.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak,\n\nPesanan *${item.namaPo}* sedang dalam proses produksi.\n\nEstimasi selesai:\n*${item.deadline}*\n\nTerima kasih.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-black bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500 hover:text-white transition-all cursor-pointer shadow-4xs shrink-0 select-none"
                                title="Kirim WA Pembaruan Estimasi Selesai Produksi"
                              >
                                <Send className="h-2.5 w-2.5 shrink-0" />
                                <span>WA Deadline</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column 1 (Cols 3-4): Product detail spec */}
                  <div className="space-y-1.5 lg:col-span-2 min-w-0">
                    <p className="text-slate-800 dark:text-slate-200 text-xs font-bold truncate">
                      {item.namaProduk} <span className="text-slate-400 dark:text-slate-500 font-semibold font-sans">({item.bahan})</span>
                    </p>
                    {item.items && item.items.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.items.slice(0, 3).map((it) => (
                          <span 
                            key={it.id} 
                            title={`${it.namaProduk} (${it.qty} Pcs)`}
                            className="text-[10px] max-w-[120px] truncate inline-block bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold border border-slate-150/60 dark:border-slate-755/50 shrink-0"
                          >
                            {it.namaProduk} ({it.qty} Pcs)
                          </span>
                        ))}
                        {item.items.length > 3 && (
                          <span className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5">
                            +{item.items.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 italic leading-relaxed">
                        &ldquo;{item.keterangan || 'Tanpa keterangan tambahan.'}&rdquo;
                      </p>
                    )}

                    {/* Pembayaran List badges */}
                    {item.pembayaranList && item.pembayaranList.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5 text-[9.5px] items-center">
                        <span className="text-slate-400 dark:text-slate-500 font-bold mr-1 shrink-0">Histori DP:</span>
                        {item.pembayaranList.map((p, idx) => (
                          <span
                            key={p.id || idx}
                            className={`px-1.5 py-0.5 rounded-sm font-bold border leading-none shrink-0 select-none ${
                              p.nominal > 0 
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                : 'bg-slate-50 dark:bg-slate-900 text-slate-450 dark:text-slate-500 border-slate-200 dark:border-slate-800'
                            }`}
                            title={`Tanggal: ${p.tanggal} - ${p.keterangan}`}
                          >
                            {p.keterangan || `Bayar ${idx + 1}`}: {formatRupiah(p.nominal)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Middle Column 2 (Cols 5-9): Financial recap with custom roomy flex layout to prevent text cuts */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center min-w-0 w-full gap-2">
                    <div className="flex flex-row items-stretch justify-center bg-slate-50 dark:bg-slate-900/40 p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-750/80 min-w-0 w-full text-center">
                      {/* Qty Section */}
                      <div className="pr-2.5 max-w-[70px] border-r border-slate-205 dark:border-slate-700/80 shrink-0 flex flex-col items-center justify-center">
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none">Qty</span>
                        <span className="text-[11px] sm:text-xs xl:text-sm font-extrabold text-slate-800 dark:text-white block mt-1.5 truncate max-w-full" title={`${item.qty} Pcs`}>
                          {item.qty} Pcs
                        </span>
                      </div>
                      
                      {/* Total Tagihan Section */}
                      <div className="px-3 flex-1 min-w-0 flex flex-col items-center justify-center">
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate max-w-full">Total Tagihan</span>
                        <span className="text-[11px] sm:text-xs xl:text-sm font-extrabold text-slate-800 dark:text-white block mt-1.5 truncate max-w-full" title={formatRupiah(item.totalHarga)}>
                          {formatRupiah(item.totalHarga)}
                        </span>
                      </div>

                      {/* Sisa Bayar Section */}
                      <div className="border-l border-slate-205 dark:border-slate-700/80 px-3 flex-1 min-w-0 flex flex-col items-center justify-center">
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate max-w-full">Sisa Bayar</span>
                        <span className={`text-[11px] sm:text-xs xl:text-sm font-black block mt-1.5 truncate max-w-full ${isFullyPaid ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'}`} title={isFullyPaid ? 'Lunas' : formatRupiah(item.sisaTagihan)}>
                          {isFullyPaid ? 'Lunas ✓' : formatRupiah(item.sisaTagihan)}
                        </span>
                      </div>

                      {/* Profit Section */}
                      <div className="border-l border-slate-205 dark:border-slate-700/80 pl-3 flex-1 min-w-0 flex flex-col items-center justify-center">
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate max-w-full">
                          Profit {hasTakenProfit ? '(Ambil ✓)' : '(Belum)'}
                        </span>
                        <span className={`text-[11px] sm:text-xs xl:text-sm font-black block mt-1.5 truncate max-w-full ${hasTakenProfit ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-[#10b981]'}`} title={formatRupiah(item.profit)}>
                          {formatRupiah(item.profit)}
                        </span>
                      </div>
                    </div>

                    {/* Notifikasi Pembayaran Produksi & Komisi */}
                    {((!hasPaidSublim && sublimCost > 0) || (!hasPaidJahit && jahitCost > 0) || (!hasPaidKomisi && komisiCost > 0)) && (
                      <div 
                        className="text-[10px] sm:text-[11px] font-bold text-[#ff3b5c] animate-pulse truncate"
                        style={{ animationDuration: '1.5s' }}
                        title="Masih ada biaya produksi atau komisi yang belum dibayar"
                      >
                        {(() => {
                          const badges = [];
                          if (!hasPaidSublim && sublimCost > 0) badges.push('BELUM BAYAR SUBLIM');
                          if (!hasPaidJahit && jahitCost > 0) badges.push('BELUM BAYAR JAHIT');
                          if (!hasPaidKomisi && komisiCost > 0) badges.push('BELUM BAYAR KOMISI');
                          return '🔴 ' + badges.join(' • ');
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Right Column (Cols 10-12): Status, Deadline & Actions stacked to avoid collisions */}
                  <div className="lg:col-span-3 flex flex-col items-stretch justify-start gap-2.5 border-t lg:border-t-0 border-slate-100 dark:border-slate-755/80 pt-3.5 lg:pt-0 min-w-0 w-full lg:shrink-0">
                    
                    {/* Top row: Deadline badge and Edit/Trash Action helpers */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Deadline:</span>
                        <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/35 px-1.5 py-0.5 rounded-md leading-none">{item.deadline}</span>
                      </div>

                      {/* Edit / Trash Actions panel */}
                      <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-750 p-0.5 rounded-lg shrink-0">
                        {/* 1. Edit button */}
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          title="Ubah Rincian Pesanan"
                          className="p-1 text-slate-700 dark:text-slate-300 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer shrink-0"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* 2. Deletion action */}
                        {confirmDeleteId === item.id ? (
                          <div className="flex items-center gap-1 px-1 bg-rose-50 dark:bg-rose-950/40 rounded-lg shrink-0">
                            <span className="text-[9px] font-black text-rose-600 animate-pulse">Hapus?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDelete(item.id);
                                setConfirmDeleteId(null);
                              }}
                              className="p-1 text-rose-600 hover:bg-rose-100 rounded-md transition-colors font-black text-[10px]"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-200 rounded-md transition-colors text-[10px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            title="Hapus Pesanan Jersey"
                            className="p-1 text-slate-700 dark:text-slate-300 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Vertically stacked aligned buttons (Sejajar dari atas ke bawah) */}
                    <div className="flex flex-col gap-1.5 w-full">
                      
                      {/* 1. Status Produksi */}
                      <button
                        type="button"
                        onClick={() => triggerNextStatus(item)}
                        disabled={item.statusProduksi === 'Beres'}
                        title={item.statusProduksi === 'Beres' ? 'Produksi Selesai!' : 'Klik untuk ubah status pengerjaan'}
                        className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border flex items-center justify-between gap-1.5 transition-all ${getStatusStyle(item.statusProduksi)} ${
                          item.statusProduksi !== 'Beres' ? 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-3xs' : 'cursor-default opacity-85'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse shrink-0" />
                          <span className="truncate">Status: {item.statusProduksi}</span>
                        </div>
                        {item.statusProduksi !== 'Beres' && (
                          <Play className="h-2.5 w-2.5 ml-0.5 animate-pulse text-current shrink-0" />
                        )}
                      </button>

                      {/* 2. Cetak Nota Pelanggan */}
                      <button
                        type="button"
                        onClick={() => onGenerateNota(item, 'pelanggan')}
                        title="Cetak Nota / Invoice Transaksi Pelanggan"
                        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/45 hover:bg-indigo-100 dark:hover:bg-indigo-950/75 border border-indigo-150 dark:border-indigo-900/50 rounded-lg transition-all cursor-pointer shadow-3xs shrink-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span>Cetak Nota PO</span>
                        </div>
                        <span className="text-[10px] text-indigo-400 font-normal">Pelanggan</span>
                      </button>

                      {/* 3. Cetak Nota Sublim */}
                      <button
                        type="button"
                        onClick={() => onGenerateNota(item, 'sublim')}
                        title="Cetak Nota Pembayaran vendor Sublim"
                        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-bold text-pink-600 dark:text-pink-400 bg-pink-50/70 dark:bg-pink-950/45 hover:bg-pink-100 dark:hover:bg-pink-950/75 border border-pink-150 dark:border-pink-900/50 rounded-lg transition-all cursor-pointer shadow-3xs shrink-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <Printer className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                          <span>Nota Sublim</span>
                        </div>
                        <span className="text-[10px] text-pink-400 font-normal">Vendor</span>
                      </button>

                      {/* 4. Cetak Nota Jahit */}
                      <button
                        type="button"
                        onClick={() => onGenerateNota(item, 'jahit')}
                        title="Cetak Nota Pembayaran vendor Jahit"
                        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/45 hover:bg-amber-100 dark:hover:bg-amber-950/75 border border-amber-150 dark:border-amber-900/50 rounded-lg transition-all cursor-pointer shadow-3xs shrink-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <Scissors className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>Nota Jahit</span>
                        </div>
                        <span className="text-[10px] text-amber-400 font-normal">Vendor</span>
                      </button>

                      {/* 4.1 Cetak SPK Deskripsi Kerja Jahit */}
                      <button
                        type="button"
                        onClick={() => onGenerateNota(item, 'spk_jahit')}
                        title="Cetak PDF Deskripsi Kerja Jahit khusus untuk Tukang Jahit"
                        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50/70 dark:bg-violet-950/45 hover:bg-violet-100 dark:hover:bg-violet-950/75 border border-violet-150 dark:border-violet-900/50 rounded-lg transition-all cursor-pointer shadow-3xs shrink-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <Clipboard className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                          <span>PDF Deskripsi Jahit</span>
                        </div>
                        <span className="text-[10px] text-violet-400 font-normal">SPK</span>
                      </button>

                      {/* 4.5 Salin Deskripsi Jahit */}
                      <button
                        type="button"
                        onClick={() => handleCopyTailorDescription(item)}
                        title="Salin deskripsi lengkap pesanan ke clipboard untuk langsung dikirim ke WhatsApp penjahit"
                        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-3xs shrink-0 select-none border ${
                          copiedOrderId === item.id 
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30' 
                            : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/45 hover:bg-indigo-100 dark:hover:bg-indigo-950/75 border-indigo-150 dark:border-indigo-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {copiedOrderId === item.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-550 shrink-0" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          )}
                          <span>{copiedOrderId === item.id ? 'Tersalin!' : 'Salin Deskripsi Jahit'}</span>
                        </div>
                        <span className="text-[10px] text-indigo-400 font-normal">WA</span>
                      </button>

                      {/* 5. Cetak Nota Komisi */}
                      <button
                        type="button"
                        onClick={() => onGenerateNota(item, 'komisi')}
                        title="Cetak Nota Pembayaran Komisi Sales"
                        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/45 hover:bg-emerald-100 dark:hover:bg-emerald-950/75 border border-emerald-150 dark:border-emerald-900/50 rounded-lg transition-all cursor-pointer shadow-3xs shrink-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>Nota Komisi</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-normal">Komisi</span>
                      </button>

                      {/* 6. Ambil Keuntungan */}
                      {item.profit > 0 && (
                        <div className="w-full flex flex-col gap-1 shrink-0">
                          {confirmProfitId === item.id ? (
                            <div className="flex gap-1.5 w-full">
                              <button
                                type="button"
                                onClick={() => {
                                  onLogToCashFlow('Ambil Keuntungan', 'keluar', item.profit, `Ambil Keuntungan PO ${item.namaPo}`);
                                  setConfirmProfitId(null);
                                }}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1 px-2 rounded-lg transition-all border border-emerald-600 shadow-3xs cursor-pointer text-center"
                              >
                                Ya, Ambil
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmProfitId(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold py-1 px-2 rounded-lg transition-all border border-slate-200 dark:border-slate-700 shadow-3xs cursor-pointer text-center"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={hasTakenProfit}
                              onClick={() => setConfirmProfitId(item.id)}
                              title={hasTakenProfit ? "Keuntungan PO sudah diambil" : "Mencatat pengambilan keuntungan PO"}
                              className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-3xs border ${
                                hasTakenProfit
                                  ? "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-750 cursor-not-allowed"
                                  : "text-emerald-600 dark:text-emerald-400 bg-emerald-50/75 dark:bg-emerald-950/45 hover:bg-emerald-100/90 dark:hover:bg-emerald-950/75 border-emerald-200 dark:border-emerald-800 cursor-pointer"
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                {hasTakenProfit ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                                <span>Ambil Untung</span>
                              </div>
                              <span className={`text-[10px] ${hasTakenProfit ? 'text-slate-400 font-normal line-through' : 'text-emerald-500 font-extrabold'}`}>
                                {hasTakenProfit ? 'Selesai' : formatRupiah(item.profit)}
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
