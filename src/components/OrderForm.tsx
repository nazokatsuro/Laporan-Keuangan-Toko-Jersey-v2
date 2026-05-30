/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Pesanan, PesananItem, StatusProduksi } from '../types';
import { generateId, formatRupiah } from '../utils';
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
  X
} from 'lucide-react';

interface OrderFormProps {
  pesananToEdit?: Pesanan | null;
  onSave: (pesanan: Pesanan) => void;
  onCancel: () => void;
}

const STATUS_LIST: StatusProduksi[] = ['Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'];

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

export default function OrderForm({ pesananToEdit, onSave, onCancel }: OrderFormProps) {
  // Base fields
  const [deadline, setDeadline] = useState('');
  const [namaPemesan, setNamaPemesan] = useState('');
  const [noTelepon, setNoTelepon] = useState('');
  const [namaPo, setNamaPo] = useState('');
  
  // Date selection states
  const [dateMode, setDateMode] = useState<'today' | 'manual'>('today');
  const [customDate, setCustomDate] = useState(() => getLocalDateString());
  
  // Numerical fields
  const [uangMasuk, setUangMasuk] = useState(0);
  
  // Production stats & modal calculation fields
  const [statusProduksi, setStatusProduksi] = useState<StatusProduksi>('Setting');
  const [biayaLainnya, setBiayaLainnya] = useState(0);

  // Mockup image URL (base64 string)
  const [mockupUrl, setMockupUrl] = useState('');

  // Multiple product items inside this 1 PO
  const [items, setItems] = useState<PesananItem[]>([]);

  // Load existing pesanan details if editing
  useEffect(() => {
    if (pesananToEdit) {
      setDeadline(pesananToEdit.deadline);
      setNamaPemesan(pesananToEdit.namaPemesan);
      setNoTelepon(pesananToEdit.noTelepon);
      setNamaPo(pesananToEdit.namaPo);
      setUangMasuk(pesananToEdit.uangMasuk || 0);
      setStatusProduksi(pesananToEdit.statusProduksi);
      setBiayaLainnya(pesananToEdit.biayaLainnya ?? 0);
      setMockupUrl(pesananToEdit.mockupUrl || '');

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
        setItems(pesananToEdit.items);
      } else {
        // Fallback for older historic single-item POs
        setItems([
          {
            id: generateId(),
            namaProduk: pesananToEdit.namaProduk || 'Jersey Futsal Fullprint',
            bahan: pesananToEdit.bahan || 'Dryfit Jarum',
            keterangan: pesananToEdit.keterangan || '',
            qty: pesananToEdit.qty || 12,
            hargaPerPcs: pesananToEdit.hargaPerPcs || 110000,
            printPerPcs: pesananToEdit.printPerPcs ?? 35000,
            jahitPerPcs: pesananToEdit.jahitPerPcs ?? 20000,
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
      setUangMasuk(0);
      setStatusProduksi('Setting');
      setBiayaLainnya(0);
      setMockupUrl('');
      setDateMode('today');
      setCustomDate(getLocalDateString());
      setItems([
        {
          id: generateId(),
          namaProduk: 'Jersey Futsal Fullprint',
          bahan: 'Dryfit Jarum',
          keterangan: '',
          qty: 12,
          hargaPerPcs: 110000,
          printPerPcs: 35000,
          jahitPerPcs: 20000,
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
        qty: 12,
        hargaPerPcs: 110000,
        printPerPcs: 35000,
        jahitPerPcs: 20000,
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

  const profit = useMemo(() => {
    return totalHarga - totalModal;
  }, [totalHarga, totalModal]);

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
      qty: totalQty,
      hargaPerPcs: firstItem.hargaPerPcs,
      totalHarga,
      uangMasuk,
      sisaTagihan,
      statusProduksi,
      printPerPcs: firstItem.printPerPcs,
      jahitPerPcs: firstItem.jahitPerPcs,
      biayaLainnya,
      totalModal,
      profit,
      items,
      mockupUrl
    };

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                {/* Sub-inputs */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Catatan Desain & Pembagian Ukuran (S, M, L, XL, dll)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="E.g. Logo dada kiri bordir. Ukuran: L-8 pcs, XL-4 pcs. Nama punggung diprint..."
                    value={item.keterangan}
                    onChange={(e) => updateItemField(index, 'keterangan', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
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
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                DP / Pembayaran Masuk (Rp)
              </label>
              <RupiahInput
                value={uangMasuk}
                onChange={(val) => setUangMasuk(val)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>

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

            <div className="bg-slate-55 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 col-span-2 flex flex-col justify-between">
              <div className="flex justify-between items-start text-xs">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Qty Order</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{totalQty} Pcs</span>
                </div>
                <div>
                  <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tagihan Bruto</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{formatRupiah(totalHarga)}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 my-1.5" />

              <div className="flex justify-between items-end">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Keuntungan Bersih PO</span>
                  <span className={`text-[13px] font-black ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-600'}`}>
                    {formatRupiah(profit)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sisa Piutang</span>
                  <span className={`text-sm font-black ${sisaTagihan > 0 ? 'text-rose-600 dark:text-rose-450' : 'text-emerald-600'}`}>
                    {sisaTagihan > 0 ? formatRupiah(sisaTagihan) : 'Lunas ✓'}
                  </span>
                </div>
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
                  <Upload className="h-8 w-8 text-slate-400 group-hover:text-indigo-500 transition mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    Klik atau seret gambar ke sini
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Format PNG, JPG, JPEG (Max. 5MB)
                  </p>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert("Ukuran gambar maksimal adalah 5MB");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setMockupUrl(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            {/* Preview Section */}
            {mockupUrl ? (
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
