import React from 'react';
import { Pesanan, ShopSettings } from '../types';
import { 
  Scissors, 
  ShoppingBag, 
  ClipboardList, 
  Layers, 
  Check, 
  ImageOff
} from 'lucide-react';

interface SpkJahitPageDetail {
  type: 'details' | 'drawings' | 'sizing';
  badge: string;
  sub: string;
  sizingLines?: string[];
  pageLabel: string;
}

export function getSpkJahitPagesContent(item: Pesanan): SpkJahitPageDetail[] {
  const pages: SpkJahitPageDetail[] = [];

  // Page 1 is always main details
  pages.push({
    type: 'details',
    badge: 'SPK JAHIT (1/[TOTAL])',
    sub: 'Fokus Kerja & Spesifikasi Jahit',
    pageLabel: 'page1',
  });

  // Page 2 is always drawings (Mockup & Collar) - centered proportionally
  pages.push({
    type: 'drawings',
    badge: 'SPK JAHIT (2/[TOTAL])',
    sub: 'Gambar Mockup & Bentuk Kerah (Collar)',
    pageLabel: 'page2',
  });

  // Page 3+ is for sizing data, if it exists
  const rawLines = item.detailSizeNama 
    ? item.detailSizeNama.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0) 
    : [];

  if (rawLines.length > 0) {
    // Each page can hold up to 60 lines divided into two columns of 30 lines each
    const linesPerPage = 60;
    const chunkedLines: string[][] = [];
    for (let i = 0; i < rawLines.length; i += linesPerPage) {
      chunkedLines.push(rawLines.slice(i, i + linesPerPage));
    }

    chunkedLines.forEach((linesChunk, idx) => {
      pages.push({
        type: 'sizing',
        badge: `SPK JAHIT (${3 + idx}/[TOTAL])`,
        sub: chunkedLines.length > 1 
          ? `Data Sizing & Daftar Nama Konsumen (Bagian ${idx + 1})` 
          : 'Data Sizing & Daftar Nama Konsumen (Lengkap)',
        sizingLines: linesChunk,
        pageLabel: `page3-${idx}`,
      });
    });
  }

  // Update total pages in badges
  const total = pages.length;
  pages.forEach((p) => {
    p.badge = p.badge.replace('[TOTAL]', total.toString());
  });

  return pages;
}

function CollarGraphic({ type }: { type?: string }) {
  const norm = (type || '').toLowerCase();
  
  if (norm.includes('v-neck') || norm.includes('v neck') || norm.includes('kerah v') || norm.includes('lancip')) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
        <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 0 C40 20, 60 20, 90 0 M20 0 L50 48 L80 0" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20 0 L50 36 L80 0" stroke="currentColor" strokeWidth="2" strokeLinearray="2,2" />
          <text x="50" y="55" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">V-NECK STYLE</text>
        </svg>
      </div>
    );
  }
  
  if (norm.includes('polo') || norm.includes('wangky') || norm.includes('lipat')) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
        <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 5 L50 35 L80 5" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
          <path d="M20 5 L35 40 L50 35 L65 40 L80 5" fill="currentColor" opacity="0.1" />
          <path d="M50 35 L50 55" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="50" cy="42" r="2" fill="#ef4444" />
          <circle cx="50" cy="50" r="2" fill="#ef4444" />
          <text x="50" y="58" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">POLO STYLE</text>
        </svg>
      </div>
    );
  }
  
  if (norm.includes('shanghai') || norm.includes('koko') || norm.includes('kerah sanghai') || norm.includes('shanghay')) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
        <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25 25 C40 12, 60 12, 75 25" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
          <path d="M43 18 L50 25 L57 18" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="18" r="2.5" fill="#10b981" />
          <text x="50" y="55" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">SHANGHAI STYLE</text>
        </svg>
      </div>
    );
  }
  
  if (norm.includes('sleting') || norm.includes('resleting') || norm.includes('zipper')) {
    return (
      <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
        <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 5 C35 15, 65 15, 80 5" stroke="currentColor" strokeWidth="3" />
          <path d="M50 12 L50 48" stroke="currentColor" strokeWidth="4" strokeLinearray="1,1"/>
          <rect x="47" y="16" width="6" height="10" rx="1" fill="#374151" />
          <text x="50" y="58" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">ZIPPER STYLE</text>
        </svg>
      </div>
    );
  }

  // Default Standard O-Neck
  return (
    <div className="flex flex-col items-center justify-center p-2 bg-slate-50 border border-slate-200 rounded-lg h-28 w-28 mx-auto shadow-xs">
      <svg className="w-20 h-16 text-indigo-650" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 5 C30 25, 70 25, 80 5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="M20 5 C30 22, 70 22, 80 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
        <text x="50" y="55" fill="#4f46e5" fontSize="8" fontWeight="bold" textAnchor="middle">O-NECK STYLE</text>
      </svg>
    </div>
  );
}

