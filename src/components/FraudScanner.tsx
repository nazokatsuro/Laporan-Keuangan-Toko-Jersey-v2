import React, { useMemo, useState } from 'react';
import { Pesanan, ShopSettings, AuditorDismissedAlert } from '../types';
import { formatRupiah } from '../utils';
import { 
  ShieldAlert, 
  AlertOctagon, 
  TrendingUp, 
  FilterX, 
  Trash2, 
  X, 
  History, 
  RotateCcw, 
  Check, 
  User, 
  Calendar,
  AlertTriangle 
} from 'lucide-react';

interface FraudScannerProps {
  pesananList: Pesanan[];
  onSelectOrder: (pesanan: Pesanan) => void;
  settings?: ShopSettings;
  onUpdateSettings?: (updates: Partial<ShopSettings>) => void;
}

export default function FraudScanner({ 
  pesananList, 
  onSelectOrder, 
  settings, 
  onUpdateSettings 
}: FraudScannerProps) {
  const [confirmDismissId, setConfirmDismissId] = useState<string | null>(null);
  const [confirmDismissAll, setConfirmDismissAll] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // AI Rule-based Anomaly Engine
  const anomalies = useMemo(() => {
    const alerts: Array<{
      id: string;
      level: 'critical' | 'warning';
      title: string;
      description: string;
      icon: React.ElementType;
      relatedOrders: Pesanan[];
    }> = [];

    if (pesananList.length === 0) return alerts;

    // 1. Detect Duplicate Entries (Operasional Ganda)
    // Same 'Vendor/PO Name', same 'totalHarga', created within the same month/year
    const duplicateMap = new Map<string, Pesanan[]>();
    pesananList.forEach(item => {
      const nama = (item.namaPo || '').toLowerCase().trim();
      const tHarga = item.totalHarga || 0;
      const created = item.createdAt ? item.createdAt.substring(0, 7) : '';
      const key = `${nama}_${tHarga}_${created}`;
      if (!duplicateMap.has(key)) {
        duplicateMap.set(key, []);
      }
      duplicateMap.get(key)!.push(item);
    });

    duplicateMap.forEach((orders, key) => {
      if (orders.length > 1) {
        const poName = orders[0].namaPo || 'Tanpa Nama';
        const totalH = orders[0].totalHarga || 0;
        const stateKey = orders.map(o => `${o.id}_${o.totalHarga}`).join('_');
        alerts.push({
          id: `dup_${key}_${stateKey}`,
          level: 'critical',
          title: 'Indikasi Input Ganda (Duplikasi Transaksi)',
          description: `Terdeteksi ${orders.length} transaksi dengan nama PO identik ("${poName}") dan nominal sama persis (${formatRupiah(totalH)}) pada periode yang sama. Pastikan ini bukan human error atau manipulasi input kas.`,
          icon: FilterX,
          relatedOrders: orders
        });
      }
    });

    // 2. Detect Unreasonable Vendor Costs (Lonjakan Biaya Vendor per Qty)
    const getPureVendorCostPerPcs = (item: Pesanan) => {
      const itemQty = item.qty || 1;
      const totalVendor = item.items && Array.isArray(item.items) ? item.items.reduce((sum, it) => sum + (it.qty * ((it.printPerPcs || 0) + (it.jahitPerPcs || 0))), 0) : 0;
      return totalVendor / itemQty;
    };

    const validModalOrders = pesananList.filter(o => (o.qty || 0) > 0 && getPureVendorCostPerPcs(o) > 0);
    
    if (validModalOrders.length >= 3) {
      const sortedCostPerPcs = validModalOrders.map(o => getPureVendorCostPerPcs(o)).sort((a, b) => a - b);
      const medianIndex = Math.floor(sortedCostPerPcs.length / 2);
      const medianCostPerPcs = sortedCostPerPcs[medianIndex];

      validModalOrders.forEach(item => {
        const itemCostPerPcs = getPureVendorCostPerPcs(item);
        if (itemCostPerPcs > medianCostPerPcs * 2 && medianCostPerPcs > 0) {
          alerts.push({
            id: `spike_cost_${item.id}_${itemCostPerPcs}`,
            level: 'warning',
            title: 'Lonjakan Biaya Pengeluaran Tidak Wajar',
            description: `Evaluasi PO "${item.namaPo || 'Tanpa Nama'}": Biaya produksi/vendor per pcs tercatat sangat tinggi (${formatRupiah(itemCostPerPcs)}/pcs) dibandingkan harga rata-rata wajar (${formatRupiah(medianCostPerPcs)}/pcs). Waspada mark-up fiktif.`,
            icon: TrendingUp,
            relatedOrders: [item]
          });
        }
      });
    }

    // 3. Detect Negative Debt or Impossible Logic (Perubahan Sepihak tanpa otorisasi)
    pesananList.forEach(item => {
      const sisaTagihan = item.sisaTagihan || 0;
      const profit = item.profit || 0;
      const namaPo = item.namaPo || 'Tanpa Nama';
      
      if (sisaTagihan < 0) {
         alerts.push({
          id: `neg_debt_${item.id}_${sisaTagihan}`,
          level: 'critical',
          title: 'Anomali Sisa Tagihan Minus',
          description: `PO "${namaPo}" memiliki uang masuk melebihi total harga. Indikasi perubahan data nominal tagihan lampau secara acak tanpa penyesuaian arus kas uang masuk.`,
          icon: AlertOctagon,
          relatedOrders: [item]
        });
      } else if (profit < 0) {
        alerts.push({
          id: `neg_profit_${item.id}_${profit}`,
          level: 'warning',
          title: 'Peringatan Kebocoran Profit (Minus)',
          description: `PO "${namaPo}" tercatat mengalami kerugian (-${formatRupiah(Math.abs(profit))}). Total modal vendor melebihi harga jual yang disepakati pelanggan.`,
          icon: ShieldAlert,
          relatedOrders: [item]
        });
      }
    });

    return alerts; // Raw calculated anomalies (unfiltered)
  }, [pesananList]);

  const dismissedAlerts = useMemo(() => settings?.dismissedAuditorAlerts || [], [settings]);

  const activeAnomalies = useMemo(() => {
    return anomalies.filter(alert => !dismissedAlerts.some(da => da.id === alert.id));
  }, [anomalies, dismissedAlerts]);

  const handleDismiss = (alertId: string) => {
    const alertToDismiss = anomalies.find(a => a.id === alertId);
    if (!alertToDismiss) return;

    const newDismissed: AuditorDismissedAlert = {
      id: alertId,
      dismissedAt: new Date().toLocaleString('id-ID'),
      dismissedBy: 'Admin',
      title: alertToDismiss.title,
      description: alertToDismiss.description,
      relatedPoNames: alertToDismiss.relatedOrders.map(ro => ro.namaPo || 'Tanpa Nama')
    };

    const currentDismissed = settings?.dismissedAuditorAlerts || [];
    if (!currentDismissed.some(da => da.id === alertId)) {
      onUpdateSettings?.({
        dismissedAuditorAlerts: [...currentDismissed, newDismissed]
      });
    }
    setConfirmDismissId(null);
  };

  const handleDismissAll = () => {
    const currentDismissed = settings?.dismissedAuditorAlerts || [];
    const newDismissedList = [...currentDismissed];
    
    activeAnomalies.forEach(alertToDismiss => {
      if (!newDismissedList.some(da => da.id === alertToDismiss.id)) {
        newDismissedList.push({
          id: alertToDismiss.id,
          dismissedAt: new Date().toLocaleString('id-ID'),
          dismissedBy: 'Admin',
          title: alertToDismiss.title,
          description: alertToDismiss.description,
          relatedPoNames: alertToDismiss.relatedOrders.map(ro => ro.namaPo || 'Tanpa Nama')
        });
      }
    });

    onUpdateSettings?.({
      dismissedAuditorAlerts: newDismissedList
    });
    setConfirmDismissAll(false);
  };

  const handleRestore = (alertId: string) => {
    const currentDismissed = settings?.dismissedAuditorAlerts || [];
    const updated = currentDismissed.filter(da => da.id !== alertId);
    onUpdateSettings?.({
      dismissedAuditorAlerts: updated
    });
  };

  const renderHistoryModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-slate-900 border border-slate-750 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] overflow-hidden flex flex-col animate-scale-in">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/15 rounded-xl relative border border-indigo-500/20">
              <History className="h-5 w-5 text-indigo-400" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-white">📋 Riwayat Auditor</h3>
              <p className="text-xs text-slate-300 mt-0.5">Daftar seluruh notifikasi yang pernah ditutup / diselesaikan.</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setShowHistoryModal(false)}
            className="text-slate-300 hover:text-white p-1.5 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1.5">
          {dismissedAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center gap-2">
              <History className="h-10 w-10 text-slate-605" style={{ color: '#818cf8' }} />
              <p className="font-extrabold text-xs text-slate-300 uppercase tracking-wider">Belum ada riwayat audit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...dismissedAlerts].reverse().map((da) => (
                <div 
                  key={da.id}
                  className="p-4 rounded-2xl border bg-slate-950/60 border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[10px] px-2.5 py-0.5 rounded-lg font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-200 border border-indigo-500/30">
                        {da.title}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                        PO: {da.relatedPoNames.join(', ') || '-'}
                      </span>
                    </div>
                    <p className="text-xs text-white leading-relaxed font-medium">
                      {da.description}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="h-3 w-3 text-indigo-400" />
                        Ditutup: {da.dismissedAt}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <User className="h-3 w-3 text-indigo-400" />
                        Oleh: {da.dismissedBy}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestore(da.id)}
                    className="flex items-center gap-1 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-505 text-white hover:text-white font-extrabold text-[11px] rounded-xl transition shrink-0 cursor-pointer border border-indigo-500"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Pulihkan
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => setShowHistoryModal(false)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-xs text-slate-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );

  const renderDismissConfirmModal = () => {
    if (!confirmDismissId) return null;
    return (
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-fade-in no-print">
        <div className="bg-slate-900 border border-slate-750 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-scale-in">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500/15 border border-amber-500/20 p-2 text-amber-400 rounded-xl shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Selesaikan Peringatan</h3>
              <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">Apakah Anda yakin ingin menutup notifikasi ini? Ini hanya akan ditandai sebagai "sudah ditinjau" tanpa menghapus data pesanan.</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <button
              onClick={() => setConfirmDismissId(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-100 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700"
            >
              Batal
            </button>
            <button
              onClick={() => handleDismiss(confirmDismissId)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-xs font-bold transition cursor-pointer border border-rose-550/30"
            >
              Ya, Tutup Notifikasi
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDismissAllConfirmModal = () => {
    if (!confirmDismissAll) return null;
    return (
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-fade-in no-print">
        <div className="bg-slate-900 border border-slate-750 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative animate-scale-in">
          <div className="flex items-start gap-3">
            <div className="bg-rose-500/15 border border-rose-500/20 p-2 text-rose-400 rounded-xl shrink-0">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Tandai Semua Sudah Ditinjau</h3>
              <p className="text-xs text-slate-200 mt-1.5 leading-relaxed">Yakin menutup semua notifikasi Auditor yang masih aktif sekarang?</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 mt-5">
            <button
              onClick={() => setConfirmDismissAll(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-100 rounded-xl text-xs font-bold transition cursor-pointer border border-slate-700"
            >
              Batal
            </button>
            <button
              onClick={() => handleDismissAll()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-550 text-white rounded-xl text-xs font-bold transition cursor-pointer border border-rose-550/30"
            >
              Ya, Tutup Semua
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (activeAnomalies.length === 0) {
    return (
      <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-full text-emerald-400 shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-lg">AI Auditor Internal</h3>
              <p className="text-emerald-400 text-xs font-semibold mt-1">Status: Aman. Tidak terdeteksi anomali fraud, duplikasi, maupun kebocoran kas.</p>
            </div>
          </div>

          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition shrink-0"
          >
            <History className="h-3.5 w-3.5 text-indigo-400" />
            Riwayat Auditor ({dismissedAlerts.length})
          </button>
        </div>

        {/* Modal render logic */}
        {showHistoryModal && renderHistoryModal()}
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
      {/* Background threat visualizer */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/15 border border-rose-500/30 p-2.5 rounded-xl text-rose-450 shrink-0">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex flex-wrap items-center gap-2">
              AI Auditor Internal & Deteksi Fraud
              <span className="text-[10px] px-2.5 py-0.5 bg-rose-600/30 text-rose-100 border border-rose-500/40 rounded-full font-black animate-pulse tracking-wider">
                {activeAnomalies.length} AKTIF
              </span>
            </h2>
            <p className="text-slate-300 text-[11px] mt-1 font-bold">24/7 memindai indikasi manipulasi, duplikasi kas, dan mark-up vendor.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setConfirmDismissAll(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 text-[10.5px] font-extrabold uppercase tracking-wider rounded-xl cursor-pointer transition shadow-md"
          >
            <Check className="h-3.5 w-3.5 text-white" />
            Selesaikan Semua
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-100 border border-slate-700/80 text-[10.5px] font-extrabold uppercase tracking-wider rounded-xl cursor-pointer transition shadow-sm"
          >
            <History className="h-3.5 w-3.5 text-indigo-400" />
            Riwayat ({dismissedAlerts.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeAnomalies.map(alert => (
          <div 
            key={alert.id}
            className={`p-5 rounded-xl border flex flex-col gap-3.5 transition-all relative group ${
              alert.level === 'critical' 
                ? 'bg-[#1c0e10] border-rose-500/40 hover:border-rose-500/50 shadow-xs'
                : 'bg-[#1c1306] border-amber-500/40 hover:border-amber-500/50 shadow-xs'
            }`}
          >
            {/* Dismiss Cross Icon Button */}
            <button
              onClick={() => setConfirmDismissId(alert.id)}
              className="absolute top-3 right-3 text-slate-200 hover:text-white bg-slate-900/80 hover:bg-slate-800 p-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition duration-150 cursor-pointer shadow-xs"
              title="Selesaikan / Tutup"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="flex items-center gap-2.5">
                <div 
                  className="p-2 rounded-xl shrink-0 flex items-center justify-center border"
                  style={{
                    backgroundColor: alert.level === 'critical' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                    borderColor: alert.level === 'critical' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                    color: alert.level === 'critical' ? '#FF5252' : '#FFD166'
                  }}
                >
                  <alert.icon className="h-4.5 w-4.5" />
                </div>
                <span 
                  className="text-xs uppercase tracking-wider font-extrabold"
                  style={{
                    color: alert.level === 'critical' ? '#FF6B6B' : '#FFD166'
                  }}
                >
                  {alert.title}
                </span>
              </div>
            </div>

            <p 
              className="text-xs font-normal"
              style={{ color: 'rgba(255, 255, 255, 0.92)', lineHeight: '1.625' }}
            >
              {alert.description}
            </p>

            <div className="mt-auto pt-3 flex flex-wrap gap-2">
              {alert.relatedOrders.map((ro, i) => (
                <button
                  key={`${alert.id}-ro-${i}`}
                  onClick={() => onSelectOrder(ro)}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-650 hover:border-slate-500 text-white hover:text-amber-200 text-[10.5px] px-3 py-1.5 rounded-xl font-extrabold transition-all duration-150 uppercase tracking-widest cursor-pointer shadow-xs"
                >
                  Cek {ro.namaPo}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Render helper popups/dialogs */}
      {showHistoryModal && renderHistoryModal()}
      {confirmDismissId && renderDismissConfirmModal()}
      {confirmDismissAll && renderDismissAllConfirmModal()}
    </div>
  );
}
