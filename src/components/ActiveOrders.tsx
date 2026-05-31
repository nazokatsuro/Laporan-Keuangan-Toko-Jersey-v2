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
  DollarSign
} from 'lucide-react';

interface ActiveOrdersProps {
  pesananList: Pesanan[];
  settings: ShopSettings;
  onLogToCashFlow: (kategori: string, jenis: 'masuk'|'keluar', nominal: number, keterangan: string) => void;
  onAddNew: () => void;
  onEdit: (pesanan: Pesanan) => void;
  onDelete: (id: string) => void;
  onGenerateNota: (pesanan: Pesanan | Pesanan[]) => void;
  onUpdateStatus: (id: string, newStatus: StatusProduksi) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

const ALL_STATUSES = ['Semua', 'Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres', 'Belum Bayar Sublim', 'Belum Bayar Jahit'];

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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'deadline' | 'qty' | 'totalHarga' | 'createdAt'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [tableMonth, setTableMonth] = useState<string>('Semua');
  const [tableYear, setTableYear] = useState<string>('Semua');
  
  // Selection state for batch receipts
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal state for deletion confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const handleToggleSort = (field: 'deadline' | 'qty' | 'totalHarga' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
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

  const handleGenerateBatchNota = () => {
    const filteredOrderIds = filteredAndSortedList.map(o => o.id);
    const selectedOrders = pesananList.filter(o => selectedIds.includes(o.id) && filteredOrderIds.includes(o.id));
    if (selectedOrders.length > 0) {
      onGenerateNota(selectedOrders);
    }
  };

  // Process sorting & filtering
  const filteredAndSortedList = useMemo(() => {
    return pesananList
      .filter(item => {
        const safeSearch = searchTerm.toLowerCase();
        const matchesSearch = 
          (item.namaPemesan || '').toLowerCase().includes(safeSearch) ||
          (item.namaPo || '').toLowerCase().includes(safeSearch) ||
          (item.id || '').toLowerCase().includes(safeSearch) ||
          (item.namaProduk || '').toLowerCase().includes(safeSearch) ||
          (item.noTelepon || '').includes(searchTerm);

        let matchesStatus = false;
        if (statusFilter === 'Semua') {
          matchesStatus = true;
        } else if (statusFilter === 'Belum Bayar Sublim') {
          const sublimCost = item.items.reduce((sum, it) => sum + (it.qty * (it.printPerPcs || 0)), 0);
          const hasPaidSublim = settings.cashFlowList?.some(cf => cf.keterangan.includes(`Bayar Sublim/Print PO ${item.namaPo}`));
          matchesStatus = sublimCost > 0 && !hasPaidSublim && ['Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'].includes(item.statusProduksi);
        } else if (statusFilter === 'Belum Bayar Jahit') {
          const jahitCost = item.items.reduce((sum, it) => sum + (it.qty * (it.jahitPerPcs || 0)), 0);
          const hasPaidJahit = settings.cashFlowList?.some(cf => cf.keterangan.includes(`Bayar Jahit PO ${item.namaPo}`));
          matchesStatus = jahitCost > 0 && !hasPaidJahit && ['Jahit', 'Tinggal Kirim', 'Beres'].includes(item.statusProduksi);
        } else {
          matchesStatus = item.statusProduksi === statusFilter;
        }
        
        // Month and year boundaries (fallback securely if createdAt missing to stop crash)
        const dtStr = item.createdAt || '';
        const itemYear = dtStr.substring(0, 4);
        const itemMonth = dtStr.substring(5, 7); // "MM"

        const yearMatches = tableYear === 'Semua' || itemYear === tableYear;
        const monthMatches = tableMonth === 'Semua' || itemMonth === tableMonth;

        return matchesSearch && matchesStatus && yearMatches && monthMatches;
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
  }, [pesananList, searchTerm, statusFilter, sortBy, sortOrder, tableMonth, tableYear]);

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
      
      {/* Top action / search panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs">
        
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari Pesanan (Nama, PO, Tim, No. Jersey/ID)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
        </div>

        {/* Filters and sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month filter dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            <select
              value={tableMonth}
              onChange={(e) => setTableMonth(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              {MONTHS_LIST.map(m => (
                <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year filter dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-indigo-500" />
            <select
              value={tableYear}
              onChange={(e) => setTableYear(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Semua Tahun</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Filter className="h-3.5 w-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              {ALL_STATUSES.map(st => (
                <option key={st} value={st} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                  Filter: {st}
                </option>
              ))}
            </select>
          </div>

          {/* Sort trigger helper */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 rounded-xl">
            <button
              onClick={() => handleToggleSort('deadline')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'deadline' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Deadline {sortBy === 'deadline' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleToggleSort('totalHarga')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === 'totalHarga' 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Tagihan {sortBy === 'totalHarga' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-600/10 hover:shadow-lg transition-transform"
          >
            <Plus className="h-4 w-4" />
            Jersey Baru
          </button>
        </div>
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
              <>
                <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
                <button
                  onClick={handleGenerateBatchNota}
                  className="flex items-center gap-1.5 bg-indigo-650 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer border-none"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Cetak Batch Nota ({selectedIds.length})
                </button>
              </>
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
            const isFullyPaid = item.sisaTagihan === 0;
            
            const sublimCost = item.items.reduce((sum, it) => sum + (it.qty * (it.printPerPcs || 0)), 0);
            const hasPaidSublim = settings.cashFlowList?.some(cf => cf.keterangan.includes(`Bayar Sublim/Print PO ${item.namaPo}`));
            const jahitCost = item.items.reduce((sum, it) => sum + (it.qty * (it.jahitPerPcs || 0)), 0);
            const hasPaidJahit = settings.cashFlowList?.some(cf => cf.keterangan.includes(`Bayar Jahit PO ${item.namaPo}`));

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
                      <div className="border-l border-slate-205 dark:border-slate-700/80 pl-3 flex-1 min-w-0 flex flex-col items-center justify-center">
                        <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate max-w-full">Sisa Bayar</span>
                        <span className={`text-[11px] sm:text-xs xl:text-sm font-black block mt-1.5 truncate max-w-full ${isFullyPaid ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'}`} title={isFullyPaid ? 'Lunas' : formatRupiah(item.sisaTagihan)}>
                          {isFullyPaid ? 'Lunas ✓' : formatRupiah(item.sisaTagihan)}
                        </span>
                      </div>
                    </div>

                    {/* Notifikasi Pembayaran Produksi */}
                    {((!hasPaidSublim && sublimCost > 0) || (!hasPaidJahit && jahitCost > 0)) && (
                      <div 
                        className="text-[10px] sm:text-[11px] font-bold text-[#ff3b5c] animate-pulse truncate"
                        style={{ animationDuration: '1s' }}
                        title="Masih ada biaya produksi yang belum dibayar"
                      >
                        {(!hasPaidSublim && sublimCost > 0) && (!hasPaidJahit && jahitCost > 0) ? (
                          '🔴 BELUM BAYAR SUBLIM • BELUM BAYAR JAHIT'
                        ) : (!hasPaidSublim && sublimCost > 0) ? (
                          '🔴 BELUM BAYAR SUBLIM'
                        ) : (
                          '🔴 BELUM BAYAR JAHIT'
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column (Cols 10-12): Status, Deadline & Actions stacked to avoid collisions */}
                  <div className="lg:col-span-3 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3.5 border-t lg:border-t-0 border-slate-100 dark:border-slate-750/80 pt-3.5 lg:pt-0 min-w-0 w-full lg:shrink-0">
                    
                    {/* Upper row on desktop: Status tag & Deadline block */}
                    <div className="flex items-center gap-3.5 max-w-full shrink-0">
                      
                      {/* Status Produksi badge */}
                      <div className="flex flex-col items-start lg:items-end shrink-0">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Status Produksi</span>
                        <button
                          type="button"
                          onClick={() => triggerNextStatus(item)}
                          disabled={item.statusProduksi === 'Beres'}
                          title={item.statusProduksi === 'Beres' ? 'Produksi Selesai!' : 'Klik untuk ubah status pengerjaan'}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center gap-1 transition-all ${getStatusStyle(item.statusProduksi)} ${
                            item.statusProduksi !== 'Beres' ? 'hover:scale-105 active:scale-95 cursor-pointer shadow-3xs' : 'cursor-default'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse shrink-0" />
                          <span className="truncate max-w-[85px]">{item.statusProduksi}</span>
                          {item.statusProduksi !== 'Beres' && (
                            <Play className="h-2 w-2 ml-0.5 animate-pulse text-current shrink-0" />
                          )}
                        </button>
                      </div>

                      {/* Deadline label */}
                      <div className="flex flex-col justify-start lg:items-end shrink-0 min-w-[75px]">
                        <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Deadline</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 inline-block">{item.deadline}</span>
                      </div>

                    </div>

                     {/* Lower row on desktop: Cetak buttons & Action helpers */}
                    <div className="flex items-center gap-2 shrink-0 max-w-full lg:justify-end lg:w-full">
                      
                      {/* Cetak Nota button replacement for Preview */}
                      <button
                        type="button"
                        onClick={() => onGenerateNota(item)}
                        title="Cetak Nota / Invoice Transaksi"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/45 hover:bg-indigo-100 dark:hover:bg-indigo-950/75 border border-indigo-150 dark:border-indigo-900/50 rounded-lg transition-all cursor-pointer shadow-3xs shrink-0"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>Cetak Nota</span>
                      </button>

                      {/* Edit / Trash Actions panel */}
                      <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-750 p-1 rounded-xl shrink-0">
                        {/* 1. Edit button */}
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          title="Ubah Rincian Pesanan"
                          className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Edit2 className="h-4 w-4" />
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
                              className="p-1 text-rose-600 hover:bg-rose-100 rounded-md transition-colors font-black text-[11px]"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-200 rounded-md transition-colors text-[11px]"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            title="Hapus Pesanan Jersey"
                            className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                    </div>

                  </div>

                </div>

                {/* Sublim/Jahit Unpaid Tracking Indicator at Bottom */}
                {((sublimCost > 0 && !hasPaidSublim && ['Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'].includes(item.statusProduksi)) || 
                  (jahitCost > 0 && !hasPaidJahit && ['Jahit', 'Tinggal Kirim', 'Beres'].includes(item.statusProduksi))) && (
                  <div className="mt-4 pt-3 border-t border-dashed border-rose-200 dark:border-rose-900/50 flex flex-wrap items-center justify-between gap-3 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Peringatan: HPP Produksi Belum Dibayar</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {sublimCost > 0 && !hasPaidSublim && ['Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'].includes(item.statusProduksi) && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`Konfirmasi pembayaran Sublim otomatis sejumlah ${formatRupiah(sublimCost)} untuk ${item.namaPo}?`)) {
                              onLogToCashFlow(
                                'Sublim',
                                'keluar',
                                sublimCost,
                                `Bayar Sublim/Print PO ${item.namaPo} sebanyak ${item.qty} Pcs`
                              );
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-3xs"
                        >
                          <DollarSign className="h-3 w-3" />
                          Belum Bayar Sublim
                        </button>
                      )}

                      {jahitCost > 0 && !hasPaidJahit && ['Jahit', 'Tinggal Kirim', 'Beres'].includes(item.statusProduksi) && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`Konfirmasi pembayaran Jahit otomatis sejumlah ${formatRupiah(jahitCost)} untuk ${item.namaPo}?`)) {
                              onLogToCashFlow(
                                'Jahit',
                                'keluar',
                                jahitCost,
                                `Bayar Jahit PO ${item.namaPo} sebanyak ${item.qty} Pcs`
                              );
                            }
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-3xs"
                        >
                          <DollarSign className="h-3 w-3" />
                          Belum Bayar Jahit
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
