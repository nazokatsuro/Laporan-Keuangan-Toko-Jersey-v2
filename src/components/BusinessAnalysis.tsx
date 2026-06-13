/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Pesanan } from '../types';
import { formatRupiah } from '../utils';
import { 
  ShoppingBag, 
  Users, 
  BarChart4, 
  TrendingUp, 
  DollarSign, 
  Box, 
  ShoppingBag as BagIcon,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie,
  LabelList
} from 'recharts';

interface BusinessAnalysisProps {
  pesananList: Pesanan[];
}

type TabType = 'produk' | 'pelanggan';

// Colors for Pie Charts & Bars
const CHART_COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple/Violet
  '#10b981', // Emerald/Hijau
  '#06b6d4', // Cyan
  '#f59e0b', // Amber/Orange
  '#ec4899', // Pink
  '#f43f5e'  // Rose
];

export default function BusinessAnalysis({ pesananList }: BusinessAnalysisProps) {
  const [activeTab, setActiveTab] = useState<TabType>('produk');

  // Multi-facet Product parsing heuristics
  const productData = useMemo(() => {
    // A. Bahan (Materials) statistics
    const bahanCounts: Record<string, number> = {};
    
    // B. Collar Model (Heuristic parsing)
    const collarCounts: Record<string, number> = {
      'O-Neck (Standar)': 0,
      'V-Neck': 0,
      'V-Persikab/kombinasi': 0,
      'V-Daun': 0,
      'V-Daun+Lidah': 0,
      'V+Lidah': 0,
      'O-Neck Kombinasi': 0,
      'Kerah Polo': 0,
      'Kerah Sleting': 0,
      'Kerah Shanghai': 0
    };

    // C. Jersey Type (Heuristic parsing)
    const typeCounts: Record<string, number> = {
      'Jersey Sepak bola/Futsal': 0,
      'Jersey Voli': 0,
      'Jersey Esports': 0,
      'Jersey Badminton': 0,
      'Jersey Lari/Sepeda': 0,
      'Jersey Custom / Casual': 0
    };

    // D. Kategori Produk
    const categoryCounts: Record<string, number> = {
      'Jersey Atletis': 0,
      'Celana Produksi': 0,
      'Jaket / Hoodie': 0,
      'Kaos / Polo': 0
    };

    pesananList.forEach(item => {
      const gQty = item.qty || 1;
      
      // 1. Bahan aggregation
      const rawBahan = (item.bahan || 'Lainnya').trim();
      const cleanBahan = rawBahan.charAt(0).toUpperCase() + rawBahan.slice(1).toLowerCase();
      bahanCounts[cleanBahan] = (bahanCounts[cleanBahan] || 0) + gQty;

      const textBlock = `${item.namaProduk} ${item.keterangan}`.toLowerCase();

      // 2. Classify Collar Type via manual field or fallback heuristic scan
      const manualCollar = (item.modelKerah || '').trim();
      if (manualCollar) {
        let matched = false;
        const lowerC = manualCollar.toLowerCase();
        
        // Exact case-insensitive match against standard keys
        const matchedKey = Object.keys(collarCounts).find(k => k.toLowerCase() === lowerC);
        if (matchedKey) {
          collarCounts[matchedKey] += gQty;
          matched = true;
        } else {
          // Specific fuzzy mappings
          if (lowerC.includes('persikab')) {
            collarCounts['V-Persikab/kombinasi'] += gQty;
            matched = true;
          } else if (lowerC.includes('v-daun+lidah') || (lowerC.includes('daun') && lowerC.includes('lidah'))) {
            collarCounts['V-Daun+Lidah'] += gQty;
            matched = true;
          } else if (lowerC.includes('v-daun') || lowerC.includes('daun')) {
            collarCounts['V-Daun'] += gQty;
            matched = true;
          } else if (lowerC.includes('v+lidah') || lowerC.includes('v + lidah') || lowerC.includes('vlidah')) {
            collarCounts['V+Lidah'] += gQty;
            matched = true;
          } else if (lowerC.includes('sleting') || lowerC.includes('zipper') || lowerC.includes('resleting')) {
            collarCounts['Kerah Sleting'] += gQty;
            matched = true;
          } else if (lowerC.includes('o-neck kombinasi') || lowerC.includes('neck kombinasi') || (lowerC.includes('o') && lowerC.includes('kombinasi'))) {
            collarCounts['O-Neck Kombinasi'] += gQty;
            matched = true;
          } else if (lowerC.includes('o-neck') || lowerC.includes('o neck') || lowerC.includes('bulat') || lowerC.includes('o_neck')) {
            collarCounts['O-Neck (Standar)'] += gQty;
            matched = true;
          } else if (lowerC.includes('v-neck') || lowerC.includes('v neck') || lowerC.includes('lancip') || lowerC.includes('v')) {
            collarCounts['V-Neck'] += gQty;
            matched = true;
          } else if (lowerC.includes('shanghai') || lowerC.includes('sanghai') || lowerC.includes('koko')) {
            collarCounts['Kerah Shanghai'] += gQty;
            matched = true;
          } else if (lowerC.includes('polo') || lowerC.includes('wangky') || lowerC.includes('lipat')) {
            collarCounts['Kerah Polo'] += gQty;
            matched = true;
          }
        }
        
        if (!matched) {
          // Capitalize and add customized collar type dynamically
          const formattedCollar = manualCollar.charAt(0).toUpperCase() + manualCollar.slice(1);
          collarCounts[formattedCollar] = (collarCounts[formattedCollar] || 0) + gQty;
        }
      } else {
        // Fallback heuristic based on text description
        if (textBlock.includes('o-neck kombinasi') || textBlock.includes('neck-kombinasi')) {
          collarCounts['O-Neck Kombinasi'] += gQty;
        } else if (textBlock.includes('persikab')) {
          collarCounts['V-Persikab/kombinasi'] += gQty;
        } else if (textBlock.includes('v-daun+lidah')) {
          collarCounts['V-Daun+Lidah'] += gQty;
        } else if (textBlock.includes('v-daun')) {
          collarCounts['V-Daun'] += gQty;
        } else if (textBlock.includes('v+lidah')) {
          collarCounts['V+Lidah'] += gQty;
        } else if (textBlock.includes('sleting') || textBlock.includes('resleting')) {
          collarCounts['Kerah Sleting'] += gQty;
        } else if (textBlock.includes('o-neck') || textBlock.includes('o neck') || textBlock.includes('kerah bulat') || textBlock.includes('o_neck')) {
          collarCounts['O-Neck (Standar)'] += gQty;
        } else if (textBlock.includes('v-neck') || textBlock.includes('v neck') || textBlock.includes('lancip') || textBlock.includes('kerah v')) {
          collarCounts['V-Neck'] += gQty;
        } else if (textBlock.includes('shanghai') || textBlock.includes('sanghai') || textBlock.includes('koko')) {
          collarCounts['Kerah Shanghai'] += gQty;
        } else if (textBlock.includes('polo') || textBlock.includes('wangky') || textBlock.includes('kerah lipat')) {
          collarCounts['Kerah Polo'] += gQty;
        } else {
          // Fall back to general O-Neck (Standar) safely without artificial noise
          collarCounts['O-Neck (Standar)'] += gQty;
        }
      }

      // 3. Classify Jersey Type
      if (textBlock.includes('futsal') || textBlock.includes('bola') || textBlock.includes('soccer') || textBlock.includes('garuda') || textBlock.includes('persib')) {
        typeCounts['Jersey Sepak bola/Futsal'] += gQty;
      } else if (textBlock.includes('voli') || textBlock.includes('volley') || textBlock.includes('srikandi')) {
        typeCounts['Jersey Voli'] += gQty;
      } else if (textBlock.includes('esport') || textBlock.includes('gaming') || textBlock.includes('legend') || textBlock.includes('hoodie gaming')) {
        typeCounts['Jersey Esports'] += gQty;
      } else if (textBlock.includes('badminton') || textBlock.includes('bulu tangkis') || textBlock.includes('bulutangkis')) {
        typeCounts['Jersey Badminton'] += gQty;
      } else if (textBlock.includes('sepeda') || textBlock.includes('gowes') || textBlock.includes('lari') || textBlock.includes('running')) {
        typeCounts['Jersey Lari/Sepeda'] += gQty;
      } else {
        typeCounts['Jersey Custom / Casual'] += gQty;
      }

      // 4. Classify Category
      const pName = item.namaProduk.toLowerCase();
      if (pName.includes('hoodie') || pName.includes('jaket') || pName.includes('sweater') || pName.includes('zipper')) {
        categoryCounts['Jaket / Hoodie'] += gQty;
      } else if (pName.includes('celana') || pName.includes('shorts') || pName.includes('pants')) {
        categoryCounts['Celana Produksi'] += gQty;
      } else if (pName.includes('kaos') || pName.includes('t-shirt') || pName.includes('tshirt') || pName.includes('polo')) {
        categoryCounts['Kaos / Polo'] += gQty;
      } else {
        categoryCounts['Jersey Atletis'] += gQty;
      }
    });

    // Materials sorted descending
    const bahanList = Object.entries(bahanCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const collarList = Object.entries(collarCounts)
      .map(([name, value]) => ({ name, value }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value);

    const typeList = Object.entries(typeCounts)
      .map(([name, value]) => ({ name, value }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value);

    const categoryList = Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      bahan: bahanList,
      collar: collarList,
      jerseyType: typeList,
      category: categoryList
    };
  }, [pesananList]);

  // Customer Profit & Stats analytics logic (grouped by customer name)
  const customerAnalytics = useMemo(() => {
    const clients: Record<string, {
      namaPemesan: string;
      noTelepon: string;
      totalOmset: number;
      totalModal: number;
      totalProfit: number;
      jumlahOrder: number;
    }> = {};

    pesananList.forEach(item => {
      const clientName = (item.namaPemesan || 'Pelanggan Lokal').trim();
      if (!clients[clientName]) {
        clients[clientName] = {
          namaPemesan: clientName,
          noTelepon: item.noTelepon || '',
          totalOmset: 0,
          totalModal: 0,
          totalProfit: 0,
          jumlahOrder: 0
        };
      }
      
      clients[clientName].totalOmset += item.totalHarga || 0;
      clients[clientName].totalModal += item.totalModal || 0;
      clients[clientName].totalProfit += item.profit || 0;
      clients[clientName].jumlahOrder += 1;
    });

    const clientArrayList = Object.values(clients).map(c => {
      return {
        ...c,
        rataRataNilaiOrder: c.totalOmset / c.jumlahOrder
      };
    });

    // Rank based on Omset
    const rankByOmset = [...clientArrayList].sort((a, b) => b.totalOmset - a.totalOmset);
    
    // Rank based on Profit
    const rankByProfit = [...clientArrayList].sort((a, b) => b.totalProfit - a.totalProfit);

    return {
      byOmset: rankByOmset,
      byProfit: rankByProfit,
      rawList: clientArrayList
    };
  }, [pesananList]);

  // Combined horizontal chart data of top customers
  const customerChartData = useMemo(() => {
    // Take top 5 customers by Profit
    return customerAnalytics.byProfit.slice(0, 5).map(c => ({
      name: c.namaPemesan.length > 20 ? c.namaPemesan.substring(0, 18) + '..' : c.namaPemesan,
      Omset: c.totalOmset,
      Keuntungan: c.totalProfit
    }));
  }, [customerAnalytics]);

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Top Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <span className="p-2 rounded-lg bg-violet-500/10 text-violet-500 dark:text-violet-400">
              <BarChart4 className="h-5 w-5" />
            </span>
            Analisa Bisnis Jersey
          </h2>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
            Data analitik performa untuk menganalisa minat bahan jersey, kerah terlaris, serta loyalitas profitabilitas pelanggan Anda.
          </p>
        </div>

        {/* Tab selector controllers */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-201/50 dark:border-slate-800 shrink-0 select-none">
          <button
            onClick={() => setActiveTab('produk')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'produk' 
                ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-3xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Analisa Produk
          </button>
          <button
            onClick={() => setActiveTab('pelanggan')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'pelanggan' 
                ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-white shadow-3xs' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Profitabilitas Pelanggan
          </button>
        </div>
      </div>

      {/* Render TAB 1: PRODUCT ANALYSIS */}
      {activeTab === 'produk' && (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
          
          {/* Main Visual Stats Charts block in grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Top Materials Chart */}
            <div className="bg-white dark:bg-slate-805 p-5 rounded-2xl border border-slate-100 dark:border-slate-755/60 shadow-3xs flex flex-col justify-between">
              <div className="border-b border-slate-105 dark:border-slate-700/60 pb-3 mb-4 flex justify-between items-center select-none">
                <h3 className="font-extrabold text-xs uppercase text-slate-450 tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-505" />
                  Analisa Bahan Terlaris (Qty Pcs)
                </h3>
              </div>
              <div className="h-56 w-full">
                {productData.bahan.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-450 text-xs italic">
                    Belum ada data bahan terekam di PO.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productData.bahan}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                        formatter={(val) => [`${val} Pcs`, 'Jumlah Terjual']}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]}>
                        {productData.bahan.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Box 2: Top Neck Collar Styles Pie Chart */}
            <div className="bg-white dark:bg-slate-805 p-5 rounded-2xl border border-slate-100 dark:border-slate-755/60 shadow-3xs flex flex-col justify-between">
              <div className="border-b border-slate-105 dark:border-slate-700/60 pb-3 mb-4 flex justify-between items-center select-none">
                <h3 className="font-extrabold text-xs uppercase text-slate-450 tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-purple-505" />
                  Morfologi Model Kerah
                </h3>
              </div>
              <div className="h-56 w-full flex flex-col md:flex-row items-center justify-around">
                {productData.collar.length === 0 ? (
                  <div className="text-slate-450 text-xs italic">
                    Belum ada spesifikasi pesanan.
                  </div>
                ) : (
                  <>
                    <div className="h-44 w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                            formatter={(val) => [`${val} Pcs`, 'Kuantitas']}
                          />
                          <Pie
                            data={productData.collar}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {productData.collar.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 1) % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0 text-[10px] w-full md:w-1/2 md:pl-4">
                      {productData.collar.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between font-bold">
                          <div className="flex items-center gap-1.5 text-slate-650 dark:text-slate-350 truncate max-w-[140px]">
                            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS[(index + 1) % CHART_COLORS.length] }} />
                            <span className="truncate" title={item.name}>{item.name}</span>
                          </div>
                          <span className="font-mono text-slate-800 dark:text-slate-100">{item.value} Pcs</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Box 3: Jersey Activity Segment Type */}
            <div className="bg-white dark:bg-slate-805 p-5 rounded-2xl border border-slate-100 dark:border-slate-755/60 shadow-3xs flex flex-col justify-between">
              <div className="border-b border-slate-105 dark:border-slate-700/60 pb-3 mb-4 flex justify-between items-center select-none">
                <h3 className="font-extrabold text-xs uppercase text-slate-450 tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-505" />
                  Kategori Cabang Jersey Terpopuler
                </h3>
              </div>
              <div className="h-56 w-full">
                {productData.jerseyType.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-450 text-xs italic">
                    Belum ada klasifikasi olahraga terekam.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productData.jerseyType} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.08} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={8} fontWeight="bold" width={110} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                        formatter={(val) => [`${val} Pcs`, 'Total Produksi']}
                      />
                      <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]}>
                        {productData.jerseyType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Box 4: Product Category Distribution */}
            <div className="bg-white dark:bg-slate-805 p-5 rounded-2xl border border-slate-100 dark:border-slate-755/60 shadow-3xs flex flex-col justify-between">
              <div className="border-b border-slate-105 dark:border-slate-700/60 pb-3 mb-4 flex justify-between items-center select-none">
                <h3 className="font-extrabold text-xs uppercase text-slate-450 tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-505" />
                  Portofolio Kategori Pakaian Produksi
                </h3>
              </div>
              <div className="h-56 w-full flex flex-col md:flex-row items-center justify-around">
                {productData.category.length === 0 ? (
                  <div className="text-slate-450 text-xs italic">
                    Belum ada sasis kategori.
                  </div>
                ) : (
                  <>
                    <div className="h-44 w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                            formatter={(val) => [`${val} Pcs`, 'Pcs Diproduksi']}
                          />
                          <Pie
                            data={productData.category}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {productData.category.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0 text-[10px] w-full md:w-1/2 md:pl-4">
                      {productData.category.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between font-bold">
                          <div className="flex items-center gap-1.5 text-slate-650 dark:text-slate-350 truncate max-w-[140px]">
                            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS[(index + 3) % CHART_COLORS.length] }} />
                            <span className="truncate">{item.name}</span>
                          </div>
                          <span className="font-mono text-slate-800 dark:text-slate-100">{item.value} Pcs</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Simple summary insights footer */}
          <div className="p-4 sm:p-5 bg-indigo-500/5 dark:bg-indigo-950/10 rounded-2xl border border-indigo-150 dark:border-indigo-900/40 text-xs text-indigo-805 dark:text-indigo-305 flex gap-3">
            <Info className="h-5 w-5 text-indigo-550 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-extrabold block">Bahan Pilihan Utama Workshop:</strong>
              <p className="mt-1 leading-relaxed text-slate-550 dark:text-slate-400">
                {productData.bahan.length > 0 
                  ? `Bahan kain *${productData.bahan[0]?.name || '-'}* saat ini mendominasi pesanan dengan total produksi sejumlah *${productData.bahan[0]?.value || 0} Pcs*, diikuti oleh *${productData.bahan[1]?.name || 'kategori lain'}*. Pertimbangkan untuk menambah persediaan bahan baku kain ini guna memperlancar kesiapan pasokan.`
                  : 'Sistem sedang membaca database pesanan. Pastikan terdapat minimal satu pesanan aktif untuk menampilkan evaluasi logistik.'
                }
              </p>
            </div>
          </div>

        </div>
      )}

      {/* Render TAB 2: CLIENT PROFITABILITY ANALYTICS */}
      {activeTab === 'pelanggan' && (
        <div className="space-y-6 md:space-y-8 animate-fade-in text-xs">
          
          {/* Top 5 Horizontal Chart ranking comparing Income (Omset) against Profit (Keuntungan) */}
          <div className="bg-white dark:bg-slate-805 p-5 rounded-2xl border border-slate-105 dark:border-slate-755/50 shadow-3xs">
            <div className="border-b border-slate-105 dark:border-slate-700/60 pb-3 mb-4 select-none">
              <h3 className="font-extrabold text-xs uppercase text-slate-450 tracking-wider flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-605" />
                Top 5 Pelanggan Berdasarkan Profitabilitas (Rp Keuntungan)
              </h3>
            </div>

            <div className="h-60 sm:h-72 w-full">
              {customerChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 italic">
                  Belum ada transaksi historis pelanggan.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.08} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={9} fontWeight="bold" tickLine={false} tickFormatter={(v) => `Rp ${v / 1000}k`} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={8} fontWeight="bold" ticks={customerChartData.map(d => d.name)} tickLine={false} width={120} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                      formatter={(val) => [formatRupiah(Number(val)), '']}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                    <Bar dataKey="Omset" fill="#818cf8" radius={[0, 4, 4, 0]} name="Total Omset" />
                    <Bar dataKey="Keuntungan" fill="#10b981" radius={[0, 4, 4, 0]} name="Keuntungan Bersih" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Core Table ranking containing extensive metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Table block 1: Top Pelanggan Berdasarkan Omset */}
            <div className="bg-white dark:bg-slate-805 rounded-2xl border border-slate-100 dark:border-slate-755/60 shadow-3xs overflow-hidden">
              <div className="px-4.5 py-3.5 border-b border-slate-105 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 font-black text-[10px] text-slate-450 uppercase tracking-widest flex items-center justify-between select-none">
                <span>Top Pelanggan Berdasarkan Omset</span>
                <span className="text-[9px] font-bold text-slate-400">Total Transaksi</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-750/50">
                {customerAnalytics.byOmset.length === 0 ? (
                  <div className="py-8 text-center text-slate-450 italic">Tidak ada rincian pelanggan.</div>
                ) : (
                  customerAnalytics.byOmset.slice(0, 6).map((item, index) => (
                    <div key={item.namaPemesan} className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`h-6 w-6 shrink-0 flex items-center justify-center font-black rounded-lg text-[10px] ${
                          index === 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                          index === 1 ? 'bg-slate-300/35 text-slate-600 dark:text-slate-400' :
                          index === 2 ? 'bg-amber-650/15 text-amber-700 dark:text-amber-500' :
                          'bg-slate-100 dark:bg-slate-900 text-slate-550'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-950 dark:text-white capitalize">{item.namaPemesan}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-450 mt-0.5 font-semibold">
                            <span>{item.jumlahOrder} x Order</span>
                            <span>•</span>
                            <span>Rata-rata: {formatRupiah(item.rataRataNilaiOrder)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-black text-slate-950 dark:text-white text-xs tabular-nums">
                          {formatRupiah(item.totalOmset)}
                        </p>
                        <p className="text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          Profit: {formatRupiah(item.totalProfit)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Table block 2: Top Pelanggan Berdasarkan Keuntungan */}
            <div className="bg-white dark:bg-slate-805 rounded-2xl border border-slate-100 dark:border-slate-755/60 shadow-3xs overflow-hidden">
              <div className="px-4.5 py-3.5 border-b border-slate-105 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 font-black text-[10px] text-slate-450 uppercase tracking-widest flex items-center justify-between select-none">
                <span>Top Pelanggan Berdasarkan Profit</span>
                <span className="text-[9px] font-bold text-slate-400">Total Keuntungan</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-750/50">
                {customerAnalytics.byProfit.length === 0 ? (
                  <div className="py-8 text-center text-slate-450 italic">Tidak ada rincian profit pelanggan.</div>
                ) : (
                  customerAnalytics.byProfit.slice(0, 6).map((item, index) => (
                    <div key={item.namaPemesan} className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-900/35 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`h-6 w-6 shrink-0 flex items-center justify-center font-black rounded-lg text-[10px] ${
                          index === 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                          index === 1 ? 'bg-indigo-300/35 text-indigo-600 dark:text-indigo-400' :
                          index === 2 ? 'bg-indigo-650/15 text-indigo-700 dark:text-indigo-500' :
                          'bg-slate-100 dark:bg-slate-900 text-slate-550'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-950 dark:text-white capitalize">{item.namaPemesan}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-450 mt-0.5 font-semibold">
                            <span>{item.jumlahOrder} x Order</span>
                            <span>•</span>
                            <span className="font-mono">{item.noTelepon || '-'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs tabular-nums">
                          {formatRupiah(item.totalProfit)}
                        </p>
                        <p className="text-[9.5px] font-semibold text-slate-450 mt-0.5">
                          Omset: {formatRupiah(item.totalOmset)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Insight Alert Card */}
          <div className="bg-amber-500/5 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/40 p-4 rounded-2xl flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-550 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-slate-550 dark:text-slate-450 leading-relaxed font-semibold">
              <strong className="text-slate-950 dark:text-white block font-extrabold">Rekomendasi Skema Hubungan Pelanggan (CRM):</strong>
              Pelanggan dengan indeks profitabilitas tertinggi di atas memberikan tingkat imbal balik modal paling efisien bagi bisnis Anda. Berikan kupon dedikasi, penawaran prioritas, atau diskon khusus pengiriman berkala bagi pelanggan top tier agar mereka terus mempercayakan pengerjaan seragam tim olahraga mereka ke Nomaden Apparel.
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
