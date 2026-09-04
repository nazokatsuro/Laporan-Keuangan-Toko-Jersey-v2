/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { Pesanan, ShopSettings } from '../../types';
import { formatRupiah } from '../../utils';
import { QRCodeSVG } from 'qrcode.react';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  Receipt
} from 'lucide-react';

interface BatchRekapCardProps {
  orders: Pesanan[];
  settings: ShopSettings;
  onLightboxImage?: (data: { url: string; title: string }) => void;
  className?: string;
  id?: string;
}

export const BatchRekapCard = forwardRef<HTMLDivElement, BatchRekapCardProps>(function BatchRekapCard(
  { orders, settings, onLightboxImage, className = '', id },
  ref
) {
  const bankName = settings.namaBankToko || 'BCA';
  const bankNo = settings.nomorRekeningToko || '8105-9281-33';
  const bankOwner = settings.atasNamaRekeningToko || settings.namaToko || 'Nomaden Apparel';
  const qrisImage = settings.qrisImageUrl || '';

  // Aggregate stats
  const totalOrders = orders.length;
  const totalQtyAll = orders.reduce((sum, o) => {
    const qty = o.items && o.items.length > 0
      ? o.items.reduce((acc, it) => acc + (it.qty || 0), 0)
      : (o.qty || 0);
    return sum + qty;
  }, 0);

  const totalTagihanAll = orders.reduce((sum, o) => sum + (Number(o.totalHarga) || 0), 0);
  const totalUangMasukAll = orders.reduce((sum, o) => sum + (Number(o.uangMasuk) || 0), 0);
  const totalSisaTagihanAll = orders.reduce((sum, o) => sum + (Number(o.sisaTagihan) || 0), 0);

  const paidOrdersCount = orders.filter(o => (Number(o.sisaTagihan) || 0) <= 0).length;
  const unpaidOrdersCount = totalOrders - paidOrdersCount;

  // Generate QRIS payload fallback
  const qrisPayload = `00020101021126580011ID.DANA.WWW01189360091530000000000303UMI51440014ID.QRIS.WWW0503030303035204581253033605802ID5910${(settings.namaToko || 'TOKO').substring(0, 20).toUpperCase()}6007BANDUNG6304REKAP`;

  const currentDateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div 
      ref={ref}
      id={id || 'batch-rekap-card'}
      className={`w-[840px] min-w-[840px] max-w-[840px] p-8 sm:p-10 bg-white text-slate-900 shadow-xl border border-slate-200/80 font-sans space-y-6 relative overflow-hidden nota-print-target print:shadow-none print:border-none print:p-8 print:m-0 print:w-full print:min-w-0 print:max-w-none ${className}`}
      style={{ colorScheme: 'light', boxSizing: 'border-box' }}
    >
      {/* Header Store & Rekapitulasi Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-indigo-600/20 pb-5">
        
        {/* Store Info */}
        <div className="flex items-start gap-3.5">
          {settings.logoUrl ? (
            <img 
              src={settings.logoUrl} 
              alt="Logo" 
              className="h-14 w-14 object-contain rounded-xl border border-slate-100 p-1 bg-slate-50 shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-14 w-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
              NA
            </div>
          )}
          <div className="space-y-0.5">
            <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              {settings.namaToko || 'Nomaden Apparel'}
            </h2>
            {settings.taglineToko && (
              <p className="text-xs font-bold text-indigo-700 tracking-tight">
                {settings.taglineToko}
              </p>
            )}
            <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed max-w-sm">
              {settings.alamatToko || 'Jl. Konveksi & Sublim Printing, Bandung'}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 pt-0.5 font-semibold">
              <span>📞 {settings.noWaToko || '081234567890'}</span>
              <span>•</span>
              <span>IG: @{settings.igToko || 'nomadenapparel'}</span>
            </div>
          </div>
        </div>

        {/* Rekap Label & Date */}
        <div className="flex flex-col items-start sm:items-end gap-1.5 self-stretch sm:self-auto bg-indigo-50/70 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-indigo-100">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-black tracking-wider uppercase shadow-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>LEMBAR REKAPITULASI BATCH NOTA</span>
          </div>
          <p className="text-xs font-bold text-slate-700">
            Tanggal Cetak: <span className="font-semibold text-slate-600">{currentDateFormatted}</span>
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-bold text-indigo-700">{totalOrders} Pesanan Terangkum</span>
            <span>•</span>
            <span className="font-mono font-bold text-slate-700">{totalQtyAll} Pcs Jersey</span>
          </div>
        </div>

      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Pesanan (PO)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-slate-900 font-mono">{totalOrders}</span>
            <span className="text-xs text-slate-500">PO ({totalQtyAll} Pcs)</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10.5px] font-semibold">
            <span className="text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" /> {paidOrdersCount} Lunas
            </span>
            {unpaidOrdersCount > 0 && (
              <span className="text-rose-600 flex items-center gap-0.5">
                <AlertCircle className="h-3 w-3" /> {unpaidOrdersCount} Belum
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Nilai Tagihan</span>
          <span className="text-lg font-black text-slate-900 font-mono block mt-1">
            {formatRupiah(totalTagihanAll)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Akumulasi seluruh PO</span>
        </div>

        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Total Uang Masuk / DP</span>
          <span className="text-lg font-black text-emerald-700 font-mono block mt-1">
            {formatRupiah(totalUangMasukAll)}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
            {totalTagihanAll > 0 ? `${Math.round((totalUangMasukAll / totalTagihanAll) * 100)}% dari tagihan` : '-'}
          </span>
        </div>

        <div className={`p-3.5 rounded-xl border ${totalSisaTagihanAll <= 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
          <span className={`text-[10px] uppercase font-bold block tracking-wider ${totalSisaTagihanAll <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            Total Sisa Tagihan (Piutang)
          </span>
          <span className={`text-lg font-black font-mono block mt-1 ${totalSisaTagihanAll <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {totalSisaTagihanAll <= 0 ? 'LUNAS (Rp 0)' : formatRupiah(totalSisaTagihanAll)}
          </span>
          <span className={`text-[10px] font-medium block mt-0.5 ${totalSisaTagihanAll <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalSisaTagihanAll <= 0 ? 'Semua pesanan lunas' : 'Menunggu pelunasan'}
          </span>
        </div>
      </div>

      {/* Detailed PO Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-indigo-600" />
            <span>Rincian Rekap Tiap Pesanan (PO)</span>
          </h4>
          <span className="text-[11px] text-slate-500 font-medium">
            Total <strong className="text-slate-800">{orders.length}</strong> pesanan dalam batch
          </span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 text-[10.5px]">
                <th className="py-2.5 px-2 text-center w-8">No</th>
                <th className="py-2.5 px-2.5">No. Nota / ID</th>
                <th className="py-2.5 px-3">Nama PO & Pemesan</th>
                <th className="py-2.5 px-2.5">Target Deadline</th>
                <th className="py-2.5 px-2 text-center">Status</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Total Tagihan</th>
                <th className="py-2.5 px-3 text-right">DP / Masuk</th>
                <th className="py-2.5 px-3 text-right">Sisa Tagihan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o, idx) => {
                const isPaid = (Number(o.sisaTagihan) || 0) <= 0;
                const poQty = o.items && o.items.length > 0
                  ? o.items.reduce((acc, it) => acc + (it.qty || 0), 0)
                  : (o.qty || 0);

                return (
                  <tr key={o.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-2 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-2.5 font-mono font-bold text-indigo-700">
                      #{o.id}
                    </td>
                    <td className="py-2 px-3">
                      <p className="font-extrabold text-slate-900">{o.namaPo}</p>
                      <p className="text-[10px] text-slate-500">
                        {o.namaPemesan} {o.noTelepon ? `• ${o.noTelepon}` : ''}
                      </p>
                    </td>
                    <td className="py-2 px-2.5 text-slate-600 font-medium">
                      {o.deadline || '-'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${
                        isPaid 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {isPaid ? 'Lunas' : 'Belum'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-bold text-slate-800">
                      {poQty}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(o.totalHarga)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-emerald-600">
                      {formatRupiah(o.uangMasuk)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black">
                      <span className={isPaid ? 'text-emerald-600' : 'text-rose-600'}>
                        {isPaid ? 'Rp 0' : formatRupiah(o.sisaTagihan)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {/* Grand Total Row */}
              <tr className="bg-slate-100 font-black border-t-2 border-slate-300 text-xs">
                <td colSpan={5} className="py-3 px-3 text-slate-900 uppercase tracking-wider text-right">
                  TOTAL KESELURUHAN ({totalOrders} PO)
                </td>
                <td className="py-3 px-2 text-center text-indigo-900 font-black font-mono text-sm">
                  {totalQtyAll} Pcs
                </td>
                <td className="py-3 px-3 text-right text-slate-900 font-black font-mono text-sm">
                  {formatRupiah(totalTagihanAll)}
                </td>
                <td className="py-3 px-3 text-right text-emerald-700 font-black font-mono text-sm">
                  {formatRupiah(totalUangMasukAll)}
                </td>
                <td className="py-3 px-3 text-right text-rose-700 font-black font-mono text-sm">
                  {totalSisaTagihanAll <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(totalSisaTagihanAll)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Clean Payment Channel (Bank + QR Code) & Store Signature Footer */}
      <div className="pt-3 border-t border-slate-200 space-y-4">
        
        {/* Payment Channels Grid */}
        <div className="bg-linear-to-r from-slate-50 via-indigo-50/30 to-slate-50 rounded-2xl border border-indigo-100 p-4 shadow-2xs space-y-3">
          
          <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
            <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Saluran Pembayaran Resmi Toko
              </h4>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            
            {/* Bank Transfer Info (Expanded to full width if no qrisImage) */}
            <div className={`${qrisImage ? 'sm:col-span-8' : 'sm:col-span-12'} space-y-2 text-xs`}>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[11px] tracking-wider uppercase shadow-2xs">
                  BANK {bankName || 'BCA'}
                </span>
                <span className="text-[11px] font-extrabold text-slate-700">
                  Transfer Rekening Resmi
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Nomor Rekening</span>
                  <span className="font-mono text-base font-black text-slate-900">{bankNo}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Atas Nama (A/N):</span>
                  <span className="font-bold text-slate-800">{bankOwner}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                *Rekapitulasi ini dihasilkan secara otomatis oleh sistem administrasi pesanan {settings.namaToko || 'Nomaden Apparel'}.
              </p>
            </div>

            {/* Store QR Code / QRIS (Only rendered if qrisImage is set) */}
            {qrisImage && (
              <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-900">
                  <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                  <span>KODE QR PEMBAYARAN</span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs inline-block">
                  <div 
                    className="cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => onLightboxImage?.({ url: qrisImage, title: 'QRIS Pembayaran Toko' })}
                    title="Klik untuk memperbesar QR"
                  >
                    <img 
                      src={qrisImage} 
                      alt="QR Toko" 
                      className="h-20 max-w-[95px] object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <p className="text-[9px] text-slate-500 text-center leading-tight font-medium">
                  Scan via BCA, Mandiri, BRI, Dana, GoPay, OVO, ShopeePay & QRIS
                </p>
              </div>
            )}

          </div>

        </div>

        {/* Footer Notes & Single Signature (Hormat Kami / Toko) */}
        <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs text-slate-600">
          <div className="space-y-1">
            <p className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
              <span>Ketentuan & Verifikasi:</span>
            </p>
            <p className="text-[10px] text-slate-400 max-w-md leading-relaxed">
              1. Rekapitulasi pesanan di atas adalah sah dan tercatat dalam database sistem.<br />
              2. Pelunasan tagihan batch dapat dikonfirmasikan melalui bukti transfer WhatsApp resmi toko.
            </p>
          </div>

          <div className="text-center space-y-10 shrink-0 self-end sm:self-auto min-w-[140px]">
            <p className="text-[11px] font-bold text-slate-700">{settings.hormatKamiToko || 'Hormat Kami,'}</p>
            <div>
              <p className="font-black text-indigo-950 border-b-2 border-slate-300 pb-1 px-6">
                {settings.namaToko || 'Nomaden Apparel'}
              </p>
              {settings.roleSignToko && (
                <p className="text-[10px] text-slate-500 font-semibold mt-1">{settings.roleSignToko}</p>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
});
