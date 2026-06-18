/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Pesanan, PesananItem, StatusProduksi, ShopSettings, PembayaranMasuk } from '../types';
import { generateId, formatRupiah, compressImage } from '../utils';
import { 
  Save, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Calculator, 
  User, 
  Settings2, 
  DollarSign, 
  Info,
  Layers,
  Sparkles,
  ClipboardList,
  Image as ImageIcon,
  Upload,
  X,
  Loader2
} from 'lucide-react';

interface OrderFormProps {
  pesananToEdit?: Pesanan | null;
  onSave: (pesanan: Pesanan) => void;
  onCancel: () => void;
  onLogToCashFlow?: (kategori: string, jenis: 'masuk'|'keluar', nominal: number, keterangan: string) => void;
  cashFlowList?: any[]; // using any temporarily, or import CashFlowTransaction
  settings?: ShopSettings;
  onUpdateSettings?: (s: ShopSettings) => void;
}

const STATUS_LIST: StatusProduksi[] = ['Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'];

const BASELINE_COLLARS = [
  "O-Neck (Standar)",
  "V-Neck",
  "V-Persikab/kombinasi",
  "V-Daun",
  "V-Daun+Lidah",
  "V+Lidah",
  "O-Neck Kombinasi",
  "Kerah Polo",
  "Kerah Sleting",
  "Kerah Shanghai"
];

const getCanonicalCollar = (c?: string): string => {
  if (!c) return 'O-Neck (Standar)';
  const val = c.trim().toLowerCase();
  if (val === 'o-neck' || val === 'o neck' || val === 'o-neck (standar)' || val === 'o neck standar' || val === 'kerah o') {
    return 'O-Neck (Standar)';
  }
  if (val === 'v-neck' || val === 'v neck' || val === 'kerah v') {
    return 'V-Neck';
  }
  return c.trim();
};

interface RupiahInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

function RupiahInput({ value, onChange, className, placeholder }: RupiahInputProps) {
  const displayValue = value === 0 ? '' : value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const clean = rawVal.replace(/[^0-9]/g, '');
    const num = clean ? parseInt(clean, 10) : 0;
    
    const input = e.target;
    const oldSelectionStart = input.selectionStart || 0;
    const oldLength = rawVal.length;

    onChange(num);

    setTimeout(() => {
      if (!input) return;
      const newDisplay = num === 0 ? '' : num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const lengthDiff = newDisplay.length - oldLength;
      const newSelectionStart = Math.max(0, oldSelectionStart + lengthDiff);
      input.setSelectionRange(newSelectionStart, newSelectionStart);
    }, 0);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      className={className}
      placeholder={placeholder || "0"}
    />
  );
}

