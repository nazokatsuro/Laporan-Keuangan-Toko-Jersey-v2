import React, { useMemo } from 'react';
import { Pesanan } from '../types';
import { formatRupiah } from '../utils';
import { ShieldAlert, AlertOctagon, TrendingUp, FilterX } from 'lucide-react';

interface FraudScannerProps {
  pesananList: Pesanan[];
  onSelectOrder: (pesanan: Pesanan) => void;
}

export default function FraudScanner({ pesananList, onSelectOrder }: FraudScannerProps) {
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
        const poName = orders[0].namaPo || 'Tanpa Name';
        const totalH = orders[0].totalHarga || 0;
        alerts.push({
          id: `dup_${key}`,
          level: 'critical',
          title: 'Indikasi Input Ganda (Duplikasi Transaksi)',
          description: `Terdeteksi ${orders.length} transaksi dengan nama PO identik ("${poName}") dan nominal sama persis (${formatRupiah(totalH)}) pada periode yang sama. Pastikan ini bukan human error atau manipulasi input kas.`,
          icon: FilterX,
          relatedOrders: orders
        });
      }
    });

    // 2. Detect Unreasonable Vendor Costs (Lonjakan Biaya Vendor per Qty)
    const validModalOrders = pesananList.filter(o => (o.qty || 0) > 0 && (o.totalModal || 0) > 0);
    if (validModalOrders.length >= 3) {
      // Calculate Median Cost per Pcs to avoid outlier skewing (mean is sensitive)
      const sortedCostPerPcs = validModalOrders.map(o => (o.totalModal || 0) / (o.qty || 1)).sort((a, b) => a - b);
      const medianIndex = Math.floor(sortedCostPerPcs.length / 2);
      const medianCostPerPcs = sortedCostPerPcs[medianIndex];

      validModalOrders.forEach(item => {
        const itemQty = item.qty || 1;
        const itemTotalModal = item.totalModal || 0;
        const itemCostPerPcs = itemTotalModal / itemQty;
        // If cost per pcs is > 100% higher than the median cost (2x), it's highly anomalous
        if (itemCostPerPcs > medianCostPerPcs * 2 && medianCostPerPcs > 0) {
          alerts.push({
            id: `spike_cost_${item.id}`,
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
          id: `neg_debt_${item.id}`,
          level: 'critical',
          title: 'Anomali Sisa Tagihan Minus',
          description: `PO "${namaPo}" memiliki uang masuk melebihi total harga. Indikasi perubahan data nominal tagihan lampau secara acak tanpa penyesuaian arus kas uang masuk.`,
          icon: AlertOctagon,
          relatedOrders: [item]
        });
      } else if (profit < 0) {
        alerts.push({
          id: `neg_profit_${item.id}`,
          level: 'warning',
          title: 'Peringatan Kebocoran Profit (Minus)',
          description: `PO "${namaPo}" tercatat mengalami kerugian (-${formatRupiah(Math.abs(profit))}). Total modal vendor melebihi harga jual yang disepakati pelanggan.`,
          icon: ShieldAlert,
          relatedOrders: [item]
        });
      }
    });

    return alerts.slice(0, 8); // Top 8 most severe warnings
  }, [pesananList]);

  if (anomalies.length === 0) {
    return (
      <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 flex items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-full text-emerald-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-lg">AI Auditor Internal</h3>
            <p className="text-emerald-400 text-xs font-semibold mt-1">Status: Aman. Tidak terdeteksi anomali fraud, duplikasi, maupun kebocoran kas.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
      {/* Background threat visualizer */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-rose-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="flex flex-col mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-rose-500">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">AI Auditor Internal & Deteksi Fraud</h2>
            <p className="text-slate-400 text-[11px] mt-1 font-bold">24/7 memindai indikasi manipulasi, duplikasi kas, dan mark-up vendor.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {anomalies.map(alert => (
          <div 
            key={alert.id}
            className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
              alert.level === 'critical' 
                ? 'bg-rose-500/5 border-rose-500/30 hover:bg-rose-500/10'
                : 'bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${alert.level === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  <alert.icon className="h-4 w-4" />
                </div>
                <span className={`font-extrabold text-xs uppercase tracking-wider ${alert.level === 'critical' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {alert.title}
                </span>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              {alert.description}
            </p>

            <div className="mt-auto pt-3 flex flex-wrap gap-2">
              {alert.relatedOrders.map((ro, i) => (
                <button
                  key={`${alert.id}-ro-${i}`}
                  onClick={() => onSelectOrder(ro)}
                  className="bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-colors uppercase tracking-wider"
                >
                  Cek {ro.namaPo}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
