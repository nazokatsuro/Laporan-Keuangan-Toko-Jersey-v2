/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { forwardRef } from 'react';
import { Pesanan, ShopSettings } from '../../types';
import { formatRupiah } from '../../utils';
import { QRCodeSVG } from 'qrcode.react';
import { 
  FileText, 
  Image as ImageIcon, 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Receipt,
  Check
} from 'lucide-react';

interface NotaCardProps {
  order: Pesanan;
  settings: ShopSettings;
  onLightboxImage?: (data: { url: string; title: string }) => void;
  className?: string;
  id?: string;
  hidePaymentInfo?: boolean;
}

export const NotaCard = forwardRef<HTMLDivElement, NotaCardProps>(function NotaCard(
  { order, settings, onLightboxImage, className = '', id, hidePaymentInfo = false },
  ref
) {
  const bankName = settings.namaBankToko || 'BCA';
  const bankNo = settings.nomorRekeningToko || '8105-9281-33';
  const bankOwner = settings.atasNamaRekeningToko || settings.namaToko || 'Nomaden Apparel';
  const qrisImage = settings.qrisImageUrl || '';

  const isFullyPaid = (Number(order.sisaTagihan) || 0) <= 0;

  // Calculate total qty
  const totalQty = order.items && order.items.length > 0 
    ? order.items.reduce((acc, it) => acc + (it.qty || 0), 0) 
    : (order.qty || 0);

  // Resolve Material (Bahan) and Collar Model (Bentuk Kerah)
  const displayBahan = order.bahan || (order.items && order.items.length > 0 
    ? Array.from(new Set(order.items.map(it => it.bahan).filter(Boolean))).join(', ') 
    : '') || '-';

  const displayKerah = order.modelKerah || (order.items && order.items.length > 0 
    ? Array.from(new Set(order.items.map(it => it.modelKerah).filter(Boolean))).join(', ') 
    : '') || '-';

  // Generate QRIS payload fallback
  const qrisPayload = `00020101021126580011ID.DANA.WWW01189360091530000000000303UMI51440014ID.QRIS.WWW0503030303035204581253033605802ID5910${(settings.namaToko || 'TOKO').substring(0, 20).toUpperCase()}6007BANDUNG6304NOTA`;

  return (
    <div 
      ref={ref}
      id={id || `nota-card-${order.id}`}
      className={`w-[840px] min-w-[840px] max-w-[840px] min-h-[1188px] p-8 sm:p-10 bg-white text-slate-900 shadow-xl border border-slate-200/90 font-sans flex flex-col justify-between relative overflow-hidden nota-print-target print:shadow-none print:border-none print:p-8 print:m-0 print:w-full print:min-w-0 print:max-w-none print:min-h-0 ${className}`}
      style={{ colorScheme: 'light', boxSizing: 'border-box' }}
    >
      <div className="space-y-6">
        {/* Header Store & Invoice Metadata */}
        <div className="flex flex-row items-center justify-between gap-4 border-b-2 border-indigo-600/30 pb-5">
          
          {/* Store Info */}
          <div className="flex items-center gap-4">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="h-16 w-16 object-contain rounded-xl border border-slate-200 p-1.5 bg-slate-50 shrink-0 shadow-2xs"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                {(settings.namaToko || 'NA').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="space-y-0.5">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {settings.namaToko || 'Nomaden Apparel'}
              </h2>
              {settings.taglineToko && (
                <p className="text-xs font-bold text-indigo-700 tracking-tight">
                  {settings.taglineToko}
                </p>
              )}
              <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed max-w-md">
                {settings.alamatToko || 'Jl. Konveksi & Sublim Printing, Bandung'}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-0.5 font-semibold">
                <span>📞 {settings.noWaToko || '081234567890'}</span>
                <span>•</span>
                <span>IG: @{settings.igToko || 'nomadenapparel'}</span>
              </div>
            </div>
          </div>

          {/* Invoice Status & No */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {/* Prominent Header Text */}
            <div className="text-[13px] font-black uppercase tracking-widest text-slate-600 text-right">
              FAKTUR / NOTA TRANSAKSI
            </div>

            {/* Official Stamp Badge for LUNAS / BELUM LUNAS */}
            <div className="flex items-center justify-end">
              <div className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1 rounded-lg border-2 text-xs font-black tracking-wider uppercase text-center select-none shadow-xs ${
                isFullyPaid 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-600' 
                  : 'bg-rose-50 text-rose-700 border-rose-500'
              }`}>
                {isFullyPaid ? (
                  <>
                    <span className="leading-none">LUNAS</span>
                    <Check className="h-4 w-4 stroke-[3] text-emerald-600 shrink-0" />
                  </>
                ) : (
                  <span className="leading-none">BELUM LUNAS</span>
                )}
              </div>
            </div>

            <div className="font-mono text-base font-black text-indigo-700 text-right">
              #{order.id}
            </div>
            <div className="text-xs text-slate-500 text-right font-medium">
              Tgl: {new Date(order.createdAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
            </div>
          </div>
        </div>

        {/* Invoice Meta Grid */}
        <div className="grid grid-cols-4 gap-4 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Pemesan</span>
            <span className="font-bold text-slate-900 text-sm block truncate">{order.namaPemesan}</span>
            <span className="text-xs text-slate-500 block">{order.noTelepon || '-'}</span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Nama PO / Tim</span>
            <span className="font-extrabold text-indigo-950 text-sm block truncate">{order.namaPo}</span>
            <div className="pt-0.5 text-[11px] text-slate-600 space-y-0.5 font-medium leading-tight">
              <p className="truncate">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider">Bahan: </span>
                <span className="font-bold text-slate-800">{displayBahan}</span>
              </p>
              <p className="truncate">
                <span className="text-slate-400 text-[10px] uppercase tracking-wider">Bentuk Kerah: </span>
                <span className="font-bold text-slate-800">{displayKerah}</span>
              </p>
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Target Deadline</span>
            <span className="font-bold text-amber-800 text-xs block">{order.deadline || '-'}</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Status Produksi</span>
            <span className="font-bold text-slate-800 text-xs block">{order.statusProduksi || 'Setting'}</span>
          </div>
        </div>

        {/* Order Items Table Section with Dedicated TOTAL QTY */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              <span>Rincian Pesanan Produk</span>
            </h4>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-extrabold text-xs">
              <span>Total Qty:</span>
              <span className="font-black text-indigo-700">{totalQty} Pcs</span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3.5">Produk / Spesifikasi</th>
                  <th className="py-2.5 px-3 text-center w-24">Qty</th>
                  <th className="py-2.5 px-3.5 text-right w-36">Harga Satuan</th>
                  <th className="py-2.5 px-3.5 text-right w-40">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it, idx) => (
                    <tr key={it.id || idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3.5">
                        <p className="font-bold text-slate-900 text-xs">{it.namaProduk}</p>
                        {it.keterangan && <p className="text-[10px] text-slate-400 italic">Catatan: {it.keterangan}</p>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{it.qty} Pcs</td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-slate-600">{formatRupiah(it.hargaPerPcs)}</td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">{formatRupiah(it.qty * it.hargaPerPcs)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2.5 px-3.5">
                      <p className="font-bold text-slate-900 text-xs">{order.namaProduk}</p>
                      {order.keterangan && <p className="text-[10px] text-slate-400 italic">Catatan: {order.keterangan}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800">{order.qty} Pcs</td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-slate-600">{formatRupiah(order.hargaPerPcs)}</td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900">{formatRupiah(order.totalHarga)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                  <td className="py-2.5 px-3.5 text-slate-800 uppercase tracking-wider text-[11px]">
                    TOTAL PESANAN
                  </td>
                  <td className="py-2.5 px-3 text-center text-indigo-900 font-black font-mono text-xs">
                    {totalQty} Pcs
                  </td>
                  <td className="py-2.5 px-3.5 text-right text-slate-400 font-medium text-[10px]">-</td>
                  <td className="py-2.5 px-3.5 text-right text-indigo-700 font-black font-mono text-sm">
                    {formatRupiah(order.totalHarga)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Side-by-Side: Mockup & Kerah (LEFT) vs Ringkasan Pembayaran (RIGHT) */}
        <div className="grid grid-cols-12 gap-5 pt-1">
          
          {/* LEFT SIDE: Mockup Jersey & Model Kerah */}
          <div className={`${(order.mockupUrl || order.fotoKerahUrl) ? 'col-span-7' : 'col-span-6'} space-y-3`}>
            {(order.mockupUrl || order.fotoKerahUrl) ? (
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Mockup Desain Jersey</span>
                  </h4>
                </div>

                <div className={`grid ${(order.mockupUrl && order.fotoKerahUrl) ? 'grid-cols-12 gap-3' : 'grid-cols-1'}`}>
                  {/* Mockup Frame */}
                  {order.mockupUrl && (
                    <div className={`${(order.mockupUrl && order.fotoKerahUrl) ? 'col-span-7' : 'col-span-1'} space-y-1`}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 inline-block"></span>
                          Jersey Depan / Belakang
                        </span>
                      </div>
                      <div 
                        className="relative w-full h-44 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2 cursor-pointer shadow-2xs hover:border-indigo-300 transition-all"
                        onClick={() => onLightboxImage?.({ url: order.mockupUrl!, title: `Mockup Jersey - ${order.namaPo}` })}
                      >
                        <img 
                          src={order.mockupUrl} 
                          alt="Mockup Desain Jersey" 
                          className="max-h-full max-w-full w-auto h-auto object-contain select-none drop-shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Kerah Frame */}
                  {order.fotoKerahUrl && (
                    <div className={`${(order.mockupUrl && order.fotoKerahUrl) ? 'col-span-5' : 'col-span-1'} space-y-1`}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block"></span>
                          Detail Kerah
                        </span>
                      </div>
                      <div 
                        className="relative w-full h-44 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2 cursor-pointer shadow-2xs hover:border-amber-300 transition-all"
                        onClick={() => onLightboxImage?.({ url: order.fotoKerahUrl!, title: `Detail Kerah - ${order.namaPo}` })}
                      >
                        <img 
                          src={order.fotoKerahUrl} 
                          alt="Detail Kerah" 
                          className="max-h-full max-w-full w-auto h-auto object-contain select-none drop-shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Fallback when no mockup uploaded */
              <div className="bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-4 flex flex-col items-center justify-center text-center text-slate-400 h-full min-h-[140px]">
                <ImageIcon className="h-7 w-7 text-slate-300 mb-1.5" />
                <p className="text-xs font-medium">Tidak ada lampiran gambar mockup jersey</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Produksi mengacu pada rincian spesifikasi pesanan</p>
              </div>
            )}

            {/* Sizing image if present */}
            {order.detailSizeNamaGambarUrl && (
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-800 flex items-center gap-1.5 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    Lampiran Daftar Nama & Size
                  </span>
                </div>
                <div 
                  className="relative w-full h-36 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2 cursor-pointer shadow-2xs hover:border-emerald-300 transition-all"
                  onClick={() => onLightboxImage?.({ url: order.detailSizeNamaGambarUrl!, title: `Daftar Nama & Size - ${order.namaPo}` })}
                >
                  <img 
                    src={order.detailSizeNamaGambarUrl} 
                    alt="Daftar Nama & Size" 
                    className="max-h-full max-w-full w-auto h-auto object-contain select-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Financial Summary Box */}
          <div className={`${(order.mockupUrl || order.fotoKerahUrl) ? 'col-span-5' : 'col-span-6'} space-y-3 flex flex-col justify-between`}>
            
            {/* Financial Summary Box */}
            <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 text-xs space-y-3 shadow-2xs">
              <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Ringkasan Pembayaran</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">IDR (Rupiah)</span>
              </h5>

              <div className="space-y-2">
                <div className="flex justify-between py-1 text-slate-600">
                  <span className="font-medium">Total Tagihan Pesanan:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{formatRupiah(order.totalHarga)}</span>
                </div>

                <div className="flex justify-between py-1 text-slate-600 border-b border-slate-200 pb-2">
                  <span className="font-medium">Uang Masuk (DP / Cicilan):</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{formatRupiah(order.uangMasuk)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center py-2.5 bg-white px-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-xs font-black text-slate-800">Sisa Tagihan:</span>
                <span className={`font-mono text-base font-black ${isFullyPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isFullyPaid ? 'LUNAS (Rp 0)' : formatRupiah(order.sisaTagihan)}
                </span>
              </div>

              <div className="text-[10px] text-slate-500 bg-indigo-50/50 p-2 rounded-lg border border-indigo-100/60 flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>Pelunasan dilakukan saat pesanan selesai sebelum pengiriman/pengambilan barang.</span>
              </div>
            </div>

          </div>

        </div>

        {/* Clean Payment Channel: Bank Transfer (Left) + QRIS (Right) */}
        {!hidePaymentInfo && (
          <div className="bg-linear-to-r from-slate-50 via-indigo-50/30 to-slate-50 rounded-2xl border border-indigo-100 p-4 shadow-2xs space-y-3">
            
            <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
              <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <CreditCard className="h-3.5 w-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Saluran Pembayaran Resmi
                </h4>
              </div>
            </div>

            {/* Dual Grid: Bank Transfer Left | QRIS Right */}
            <div className="grid grid-cols-12 gap-5 items-center">
              
              {/* LEFT SIDE: Bank Account (Expanded to full width if no qrisImage) */}
              <div className={`${qrisImage ? 'col-span-7' : 'col-span-12'} space-y-2`}>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[11px] tracking-wider uppercase shadow-2xs">
                    BANK {bankName || 'BCA'}
                  </span>
                  <span className="text-[11px] font-extrabold text-slate-700">
                    Transfer Rekening Resmi
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nomor Rekening Tujuan</p>
                  <p className="font-mono text-lg font-black text-slate-900 tracking-wider">
                    {bankNo || '-'}
                  </p>
                </div>

                <div className="text-xs px-1 text-slate-600">
                  <span className="text-slate-400 font-medium">Atas Nama (A/N): </span>
                  <span className="font-black text-slate-800">{bankOwner || settings.namaToko || 'Nomaden Apparel'}</span>
                </div>

                <p className="text-[10px] text-slate-400 italic px-1">
                  *Mohon cantumkan Nama PO (<strong>{order.namaPo}</strong>) pada berita transfer.
                </p>
              </div>

              {/* RIGHT SIDE: QRIS Instant Payment (Only rendered if qrisImage is set) */}
              {qrisImage && (
                <div className="col-span-5 flex flex-col items-center justify-center p-3.5 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-indigo-900">
                    <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                    <span>QRIS PEMBAYARAN INSTAN</span>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs inline-block">
                    <div 
                      className="cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => onLightboxImage?.({ url: qrisImage, title: 'QRIS Pembayaran Toko' })}
                      title="Klik untuk memperbesar QRIS"
                    >
                      <img 
                        src={qrisImage} 
                        alt="QRIS Toko" 
                        className="h-24 max-w-[110px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-500 text-center leading-tight font-medium">
                    BCA, Mandiri Livin, BRImo, Dana, GoPay, OVO, ShopeePay & QRIS lainnya.
                  </p>
                </div>
              )}

            </div>

          </div>
        )}
      </div>

      {/* Footer Signatures & Terms */}
      <div className="pt-6 mt-4 border-t border-slate-200 flex flex-row justify-between items-end gap-4 text-xs text-slate-600">
        <div className="space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
            <span>Ketentuan & Garansi:</span>
          </p>
          <p className="text-[10px] text-slate-400 max-w-md leading-relaxed">
            1. Pesanan diproduksi sesuai spesifikasi bahan, ukuran, dan kerah yang tertera.<br />
            2. Pelunasan dilakukan saat pesanan selesai sebelum pengiriman/pengambilan barang.
          </p>
          <p className="text-[9px] text-slate-400 pt-1">
            Dokumen Faktur / Nota Transaksi Resmi • {settings.namaToko || 'Nomaden Apparel'}
          </p>
        </div>

        <div className="text-center space-y-10 shrink-0 min-w-[160px]">
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
  );
});