// Helper to get local date in "YYYY-MM-DD" format
const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function OrderForm({ pesananToEdit, onSave, onCancel, onLogToCashFlow, cashFlowList, settings, onUpdateSettings }: OrderFormProps) {
  // Base fields
  const [deadline, setDeadline] = useState('');
  const [namaPemesan, setNamaPemesan] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [namaPo, setNamaPo] = useState('');
  
  // Commission fields
  const [penerimaKomisi, setPenerimaKomisi] = useState('');
  const [komisiPerPcs, setKomisiPerPcs] = useState(0);
  
  // Date selection states
  const [dateMode, setDateMode] = useState<'today' | 'manual'>('today');
  const [customDate, setCustomDate] = useState(() => getLocalDateString());
  
  // Numerical fields & Payments List
  const [pembayaranList, setPembayaranList] = useState<PembayaranMasuk[]>([]);
  
  const uangMasuk = useMemo(() => {
    return pembayaranList.reduce((sum, p) => sum + p.nominal, 0);
  }, [pembayaranList]);
  
  // Production stats & modal calculation fields
  const [statusProduksi, setStatusProduksi] = useState<StatusProduksi>('Setting');
  const [biayaLainnya, setBiayaLainnya] = useState(0);

  // Mockup image URL (base64 string)
  const [mockupUrl, setMockupUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  // Collar image URL (base64 string)
  const [fotoKerahUrl, setFotoKerahUrl] = useState('');
  const [isCompressingKerah, setIsCompressingKerah] = useState(false);

  // Multiple product items inside this 1 PO
  const [items, setItems] = useState<PesananItem[]>([]);

  // Sizing details & names list from user
  const [detailSizeNama, setDetailSizeNama] = useState('');

  // Memoized lists of collars combining baseline and custom ones
  const availableCollars = useMemo(() => {
    const customList = settings?.customCollars || [];
    const uniqueCustom = customList.filter(col => col && !BASELINE_COLLARS.includes(col));
    return [...BASELINE_COLLARS, ...uniqueCustom];
  }, [settings?.customCollars]);

  // Load existing pesanan details if editing
  useEffect(() => {
    if (pesananToEdit) {
      setDeadline(pesananToEdit.deadline);
      setNamaPemesan(pesananToEdit.namaPemesan);
      setNoTelepon(pesananToEdit.noTelepon);
      setNamaPo(pesananToEdit.namaPo);
      
      if (pesananToEdit.pembayaranList && pesananToEdit.pembayaranList.length > 0) {
        setPembayaranList(pesananToEdit.pembayaranList);
      } else {
        setPembayaranList([
          {
            id: `pm-init-${pesananToEdit.id}`,
            tanggal: (pesananToEdit.createdAt || new Date().toISOString()).substring(0, 10),
            nominal: pesananToEdit.uangMasuk || 0,
            keterangan: 'DP Masuk Ke-1'
          }
        ]);
      }

      setStatusProduksi(pesananToEdit.statusProduksi);
      setBiayaLainnya(pesananToEdit.biayaLainnya ?? 0);
      setMockupUrl(pesananToEdit.mockupUrl || '');
      setFotoKerahUrl(pesananToEdit.fotoKerahUrl || '');
      setPenerimaKomisi(pesananToEdit.penerimaKomisi || '');
      setKomisiPerPcs(pesananToEdit.komisiPerPcs || 0);
      setDetailSizeNama(pesananToEdit.detailSizeNama || '');

      // Load creation date
      if (pesananToEdit.createdAt) {
        const orderDateStr = pesananToEdit.createdAt.substring(0, 10);
        setCustomDate(orderDateStr);
        const todayStr = getLocalDateString();
        if (orderDateStr === todayStr) {
          setDateMode('today');
        } else {
          setDateMode('manual');
        }
      } else {
        setDateMode('today');
        setCustomDate(getLocalDateString());
      }

      if (pesananToEdit.items && pesananToEdit.items.length > 0) {
        setItems(pesananToEdit.items.map(it => ({
          ...it,
          catatanJahit: it.catatanJahit || '',
          modelKerah: getCanonicalCollar(it.modelKerah || pesananToEdit.modelKerah)
        })));
      } else {
        // Fallback for older historic single-item POs
        setItems([
          {
            id: generateId(),
            namaProduk: pesananToEdit.namaProduk || 'Jersey Futsal Fullprint',
            bahan: pesananToEdit.bahan || 'Dryfit Jarum',
            keterangan: pesananToEdit.keterangan || '',
            catatanJahit: pesananToEdit.catatanJahit || '',
            qty: pesananToEdit.qty || 12,
            hargaPerPcs: pesananToEdit.hargaPerPcs || 110000,
            printPerPcs: pesananToEdit.printPerPcs ?? 35000,
            jahitPerPcs: pesananToEdit.jahitPerPcs ?? 20000,
            modelKerah: getCanonicalCollar(pesananToEdit.modelKerah),
          }
        ]);
      }
    } else {
      // Set default deadline is + 7 days from now
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7);
      setDeadline(targetDate.toISOString().substring(0, 10));
      
      // Cleanup for new
      setNamaPemesan('');
      setNoTelepon('');
      setNamaPo('');
      setPembayaranList([
        {
          id: `pm-new-${Date.now()}`,
          tanggal: getLocalDateString(),
          nominal: 0,
          keterangan: 'DP Masuk Ke-1'
        }
      ]);
      setBiayaLainnya(0);
      setPenerimaKomisi('');
      setKomisiPerPcs(0);
      setStatusProduksi('Setting');
      setMockupUrl('');
      setFotoKerahUrl('');
      setDetailSizeNama('');
      setDateMode('today');
      setCustomDate(getLocalDateString());
      setItems([
        {
          id: generateId(),
          namaProduk: 'Jersey Futsal Fullprint',
          bahan: 'Dryfit Jarum',
          keterangan: '',
          catatanJahit: '',
          qty: 12,
          hargaPerPcs: 110000,
          printPerPcs: 35000,
          jahitPerPcs: 20000,
          modelKerah: 'O-Neck (Standar)',
        }
      ]);
    }
  }, [pesananToEdit]);

  // Real-time item actions
  const updateItemField = (index: number, field: keyof PesananItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addNewItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: generateId(),
        namaProduk: 'Jersey Futsal Fullprint',
        bahan: 'Dryfit Jarum',
        keterangan: '',
        catatanJahit: '',
        qty: 12,
        hargaPerPcs: 110000,
        printPerPcs: 35000,
        jahitPerPcs: 20000,
        modelKerah: 'O-Neck (Standar)',
      }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      alert('Satu PO harus memiliki minimal 1 produk!');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const applyTemplateToItem = (index: number, mode: 'sublime-premium' | 'sublime-standar' | 'semi-sablon') => {
    setItems(prev => {
      const updated = [...prev];
      if (mode === 'sublime-premium') {
        updated[index].printPerPcs = 38000;
        updated[index].jahitPerPcs = 22000;
        updated[index].hargaPerPcs = 130000;
      } else if (mode === 'sublime-standar') {
        updated[index].printPerPcs = 32000;
        updated[index].jahitPerPcs = 18000;
        updated[index].hargaPerPcs = 110000;
      } else if (mode === 'semi-sablon') {
        updated[index].printPerPcs = 15000;
        updated[index].jahitPerPcs = 18000;
        updated[index].hargaPerPcs = 85000;
      }
      return updated;
    });
  };

  // Real-time calculated fields pooled across all items
  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty, 0);
  }, [items]);

  const totalHarga = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.qty * item.hargaPerPcs), 0);
  }, [items]);

  const sisaTagihan = useMemo(() => {
    const diff = totalHarga - uangMasuk;
    return diff < 0 ? 0 : diff;
  }, [totalHarga, uangMasuk]);

  const totalModal = useMemo(() => {
    const itemsModal = items.reduce((sum, item) => sum + (item.qty * item.printPerPcs) + (item.qty * item.jahitPerPcs), 0);
    return itemsModal + biayaLainnya;
  }, [items, biayaLainnya]);

  const totalKomisi = useMemo(() => {
    const baseKomisi = Number(komisiPerPcs) || 0;
    return items.reduce((sum, item) => sum + (item.qty * (item.komisiPerPcs !== undefined ? item.komisiPerPcs : baseKomisi)), 0);
  }, [items, komisiPerPcs]);

  const profit = useMemo(() => {
    return totalHarga - totalModal - totalKomisi;
  }, [totalHarga, totalModal, totalKomisi]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPemesan.trim()) {
      alert('Mohon isi nama pemesan!');
      return;
    }
    if (!namaPo.trim()) {
      alert('Mohon isi nama PO / Tim!');
      return;
    }
    if (items.length === 0) {
      alert('Silakan tambahkan minimal 1 item produk!');
      return;
    }

    // Validate details inside items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].namaProduk.trim()) {
        alert(`Nama Produk pada item ke-${i + 1} tidak boleh kosong!`);
        return;
      }
      if (items[i].qty <= 0) {
        alert(`Jumlah qty pada item ke-${i + 1} minimal harus 1 pcs!`);
        return;
      }
    }

    // Summarize items for backwards compatibility and easy main listing
    const summaryNamaProduk = items.length === 1 
      ? items[0].namaProduk 
      : `${items[0].namaProduk} (+ ${items.length - 1} item lainnya)`;
    
    const summaryBahan = items.length === 1 
      ? items[0].bahan 
      : items.map(item => item.bahan).filter((v, idx, arr) => arr.indexOf(v) === idx).join(', ');

    const summaryKeterangan = items.length === 1 
      ? items[0].keterangan 
      : items.map((item, idx) => `[Item ${idx + 1}] ${item.namaProduk}: ${item.keterangan || '-'}`).join('; ');

    const summaryCatatanJahit = items.length === 1
      ? (items[0].catatanJahit || '')
      : items.map((item, idx) => item.catatanJahit ? `[Item ${idx + 1}] ${item.namaProduk}: ${item.catatanJahit}` : '').filter(Boolean).join('; ');

    const summaryModelKerah = items.length === 1
      ? (items[0].modelKerah || 'O-Neck (Standar)')
      : items.map(item => item.modelKerah || 'O-Neck (Standar)').filter((v, idx, arr) => arr.indexOf(v) === idx).join(', ');

    const firstItem = items[0] || { printPerPcs: 35000, jahitPerPcs: 20000, hargaPerPcs: 110000 };

    const todayLocalStr = getLocalDateString();
    let finalCreatedAt = '';
    if (dateMode === 'today') {
      if (pesananToEdit) {
        const originalDateStr = pesananToEdit.createdAt.substring(0, 10);
        if (originalDateStr === todayLocalStr) {
          // Keep the exact original timestamp
          finalCreatedAt = pesananToEdit.createdAt;
        } else {
          // Set to current real-time timestamp
          finalCreatedAt = new Date().toISOString();
        }
      } else {
        // New order, use current timestamp
        finalCreatedAt = new Date().toISOString();
      }
    } else {
      // Manual date mode. customDate is in "YYYY-MM-DD" format.
      if (pesananToEdit && pesananToEdit.createdAt.startsWith(customDate)) {
        finalCreatedAt = pesananToEdit.createdAt;
      } else {
        // Construct standard ISO string for that selected day (midday to avoid timezone offset issues)
        finalCreatedAt = `${customDate}T12:00:00.000Z`;
      }
    }

    const payload: Pesanan = {
      id: pesananToEdit ? pesananToEdit.id : generateId(),
      createdAt: finalCreatedAt,
      deadline,
      namaPemesan,
      noTelepon,
      namaPo,
      namaProduk: summaryNamaProduk,
      bahan: summaryBahan,
      keterangan: summaryKeterangan,
      catatanJahit: summaryCatatanJahit,
      qty: totalQty,
      hargaPerPcs: firstItem.hargaPerPcs,
      totalHarga,
      uangMasuk,
      sisaTagihan,
      statusProduksi,
      modelKerah: summaryModelKerah,
      printPerPcs: firstItem.printPerPcs,
      jahitPerPcs: firstItem.jahitPerPcs,
      biayaLainnya,
      totalModal,
      profit,
      penerimaKomisi: penerimaKomisi.trim(),
      komisiPerPcs: Number(komisiPerPcs) || 0,
      items,
      mockupUrl,
      fotoKerahUrl,
      pembayaranList,
      detailSizeNama: detailSizeNama.trim()
    };

    // Automatically register any newly entered custom collar models in the shop settings for next transactions
    if (onUpdateSettings && settings) {
      const existingCustom = settings.customCollars || [];
      const newCustomsToRegister: string[] = [];
      
      items.forEach(it => {
        const collar = (it.modelKerah || '').trim();
        if (collar && collar !== 'Kustom' && collar !== 'Lainnya') {
          const isInBaseline = BASELINE_COLLARS.some(bc => bc.toLowerCase() === collar.toLowerCase());
          const isInCustom = existingCustom.some(ec => ec.toLowerCase() === collar.toLowerCase());
          const isInWorkingList = newCustomsToRegister.some(n => n.toLowerCase() === collar.toLowerCase());
          
          if (!isInBaseline && !isInCustom && !isInWorkingList) {
            newCustomsToRegister.push(collar);
          }
        }
      });
      
      if (newCustomsToRegister.length > 0) {
        onUpdateSettings({
          ...settings,
          customCollars: [...existingCustom, ...newCustomsToRegister]
        });
      }
    }

    onSave(payload);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            type="button"
            onClick={onCancel}
            className="group flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" />
            Kembali ke Daftar Pesanan
          </button>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {pesananToEdit ? `Edit Pesanan: ${pesananToEdit.id}` : 'Draft Pesanan Jersey Baru'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Formulir pendaftaran PO jersey lengkap dengan multi-produk produk kustom, HPP jahit & tsublimasi, serta profit laba bersih.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Step 1: Customer Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-slate-700 pb-2">
            <User className="h-4 w-4 text-indigo-500" />
            Detail Pemesan & Deadline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Nama Pemesan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Andi, Siti, atau Budi..."
                value={namaPemesan}
                onChange={(e) => setNamaPemesan(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all [&:not(:placeholder-shown)]:bg-white dark:[&:not(:placeholder-shown)]:bg-slate-900"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Nomor Telepon
              </label>
              <input
                type="tel"
                placeholder="081234..."
                value={noTelepon}
                onChange={(e) => setNoTelepon(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all [&:not(:placeholder-shown)]:bg-white dark:[&:not(:placeholder-shown)]:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Deadline Penyelesaian <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all [&:not(:placeholder-shown)]:bg-white dark:[&:not(:placeholder-shown)]:bg-slate-900"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700/60 my-2 pt-4">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Tanggal Transaksi / Pembukuan PO <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDateMode('today')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer select-none ${
                    dateMode === 'today'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Gunakan Tanggal Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => setDateMode('manual')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer select-none ${
                    dateMode === 'manual'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-905 dark:hover:text-white'
                  }`}
                >
                  Pilih Tanggal Manual
                </button>
              </div>

              {dateMode === 'manual' ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-450 dark:text-slate-400 font-medium whitespace-nowrap">Atur Tanggal:</span>
                  <input
                    type="date"
                    required={dateMode === 'manual'}
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all cursor-pointer"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Tanggal otomatis hari ini: <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold not-italic">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: PO Team detail & Product List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-105 dark:border-slate-700 pb-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-500" />
              Detail Produk & Rincian Jersey PO
            </h3>
            
            <button
              type="button"
              onClick={addNewItem}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-550 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Produk (+)
            </button>
          </div>

          {/* PO Team Level */}
          <div className="max-w-md">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Nama PO / Nama Tim / Komunitas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="E.g. Garuda United FC, Esport Legend, Al-Ikhlas FC..."
              value={namaPo}
              onChange={(e) => setNamaPo(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-semibold [&:not(:placeholder-shown)]:bg-white dark:[&:not(:placeholder-shown)]:bg-slate-900"
            />
          </div>

          {/* List of custom item cards */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={item.id} 
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors space-y-4 relative"
              >
                {/* Product Card Title Header with delete option */}
                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-2">
                  <span className="text-xs font-extrabold text-slate-850 dark:text-slate-200 flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[10px] font-black">
                      {index + 1}
                    </span>
                    Produk / Item #{index + 1}
                  </span>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="flex items-center gap-1 py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition duration-150 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus Item
                    </button>
                  )}
                </div>

                {/* Main product specs input fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Nama Produk Jersey <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="E.g. Jersey Home Pemain, Jersey Away, Jersey Kiper..."
                      value={item.namaProduk}
                      onChange={(e) => updateItemField(index, 'namaProduk', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Bahan Kain Jersey <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dryfit Milano, Jarum, Benzema..."
                      value={item.bahan}
                      onChange={(e) => updateItemField(index, 'bahan', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Model Kerah <span className="text-indigo-500 font-semibold">*</span>
                    </label>
                    <select
                      value={
                        availableCollars.includes(item.modelKerah || 'O-Neck (Standar)')
                          ? (item.modelKerah || 'O-Neck (Standar)')
                          : 'Lainnya'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Lainnya') {
                          updateItemField(index, 'modelKerah', 'Kustom');
                        } else {
                          updateItemField(index, 'modelKerah', val);
                        }
                      }}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
                    >
                      {availableCollars.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Lainnya">Lainnya (Ketik Manual...)</option>
                    </select>

                    {!availableCollars.includes(item.modelKerah || 'O-Neck (Standar)') && (
                      <input
                        type="text"
                        placeholder="Ketik model kerah manual..."
                        required
                        value={item.modelKerah === 'Kustom' ? '' : (item.modelKerah || '')}
                        onChange={(e) => updateItemField(index, 'modelKerah', e.target.value)}
                        className="w-full mt-2 px-3.5 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-950/20 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden animate-fade-in"
                      />
                    )}
                  </div>

                  {/* Template pricing for this item SPECIFICALLY */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                      Template Biaya Jersey Ini:
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyTemplateToItem(index, 'sublime-premium')}
                        className="flex-1 px-1.5 py-2 text-[9px] font-extrabold bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-950/70 transition"
                      >
                        Premium
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplateToItem(index, 'sublime-standar')}
                        className="flex-1 px-1.5 py-2 text-[9px] font-extrabold bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/70 transition"
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplateToItem(index, 'semi-sablon')}
                        className="flex-1 px-1.5 py-2 text-[9px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        Sablon
                      </button>
                    </div>
                  </div>
                </div>

                 {/* Sub-inputs - Split Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                      Catatan Untuk Konsumen (Tampil di Nota Pelanggan Saja)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="E.g. Logo dada kiri bordir, nama punggung diprint, warna dasar hitam pekat..."
                      value={item.keterangan || ''}
                      onChange={(e) => updateItemField(index, 'keterangan', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 border border-amber-450"></span>
                      Catatan Khusus Jahit (Hanya Tampil di SPK Jahit)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="E.g. Kerah V-neck lancip, belahan samping kanan-kiri, benang jahit senada..."
                      value={item.catatanJahit || ''}
                      onChange={(e) => updateItemField(index, 'catatanJahit', e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-705 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Numeric fields of the product card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Kuantitas / Qty <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={item.qty}
                      onChange={(e) => updateItemField(index, 'qty', Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Harga Jual / Pcs (Rp)
                    </label>
                    <RupiahInput
                      value={item.hargaPerPcs}
                      onChange={(val) => updateItemField(index, 'hargaPerPcs', val)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-extrabold text-indigo-650 dark:text-indigo-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Modal Sublim / Pcs (Rp)
                    </label>
                    <RupiahInput
                      value={item.printPerPcs}
                      onChange={(val) => updateItemField(index, 'printPerPcs', val)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Modal Jahit / Pcs (Rp)
                    </label>
                    <RupiahInput
                      value={item.jahitPerPcs}
                      onChange={(val) => updateItemField(index, 'jahitPerPcs', val)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Subtotal of this jersey line */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 mt-1 gap-1.5">
                  <p>
                    Subtotal Jual Jersey: <strong className="font-bold text-slate-800 dark:text-white">{formatRupiah(item.qty * item.hargaPerPcs)}</strong>
                  </p>
                  <p>
                    Estimasi Modal HPP: <strong className="font-semibold text-slate-700 dark:text-slate-350">{formatRupiah((item.qty * item.printPerPcs) + (item.qty * item.jahitPerPcs))}</strong>
                  </p>
                </div>

              </div>
            ))}
          </div>

          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={addNewItem}
              className="flex items-center gap-1.5 px-6 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-705 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 dark:text-indigo-300 rounded-xl text-xs font-bold transition duration-150 cursor-pointer border border-dashed border-indigo-200 dark:border-indigo-900/50 shadow-3xs"
            >
              <Plus className="h-4 w-4" />
              Tambah Produk Lain ke dalam PO ini
            </button>
          </div>

        </div>

        {/* Step 3: Overall PO Financial Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-slate-700 pb-2">
            <Calculator className="h-4 w-4 text-indigo-500" />
            Perhitungan Pelunasan & Keuangan PO Keseluruhan
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* COLUMN 1 & 2: MULTIPLE PEMBAYARAN / DP LIST */}
            <div className="col-span-1 md:col-span-2 space-y-3 bg-slate-50/50 dark:bg-slate-900/20 p-3 rounded-2xl border border-slate-100 dark:border-slate-805/40">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Rincian DP / Cicilan Masuk (Rp)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPembayaranList(prev => [
                      ...prev,
                      {
                        id: `pm-new-${Date.now()}-${Math.random().toString(36).substring(2,6)}`,
                        tanggal: getLocalDateString(),
                        nominal: 0,
                        keterangan: `Pembayaran Ke-${prev.length + 1}`
                      }
                    ]);
                  }}
                  className="inline-flex items-center gap-1.5 text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/50 dark:hover:bg-indigo-950/80 dark:text-indigo-400 px-2.5 py-1.5 rounded-lg transition-colors border border-indigo-100/50 dark:border-indigo-900/50"
                  id="btn-tambah-pembayaran"
                >
                  <Plus className="w-3 h-3" /> Tambah Pembayaran
                </button>
              </div>

              <div className="space-y-2 max-h-[178px] overflow-y-auto pr-1">
                {pembayaranList.map((pembayaran, pIdx) => (
                  <div key={pembayaran.id} className="flex gap-1.5 items-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-3xs">
                    <div className="w-[110px] shrink-0">
                      <input
                        type="date"
                        value={pembayaran.tanggal}
                        onChange={(e) => {
                          const updated = [...pembayaranList];
                          updated[pIdx].tanggal = e.target.value;
                          setPembayaranList(updated);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-850 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        id={`pm-date-${pIdx}`}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Keterangan (ex: DP 1, Pelunasan)"
                        value={pembayaran.keterangan}
                        onChange={(e) => {
                          const updated = [...pembayaranList];
                          updated[pIdx].keterangan = e.target.value;
                          setPembayaranList(updated);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-850 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        id={`pm-keterangan-${pIdx}`}
                      />
                    </div>
                    <div className="w-[115px] shrink-0">
                      <RupiahInput
                        value={pembayaran.nominal}
                        onChange={(val) => {
                          const updated = [...pembayaranList];
                          updated[pIdx].nominal = val;
                          setPembayaranList(updated);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-right"
                      />
                    </div>
                    {pembayaranList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPembayaranList(prev => prev.filter((_, idx) => idx !== pIdx));
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                        title="Hapus Pembayaran"
                        id={`pm-delete-${pIdx}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="text-[10px] text-slate-400 dark:text-slate-500 flex justify-between px-1.5 pt-0.5 border-t border-slate-100 dark:border-slate-800/60">
                <span>Total DP Terbayar ({pembayaranList.length}x):</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-[11px]">{formatRupiah(uangMasuk)}</span>
              </div>
            </div>

            {/* COLUMN 3: BIAYA LAIN-LAIN */}
            <div className="flex flex-col justify-start space-y-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Biaya Lain - lain (Ongkir, dll) (Rp)
                </label>
                <RupiahInput
                  value={biayaLainnya}
                  onChange={(val) => setBiayaLainnya(val)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-bold text-rose-600 dark:text-rose-400"
                />
              </div>
              <div className="p-3 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl border border-indigo-100/30 dark:border-indigo-900/20 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Info Keuangan:</span> Setiap pembayaran masuk (DP) dicatat rinci untuk memotong Sisa Piutang PO. Keuntungan dihitung dari Total Tagihan dikurangi modal produksi dan komisi.
              </div>
            </div>

            {/* COLUMN 4: FINANCIAL SUMMARY CARD */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Qty Order</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">{totalQty} Pcs</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tagihan Bruto</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">{formatRupiah(totalHarga)}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800" />

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Keuntungan Bersih</span>
                  <span className={`text-sm font-black ${profit >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {formatRupiah(profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sisa Tagihan</span>
                  <span className={`text-base font-black ${sisaTagihan > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                    {sisaTagihan > 0 ? formatRupiah(sisaTagihan) : 'Lunas ✓'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-section: Komisi Broker / Sales / Reseller (Opsional) */}
          <div className="border-t border-slate-100 dark:border-slate-705/60 pt-4 mt-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-1.5 h-3 bg-indigo-500 rounded-xs block"></span>
              Pengaturan Komisi Penjualan / Broker (Opsional)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Komisi Untuk Siapa (Nama Penerima)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Sales, Haji Ahmad, Broker Adi..."
                  value={penerimaKomisi}
                  onChange={(e) => setPenerimaKomisi(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all cursor-text"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Komisi per Pcs (Rp)
                </label>
                <RupiahInput
                  value={komisiPerPcs}
                  onChange={(val) => setKomisiPerPcs(val)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <div className="bg-indigo-50/40 dark:bg-indigo-950/25 border border-indigo-100/50 dark:border-indigo-900/35 p-3 rounded-xl flex flex-col justify-center">
                <span className="block text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest">Estimasi Total Komisi</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {formatRupiah(totalQty * komisiPerPcs)}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500">
                  ({totalQty} pcs x {formatRupiah(komisiPerPcs)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3.5: Mockup Desain Pesanan */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-slate-700 pb-2">
            <ImageIcon className="h-4 w-4 text-indigo-500" />
            Mockup Desain / Gambar Pesanan (Opsional)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unggah gambar desain mockup jersey PO ini untuk dilampirkan langsung di dalam nota transaksi.
          </p>

          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Upload Area */}
            <div className="w-full md:flex-1">
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-2xl cursor-pointer transition group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isCompressing ? (
                    <>
                      <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
                      <p className="text-xs font-bold text-indigo-500">
                        Sedang mengoptimalkan gambar...
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Memperkecil ukuran berkas agar hemat penyimpanan
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400 group-hover:text-indigo-500 transition mb-2" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350">
                        Klik atau seret gambar ke sini
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Format PNG, JPG, JPEG (Max. 5MB)
                      </p>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  disabled={isCompressing}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Ukuran gambar maksimal adalah 5MB");
                        return;
                      }
                      setIsCompressing(true);
                      try {
                        // Compress the image down to 800px max dimensions and 0.7 JPEG quality
                        const compressedBase64 = await compressImage(file, 800, 800, 0.7);
                        setMockupUrl(compressedBase64);
                      } catch (err: any) {
                        console.error("Gagal mengompresi gambar mockup:", err);
                        // Fallback to uncompressed file
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setMockupUrl(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      } finally {
                        setIsCompressing(false);
                      }
                    }
                  }}
                />
              </label>
            </div>

            {/* Preview Section */}
            {isCompressing ? (
              <div className="w-full max-w-[200px] h-36 border border-dashed border-indigo-300 dark:border-indigo-700/60 rounded-2xl flex flex-col items-center justify-center text-indigo-400 bg-indigo-50/10 text-xs">
                <Loader2 className="h-6 w-6 mb-1 animate-spin text-indigo-500" />
                <span>Memproses...</span>
              </div>
            ) : mockupUrl ? (
              <div className="relative w-full max-w-[200px] h-36 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 group overflow-hidden">
                <img 
                  src={mockupUrl} 
                  alt="Mockup Preview" 
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setMockupUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md opacity-90 hover:opacity-100 transition duration-150"
                  title="Hapus gambar mockup"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-full max-w-[200px] h-36 border border-dashed border-slate-200 dark:border-slate-750 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/20 text-xs">
                <ImageIcon className="h-6 w-6 mb-1 opacity-60" />
                <span>Belum ada mockup</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 3.5.2: Gambar Bentuk Kerah */}
        <div id="upload_collar_image" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-slate-700 pb-2">
            <Layers className="h-4 w-4 text-violet-500" />
            Foto / Gambar Bentuk Kerah Custom (Opsional)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Unggah gambar atau bentuk kerah yang diinginkan pelanggan untuk panduan pengerjaan tukang jahit di SPK.
          </p>

          <div className="flex flex-col md:flex-row gap-6 items-center">
            {/* Upload Area */}
            <div className="w-full md:flex-1">
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-slate-900/40 rounded-2xl cursor-pointer transition group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isCompressingKerah ? (
                    <>
                      <Loader2 className="h-8 w-8 text-violet-500 animate-spin mb-2" />
                      <p className="text-xs font-bold text-violet-500">
                        Sedang mengoptimalkan gambar...
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Memperkecil ukuran berkas agar hemat penyimpanan
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400 group-hover:text-violet-500 transition mb-2" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350">
                        Klik atau seret gambar kerah ke sini
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Format PNG, JPG, JPEG (Max. 5MB)
                      </p>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  disabled={isCompressingKerah}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Ukuran gambar maksimal adalah 5MB");
                        return;
                      }
                      setIsCompressingKerah(true);
                      try {
                        const compressedBase64 = await compressImage(file, 800, 800, 0.7);
                        setFotoKerahUrl(compressedBase64);
                      } catch (err: any) {
                        console.error("Gagal mengompresi gambar kerah:", err);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setFotoKerahUrl(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      } finally {
                        setIsCompressingKerah(false);
                      }
                    }
                  }}
                />
              </label>
            </div>

            {/* Preview Section */}
            {isCompressingKerah ? (
              <div className="w-full max-w-[200px] h-36 border border-dashed border-violet-300 dark:border-violet-700/60 rounded-2xl flex flex-col items-center justify-center text-violet-400 bg-violet-50/10 text-xs">
                <Loader2 className="h-6 w-6 mb-1 animate-spin text-violet-500" />
                <span>Memproses...</span>
              </div>
            ) : fotoKerahUrl ? (
              <div className="relative w-full max-w-[200px] h-36 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 group overflow-hidden">
                <img 
                  src={fotoKerahUrl} 
                  alt="Collar Preview" 
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setFotoKerahUrl('')}
                  className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-md opacity-90 hover:opacity-100 transition duration-150"
                  title="Hapus gambar kerah"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="w-full max-w-[200px] h-36 border border-dashed border-slate-200 dark:border-slate-750 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/20 text-xs">
                <ImageIcon className="h-6 w-6 mb-1 opacity-60" />
                <span>Belum ada gambar kerah</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 3.6: Detail Sizing & Daftar Nama Konsumen (Untuk Tukang Jahit) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-slate-700 pb-2">
            <ClipboardList className="h-4 w-4 text-indigo-500" />
            Detail Sizing &amp; Daftar Nama Konsumen (Untuk Tukang Jahit)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tulis rincian ukuran (size chart) dan nama-nama dari konsumen di bawah ini agar otomatis masuk ke format cetak PDF khusus jahit dan draf copy-paste untuk WhatsApp (WA).
          </p>
          <div>
            <textarea
              rows={4}
              placeholder="Contoh:&#10;- Budi (Size L, No. Punggung 10)&#10;- Andi (Size M, No. Punggung 7)&#10;- Dani (Size XL, No. Punggung 9)&#10;&#10;Atau ukuran rekap:&#10;S: 2 pcs, M: 5 pcs, L: 8 pcs, XL: 3 pcs"
              value={detailSizeNama}
              onChange={(e) => setDetailSizeNama(e.target.value)}
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500/25 focus:border-indigo-505 focus:outline-hidden font-mono"
            />
          </div>
        </div>

        {/* Step 4: Production Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-slate-700 pb-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Status Alur Produksi Jersey PO
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {STATUS_LIST.map((stat) => {
              const active = statusProduksi === stat;
              return (
                <button
                  key={stat}
                  type="button"
                  onClick={() => setStatusProduksi(stat)}
                  className={`px-3 py-3 rounded-xl border text-center transition-all text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    active 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700' 
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-205 dark:border-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${active ? 'bg-white' : 'bg-slate-300'} 
                    ${stat === 'Setting' && 'bg-indigo-400'}
                    ${stat === 'Print Press' && 'bg-pink-400'}
                    ${stat === 'Jahit' && 'bg-amber-400'}
                    ${stat === 'Tinggal Kirim' && 'bg-teal-400'}
                    ${stat === 'Beres' && 'bg-emerald-400'}
                  `} />
                  <span>{stat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 5: Pembayaran & Pengeluaran HPP Manual (Arus Kas) */}
        {pesananToEdit && onLogToCashFlow && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-slate-700 pb-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Catat Pembayaran & HPP ke Arus Kas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gunakan tombol di bawah ini untuk mencatat uang masuk dari PO ini atau melakukan pembayaran biaya produksi ke Arus Kas secara manual.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pemasukan (Pelanggan)</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Total Harga: <span className="font-bold">{formatRupiah(totalHarga)}</span></p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Uang Masuk / DP: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatRupiah(uangMasuk)}</span></p>
                  <p className="text-xs font-semibold text-rose-500 dark:text-rose-400 mb-3">Sisa Tagihan: {formatRupiah(sisaTagihan)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="w-full text-center px-4 py-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-xl font-bold text-[10px] uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/50">
                    DP otomatis tercatat di Arus Kas
                  </div>
                  {pesananToEdit && profit > 0 && (
                    <>
                      {(() => {
                        const isProfitTaken = cashFlowList?.some(cf => {
                          const desc = (cf.keterangan || '').toLowerCase();
                          return desc.includes('ambil keuntungan') && desc.includes(pesananToEdit.namaPo.toLowerCase());
                        });
                        return (
                          <button
                            type="button"
                            disabled={isProfitTaken}
                            onClick={() => {
                              if (!onLogToCashFlow) return;
                              onLogToCashFlow('Ambil Keuntungan', 'keluar', profit, `Ambil Keuntungan PO ${namaPo}`);
                            }}
                            className={`w-full text-center px-4 py-1.5 ${isProfitTaken ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 cursor-pointer'} rounded-xl font-bold text-xs transition border`}
                          >
                            {isProfitTaken ? `Untung Lunas (${formatRupiah(profit)})` : `Ambil Untung (${formatRupiah(profit)})`}
                          </button>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pengeluaran Produksi</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Est. Total Modal: <span className="text-amber-600 dark:text-amber-400 font-bold">{formatRupiah(totalModal)}</span></p>
                </div>
                <div className="flex flex-col gap-2 mt-3">
                  {(() => {
                    const sumSublim = items.reduce((sum, it) => sum + (it.qty * it.printPerPcs), 0);
                    const isSublimPaid = pesananToEdit && cashFlowList?.some(cf => cf.keterangan.includes(`Bayar Sublim/Print PO ${pesananToEdit.namaPo}`));
                    return (
                      <button
                        type="button"
                        disabled={isSublimPaid || sumSublim <= 0}
                        onClick={() => {
                          if (!onLogToCashFlow) return;
                          if (sumSublim > 0) onLogToCashFlow('Sublim', 'keluar', sumSublim, `Bayar Sublim/Print PO ${namaPo}`); else alert('Biaya sublim 0');
                        }}
                        className={`w-full text-center px-4 py-2 ${isSublimPaid ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 border-rose-200 dark:border-rose-800 cursor-pointer'} rounded-xl font-bold text-xs transition border`}
                      >
                        {isSublimPaid ? 'Pelunasan Sublim Lunas' : 'Bayar Sublim / Print'}
                      </button>
                    );
                  })()}
                  {(() => {
                    const sumJahit = items.reduce((sum, it) => sum + (it.qty * it.jahitPerPcs), 0);
                    const isJahitPaid = pesananToEdit && cashFlowList?.some(cf => cf.keterangan.includes(`Bayar Jahit PO ${pesananToEdit.namaPo}`));
                    return (
                      <button
                        type="button"
                        disabled={isJahitPaid || sumJahit <= 0}
                        onClick={() => {
                          if (!onLogToCashFlow) return;
                          if (sumJahit > 0) onLogToCashFlow('Jahit', 'keluar', sumJahit, `Bayar Jahit PO ${namaPo}`); else alert('Biaya jahit 0');
                        }}
                        className={`w-full text-center px-4 py-2 ${isJahitPaid ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 dark:text-amber-400 border-amber-200 dark:border-amber-800 cursor-pointer'} rounded-xl font-bold text-xs transition border`}
                      >
                        {isJahitPaid ? 'Pelunasan Jahit Lunas' : 'Bayar Jahit'}
                      </button>
                    );
                  })()}
                  {(() => {
                    const baseKomisi = pesananToEdit?.komisiPerPcs || 0;
                    const hasPenerimaKomisi = !!penerimaKomisi.trim();
                    const sumKomisi = hasPenerimaKomisi
                      ? items.reduce((sum, it) => sum + (it.qty * (it.komisiPerPcs !== undefined ? it.komisiPerPcs : baseKomisi)), 0)
                      : 0;
                    const isKomisiPaid = pesananToEdit && cashFlowList?.some(cf => 
                      cf.keterangan.toLowerCase().includes('komisi') && cf.keterangan.includes(pesananToEdit.namaPo)
                    );
                    return (
                      <button
                        type="button"
                        disabled={isKomisiPaid || sumKomisi <= 0}
                        onClick={() => {
                          if (!onLogToCashFlow) return;
                          if (sumKomisi > 0) {
                            onLogToCashFlow('Komisi', 'keluar', sumKomisi, `Bayar Komisi Broker (${penerimaKomisi}) PO ${namaPo}`);
                          } else {
                            alert('Biaya komisi 0 atau Broker belum ditentukan');
                          }
                        }}
                        className={`w-full text-center px-4 py-2 ${isKomisiPaid ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 cursor-pointer'} rounded-xl font-bold text-xs transition border`}
                      >
                        {isKomisiPaid ? 'Pelunasan Komisi Lunas' : `Bayar Komisi (${penerimaKomisi || 'Broker'})`}
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-55 dark:hover:bg-slate-850 text-sm transition"
          >
            Batal
          </button>
          
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/15 text-sm transition cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {pesananToEdit ? 'Simpan Perubahan PO' : 'Catat Pesanan Jersey (PO)'}
          </button>
        </div>

      </form>
    </div>
  );
}