interface SpkJahitDocumentProps {
  key?: any;
  item: Pesanan;
  index: number;
  pesananArray: Pesanan[];
  settings: ShopSettings;
}

export function SpkJahitDocument({ item, index, pesananArray, settings }: SpkJahitDocumentProps) {
  const spkPages = getSpkJahitPagesContent(item);

  return (
    <React.Fragment>
      {spkPages.map((page, pageIdx) => {
        const isLastPageOfThisItem = pageIdx === spkPages.length - 1;
        const isLastItemOfAll = index === pesananArray.length - 1;
        const shouldBreakPage = !isLastPageOfThisItem || !isLastItemOfAll;

        return (
          <div
            key={`${item.id}-${page.pageLabel}`}
            id={`invoice-paper-${item.id}-${page.pageLabel}`}
            className={`w-full max-w-[680px] bg-white p-6 sm:p-10 rounded-xs shadow-md text-slate-805 border border-slate-200/60 font-sans relative invoice-card text-left ${
              shouldBreakPage ? 'page-break' : ''
            }`}
          >
            <div className="space-y-6 text-left relative">
              {/* Decorative header */}
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-indigo-900">
                    SURAT PERINTAH KERJA (SPK) PRODUCTION
                  </h1>
                  <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mt-0.5">
                    {page.sub}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] bg-indigo-105 text-indigo-800 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                    {page.badge}
                  </span>
                  <h2 className="text-xs font-black text-slate-500 mt-1">NO: #{item.id}</h2>
                </div>
              </div>

              {/* Metadata bar */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama Konsumen / Pemesan</span>
                  <strong className="text-xs text-slate-800">{item.namaPemesan || 'N/A'}</strong>
                </div>
                <div>
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Nama PO / Tim</span>
                  <strong className="text-xs text-slate-800">{item.namaPo || 'N/A'}</strong>
                </div>
                <div>
                  <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Target Selesai (Deadline)</span>
                  <strong className="text-xs text-rose-600 font-black">
                    {new Date(item.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </strong>
                </div>
              </div>

              {/* Render Content Specific to Page Type */}
              {page.type === 'details' && (
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-5">
                    {/* Detail Bahan */}
                    <div className="p-3.5 bg-indigo-50/20 rounded-xl border border-indigo-100/70">
                      <span className="block text-[9px] font-extrabold text-indigo-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Scissors className="h-3 w-3 text-indigo-600" /> Bahan Jersey Pelanggan
                      </span>
                      <p className="text-xs font-semibold text-slate-850">
                        {item.items && item.items.length > 0
                          ? item.items.map(it => `${it.namaProduk} (${it.bahan})`).join(', ')
                          : (item.bahan || 'Bahan Jersey')}
                      </p>
                    </div>

                    {/* Item Qty List and Miscellaneous */}
                    <div className="p-3.5 bg-teal-50/20 rounded-xl border border-teal-100/70">
                      <span className="block text-[9px] font-extrabold text-teal-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <ShoppingBag className="h-3 w-3 text-teal-600" /> Jenis Produk &amp; Total Qty
                      </span>
                      <div className="text-xs space-y-1 text-slate-755">
                        {((item.items && item.items.length > 0) ? item.items : [{
                          namaProduk: item.namaProduk,
                          qty: item.qty
                        }]).map((p, pIdx) => (
                          <div key={pIdx} className="flex justify-between border-b border-dashed border-slate-150 py-1">
                            <span className="font-medium text-slate-800">{p.namaProduk}</span>
                            <span className="font-bold text-slate-950">{p.qty} pcs</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-black pt-1.5 text-indigo-900 text-xs">
                          <span>TOTAL KESELURUHAN</span>
                          <span>{item.qty} pcs</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Deskripsi Jahit */}
                    <div className="p-3.5 bg-indigo-50/20 rounded-xl border border-indigo-100/70 h-full flex flex-col">
                      <span className="block text-[9px] font-extrabold text-indigo-900 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <ClipboardList className="h-3 w-3 text-indigo-600" /> Deskripsi Jahitan &amp; Catatan
                      </span>
                      <p className="text-xs text-slate-755 whitespace-pre-wrap leading-relaxed flex-1">
                        {item.items && item.items.length > 0
                          ? item.items.map(it => `${it.namaProduk}: ${it.keterangan || '(Tanpa Catatan)'}`).join('\n')
                          : (item.keterangan || '(Tanpa Catatan)')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {page.type === 'drawings' && (
                <div className="grid grid-cols-2 gap-6 pt-4 flex-1 items-stretch">
                  {/* Jersey Mockup Card */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between h-full min-h-[340px]">
                    <span className="block text-[9px] font-extrabold text-slate-450 uppercase tracking-widest mb-3 text-center">
                      Gambar Mockup Desain Jersey (PO)
                    </span>
                    <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-slate-150 p-2 overflow-hidden shadow-inner">
                      {item.mockupUrl ? (
                        <img 
                          src={item.mockupUrl} 
                          alt="Jersey Mockup" 
                          className="max-h-[260px] max-w-full object-contain mx-auto transition-transform duration-300 hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300 gap-1.5 py-12">
                          <ImageOff className="h-10 w-10 text-slate-400 animate-pulse" />
                          <span className="text-[10.5px] font-bold text-slate-400">Mockup desain tidak tersedia</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bentuk Kerah Card */}
                  <div className="p-4 bg-indigo-50/15 rounded-xl border border-indigo-150/50 flex flex-col justify-between h-full min-h-[340px]">
                    <div>
                      <span className="block text-[9px] font-extrabold text-indigo-900 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-indigo-600" /> Bentuk Kerah (Collar)
                      </span>
                      <p className="text-sm font-black text-slate-855 text-center mb-3">
                        {item.items && item.items.length > 0
                          ? item.items.map(it => `${it.modelKerah || 'O-Neck (Standar)'}`).join(', ')
                          : (item.modelKerah || 'O-Neck (Standar)')}
                      </p>
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-indigo-105 p-3 overflow-hidden shadow-inner select-none">
                      {item.fotoKerahUrl ? (
                        <img
                          src={item.fotoKerahUrl}
                          alt="Custom Collar"
                          className="max-h-[220px] max-w-full object-contain rounded-lg mx-auto"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full flex justify-center items-center">
                          <CollarGraphic type={item.modelKerah || (item.items && item.items[0]?.modelKerah)} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {page.type === 'sizing' && page.sizingLines && (
                <div className="p-4 bg-amber-50/25 rounded-xl border border-amber-250/70 flex flex-col h-full min-h-[440px]">
                  <span className="block text-[9px] font-extrabold text-amber-800 uppercase tracking-widest mb-3 flex items-center gap-1.5 justify-center sm:justify-start">
                    <Check className="h-3.5 w-3.5 text-amber-650" /> {page.sub}
                  </span>
                  <div className="bg-white p-4 rounded-lg border border-amber-105 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 font-mono select-all flex-1 text-[10px]">
                    {/* Column 1 */}
                    <div className="space-y-1">
                      {page.sizingLines.slice(0, Math.ceil(page.sizingLines.length / 2)).map((line, lIdx) => (
                        <div key={`col1-${lIdx}`} className="whitespace-pre py-0.5 border-b border-dashed border-slate-100 text-slate-800 text-[10.5px]">
                          {line}
                        </div>
                      ))}
                    </div>
                    {/* Column 2 */}
                    <div className="space-y-1">
                      {page.sizingLines.slice(Math.ceil(page.sizingLines.length / 2)).map((line, lIdx) => (
                        <div key={`col2-${lIdx}`} className="whitespace-pre py-0.5 border-b border-dashed border-slate-100 text-slate-800 text-[10.5px]">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer / Signoffs for factory tracking on each page to avoid truncation */}
              <div className="grid grid-cols-3 gap-6 font-bold text-center text-[10px] uppercase tracking-wider pt-8 text-slate-500">
                <div className="border-t border-slate-200 pt-3">
                  <span className="block text-[8px] text-slate-400 font-normal">Operator Desain/SPK</span>
                  <div className="h-10" />
                  <p className="text-slate-800 font-bold">{settings.namaToko || 'Nomaden Apparel'}</p>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <span className="block text-[8px] text-slate-400 font-normal">Penerima Kerja (Penjahit)</span>
                  <div className="h-10" />
                  <p className="border-b border-dashed border-slate-350 mx-auto w-32"></p>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <span className="block text-[8px] text-slate-400 font-normal">Kepala Produksi (QC)</span>
                  <div className="h-10" />
                  <p className="border-b border-dashed border-slate-350 mx-auto w-32"></p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </React.Fragment>
  );
}
