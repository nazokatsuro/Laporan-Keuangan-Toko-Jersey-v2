/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { Pesanan, ShopSettings } from '../../types';
import { formatRupiah } from '../../utils';
import { 
  Scissors, 
  Layers, 
  DollarSign, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Calendar,
  User,
  Phone,
  ShieldCheck,
  ReceiptText
} from 'lucide-react';

export type VendorPayableCategory = 'semua' | 'jahit' | 'sublim' | 'komisi';

export interface VendorPayablesCardProps {
  orders: Pesanan[];
  settings: ShopSettings;
  category: VendorPayableCategory;
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
      vendorNameFilter = '',
      documentNumber,
      customNotes,
      className = '',
      id
    },
    ref
  ) {
    // Process items and calculate totals according to selected category
    const rows = orders.flatMap((order, oIdx) => {
      // If order has multi-items, decompose to sub-items, otherwise use order itself
      if (order.items && order.items.length > 0) {
        return order.items.map((item, iIdx) => {
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

          const isJahitLunas = item.statusBayarJahit === 'Lunas' || order.statusBayarJahit === 'Lunas';
          const isSublimLunas = item.statusBayarSublim === 'Lunas' || order.statusBayarSublim === 'Lunas';
          const isKomisiLunas = item.statusBayarKomisi === 'Lunas' || order.statusBayarKomisi === 'Lunas';

          return {
            orderId: order.id,
            itemId: item.id || `item-${oIdx}-${iIdx}`,
            namaPo: order.namaPo,
            namaPemesan: order.namaPemesan,
            noTelepon: order.noTelepon,
            deadline: order.deadline,
            createdAt: order.createdAt,
            namaProduk: item.namaProduk || order.namaProduk || 'Jersey Custom',
            bahan: item.bahan || order.bahan || 'Polyester Dryfit',
            modelKerah: item.modelKerah || order.modelKerah || 'O-Neck (Standar)',
            catatanJahit: item.catatanJahit || order.catatanJahit || '-',
            keterangan: item.keterangan || order.keterangan || '-',
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
            totalBiaya: totalJahit + totalSublim + totalKomisi
          };
        });
      }

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

      const isJahitLunas = order.statusBayarJahit === 'Lunas';
      const isSublimLunas = order.statusBayarSublim === 'Lunas';
      const isKomisiLunas = order.statusBayarKomisi === 'Lunas';

      return [{
        orderId: order.id,
        itemId: `order-${order.id}`,
        namaPo: order.namaPo,
        namaPemesan: order.namaPemesan,
        noTelepon: order.noTelepon,
        deadline: order.deadline,
        createdAt: order.createdAt,
        namaProduk: order.namaProduk || 'Jersey Custom',
        bahan: order.bahan || 'Polyester Dryfit',
        modelKerah: order.modelKerah || 'O-Neck (Standar)',
        catatanJahit: order.catatanJahit || '-',
        keterangan: order.keterangan || '-',
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
        totalBiaya: totalJahit + totalSublim + totalKomisi
      }];
    });

    // Filter by category and vendor if supplied
    const filteredRows = rows.filter(row => {
      if (category === 'jahit') {
        if (row.isJahitLunas) return false;
        if (row.totalJahit <= 0) return false;
        if (vendorNameFilter && !row.vendorJahit.toLowerCase().includes(vendorNameFilter.toLowerCase())) {
          return false;
        }
        return true;
      }
      if (category === 'sublim') {
        if (row.isSublimLunas) return false;
        if (row.totalSublim <= 0) return false;
        if (vendorNameFilter && !row.vendorSublim.toLowerCase().includes(vendorNameFilter.toLowerCase())) {
          return false;
        }
        return true;
      }
      if (category === 'komisi') {
        if (row.isKomisiLunas) return false;
        if (row.totalKomisi <= 0) return false;
        if (vendorNameFilter && !row.penerimaKomisi.toLowerCase().includes(vendorNameFilter.toLowerCase())) {
          return false;
        }
        return true;
      }
      // 'semua'
      const hasUnpaid = (!row.isJahitLunas && row.totalJahit > 0) ||
                        (!row.isSublimLunas && row.totalSublim > 0) ||
                        (!row.isKomisiLunas && row.totalKomisi > 0);
      return hasUnpaid;
    });

    // Aggregates for filtered rows
    const totalPcs = filteredRows.reduce((sum, r) => sum + r.qty, 0);
    const sumJahit = filteredRows.reduce((sum, r) => sum + (r.isJahitLunas ? 0 : r.totalJahit), 0);
    const sumSublim = filteredRows.reduce((sum, r) => sum + (r.isSublimLunas ? 0 : r.totalSublim), 0);
    const sumKomisi = filteredRows.reduce((sum, r) => sum + (r.isKomisiLunas ? 0 : r.totalKomisi), 0);

    const grandTotal = category === 'jahit'
      ? sumJahit
      : category === 'sublim'
      ? sumSublim
      : category === 'komisi'
      ? sumKomisi
      : (sumJahit + sumSublim + sumKomisi);

    // Dynamic Title & Badge styling based on category
    const titleConfig = {
      jahit: {
        title: 'NOTA TAGIHAN ONGKOS JAHIT (BELUM LUNAS)',
        subtitle: 'Rincian Tanggungan Upah & Ongkos Jahit Konveksi Jersey',
        icon: Scissors,
        colorClass: 'text-amber-700 bg-amber-50 border-amber-300',
        badgeText: 'BELUM LUNAS JAHIT',
        roleSignLeft: 'Penjahit / Vendor Jahit',
        roleSignRight: 'Manajemen Toko (Owner)'
      },
      sublim: {
        title: 'NOTA TAGIHAN ONGKOS PRINT & PRESS SUBLIM (BELUM LUNAS)',
        subtitle: 'Rincian Tanggungan Ongkos Cetak / Sublimasi Printing',
        icon: Layers,
        colorClass: 'text-sky-700 bg-sky-50 border-sky-300',
        badgeText: 'BELUM LUNAS SUBLIM',
        roleSignLeft: 'Vendor Print & Press Sublim',
        roleSignRight: 'Manajemen Toko (Owner)'
      },
      komisi: {
        title: 'NOTA TAGIHAN KOMISI & MARKETING FEE (BELUM LUNAS)',
        subtitle: 'Rincian Tanggungan Komisi Penjualan / Broker / Desainer',
        icon: DollarSign,
        colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-300',
        badgeText: 'BELUM LUNAS KOMISI',
        roleSignLeft: 'Penerima Komisi / Mitra',
        roleSignRight: 'Manajemen Toko (Owner)'
      },
      semua: {
        title: 'NOTA REKAP BIAYA PRODUKSI & KOMISI (BELUM LUNAS)',
        subtitle: 'Rekapitulasi Tanggungan Ongkos Jahit, Sublim, & Komisi Per Pesanan',
        icon: ReceiptText,
        colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-300',
        badgeText: 'REKAP BELUM LUNAS',
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

    const docNo = documentNumber || `NP-${category.substring(0, 3).toUpperCase()}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${orders.length}PO`;

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
          <div className="text-left sm:text-right space-y-1 shrink-0 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-150">
            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-black tracking-wider uppercase border ${titleConfig.colorClass}`}>
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{titleConfig.badgeText}</span>
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

        {/* Banner Judul Nota Tagihan */}
        <div className="my-4 p-3.5 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/10 text-white flex items-center justify-center shrink-0">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-wide uppercase">
                {titleConfig.title}
              </h3>
              <p className="text-[11px] text-slate-300 font-medium">
                {titleConfig.subtitle}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right bg-white/10 px-3 py-1.5 rounded-lg shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Ditagihkan:</span>
            <span className="text-sm sm:text-base font-mono font-black text-amber-300">
              {formatRupiah(grandTotal)}
            </span>
          </div>
        </div>

        {/* Tabel Rincian Per PO */}
        <div className="rounded-xl border border-slate-300 shadow-2xs mb-5 overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10.5px] border-b border-slate-300">
                <th className="py-2.5 px-2.5 text-center w-10 border-r border-slate-200">No</th>
                <th className="py-2.5 px-3 w-44 border-r border-slate-200">Nama PO / Pemesan</th>
                <th className="py-2.5 px-3 w-40 border-r border-slate-200">Rincian Item & Spesifikasi</th>
                <th className="py-2.5 px-2.5 text-center w-14 border-r border-slate-200">Qty</th>
                
                {category === 'jahit' && (
                  <>
                    <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200">Tarif Jahit/Pcs</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Catatan Jahit & Kerah</th>
                    <th className="py-2.5 px-3 w-32 text-right font-black text-amber-900 bg-amber-50/70">Subtotal Jahit</th>
                  </>
                )}

                {category === 'sublim' && (
                  <>
                    <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200">Tarif Print/Pcs</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Bahan & Keterangan</th>
                    <th className="py-2.5 px-3 w-32 text-right font-black text-sky-900 bg-sky-50/70">Subtotal Sublim</th>
                  </>
                )}

                {category === 'komisi' && (
                  <>
                    <th className="py-2.5 px-3 w-28 text-right border-r border-slate-200">Tarif Komisi/Pcs</th>
                    <th className="py-2.5 px-3 border-r border-slate-200">Penerima Komisi</th>
                    <th className="py-2.5 px-3 w-32 text-right font-black text-emerald-900 bg-emerald-50/70">Subtotal Komisi</th>
                  </>
                )}

                {category === 'semua' && (
                  <>
                    <th className="py-2.5 px-2.5 w-24 text-right border-r border-slate-200">Ongkos Jahit</th>
                    <th className="py-2.5 px-2.5 w-24 text-right border-r border-slate-200">Ongkos Sublim</th>
                    <th className="py-2.5 px-2.5 w-24 text-right border-r border-slate-200">Komisi Fee</th>
                    <th className="py-2.5 px-3 w-28 text-right font-black text-indigo-950 bg-indigo-50/70">Total Biaya</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => (
                  <tr key={`${row.orderId}-${row.itemId}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-2.5 text-center font-bold text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 break-words">
                      <p className="font-extrabold text-slate-900 text-[11.5px] leading-tight">
                        {row.namaPo}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        #{row.orderId} • {row.namaPemesan}
                      </p>
                      <p className="text-[9.5px] text-slate-400">
                        Deadline: {row.deadline}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 border-r border-slate-200 break-words">
                      <p className="font-bold text-slate-800 text-[11px]">
                        {row.namaProduk}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Bahan: <span className="font-semibold text-slate-700">{row.bahan}</span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Kerah: <span className="font-semibold text-slate-700">{row.modelKerah}</span>
                      </p>
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-black text-slate-900 border-r border-slate-200">
                      {row.qty} <span className="text-[9px] font-normal text-slate-500">Pcs</span>
                    </td>

                    {category === 'jahit' && (
                      <>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                          {formatRupiah(row.jahitPerPcs)}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-[10.5px]">
                          <p className="font-medium text-slate-700">
                            {row.catatanJahit && row.catatanJahit !== '-' ? row.catatanJahit : `Kerah ${row.modelKerah}`}
                          </p>
                          <p className="text-[9.5px] text-slate-400 mt-0.5">
                            Mitra: {row.vendorJahit}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-amber-950 bg-amber-50/40">
                          {formatRupiah(row.totalJahit)}
                        </td>
                      </>
                    )}

                    {category === 'sublim' && (
                      <>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                          {formatRupiah(row.printPerPcs)}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-[10.5px]">
                          <p className="font-medium text-slate-700">
                            {row.bahan}
                          </p>
                          <p className="text-[9.5px] text-slate-400 mt-0.5">
                            Vendor: {row.vendorSublim}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-sky-950 bg-sky-50/40">
                          {formatRupiah(row.totalSublim)}
                        </td>
                      </>
                    )}

                    {category === 'komisi' && (
                      <>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200">
                          {formatRupiah(row.komisiPerPcs)}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-[10.5px]">
                          <p className="font-bold text-emerald-900">
                            {row.penerimaKomisi}
                          </p>
                          <p className="text-[9.5px] text-slate-400 mt-0.5">
                            Mitra Marketing / Desainer
                          </p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/40">
                          {formatRupiah(row.totalKomisi)}
                        </td>
                      </>
                    )}

                    {category === 'semua' && (
                      <>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
                          {formatRupiah(row.totalJahit)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
                          {formatRupiah(row.totalSublim)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
                          {formatRupiah(row.totalKomisi)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-950 bg-indigo-50/40">
                          {formatRupiah(row.totalBiaya)}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={category === 'semua' ? 8 : 7} className="py-8 text-center text-slate-400 italic">
                    Tidak ada tanggungan belum lunas untuk kategori yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Total Footer Row */}
            <tfoot>
              <tr className="bg-slate-100/90 text-slate-900 font-extrabold border-t-2 border-slate-300 text-xs">
                <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider border-r border-slate-200">
                  Total Keseluruhan:
                </td>
                <td className="py-2.5 px-2.5 text-center font-black border-r border-slate-200">
                  {totalPcs} <span className="text-[9px] font-normal text-slate-500">Pcs</span>
                </td>

                {category === 'jahit' && (
                  <>
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px] text-slate-500 border-r border-slate-200">
                      Total Ongkos Jahit ({filteredRows.length} PO):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-amber-950 bg-amber-100/80">
                      {formatRupiah(sumJahit)}
                    </td>
                  </>
                )}

                {category === 'sublim' && (
                  <>
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px] text-slate-500 border-r border-slate-200">
                      Total Ongkos Sublim ({filteredRows.length} PO):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-sky-950 bg-sky-100/80">
                      {formatRupiah(sumSublim)}
                    </td>
                  </>
                )}

                {category === 'komisi' && (
                  <>
                    <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px] text-slate-500 border-r border-slate-200">
                      Total Komisi ({filteredRows.length} PO):
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-emerald-950 bg-emerald-100/80">
                      {formatRupiah(sumKomisi)}
                    </td>
                  </>
                )}

                {category === 'semua' && (
                  <>
                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-amber-900 border-r border-slate-200">
                      {formatRupiah(sumJahit)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-sky-900 border-r border-slate-200">
                      {formatRupiah(sumSublim)}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-900 border-r border-slate-200">
                      {formatRupiah(sumKomisi)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-indigo-950 bg-indigo-100/80">
                      {formatRupiah(grandTotal)}
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
              <span>Ringkasan Tagihan Produksi & Komisi</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Total PO</span>
                <span className="text-sm font-black text-slate-900">{orders.length} PO</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Total Jersey</span>
                <span className="text-sm font-black text-slate-900">{totalPcs} Pcs</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-medium block">Status</span>
                <span className="text-[11px] font-black text-amber-700">Belum Lunas</span>
              </div>
            </div>

            {customNotes && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700">Catatan Khusus:</span> {customNotes}
              </div>
            )}
          </div>

          {/* Grand Total Box Highlight */}
          <div className="sm:col-span-5 bg-linear-to-br from-slate-900 to-slate-950 text-white p-4 rounded-xl shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10.5px] uppercase font-bold text-slate-300 tracking-wider block">
                Total Kewajiban Pembayaran:
              </span>
              <p className="font-mono text-2xl font-black text-amber-300 mt-1">
                {formatRupiah(grandTotal)}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic leading-tight">
              *Jumlah di atas merupakan rincian tagihan resmi yang belum diselesaikan / belum lunas per tanggal cetak.
            </p>
          </div>

        </div>

        {/* Dual Signatures / Tanda Tangan Validasi (Tanpa Nomor Rekening & Tanpa Barcode) */}
        <div className="pt-4 border-t-2 border-slate-200">
          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            
            {/* Tanda Tangan Yang Mengajukan / Vendor / Penjahit / Komisi */}
            <div className="space-y-16">
              <div>
                <p className="font-bold text-slate-700">Yang Menagihkan / Mitra,</p>
                <p className="text-[10.5px] text-slate-500">({titleConfig.roleSignLeft})</p>
              </div>
              <p className="font-bold text-slate-800 border-b-2 border-slate-400 pb-1 px-4 inline-block min-w-[150px]">
                {vendorNameFilter || '( ................................... )'}
              </p>
            </div>

            {/* Tanda Tangan Mengetahui Toko */}
            <div className="space-y-16">
              <div>
                <p className="font-bold text-slate-700">Mengetahui & Menyetujui,</p>
                <p className="text-[10.5px] text-slate-500">({titleConfig.roleSignRight})</p>
              </div>
              <p className="font-black text-slate-950 border-b-2 border-slate-400 pb-1 px-4 inline-block min-w-[150px]">
                {settings.namaToko || 'Nomaden Apparel'}
              </p>
            </div>

          </div>

          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
            Dokumen Nota Rincian Tagihan Produksi Internal • {settings.namaToko || 'Nomaden Apparel'} • {dateFormatted}
          </div>
        </div>

      </div>
    );
  }
);
