/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { Pesanan, ShopSettings } from '../../types';
import { formatRupiah, checkOrderPaymentStatus } from '../../utils';
import { 
  Scissors, 
  Layers, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Phone,
  ShieldCheck,
  ReceiptText,
  Clock
} from 'lucide-react';

export type VendorPayableCategory = 'semua' | 'jahit' | 'sublim' | 'komisi';
export type VendorStatusFilter = 'semua' | 'belum_lunas' | 'lunas';

export interface VendorPayablesCardProps {
  orders: Pesanan[];
  settings: ShopSettings;
  category: VendorPayableCategory;
  statusFilter?: VendorStatusFilter;
  vendorNameFilter?: string;
  documentNumber?: string;
  customNotes?: string;
  className?: string;
  id?: string;
}

export const VendorPayablesCard = forwardRef<HTMLDivElement, VendorPayablesCardProps>(
  function VendorPayablesCard(
    {
      orders,
      settings,
      category,
      statusFilter = 'semua',
      vendorNameFilter = '',
      documentNumber,
      customNotes,
      className = '',
      id
    },
    ref
  ) {
    // Process and group orders by PO with full status tracking
    interface ProcessedItem {
      itemId: string;
      namaProduk: string;
      bahan: string;
      modelKerah: string;
      catatanJahit: string;
      keterangan: string;
      qty: number;
      jahitPerPcs: number;
      printPerPcs: number;
      komisiPerPcs: number;
      totalJahit: number;
      totalSublim: number;
      totalKomisi: number;
      vendorJahit: string;
      vendorSublim: string;
      penerimaKomisi: string;
      isJahitLunas: boolean;
      isSublimLunas: boolean;
      isKomisiLunas: boolean;
      
      // Category specific values
      cost: number;
      paid: number;
      unpaid: number;
      status: 'Lunas' | 'Belum Lunas' | 'Sebagian Lunas';
    }

    interface ProcessedOrder {
      orderId: string;
      namaPo: string;
      namaPemesan: string;
      noTelepon: string;
      deadline: string;
      createdAt: string;
      items: ProcessedItem[];
      totalQty: number;
      totalCost: number;
      totalPaid: number;
      totalUnpaid: number;
      orderStatus: 'Lunas' | 'Belum Lunas' | 'Sebagian Lunas';
      
      sumJahit: number;
      sumJahitPaid: number;
      sumJahitUnpaid: number;
      
      sumSublim: number;
      sumSublimPaid: number;
      sumSublimUnpaid: number;
      
      sumKomisi: number;
      sumKomisiPaid: number;
      sumKomisiUnpaid: number;
    }

    const groupedOrders: ProcessedOrder[] = [];

    orders.forEach((order, oIdx) => {
      let rawItems: ProcessedItem[] = [];

      if (order.items && order.items.length > 0) {
        rawItems = order.items.map((item, iIdx) => {
          const qty = Number(item.qty) || 0;
          const jahitPerPcs = Number(item.jahitPerPcs ?? order.jahitPerPcs ?? 0);
          const printPerPcs = Number(item.printPerPcs ?? order.printPerPcs ?? 0);
          const komisiPerPcs = Number(item.komisiPerPcs ?? order.komisiPerPcs ?? 0);
          
          const totalJahit = qty * jahitPerPcs;
          const totalSublim = qty * printPerPcs;
          const totalKomisi = qty * komisiPerPcs;

          const vendorJahit = item.vendorJahit || order.vendorJahit || 'Penjahit / Konveksi';
          const vendorSublim = item.vendorSublim || order.vendorSublim || 'Vendor Print Sublim';
          const penerimaKomisi = item.penerimaKomisi || order.penerimaKomisi || 'Penerima Komisi';

          const paymentStatus = checkOrderPaymentStatus(order, settings.cashFlowList, orders);
          const isJahitLunas = item.statusBayarJahit === 'Lunas' 
            || (item.statusBayarJahit !== 'Belum Lunas' && (order.statusBayarJahit === 'Lunas' || (order.statusBayarJahit !== 'Belum Lunas' && paymentStatus.isJahitPaid)));
          const isSublimLunas = item.statusBayarSublim === 'Lunas' 
            || (item.statusBayarSublim !== 'Belum Lunas' && (order.statusBayarSublim === 'Lunas' || (order.statusBayarSublim !== 'Belum Lunas' && paymentStatus.isSublimPaid)));
          const isKomisiLunas = item.statusBayarKomisi === 'Lunas' 
            || (item.statusBayarKomisi !== 'Belum Lunas' && (order.statusBayarKomisi === 'Lunas' || (order.statusBayarKomisi !== 'Belum Lunas' && paymentStatus.isKomisiPaid)));

          // Category-specific calculation
          let cost = 0;
          let paid = 0;
          let unpaid = 0;
          let status: 'Lunas' | 'Belum Lunas' | 'Sebagian Lunas' = 'Belum Lunas';

          if (category === 'jahit') {
            cost = totalJahit;
            paid = isJahitLunas ? totalJahit : 0;
            unpaid = isJahitLunas ? 0 : totalJahit;
            status = isJahitLunas ? 'Lunas' : 'Belum Lunas';
          } else if (category === 'sublim') {
            cost = totalSublim;
            paid = isSublimLunas ? totalSublim : 0;
            unpaid = isSublimLunas ? 0 : totalSublim;
            status = isSublimLunas ? 'Lunas' : 'Belum Lunas';
          } else if (category === 'komisi') {
            cost = totalKomisi;
            paid = isKomisiLunas ? totalKomisi : 0;
            unpaid = isKomisiLunas ? 0 : totalKomisi;
            status = isKomisiLunas ? 'Lunas' : 'Belum Lunas';
          } else {
            // 'semua'
            cost = totalJahit + totalSublim + totalKomisi;
            paid = (isJahitLunas ? totalJahit : 0) + (isSublimLunas ? totalSublim : 0) + (isKomisiLunas ? totalKomisi : 0);
            unpaid = cost - paid;
            if (unpaid <= 0 && cost > 0) {
              status = 'Lunas';
            } else if (paid > 0 && unpaid > 0) {
              status = 'Sebagian Lunas';
            } else {
              status = 'Belum Lunas';
            }
          }

          return {
            itemId: item.id || `item-${oIdx}-${iIdx}`,
            namaProduk: (item.namaProduk || order.namaProduk || 'Jersey Custom').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim(),
            bahan: item.bahan || order.bahan || 'Polyester Dryfit',
            modelKerah: item.modelKerah || order.modelKerah || 'O-Neck (Standar)',
            catatanJahit: (item.catatanJahit || (order.items && order.items.length === 1 ? order.catatanJahit : '') || '-').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim(),
            keterangan: (item.keterangan || (order.items && order.items.length === 1 ? order.keterangan : '') || '-').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim(),
            qty,
            jahitPerPcs,
            printPerPcs,
            komisiPerPcs,
            totalJahit,
            totalSublim,
            totalKomisi,
            vendorJahit,
            vendorSublim,
            penerimaKomisi,
            isJahitLunas,
            isSublimLunas,
            isKomisiLunas,
            cost,
            paid,
            unpaid,
            status
          };
        });
      } else {
        const qty = Number(order.qty) || 0;
        const jahitPerPcs = Number(order.jahitPerPcs) || 0;
        const printPerPcs = Number(order.printPerPcs) || 0;
        const komisiPerPcs = Number(order.komisiPerPcs) || 0;

        const totalJahit = qty * jahitPerPcs;
        const totalSublim = qty * printPerPcs;
        const totalKomisi = qty * komisiPerPcs;

        const vendorJahit = order.vendorJahit || 'Penjahit / Konveksi';
        const vendorSublim = order.vendorSublim || 'Vendor Print Sublim';
        const penerimaKomisi = order.penerimaKomisi || 'Penerima Komisi';

        const paymentStatus = checkOrderPaymentStatus(order, settings.cashFlowList, orders);
        const isJahitLunas = order.statusBayarJahit === 'Lunas' || (order.statusBayarJahit !== 'Belum Lunas' && paymentStatus.isJahitPaid);
        const isSublimLunas = order.statusBayarSublim === 'Lunas' || (order.statusBayarSublim !== 'Belum Lunas' && paymentStatus.isSublimPaid);
        const isKomisiLunas = order.statusBayarKomisi === 'Lunas' || (order.statusBayarKomisi !== 'Belum Lunas' && paymentStatus.isKomisiPaid);

        let cost = 0;
        let paid = 0;
        let unpaid = 0;
        let status: 'Lunas' | 'Belum Lunas' | 'Sebagian Lunas' = 'Belum Lunas';

        if (category === 'jahit') {
          cost = totalJahit;
          paid = isJahitLunas ? totalJahit : 0;
          unpaid = isJahitLunas ? 0 : totalJahit;
          status = isJahitLunas ? 'Lunas' : 'Belum Lunas';
        } else if (category === 'sublim') {
          cost = totalSublim;
          paid = isSublimLunas ? totalSublim : 0;
          unpaid = isSublimLunas ? 0 : totalSublim;
          status = isSublimLunas ? 'Lunas' : 'Belum Lunas';
        } else if (category === 'komisi') {
          cost = totalKomisi;
          paid = isKomisiLunas ? totalKomisi : 0;
          unpaid = isKomisiLunas ? 0 : totalKomisi;
          status = isKomisiLunas ? 'Lunas' : 'Belum Lunas';
        } else {
          cost = totalJahit + totalSublim + totalKomisi;
          paid = (isJahitLunas ? totalJahit : 0) + (isSublimLunas ? totalSublim : 0) + (isKomisiLunas ? totalKomisi : 0);
          unpaid = cost - paid;
          if (unpaid <= 0 && cost > 0) {
            status = 'Lunas';
          } else if (paid > 0 && unpaid > 0) {
            status = 'Sebagian Lunas';
          } else {
            status = 'Belum Lunas';
          }
        }

        rawItems = [{
          itemId: `order-${order.id}`,
          namaProduk: (order.namaProduk || 'Jersey Custom').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim(),
          bahan: order.bahan || 'Polyester Dryfit',
          modelKerah: order.modelKerah || 'O-Neck (Standar)',
          catatanJahit: (order.catatanJahit || '-').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim(),
          keterangan: (order.keterangan || '-').replace(/\[Item\s*\d+\]:?\s*/gi, '').trim(),
          qty,
          jahitPerPcs,
          printPerPcs,
          komisiPerPcs,
          totalJahit,
          totalSublim,
          totalKomisi,
          vendorJahit,
          vendorSublim,
          penerimaKomisi,
          isJahitLunas,
          isSublimLunas,
          isKomisiLunas,
          cost,
          paid,
          unpaid,
          status
        }];
      }

      // Filter matching items per category and vendorNameFilter
      const matchingItems = rawItems.filter(row => {
        // Vendor name filter
        if (vendorNameFilter) {
          const needle = vendorNameFilter.toLowerCase();
          if (category === 'jahit' && !row.vendorJahit.toLowerCase().includes(needle)) return false;
          if (category === 'sublim' && !row.vendorSublim.toLowerCase().includes(needle)) return false;
          if (category === 'komisi' && !row.penerimaKomisi.toLowerCase().includes(needle)) return false;
          if (category === 'semua' && 
              !row.vendorJahit.toLowerCase().includes(needle) && 
              !row.vendorSublim.toLowerCase().includes(needle) && 
              !row.penerimaKomisi.toLowerCase().includes(needle)) {
            return false;
          }
        }

        // Relevant cost check
        if (category === 'jahit' && row.totalJahit <= 0) return false;
        if (category === 'sublim' && row.totalSublim <= 0) return false;
        if (category === 'komisi' && row.totalKomisi <= 0) return false;
        if (category === 'semua' && row.cost <= 0) return false;

        // Payment status filter
        if (statusFilter === 'belum_lunas') {
          if (row.unpaid <= 0) return false;
        } else if (statusFilter === 'lunas') {
          if (row.unpaid > 0) return false;
        }

        return true;
      });

      if (matchingItems.length > 0) {
        const totalQty = matchingItems.reduce((sum, it) => sum + it.qty, 0);
        const totalCost = matchingItems.reduce((sum, it) => sum + it.cost, 0);
        const totalPaid = matchingItems.reduce((sum, it) => sum + it.paid, 0);
        const totalUnpaid = matchingItems.reduce((sum, it) => sum + it.unpaid, 0);

        let orderStatus: 'Lunas' | 'Belum Lunas' | 'Sebagian Lunas' = 'Belum Lunas';
        if (totalUnpaid <= 0 && totalCost > 0) {
          orderStatus = 'Lunas';
        } else if (totalPaid > 0 && totalUnpaid > 0) {
          orderStatus = 'Sebagian Lunas';
        }

        const sumJahit = matchingItems.reduce((sum, it) => sum + it.totalJahit, 0);
        const sumJahitPaid = matchingItems.reduce((sum, it) => sum + (it.isJahitLunas ? it.totalJahit : 0), 0);
        const sumJahitUnpaid = matchingItems.reduce((sum, it) => sum + (!it.isJahitLunas ? it.totalJahit : 0), 0);

        const sumSublim = matchingItems.reduce((sum, it) => sum + it.totalSublim, 0);
        const sumSublimPaid = matchingItems.reduce((sum, it) => sum + (it.isSublimLunas ? it.totalSublim : 0), 0);
        const sumSublimUnpaid = matchingItems.reduce((sum, it) => sum + (!it.isSublimLunas ? it.totalSublim : 0), 0);

        const sumKomisi = matchingItems.reduce((sum, it) => sum + it.totalKomisi, 0);
        const sumKomisiPaid = matchingItems.reduce((sum, it) => sum + (it.isKomisiLunas ? it.totalKomisi : 0), 0);
        const sumKomisiUnpaid = matchingItems.reduce((sum, it) => sum + (!it.isKomisiLunas ? it.totalKomisi : 0), 0);

        groupedOrders.push({
          orderId: order.id,
          namaPo: order.namaPo,
          namaPemesan: order.namaPemesan,
          noTelepon: order.noTelepon,
          deadline: order.deadline,
          createdAt: order.createdAt,
          items: matchingItems,
          totalQty,
          totalCost,
          totalPaid,
          totalUnpaid,
          orderStatus,
          sumJahit,
          sumJahitPaid,
          sumJahitUnpaid,
          sumSublim,
          sumSublimPaid,
          sumSublimUnpaid,
          sumKomisi,
          sumKomisiPaid,
          sumKomisiUnpaid
        });
      }
    });

    // Grand totals across all processed orders
    const totalOrdersCount = groupedOrders.length;
    const totalPcsAll = groupedOrders.reduce((sum, g) => sum + g.totalQty, 0);
    const grandTotalCost = groupedOrders.reduce((sum, g) => sum + g.totalCost, 0);
    const grandTotalPaid = groupedOrders.reduce((sum, g) => sum + g.totalPaid, 0);
    const grandTotalUnpaid = groupedOrders.reduce((sum, g) => sum + g.totalUnpaid, 0);

    const paidOrdersCount = groupedOrders.filter(g => g.totalUnpaid <= 0).length;
    const unpaidOrdersCount = groupedOrders.filter(g => g.totalUnpaid > 0).length;

    // Breakdown aggregates for 'semua'
    const grandSumJahit = groupedOrders.reduce((sum, g) => sum + g.sumJahit, 0);
    const grandSumJahitPaid = groupedOrders.reduce((sum, g) => sum + g.sumJahitPaid, 0);
    const grandSumJahitUnpaid = groupedOrders.reduce((sum, g) => sum + g.sumJahitUnpaid, 0);

    const grandSumSublim = groupedOrders.reduce((sum, g) => sum + g.sumSublim, 0);
    const grandSumSublimPaid = groupedOrders.reduce((sum, g) => sum + g.sumSublimPaid, 0);
    const grandSumSublimUnpaid = groupedOrders.reduce((sum, g) => sum + g.sumSublimUnpaid, 0);

    const grandSumKomisi = groupedOrders.reduce((sum, g) => sum + g.sumKomisi, 0);
    const grandSumKomisiPaid = groupedOrders.reduce((sum, g) => sum + g.sumKomisiPaid, 0);
    const grandSumKomisiUnpaid = groupedOrders.reduce((sum, g) => sum + g.sumKomisiUnpaid, 0);

    // Dynamic Title & Badge styling based on category
    const titleConfig = {
      jahit: {
        title: 'NOTA TAGIHAN ONGKOS JAHIT',
        subtitle: 'Rincian Status Pembayaran & Sisa Tagihan Ongkos Jahit Konveksi',
        icon: Scissors,
        colorClass: 'text-amber-700 bg-amber-50 border-amber-300',
        roleSignLeft: 'Penjahit / Vendor Jahit',
        roleSignRight: 'Manajemen Toko (Owner)'
      },
      sublim: {
        title: 'NOTA TAGIHAN ONGKOS PRINT & PRESS SUBLIM',
        subtitle: 'Rincian Status Pembayaran & Sisa Tagihan Ongkos Cetak / Sublimasi Printing',
        icon: Layers,
        colorClass: 'text-sky-700 bg-sky-50 border-sky-300',
        roleSignLeft: 'Vendor Print & Press Sublim',
        roleSignRight: 'Manajemen Toko (Owner)'
      },
      komisi: {
        title: 'NOTA TAGIHAN KOMISI & MARKETING FEE',
        subtitle: 'Rincian Status Pembayaran & Sisa Tagihan Komisi Penjualan / Broker',
        icon: DollarSign,
        colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-300',
        roleSignLeft: 'Penerima Komisi / Mitra',
        roleSignRight: 'Manajemen Toko (Owner)'
      },
      semua: {
        title: 'NOTA REKAP BIAYA PRODUKSI & KOMISI VENDOR',
        subtitle: 'Rekapitulasi Transaksi Lunas & Sisa Tagihan Ongkos Jahit, Sublim, & Komisi',
        icon: ReceiptText,
        colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-300',
        roleSignLeft: 'Penerima / Vendor / Mitra',
        roleSignRight: 'Manajemen Toko (Owner)'
      }
    }[category];

    const IconComponent = titleConfig.icon;
    const dateFormatted = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const docNo = documentNumber || `NV-${category.substring(0, 3).toUpperCase()}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${orders.length}PO`;

    return (
      <div 
        ref={ref}
        id={id}
        className={`bg-white text-slate-900 w-[840px] min-w-[840px] max-w-[840px] mx-auto p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-6 print:max-w-none print:w-full print:min-w-0 ${className}`}
        style={{ colorScheme: 'light', boxSizing: 'border-box' }}
      >
        {/* Header Toko & Dokumen */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b-2 border-slate-800">
          
          {/* Logo & Identitas Toko */}
          <div className="flex items-center gap-3.5">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={settings.namaToko} 
                className="h-14 w-14 object-contain rounded-xl border border-slate-200 p-1 bg-white shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-tighter shrink-0">
                {(settings.namaToko || 'NA').substring(0, 2).toUpperCase()}
              </div>
            )}
            
            <div>
              <h2 className="text-xl font-black text-slate-950 tracking-tight leading-tight">
                {settings.namaToko || 'Nomaden Apparel'}
              </h2>
              {settings.taglineToko && (
                <p className="text-xs font-bold text-indigo-700">
                  {settings.taglineToko}
                </p>
              )}
              <p className="text-[11px] text-slate-500 font-medium max-w-sm leading-snug mt-0.5">
                {settings.alamatToko || 'Sentra Produksi & Konveksi Jersey Printing Custom'}
              </p>
              {settings.noWaToko && (
                <p className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>Kontak Toko: {settings.noWaToko}</span>
                </p>
              )}
            </div>
          </div>

          {/* Nomor Nota & Status Dokumen */}
          <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-150">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-black tracking-wider uppercase shadow-xs">
              <IconComponent className="h-3.5 w-3.5" />
              <span>{titleConfig.title}</span>
            </div>
            {vendorNameFilter && (
              <p className="text-[11px] font-bold text-indigo-700">
                Mitra: <span className="underline">{vendorNameFilter}</span>
              </p>
            )}
            <div className="pt-0.5">
              {grandTotalUnpaid <= 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-black tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>SEMUA TRANSAKSI LUNAS</span>
                </span>
              ) : grandTotalPaid > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-black tracking-wider uppercase bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                  <Clock className="h-3.5 w-3.5" />
                  <span>SEBAGIAN BELUM LUNAS</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-black tracking-wider uppercase bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>BELUM ADA PELUNASAN</span>
                </span>
              )}
            </div>
            <p className="font-mono text-xs font-extrabold text-slate-800">
              No: <span className="text-slate-950">{docNo}</span>
            </p>
            <p className="text-[11px] text-slate-500 flex items-center justify-start sm:justify-end gap-1 font-medium">
              <Calendar className="h-3 w-3 text-slate-400" />
              <span>{dateFormatted}</span>
            </p>
          </div>

        </div>

        {/* 4-KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 mb-5">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block tracking-wider">Total Pesanan (PO)</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-slate-900 font-mono">{totalOrdersCount}</span>
              <span className="text-[11px] text-slate-500">PO ({totalPcsAll} Pcs)</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold">
              <span className="text-emerald-600 flex items-center gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" /> {paidOrdersCount} Lunas
              </span>
              {unpaidOrdersCount > 0 && (
                <span className="text-rose-600 flex items-center gap-0.5">
                  <AlertCircle className="h-2.5 w-2.5" /> {unpaidOrdersCount} Belum
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block tracking-wider">Total Nilai Transaksi</span>
            <span className="text-base font-black text-slate-900 font-mono block mt-0.5">
              {formatRupiah(grandTotalCost)}
            </span>
            <span className="text-[9.5px] text-slate-400 block mt-0.5">Akumulasi seluruh pesanan</span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
            <span className="text-[9.5px] uppercase font-bold text-emerald-700 block tracking-wider">Sudah Lunas / Dibayar</span>
            <span className="text-base font-black text-emerald-700 font-mono block mt-0.5">
              {formatRupiah(grandTotalPaid)}
            </span>
            <span className="text-[9.5px] text-emerald-600 font-medium block mt-0.5">
              {grandTotalCost > 0 ? `${Math.round((grandTotalPaid / grandTotalCost) * 100)}% dari transaksi` : '-'}
            </span>
          </div>

          <div className={`p-3 rounded-xl border ${grandTotalUnpaid <= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
            <span className={`text-[9.5px] uppercase font-bold block tracking-wider ${grandTotalUnpaid <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              Sisa Tagihan (Kewajiban)
            </span>
            <span className={`text-base font-black font-mono block mt-0.5 ${grandTotalUnpaid <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {grandTotalUnpaid <= 0 ? 'LUNAS (Rp 0)' : formatRupiah(grandTotalUnpaid)}
            </span>
            <span className={`text-[9.5px] font-medium block mt-0.5 ${grandTotalUnpaid <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {grandTotalUnpaid <= 0 ? 'Semua tagihan lunas' : `${unpaidOrdersCount} PO belum lunas`}
            </span>
          </div>
        </div>

        {/* Tabel Rincian Per PO & Item */}
        <div className="rounded-xl border border-slate-300 shadow-2xs mb-5 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px] border-b border-slate-300">
                <th className="py-2.5 px-2 text-center w-8 border-r border-slate-200">No</th>
                <th className="py-2.5 px-2.5 w-40 border-r border-slate-200">Nama PO / Pemesan</th>
                <th className="py-2.5 px-2.5 w-36 border-r border-slate-200">Rincian Item</th>
                <th className="py-2.5 px-2 text-center w-12 border-r border-slate-200">Qty</th>
                
                {category === 'jahit' && (
                  <>
                    <th className="py-2.5 px-2.5 w-24 text-right border-r border-slate-200">Tarif Jahit</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-200">Catatan & Mitra</th>
                    <th className="py-2.5 px-2 text-center w-24 border-r border-slate-200">Status Bayar</th>
                    <th className="py-2.5 px-2.5 w-28 text-right border-r border-slate-200">Total Ongkos</th>
                    <th className="py-2.5 px-2.5 w-28 text-right font-black text-rose-900 bg-rose-50/70">Sisa Tagihan</th>
                  </>
                )}

                {category === 'sublim' && (
                  <>
                    <th className="py-2.5 px-2.5 w-24 text-right border-r border-slate-200">Tarif Print</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-200">Bahan & Vendor</th>
                    <th className="py-2.5 px-2 text-center w-24 border-r border-slate-200">Status Bayar</th>
                    <th className="py-2.5 px-2.5 w-28 text-right border-r border-slate-200">Total Ongkos</th>
                    <th className="py-2.5 px-2.5 w-28 text-right font-black text-sky-900 bg-sky-50/70">Sisa Tagihan</th>
                  </>
                )}

                {category === 'komisi' && (
                  <>
                    <th className="py-2.5 px-2.5 w-24 text-right border-r border-slate-200">Tarif Komisi</th>
                    <th className="py-2.5 px-2.5 border-r border-slate-200">Penerima Komisi</th>
                    <th className="py-2.5 px-2 text-center w-24 border-r border-slate-200">Status Bayar</th>
                    <th className="py-2.5 px-2.5 w-28 text-right border-r border-slate-200">Total Komisi</th>
                    <th className="py-2.5 px-2.5 w-28 text-right font-black text-emerald-900 bg-emerald-50/70">Sisa Tagihan</th>
                  </>
                )}

                {category === 'semua' && (
                  <>
                    <th className="py-2.5 px-2 w-20 text-right border-r border-slate-200">Ongkos Jahit</th>
                    <th className="py-2.5 px-2 w-20 text-right border-r border-slate-200">Ongkos Sublim</th>
                    <th className="py-2.5 px-2 w-20 text-right border-r border-slate-200">Komisi Fee</th>
                    <th className="py-2.5 px-2.5 w-24 text-right border-r border-slate-200">Total Biaya</th>
                    <th className="py-2.5 px-2 text-center w-24 border-r border-slate-200">Status</th>
                    <th className="py-2.5 px-2.5 w-26 text-right font-black text-indigo-950 bg-indigo-50/70">Sisa Tagihan</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {groupedOrders.length > 0 ? (
                groupedOrders.map((group, poIdx) => {
                  const itemCount = group.items.length;
                  const poNumber = poIdx + 1;

                  return (
                    <React.Fragment key={group.orderId}>
                      {group.items.map((item, itemIdx) => {
                        const isFirstItem = itemIdx === 0;
                        const isLastItem = itemIdx === itemCount - 1;
                        const isItemFullyPaid = item.unpaid <= 0;

                        return (
                          <tr 
                            key={`${group.orderId}-${item.itemId}-${itemIdx}`} 
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isLastItem ? 'border-b-2 border-slate-300' : 'border-b border-slate-100'
                            }`}
                          >
                            {/* Column 1: No PO (Rowspanned per PO) */}
                            {isFirstItem && (
                              <td 
                                rowSpan={itemCount} 
                                className="py-2.5 px-2 text-center font-black text-slate-900 border-r border-slate-200 bg-slate-50/40 align-top text-xs"
                              >
                                {poNumber}
                              </td>
                            )}

                            {/* Column 2: Nama PO / Pemesan (Rowspanned per PO) */}
                            {isFirstItem && (
                              <td 
                                rowSpan={itemCount} 
                                className="py-2.5 px-2.5 border-r border-slate-200 break-words bg-slate-50/30 align-top"
                              >
                                <p className="font-extrabold text-slate-950 text-[11.5px] leading-tight">
                                  {group.namaPo}
                                </p>
                                <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                                  #{group.orderId} • {group.namaPemesan}
                                </p>
                                <p className="text-[9.5px] text-slate-500 mt-0.5">
                                  Deadline: <span className="font-semibold text-rose-600">{group.deadline || '-'}</span>
                                </p>
                                {itemCount > 1 && (
                                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[8.5px] font-bold">
                                    <span>{itemCount} Item</span>
                                    <span>•</span>
                                    <span>{group.totalQty} Pcs</span>
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Column 3: Rincian Item Produk */}
                            <td className="py-2 px-2.5 border-r border-slate-200 break-words">
                              <p className="font-bold text-slate-900 text-[10.5px]">
                                {item.namaProduk}
                              </p>
                              <p className="text-[9.5px] text-slate-500 mt-0.5">
                                Bahan: <span className="font-semibold text-slate-700">{item.bahan}</span>
                              </p>
                              <p className="text-[9.5px] text-slate-500">
                                Kerah: <span className="font-semibold text-slate-700">{item.modelKerah}</span>
                              </p>
                            </td>

                            {/* Column 4: Qty */}
                            <td className="py-2 px-2 text-center font-black text-slate-900 border-r border-slate-200">
                              {item.qty} <span className="text-[8.5px] font-normal text-slate-500">Pcs</span>
                            </td>

                            {/* Category: Jahit */}
                            {category === 'jahit' && (
                              <>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                                  {formatRupiah(item.jahitPerPcs)}
                                </td>
                                <td className="py-2 px-2.5 border-r border-slate-200 text-[10px]">
                                  <p className="font-medium text-slate-700">
                                    {item.catatanJahit && item.catatanJahit !== '-' ? item.catatanJahit : `Kerah ${item.modelKerah}`}
                                  </p>
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                    Mitra: <span className="font-bold text-slate-700">{item.vendorJahit}</span>
                                  </p>
                                </td>
                                <td className="py-2 px-2 text-center border-r border-slate-200">
                                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                    item.isJahitLunas
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}>
                                    {item.isJahitLunas ? '✓ LUNAS' : 'BELUM LUNAS'}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                                  {formatRupiah(item.totalJahit)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-black">
                                  <span className={item.isJahitLunas ? 'text-emerald-700' : 'text-rose-700'}>
                                    {item.isJahitLunas ? 'Rp 0' : formatRupiah(item.unpaid)}
                                  </span>
                                </td>
                              </>
                            )}

                            {/* Category: Sublim */}
                            {category === 'sublim' && (
                              <>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                                  {formatRupiah(item.printPerPcs)}
                                </td>
                                <td className="py-2 px-2.5 border-r border-slate-200 text-[10px]">
                                  <p className="font-medium text-slate-700">
                                    {item.bahan}
                                  </p>
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                    Vendor: <span className="font-bold text-slate-700">{item.vendorSublim}</span>
                                  </p>
                                </td>
                                <td className="py-2 px-2 text-center border-r border-slate-200">
                                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                    item.isSublimLunas
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}>
                                    {item.isSublimLunas ? '✓ LUNAS' : 'BELUM LUNAS'}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                                  {formatRupiah(item.totalSublim)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-black">
                                  <span className={item.isSublimLunas ? 'text-emerald-700' : 'text-sky-700'}>
                                    {item.isSublimLunas ? 'Rp 0' : formatRupiah(item.unpaid)}
                                  </span>
                                </td>
                              </>
                            )}

                            {/* Category: Komisi */}
                            {category === 'komisi' && (
                              <>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                                  {formatRupiah(item.komisiPerPcs)}
                                </td>
                                <td className="py-2 px-2.5 border-r border-slate-200 text-[10px]">
                                  <p className="font-bold text-emerald-900">
                                    {item.penerimaKomisi}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">
                                    Marketing / Broker
                                  </p>
                                </td>
                                <td className="py-2 px-2 text-center border-r border-slate-200">
                                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                    item.isKomisiLunas
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}>
                                    {item.isKomisiLunas ? '✓ LUNAS' : 'BELUM LUNAS'}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                                  {formatRupiah(item.totalKomisi)}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-black">
                                  <span className={item.isKomisiLunas ? 'text-emerald-700' : 'text-emerald-700 font-black'}>
                                    {item.isKomisiLunas ? 'Rp 0' : formatRupiah(item.unpaid)}
                                  </span>
                                </td>
                              </>
                            )}

                            {/* Category: Semua */}
                            {category === 'semua' && (
                              <>
                                <td className="py-2 px-2 text-right font-mono text-[10.5px] border-r border-slate-200">
                                  <div className="font-bold text-slate-800">{formatRupiah(item.totalJahit)}</div>
                                  <span className={`text-[8.5px] px-1 py-0.2 rounded font-bold ${item.isJahitLunas ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                    {item.isJahitLunas ? '✓ Lunas' : 'Belum'}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-[10.5px] border-r border-slate-200">
                                  <div className="font-bold text-slate-800">{formatRupiah(item.totalSublim)}</div>
                                  <span className={`text-[8.5px] px-1 py-0.2 rounded font-bold ${item.isSublimLunas ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                    {item.isSublimLunas ? '✓ Lunas' : 'Belum'}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-[10.5px] border-r border-slate-200">
                                  <div className="font-bold text-slate-800">{formatRupiah(item.totalKomisi)}</div>
                                  <span className={`text-[8.5px] px-1 py-0.2 rounded font-bold ${item.isKomisiLunas ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                    {item.isKomisiLunas ? '✓ Lunas' : 'Belum'}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                                  {formatRupiah(item.cost)}
                                </td>
                                <td className="py-2 px-2 text-center border-r border-slate-200">
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                                    item.status === 'Lunas'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : item.status === 'Sebagian Lunas'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-black">
                                  <span className={item.unpaid <= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                    {item.unpaid <= 0 ? 'Rp 0' : formatRupiah(item.unpaid)}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={category === 'semua' ? 10 : 9} className="py-8 text-center text-slate-400 italic">
                    Tidak ada transaksi vendor yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer Row */}
            <tfoot>
              <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-300 text-xs">
                <td colSpan={3} className="py-3 px-2.5 text-right uppercase tracking-wider border-r border-slate-200 text-slate-900 font-black">
                  TOTAL KESELURUHAN ({totalOrdersCount} PO)
                </td>
                <td className="py-3 px-2 text-center font-black border-r border-slate-200 font-mono text-indigo-950">
                  {totalPcsAll} <span className="text-[8.5px] font-normal text-slate-500">Pcs</span>
                </td>

                {category === 'jahit' && (
                  <>
                    <td colSpan={2} className="py-3 px-2.5 text-right uppercase text-[9.5px] text-slate-500 border-r border-slate-200 font-bold">
                      Lunas: {formatRupiah(grandTotalPaid)}
                    </td>
                    <td className="py-3 px-2 text-center border-r border-slate-200 font-bold text-[9.5px] text-slate-700">
                      {paidOrdersCount}L / {unpaidOrdersCount}B
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                      {formatRupiah(grandTotalCost)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-black text-rose-700 bg-rose-100/70 text-sm">
                      {grandTotalUnpaid <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(grandTotalUnpaid)}
                    </td>
                  </>
                )}

                {category === 'sublim' && (
                  <>
                    <td colSpan={2} className="py-3 px-2.5 text-right uppercase text-[9.5px] text-slate-500 border-r border-slate-200 font-bold">
                      Lunas: {formatRupiah(grandTotalPaid)}
                    </td>
                    <td className="py-3 px-2 text-center border-r border-slate-200 font-bold text-[9.5px] text-slate-700">
                      {paidOrdersCount}L / {unpaidOrdersCount}B
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                      {formatRupiah(grandTotalCost)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-black text-sky-900 bg-sky-100/70 text-sm">
                      {grandTotalUnpaid <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(grandTotalUnpaid)}
                    </td>
                  </>
                )}

                {category === 'komisi' && (
                  <>
                    <td colSpan={2} className="py-3 px-2.5 text-right uppercase text-[9.5px] text-slate-500 border-r border-slate-200 font-bold">
                      Lunas: {formatRupiah(grandTotalPaid)}
                    </td>
                    <td className="py-3 px-2 text-center border-r border-slate-200 font-bold text-[9.5px] text-slate-700">
                      {paidOrdersCount}L / {unpaidOrdersCount}B
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                      {formatRupiah(grandTotalCost)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-black text-emerald-900 bg-emerald-100/70 text-sm">
                      {grandTotalUnpaid <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(grandTotalUnpaid)}
                    </td>
                  </>
                )}

                {category === 'semua' && (
                  <>
                    <td className="py-3 px-2 text-right font-mono text-[10.5px] font-bold text-amber-900 border-r border-slate-200">
                      <div>{formatRupiah(grandSumJahit)}</div>
                      <div className="text-[8.5px] text-slate-500 font-normal">Sisa: {formatRupiah(grandSumJahitUnpaid)}</div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-[10.5px] font-bold text-sky-900 border-r border-slate-200">
                      <div>{formatRupiah(grandSumSublim)}</div>
                      <div className="text-[8.5px] text-slate-500 font-normal">Sisa: {formatRupiah(grandSumSublimUnpaid)}</div>
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-[10.5px] font-bold text-emerald-900 border-r border-slate-200">
                      <div>{formatRupiah(grandSumKomisi)}</div>
                      <div className="text-[8.5px] text-slate-500 font-normal">Sisa: {formatRupiah(grandSumKomisiUnpaid)}</div>
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-black text-slate-900 border-r border-slate-200 text-xs">
                      {formatRupiah(grandTotalCost)}
                    </td>
                    <td className="py-3 px-2 text-center border-r border-slate-200 text-[9.5px] font-bold text-slate-700">
                      {paidOrdersCount}L / {unpaidOrdersCount}B
                    </td>
                    <td className="py-3 px-2.5 text-right font-mono font-black text-rose-700 bg-rose-100/70 text-sm">
                      {grandTotalUnpaid <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(grandTotalUnpaid)}
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Ringkasan Akumulasi & Grand Total Card */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-6">
          
          {/* Summary KPI Badges */}
          <div className="sm:col-span-7 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span>Rincian Rekapitulasi Pembayaran Vendor</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[9.5px] text-slate-500 font-medium block">Total Transaksi</span>
                <span className="text-xs font-black text-slate-900">{formatRupiah(grandTotalCost)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[9.5px] text-emerald-600 font-medium block">Sudah Lunas</span>
                <span className="text-xs font-black text-emerald-700">{formatRupiah(grandTotalPaid)}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[9.5px] text-rose-600 font-medium block">Sisa Tagihan</span>
                <span className="text-xs font-black text-rose-700">{formatRupiah(grandTotalUnpaid)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
              <span>Status Transaksi: <strong className="text-emerald-700">{paidOrdersCount} PO Lunas</strong>, <strong className="text-rose-700">{unpaidOrdersCount} PO Belum Lunas</strong></span>
              <span className="font-mono text-slate-500">{totalPcsAll} Pcs Total</span>
            </div>

            {customNotes && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700">Catatan Khusus:</span> {customNotes}
              </div>
            )}
          </div>

          {/* Grand Total Sisa Tagihan Highlight */}
          <div className="sm:col-span-5 bg-linear-to-br from-slate-900 to-slate-950 text-white p-4 rounded-xl shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider block">
                Total Sisa Tagihan (Kewajiban Belum Lunas):
              </span>
              <p className="font-mono text-2xl font-black text-amber-300 mt-1">
                {grandTotalUnpaid <= 0 ? 'LUNAS (Rp 0)' : formatRupiah(grandTotalUnpaid)}
              </p>
              <div className="flex items-center gap-3 text-[10.5px] text-slate-300 mt-1 pt-1 border-t border-slate-800">
                <span>Total: <strong className="text-white font-mono">{formatRupiah(grandTotalCost)}</strong></span>
                <span>•</span>
                <span>Lunas: <strong className="text-emerald-400 font-mono">{formatRupiah(grandTotalPaid)}</strong></span>
              </div>
            </div>
            <p className="text-[9.5px] text-slate-400 mt-2 italic leading-tight">
              *Rincian resmi di atas mencantumkan daftar pesanan yang sudah lunas dan yang belum lunas per tanggal cetak.
            </p>
          </div>

        </div>

        {/* Dual Signatures / Tanda Tangan Validasi */}
        <div className="pt-4 border-t-2 border-slate-200">
          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            
            {/* Tanda Tangan Yang Menagihkan / Vendor / Penjahit / Komisi */}
            <div className="space-y-16">
              <div>
                <p className="font-bold text-slate-700">Yang Menagihkan / Mitra,</p>
                <p className="text-[10px] text-slate-500">({titleConfig.roleSignLeft})</p>
              </div>
              <p className="font-bold text-slate-800 border-b-2 border-slate-400 pb-1 px-4 inline-block min-w-[150px]">
                {vendorNameFilter || '( ................................... )'}
              </p>
            </div>

            {/* Tanda Tangan Mengetahui Toko */}
            <div className="space-y-16">
              <div>
                <p className="font-bold text-slate-700">Mengetahui & Menyetujui,</p>
                <p className="text-[10px] text-slate-500">({titleConfig.roleSignRight})</p>
              </div>
              <p className="font-black text-slate-950 border-b-2 border-slate-400 pb-1 px-4 inline-block min-w-[150px]">
                {settings.namaToko || 'Nomaden Apparel'}
              </p>
            </div>

          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Dokumen Nota Rincian Tagihan Produksi & Mitra • {settings.namaToko || 'Nomaden Apparel'} • {dateFormatted}
          </div>
        </div>

      </div>
    );
  }
);
