/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Pesanan, StatusProduksi } from '../types';
import { formatRupiah } from '../utils';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  MessageCircle, 
  Send, 
  User, 
  FileText,
  Tag,
  AlertTriangle,
  Info
} from 'lucide-react';

interface ProductionCalendarProps {
  pesananList: Pesanan[];
  onSelectOrder: (order: Pesanan) => void;
}

export default function ProductionCalendar({ pesananList, onSelectOrder }: ProductionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    const saved = localStorage.getItem('laporan_jersey_cal_date');
    return saved ? new Date(saved) : new Date();
  });
  const [selectedOrder, setSelectedOrder] = useState<Pesanan | null>(null);
  
  // Status Filters
  const [activeFilters, setActiveFilters] = useState<Record<StatusProduksi, boolean>>(() => {
    const saved = localStorage.getItem('laporan_jersey_cal_filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default fallback
      }
    }
    return {
      'Setting': true,
      'Print Press': true,
      'Jahit': true,
      'Tinggal Kirim': true,
      'Beres': true
    };
  });

  // Sync state to localStorage
  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_cal_date', currentDate.toISOString());
  }, [currentDate]);

  React.useEffect(() => {
    localStorage.setItem('laporan_jersey_cal_filters', JSON.stringify(activeFilters));
  }, [activeFilters]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Color mapping according to requirements
  const getStatusStyle = (status: StatusProduksi) => {
    switch (status) {
      case 'Setting': // Setting Desain -> Biru
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50',
          dot: 'bg-blue-500',
          text: 'text-blue-600 dark:text-blue-400 font-bold'
        };
      case 'Print Press': // Print Press -> Ungu
        return {
          bg: 'bg-purple-500/10 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50',
          dot: 'bg-purple-500',
          text: 'text-purple-600 dark:text-purple-400 font-bold'
        };
      case 'Jahit': // Jahit -> Orange
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
          dot: 'bg-amber-500',
          text: 'text-amber-600 dark:text-amber-400 font-bold'
        };
      case 'Tinggal Kirim': // Tinggal Kirim -> Cyan
        return {
          bg: 'bg-cyan-500/10 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50',
          dot: 'bg-cyan-500',
          text: 'text-cyan-600 dark:text-cyan-400 font-bold'
        };
      case 'Beres': // Selesai -> Hijau
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/50',
          dot: 'bg-emerald-500',
          text: 'text-emerald-600 dark:text-emerald-400 font-bold'
        };
      default:
        return {
          bg: 'bg-slate-500/10 dark:bg-slate-950/30 text-slate-500 border-slate-200',
          dot: 'bg-slate-500',
          text: 'text-slate-500 font-bold'
        };
    }
  };

  // Status Filter controls
  const toggleFilter = (status: StatusProduksi) => {
    setActiveFilters(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const selectAllFilters = (enable: boolean) => {
    setActiveFilters({
      'Setting': enable,
      'Print Press': enable,
      'Jahit': enable,
      'Tinggal Kirim': enable,
      'Beres': enable
    });
  };

  // Map orders to deadlines
  const filteredOrdersByDeadline = useMemo(() => {
    return pesananList.filter(item => {
      // Must match chosen Status filters
      return activeFilters[item.statusProduksi];
    });
  }, [pesananList, activeFilters]);

  // Calendar Day generation
  const daysInMonth = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday ...
    // Convert Sunday = 0 to Monday-first convention:
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    const numDays = new Date(year, month + 1, 0).getDate();
    const days: Array<{ dayNum: number; dateString: string; isCurrentMonth: boolean }> = [];

    // Prior Month filler days
    const prevMonthNumDays = new Date(year, month, 0).getDate();
    for (let i = startOffset; i > 0; i--) {
      const d = prevMonthNumDays - i + 1;
      const prevMonthDate = new Date(year, month - 1, d);
      days.push({
        dayNum: d,
        dateString: prevMonthDate.toISOString().substring(0, 10),
        isCurrentMonth: false
      });
    }

    // Current Month days
    for (let d = 1; d <= numDays; d++) {
      const curMonthDate = new Date(year, month, d);
      // Construct date string preserving local timezone padding offset
      const dd = String(d).padStart(2, '0');
      const mm = String(month + 1).padStart(2, '0');
      days.push({
        dayNum: d,
        dateString: `${year}-${mm}-${dd}`,
        isCurrentMonth: true
      });
    }

    // Remaining empty days to complete neat 42 grid card
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      const dd = String(i).padStart(2, '0');
      const mm = String(month + 2).padStart(2, '0'); // will handle rolling years nicely in date conversions
      // Simple string fallback for clean display
      days.push({
        dayNum: i,
        dateString: `${year}-${mm}-${dd}`,
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month]);

  // Group events by YYYY-MM-DD
  const eventsByDay = useMemo(() => {
    const map: Record<string, Pesanan[]> = {};
    filteredOrdersByDeadline.forEach(order => {
      const dl = order.deadline; // "YYYY-MM-DD"
      if (!map[dl]) {
        map[dl] = [];
      }
      map[dl].push(order);
    });
    return map;
  }, [filteredOrdersByDeadline]);

  // Navigate calendar months
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to build normalized WhatsApp link
  const getWhatsAppLink = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') 
      ? '62' + cleanPhone.substring(1) 
      : cleanPhone;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 pb-12">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
              <Calendar className="h-5 w-5" />
            </span>
            Kalender Produksi Jersey
          </h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            Pantau rincian deadline seluruh PO aktif berdasarkan status pengerjaan untuk pengorganisasian tim yang lebih terjadwal.
          </p>
        </div>

        {/* Filters control block */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
            <button
              onClick={() => selectAllFilters(true)}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline hover:scale-102"
            >
              Semua
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              onClick={() => selectAllFilters(false)}
              className="text-[10px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-wider hover:underline hover:scale-102"
            >
              Sembunyikan
            </button>
          </div>
        </div>
      </div>

      {/* Production Status Toggle Toggles */}
      <div className="flex flex-wrap gap-2">
        {(['Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'] as StatusProduksi[]).map((status) => {
          const isActive = activeFilters[status];
          const styles = getStatusStyle(status);
          return (
            <button
              key={status}
              onClick={() => toggleFilter(status)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer select-none ${
                isActive 
                  ? `${styles.bg} scale-102 shadow-3xs` 
                  : 'bg-slate-50 dark:bg-slate-900/40 text-slate-400 border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${isActive ? styles.dot : 'bg-slate-300'}`} />
              <span>{status === 'Beres' ? 'Selesai/Beres' : status}</span>
            </button>
          );
        })}
      </div>

      {/* Calendar Structure Container */}
      <div className="bg-white dark:bg-slate-805 p-3.5 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-750/80 shadow-3xs">
        {/* Navigation Month controllers */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60 mb-5">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white capitalize">
              {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              {filteredOrdersByDeadline.length} PO Terfilter
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer border border-slate-200/40 dark:border-slate-750"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 transition-all cursor-pointer border border-slate-200/40 dark:border-slate-750"
            >
              Hari Ini
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer border border-slate-200/40 dark:border-slate-750"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Label Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center select-none">
          {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
            <div key={day} className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest py-1.5">
              {day}
            </div>
          ))}
        </div>

        {/* Massive 42 Day Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {daysInMonth.map((dayObj, index) => {
            const dayEvents = eventsByDay[dayObj.dateString] || [];
            const isToday = dayObj.dateString === new Date().toISOString().substring(0, 10);
            
            return (
              <div
                key={`${dayObj.dateString}-${index}`}
                className={`min-h-[75px] sm:min-h-[105px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                  dayObj.isCurrentMonth
                    ? 'bg-slate-50/40 dark:bg-slate-900/10 border-slate-150 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    : 'bg-slate-100/10 dark:bg-slate-950/5 border-slate-100 dark:border-slate-850 text-slate-400 opacity-45'
                } ${isToday ? 'ring-2 ring-indigo-500/50 dark:ring-indigo-400/50 bg-indigo-50/10' : ''}`}
              >
                {/* Day Marker */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] sm:text-xs font-extrabold inline-flex items-center justify-center rounded-sm ${
                    isToday 
                      ? 'bg-indigo-605 text-white h-5 w-5 rounded-full shadow-3xs' 
                      : 'text-slate-500 dark:text-slate-450'
                  }`}>
                    {dayObj.dayNum}
                  </span>
                  
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] font-black h-4 px-1 rounded-full bg-slate-200 dark:bg-slate-850 inline-flex items-center justify-center text-slate-500 dark:text-slate-450">
                      {dayEvents.length} PO
                    </span>
                  )}
                </div>

                {/* Day Events stack list */}
                <div className="space-y-1 mt-1.5 flex-1 overflow-y-auto max-h-[50px] sm:max-h-[70px] pr-0.5">
                  {dayEvents.slice(0, 3).map(order => {
                    const style = getStatusStyle(order.statusProduksi);
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className={`w-full text-left p-1 text-[8px] sm:text-[10px] font-extrabold truncate rounded-md border leading-tight hover:scale-[1.03] transition-transform shadow-4xs cursor-pointer flex items-center gap-1 ${style.bg}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} />
                        <span className="truncate">{order.namaPo}</span>
                      </button>
                    );
                  })}
                  
                  {dayEvents.length > 3 && (
                    <div className="text-[8px] text-slate-450 font-bold text-center">
                      +{dayEvents.length - 3} lainnya
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pop up Dialog drawer for Selected event detail */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-2xs flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          
          <div 
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl border border-slate-105 dark:border-slate-700 shadow-2xl overflow-hidden animate-fade-in text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header banner styled with specific Production stage color context */}
            <div className={`px-5 py-4 flex items-center justify-between border-b ${getStatusStyle(selectedOrder.statusProduksi).bg}`}>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-wider">DETAIL PROSES & DEADLINE</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-sm font-black p-1 hover:scale-110 opacity-70 hover:opacity-100 hover:text-rose-555"
              >
                ✕
              </button>
            </div>

            {/* Modal Core Specification Fields */}
            <div className="p-5 space-y-4">
              
              {/* Product and Team Identification */}
              <div>
                <span className="text-[8.5px] font-black tracking-widest text-slate-400 block uppercase">NAMA PO / TIM</span>
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">{selectedOrder.namaPo}</h4>
                <p className="text-xs text-indigo-620 dark:text-indigo-400 font-bold mt-1 inline-block">
                  {selectedOrder.namaProduk} <span className="text-slate-450 dark:text-slate-500 font-medium">({selectedOrder.bahan})</span>
                </p>
              </div>

              {/* Deadline & Status side by side */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <div>
                  <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wider mb-1">PROGRES PENGERJAAN</span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full animate-pulse shrink-0 ${getStatusStyle(selectedOrder.statusProduksi).dot}`} />
                    <span className={`text-xs ${getStatusStyle(selectedOrder.statusProduksi).text}`}>
                      {selectedOrder.statusProduksi}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[8px] font-black text-slate-400 block uppercase tracking-wider mb-1">BATAS TENGGAT / DEADLINE</span>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Calendar className="h-4 w-4 text-slate-450" />
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      {selectedOrder.deadline}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client specifications and contact detail block */}
              <div className="space-y-2.5">
                <span className="text-[8.5px] font-black tracking-widest text-slate-400 block uppercase">DETAIL PELANGGAN</span>
                
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    {selectedOrder.namaPemesan} <span className="text-[10px] text-slate-450 font-mono px-1.5 py-0.5 rounded-xs dark:bg-slate-900/60 font-semibold">({selectedOrder.noTelepon || '-'})</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Sisa Tagihan: <span className={`font-black ${selectedOrder.sisaTagihan > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {selectedOrder.sisaTagihan > 0 ? formatRupiah(selectedOrder.sisaTagihan) : 'Lunas'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Total Produksi: <span className="font-extrabold text-indigo-500">{selectedOrder.qty} Pcs</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Action triggers for WA integration */}
              {selectedOrder.noTelepon && (
                <div className="pt-3.5 border-t border-slate-100 dark:border-slate-700/60 flex flex-col gap-2">
                  <span className="text-[8.5px] font-black tracking-widest text-slate-400 block uppercase mb-1">TINDAKAN REMINDER</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={getWhatsAppLink(
                        selectedOrder.noTelepon, 
                        `Halo Kak,\n\nMengingatkan sisa pembayaran PO:\n\n*${selectedOrder.namaPo}*\n\nSisa Tagihan:\n*${formatRupiah(selectedOrder.sisaTagihan)}*\n\nTerima kasih.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-2xs rounded-xl shadow-xs cursor-pointer text-center select-none"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Remind Tagihan
                    </a>

                    <a
                      href={getWhatsAppLink(
                        selectedOrder.noTelepon, 
                        `Halo Kak,\n\nPesanan *${selectedOrder.namaPo}* sedang dalam proses produksi.\n\nEstimasi selesai:\n*${selectedOrder.deadline}*\n\nTerima kasih.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-2xs rounded-xl shadow-xs cursor-pointer text-center select-none"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Remind Deadline
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      onSelectOrder(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    className="mt-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-2xs rounded-xl shadow-xs cursor-pointer text-center select-none w-full"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Lihat & Cetak Nota Invoice
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Helpful Legend summary banner */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-4 rounded-2xl flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-xs">
          <strong className="font-bold text-slate-950 dark:text-white">Petunjuk Alur Kalender:</strong>
          <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Deadline PO diurutkan secara vertikal pada kolom tanggal piringan kalender di atas. Klik pada rincian mini untuk melihat detail pesanan, sisa pembayaran, status aktif, dan mengirimkan pesan WhatsApp secara instan tanpa tumpang tumpih.
          </p>
        </div>
      </div>

    </div>
  );
}
