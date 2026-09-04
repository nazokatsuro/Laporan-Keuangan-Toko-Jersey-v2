/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { SPKData, SPKPlayer } from '../../spkTypes';
import { calculateSizeRecap } from '../../utils/spkParser';
import { AlertTriangle, CheckSquare, Square, ShieldCheck, FileCheck, Layers, ClipboardCheck, Sparkles } from 'lucide-react';

interface SpkSheetA4Props {
  data: SPKData;
  showSafeArea?: boolean;
  scale?: number;
  onToggleQc?: (playerId: string) => void;
  id?: string;
  elementId?: string;
  isPrintOnly?: boolean;
  activePageTab?: 'all' | string;
}

export const SpkSheetA4: React.FC<SpkSheetA4Props> = ({
  data,
  showSafeArea = false,
  scale = 1,
  onToggleQc,
  id,
  elementId,
  isPrintOnly = false,
  activePageTab = 'all'
}) => {
  const docId = id || elementId || 'spk-a4-document';
  const {
    spkNumber,
    customer,
    poName,
    collarModel,
    productModel,
    material,
    sleeveModel,
    sewingModel,
    status,
    productionDate,
    deadline,
    players = [],
    collarImage,
    collarCaption,
    collarZoom = 1,
    collarPosX = 0,
    collarPosY = 0,
    collarRotation = 0,
    jerseyImages = [],
    notes,
    companySettings,
    layout
  } = data;

  const totalPcs = players.length;
  const recap = useMemo(() => calculateSizeRecap(players), [players]);

  // Dynamic Pagination Logic:
  // Fills each page completely to full page capacity (default 50 data per page, supports 50-70+ pcs)
  // Remaining items are gracefully placed on the final continuation page
  const rawMaxPage1 = layout?.maxPlayersPerPage;
  const maxPage1Rows = typeof rawMaxPage1 === 'number' && rawMaxPage1 >= 20 ? rawMaxPage1 : 50;

  const rawContinuation = layout?.continuationPageSize;
  const continuationPageSize = typeof rawContinuation === 'number' && rawContinuation >= 20 ? rawContinuation : 50;

  const pagesData: { pageNumber: number; players: SPKPlayer[]; startIndex: number }[] = useMemo(() => {
    // 1. Force 1 Page
    if (layout?.pageMode === '1page') {
      return [{ pageNumber: 1, players, startIndex: 0 }];
    }

    // 2. Data fits on Page 1 (up to 50 data)
    if (players.length <= maxPage1Rows) {
      return [{ pageNumber: 1, players, startIndex: 0 }];
    }

    // 3. Force 2 Pages max (Page 1 gets full 50 data, Page 2 gets all remainder)
    if (layout?.pageMode === '2page') {
      const page1 = players.slice(0, maxPage1Rows);
      const page2 = players.slice(maxPage1Rows);
      return [
        { pageNumber: 1, players: page1, startIndex: 0 },
        { pageNumber: 2, players: page2, startIndex: maxPage1Rows }
      ];
    }

    // 4. Auto / Multi-Page: Fill each page to full capacity (50 pcs/page), remainder on last page
    const result: { pageNumber: number; players: SPKPlayer[]; startIndex: number }[] = [];
    
    // Page 1 (Full page: up to 50 data)
    const page1 = players.slice(0, maxPage1Rows);
    result.push({ pageNumber: 1, players: page1, startIndex: 0 });

    // Continuation pages: Each page fills completely (50 pcs), last page takes remaining
    let currentOffset = maxPage1Rows;
    let pageNum = 2;

    while (currentOffset < players.length) {
      const pageChunk = players.slice(currentOffset, currentOffset + continuationPageSize);
      result.push({
        pageNumber: pageNum,
        players: pageChunk,
        startIndex: currentOffset
      });
      currentOffset += continuationPageSize;
      pageNum += 1;
    }

    return result;
  }, [players, maxPage1Rows, continuationPageSize, layout?.pageMode]);

  const totalPages = pagesData.length;

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'URGENT':
        return { bg: 'bg-[#F05B83]', text: 'text-white' };
      case 'PRIORITAS':
        return { bg: 'bg-[#F59E0B]', text: 'text-white' };
      case 'SELESAI':
        return { bg: 'bg-[#006B50]', text: 'text-white' };
      case 'HOLD':
        return { bg: 'bg-slate-500', text: 'text-white' };
      case 'NORMAL':
      default:
        return { bg: 'bg-[#00805F]', text: 'text-white' };
    }
  };

  const statusStyle = getStatusBadge(status);
  const visibleMockups = jerseyImages.filter(img => img.includedInSpk);

  // Reusable Player Table Row with adaptive density (supports up to 50-70 rows per page)
  const renderPlayerRow = (p: SPKPlayer, idx: number, totalInTable: number, displayIndex: number) => {
    const isEven = idx % 2 === 1;
    const isLongSleeve = (p.model || '').toUpperCase().includes('PANJANG') || (p.model || '').toUpperCase().includes('PJG');
    const isKiper = (p.notes || '').toUpperCase().includes('KIPER');

    const isUltraDensity = totalInTable > 40;
    const isHighDensity = totalInTable > 24;

    const pyClass = isUltraDensity ? 'py-[0.5px]' : isHighDensity ? 'py-[1.5px]' : 'py-1';
    const textSz = isUltraDensity ? 'text-[7.5px]' : isHighDensity ? 'text-[8px]' : 'text-[9px]';
    const nameSz = isUltraDensity ? 'text-[8px]' : isHighDensity ? 'text-[8.5px]' : 'text-[9px]';

    return (
      <tr
        key={p.id || idx}
        className={`${isEven ? 'bg-slate-50/70' : 'bg-white'} ${
          isHighDensity ? 'leading-none' : 'leading-normal'
        } hover:bg-emerald-50/30 transition-colors`}
      >
        {/* NO */}
        <td className={`text-center font-bold text-slate-600 border-r border-slate-200 ${pyClass} px-1 ${textSz}`}>
          {displayIndex}
        </td>

        {/* NAMA */}
        <td className={`font-black text-slate-900 border-r border-slate-200 truncate ${pyClass} px-1.5 ${nameSz}`}>
          {p.name}
        </td>

        {/* SZ (Size) */}
        <td className={`text-center font-black text-slate-900 border-r border-slate-200 ${pyClass} px-1 ${textSz}`}>
          <span className="inline-block font-extrabold text-slate-800">
            {p.size}
          </span>
        </td>

        {/* NOP (Jersey Number with Distinct Green Pill) */}
        <td className={`text-center border-r border-slate-200 ${pyClass} px-1`}>
          <span className={`inline-block font-black text-[#006B50] bg-emerald-50 border border-emerald-200/80 rounded ${
            isUltraDensity
              ? 'px-1 py-0 text-[7.5px] min-w-[18px]'
              : isHighDensity
              ? 'px-1 py-0 text-[8px] min-w-[20px]'
              : 'px-1.5 py-0.5 rounded-md text-[9px] min-w-[24px]'
          }`}>
            {p.number || '-'}
          </span>
        </td>

        {/* MODEL (PENDEK or badge for LENGAN PANJANG / BUNTONG) */}
        <td className={`text-center border-r border-slate-200 ${pyClass} px-1`}>
          {isLongSleeve ? (
            <span className={`inline-block rounded-md bg-amber-100/90 text-amber-900 border border-amber-300/80 font-black tracking-tight ${
              isUltraDensity
                ? 'px-1 py-0 text-[6.5px]'
                : isHighDensity
                ? 'px-1 py-0 text-[7px]'
                : 'px-1.5 py-0.5 text-[8px]'
            }`}>
              PANJANG
            </span>
          ) : (p.model || '').toUpperCase().includes('BUNTONG') ? (
            <span className={`inline-block rounded-md bg-purple-100 text-purple-900 border border-purple-300/80 font-black tracking-tight ${
              isUltraDensity
                ? 'px-1 py-0 text-[6.5px]'
                : isHighDensity
                ? 'px-1 py-0 text-[7px]'
                : 'px-1.5 py-0.5 text-[8px]'
            }`}>
              BUNTONG
            </span>
          ) : (
            <span className={`font-bold text-slate-700 ${textSz}`}>
              {p.model || 'PENDEK'}
            </span>
          )}
        </td>

        {/* KETERANGAN */}
        <td className={`font-bold border-r border-slate-200 truncate ${pyClass} px-1.5 ${textSz} ${
          isKiper ? 'text-amber-800 bg-amber-50/60 font-black' : 'text-slate-600'
        }`}>
          {p.notes || '-'}
        </td>

        {/* QC Checkbox */}
        <td className={`text-center ${pyClass} px-1`}>
          <button
            type="button"
            onClick={() => onToggleQc && onToggleQc(p.id)}
            className="inline-flex items-center justify-center cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
          >
            {p.qc ? (
              <CheckSquare className={`${isHighDensity ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-[#00805F] fill-emerald-100`} />
            ) : (
              <Square className={`${isHighDensity ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-slate-400`} />
            )}
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div
      id={docId}
      className={`spk-document-root ${isPrintOnly ? 'spk-print-target' : ''} flex flex-col gap-8 print:gap-0 select-none`}
    >
      
      {/* =========================================================================
          PAGE 1 (HALAMAN 1: MASTER SPESIFIKASI & ROSTER AWAL)
         ========================================================================= */}
      {(activePageTab === 'all' || activePageTab === '1') && (
        <div
          id={`${docId}-page-1`}
          className="spk-page-a4 relative bg-white text-[#162033] shadow-xl mx-auto print:shadow-none print:m-0 print:border-none"
          style={{
            width: '210mm',
            minWidth: '210mm',
            maxWidth: '210mm',
            height: '297mm',
            minHeight: '297mm',
            maxHeight: '297mm',
            padding: '8mm 9mm 8mm 9mm',
            boxSizing: 'border-box',
            transformOrigin: 'top center',
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            fontFamily: layout?.fontFamily === 'mono' ? 'monospace' : layout?.fontFamily === 'serif' ? 'serif' : 'Inter, system-ui, -apple-system, sans-serif'
          }}
        >
          {/* Safe Area overlay guide (editor only, not printed) */}
          {showSafeArea && (
            <div className="absolute inset-2 border-2 border-dashed border-emerald-400/40 pointer-events-none z-50 no-print flex items-start justify-end p-1">
              <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                A4 SAFE AREA (5mm) — HALAMAN 1 DARI {totalPages}
              </span>
            </div>
          )}

          {/* Page 1 Flex Container */}
          <div className="h-full flex flex-col justify-between overflow-hidden">
            
            {/* 1. HEADER SECTION */}
            {layout?.showHeader && (
              <header className="pb-2 border-b border-[#CBD5E1] shrink-0">
                <div className="flex items-center justify-between gap-2">
                  
                  {/* Left Branding */}
                  <div className="flex items-center gap-3">
                    {companySettings.logoUrl ? (
                      <img
                        src={companySettings.logoUrl}
                        alt={companySettings.name}
                        className="h-11 w-11 object-contain rounded-md border border-[#CBD5E1]"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-lg border-2 border-[#162033] flex items-center justify-center p-1 font-black bg-white shadow-xs">
                        <span className="text-2xl font-black italic tracking-tighter text-[#162033]">N</span>
                      </div>
                    )}

                    <div>
                      <h1
                        className="text-xl font-black tracking-tight leading-none text-[#00805F]"
                        style={{ color: companySettings.primaryColor || '#00805F' }}
                      >
                        {companySettings.name || 'NOMADEN APPAREL'}
                      </h1>
                      <p className="text-[9.5px] font-bold text-slate-700 mt-1 leading-none">
                        {companySettings.tagline || 'Spesialis Pembuatan Jersey Custom & Apparel Olahraga'}
                      </p>
                      <p className="text-[8px] text-slate-500 mt-1 font-medium leading-none">
                        WA: {companySettings.wa} • IG: {companySettings.ig} • {companySettings.address}
                      </p>
                    </div>
                  </div>

                  {/* Right 3 Status Cards */}
                  <div className="flex items-stretch gap-2 shrink-0">
                    {/* Konsumen Card */}
                    <div className="border border-[#CBD5E1] rounded-md px-4 py-1.5 text-center min-w-[110px] flex flex-col justify-center bg-white shadow-2xs">
                      <span className="text-[8.5px] font-bold text-slate-500 tracking-wider uppercase block">KONSUMEN</span>
                      <span className="text-sm font-black text-[#162033] truncate block mt-0.5 uppercase">
                        {customer || 'KIERAHA'}
                      </span>
                    </div>

                    {/* Jumlah Pesanan Card */}
                    <div className="border border-[#CBD5E1] rounded-md px-3.5 py-1.5 text-center min-w-[95px] flex flex-col justify-center bg-white shadow-2xs">
                      <span className="text-[8.5px] font-bold text-slate-500 tracking-wider uppercase block">JUMLAH PESANAN</span>
                      <span className="text-sm font-black text-[#00805F] block mt-0.5">
                        {totalPcs} <span className="text-[10px] font-extrabold">PCS</span>
                      </span>
                    </div>

                    {/* SPK Green Card */}
                    <div
                      className="rounded-md px-4 py-1.5 text-center min-w-[110px] flex flex-col justify-center text-white shadow-xs"
                      style={{ backgroundColor: companySettings.primaryColor || '#00805F' }}
                    >
                      <span className="text-sm font-black tracking-wider leading-none">SPK</span>
                      <span className="text-[7.5px] font-bold tracking-tight opacity-90 leading-none mt-1">
                        SURAT PERINTAH KERJA
                      </span>
                    </div>
                  </div>

                </div>
              </header>
            )}

            {/* 2. ORDER INFO 2-COLUMN SECTION */}
            {layout?.showOrderInfo && (
              <section className="my-2 p-2 rounded-lg border border-[#CBD5E1] bg-slate-50/70 text-[10px] shrink-0">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                  {/* Left Column */}
                  <div className="space-y-0.5">
                    <div className="flex items-center">
                      <span className="w-28 font-bold text-slate-600">NO. SPK</span>
                      <span className="font-bold text-slate-900">: {spkNumber || 'SPK-2026-006'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-28 font-bold text-slate-600">NAMA PO</span>
                      <span className="font-black text-slate-900">: {poName || 'SOLIDARITAS'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-28 font-bold text-slate-600">MODEL KERAH</span>
                      <span className="font-bold text-slate-900">: {collarModel || 'V DATAR + LIDAH'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-28 font-bold text-slate-600">MODEL PESANAN</span>
                      <span className="font-bold text-slate-900">: {productModel || 'SETELAN'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-28 font-bold text-slate-600">BAHAN</span>
                      <span className="font-bold text-slate-900">: {material || 'WAFFLE'}</span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-0.5">
                    <div className="flex items-center">
                      <span className="w-36 font-bold text-slate-600">MODEL TANGAN</span>
                      <span className="font-bold text-slate-900">: {sleeveModel || 'PENDEK'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-36 font-bold text-slate-600">MODEL JAHITAN</span>
                      <span className="font-bold text-slate-900">: {sewingModel || 'FULL STIK'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-36 font-bold text-slate-600">STATUS</span>
                      <span className="flex items-center gap-1">
                        : <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}>
                          {status || 'NORMAL'}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-36 font-bold text-slate-600">TGL PRODUKSI</span>
                      <span className="font-bold text-slate-900">: {productionDate || '-'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-36 font-bold text-slate-600">TGL KIRIM / DEADLINE</span>
                      <span className="font-black text-rose-600">: {deadline || '-'}</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 3. MAIN CONTENT: LEFT (ROSTER TABLE) + RIGHT (PANELS) */}
            <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">
              
              {/* LEFT COLUMN: ROSTER TABLE (7 COLS) */}
              <div className="col-span-7 flex flex-col justify-between h-full overflow-hidden">
                {layout?.showPlayerTable && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    
                    {/* Table Container */}
                    <div className="border border-[#CBD5E1] rounded-t-md overflow-hidden flex-1 flex flex-col bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr
                            className="text-white text-[9.5px] uppercase font-black"
                            style={{ backgroundColor: companySettings.darkColor || '#006B50' }}
                          >
                            <th className="py-1 px-1.5 text-center w-8 border-r border-emerald-700/50">NO</th>
                            <th className="py-1 px-2 border-r border-emerald-700/50">NAMA</th>
                            <th className="py-1 px-1.5 text-center w-8 border-r border-emerald-700/50">SZ</th>
                            <th className="py-1 px-2 text-center w-12 border-r border-emerald-700/50">NOP</th>
                            <th className="py-1 px-2 text-center w-20 border-r border-emerald-700/50">MODEL</th>
                            <th className="py-1 px-2 border-r border-emerald-700/50">KETERANGAN</th>
                            <th className="py-1 px-1 text-center w-7">QC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[9px]">
                          {(pagesData[0]?.players || []).map((p, idx) => 
                            renderPlayerRow(p, idx, pagesData[0].players.length, idx + 1)
                          )}

                          {(pagesData[0]?.players || []).length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-400 font-bold italic">
                                Belum ada data pemain. Klik "Input Data Cepat" atau tambah pemain di editor.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Footer: Roster Subtotal / Total */}
                    <div className="border-x border-b border-[#CBD5E1] rounded-b-md px-3 py-1.5 flex items-center justify-between bg-slate-50 shrink-0">
                      <span className="text-[9.5px] font-black text-slate-800 tracking-wider uppercase">
                        {totalPages > 1 ? `SUBTOTAL HAL. 1 (${pagesData[0]?.players.length || 0} PCS):` : 'TOTAL PEMAIN / ROSTER:'}
                      </span>
                      <div className="flex items-center gap-2">
                        {totalPages > 1 && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                            Lanjut Hal. 2 ➔
                          </span>
                        )}
                        <span className="text-xs font-black text-[#00805F]">
                          {totalPages > 1 ? `${pagesData[0]?.players.length || 0} / ${totalPcs}` : totalPcs} <span className="text-[9px] font-bold">PCS</span>
                        </span>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: PANELS (5 COLS) */}
              <div className="col-span-5 flex flex-col justify-between h-full gap-2 overflow-hidden">
                
                {/* PANEL 1: PREVIEW MODEL KERAH */}
                {layout?.showCollarPreview && (
                  <div className="border border-[#CBD5E1] rounded-md overflow-hidden bg-white shrink-0">
                    <div
                      className="py-1 px-2 text-center text-white text-[9px] font-black tracking-wider uppercase"
                      style={{ backgroundColor: companySettings.darkColor || '#006B50' }}
                    >
                      PREVIEW MODEL KERAH
                    </div>
                    <div className="p-1.5 flex flex-col items-center justify-center bg-slate-50/50">
                      {collarImage ? (
                        <div className="h-20 w-full flex items-center justify-center overflow-hidden relative">
                          <img
                            src={collarImage}
                            alt="Collar Preview"
                            className="max-h-full max-w-full object-contain transition-transform"
                            style={{
                              transform: `scale(${collarZoom}) translate(${collarPosX}%, ${collarPosY}%) rotate(${collarRotation}deg)`
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-full flex items-center justify-center text-slate-400 text-[9px] font-bold">
                          Gambar kerah belum diupload
                        </div>
                      )}

                      <div
                        className="mt-1 px-3 py-0.5 rounded-full text-white text-[8px] font-black tracking-wider uppercase shadow-2xs"
                        style={{ backgroundColor: companySettings.darkColor || '#006B50' }}
                      >
                        {collarCaption || collarModel || 'V DATAR + LIDAH'}
                      </div>
                    </div>
                  </div>
                )}

                {/* PANEL 2: REKAP UKURAN */}
                {layout?.showSizeRecap && (
                  <div className="border border-[#CBD5E1] rounded-md overflow-hidden bg-white shrink-0">
                    <div
                      className="py-1 px-2 text-center text-white text-[9px] font-black tracking-wider uppercase"
                      style={{ backgroundColor: companySettings.darkColor || '#006B50' }}
                    >
                      REKAP UKURAN
                    </div>
                    <table className="w-full text-center text-[8.5px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-extrabold text-slate-700 border-b border-slate-200">
                          <th className="py-0.5 border-r border-slate-200">SIZE</th>
                          <th className="py-0.5 border-r border-slate-200">PENDEK</th>
                          <th className="py-0.5 border-r border-slate-200">PJG</th>
                          <th className="py-0.5">TTL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-bold text-slate-800">
                        {recap.rows.map(row => (
                          <tr key={row.size} className="hover:bg-slate-50">
                            <td className="py-0.5 border-r border-slate-200 font-black">{row.size}</td>
                            <td className="py-0.5 border-r border-slate-200">{row.pendek || '-'}</td>
                            <td className="py-0.5 border-r border-slate-200 text-amber-700">{row.pjg || '-'}</td>
                            <td className="py-0.5 font-black">{row.total || '0'}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#E6F7F0] text-[#006B50] font-black border-t-2 border-[#006B50]">
                          <td className="py-0.5 border-r border-emerald-200">JUMLAH</td>
                          <td className="py-0.5 border-r border-emerald-200">{recap.totalPendek}</td>
                          <td className="py-0.5 border-r border-emerald-200 text-amber-800">{recap.totalPjg}</td>
                          <td className="py-0.5 text-xs">{recap.grandTotal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* PANEL 3: DESIGN JERSEY (MOCKUP PRODUKSI) */}
                {layout?.showJerseyDesign && (
                  <div className="border border-[#CBD5E1] rounded-md overflow-hidden bg-white flex-1 flex flex-col min-h-0">
                    <div
                      className="py-1 px-2 flex items-center justify-between text-white text-[9px] font-black tracking-wider uppercase shrink-0"
                      style={{ backgroundColor: companySettings.darkColor || '#006B50' }}
                    >
                      <span>DESIGN JERSEY</span>
                      <span className="text-[7px] opacity-80">MOCKUP PRODUKSI</span>
                    </div>
                    <div className="flex-1 p-1 bg-slate-50/50 flex items-center justify-center overflow-hidden relative min-h-[130px]">
                      {visibleMockups.length > 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 overflow-hidden">
                          {visibleMockups.map(img => (
                            <div key={img.id} className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
                              <img
                                src={img.url}
                                alt={img.title}
                                className="max-h-full max-w-full object-contain transition-transform"
                                style={{
                                  transform: `scale(${img.zoom || 1}) translate(${img.posX || 0}%, ${img.posY || 0}%) rotate(${img.rotation ?? 90}deg)`,
                                  opacity: img.opacity ?? 1
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-3 text-slate-400 text-[8.5px] font-bold">
                          Mockup desain belum diupload atau dinonaktifkan.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PANEL 4: CATATAN PENJAHIT & INSTRUKSI JAHIT */}
                {layout?.showTailorNotes && (
                  <div className="border border-amber-400/80 rounded-md overflow-hidden bg-amber-50/40 shrink-0">
                    <div className="bg-amber-100/90 border-b border-amber-300/80 py-0.5 px-2 flex items-center justify-between text-[8px] font-black text-amber-900">
                      <div className="flex items-center gap-1">
                        <span className="bg-amber-500 text-white px-1 py-0.2 rounded font-black text-[7.5px] flex items-center gap-0.5">
                          <AlertTriangle className="h-2.5 w-2.5" /> CATATAN PENJAHIT
                        </span>
                        <span className="tracking-tight uppercase">INSTRUKSI JAHIT & QC</span>
                      </div>
                      <span className="text-amber-800 font-extrabold uppercase truncate max-w-[110px]">
                        KERAH: {notes?.kerah || collarModel || 'V DATAR + LIDAH'}
                      </span>
                    </div>

                    <div className="p-1.5 space-y-1 text-[8.5px]">
                      <p className="font-black text-slate-900 tracking-tight leading-tight uppercase">
                        {notes?.mainNote || 'TUTUP KERAH POLOS, FULL STIK'}
                      </p>
                      
                      <div className="grid grid-cols-3 gap-1 pt-0.5 border-t border-amber-200/60 text-[8px]">
                        <div>
                          <span className="text-slate-500 font-bold block">Jahit:</span>
                          <span className="font-black text-slate-900 uppercase">{notes?.jahit || sewingModel || 'FULL STIK'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">Bahan:</span>
                          <span className="font-black text-slate-900 uppercase">{notes?.bahan || material || 'WAFFLE'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold block">Tangan:</span>
                          <span className="font-black text-slate-900 uppercase">{notes?.tangan || sleeveModel || 'PENDEK'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* 4. FOOTER NOTE & PAGE NUMBER */}
            <div className="pt-2 mt-1 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-400 font-medium shrink-0">
              <span className="truncate max-w-[420px]">
                {companySettings.footerNote || 'Surat Perintah Kerja (SPK) resmi Nomaden Apparel. Harap ikuti spesifikasi dengan seksama.'}
              </span>
              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                {totalPages > 1 ? `Halaman 1 dari ${totalPages} (Spesifikasi & Roster Awal)` : 'Halaman 1 dari 1 (Dokumen Lengkap)'}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          CONTINUATION PAGES: PAGE 2, PAGE 3, ..., PAGE N
         ========================================================================= */}
      {pagesData.slice(1).map((page) => {
        const pageNum = page.pageNumber;
        const isCurrentPageActive = activePageTab === 'all' || activePageTab === String(pageNum);
        if (!isCurrentPageActive) return null;

        const isLastPage = pageNum === totalPages;
        const pagePlayers = page.players;
        const isHighDensityContinuation = pagePlayers.length > 20;

        return (
          <div
            key={`page-${pageNum}`}
            id={`${docId}-page-${pageNum}`}
            className="spk-page-a4 relative bg-white text-[#162033] shadow-xl mx-auto print:shadow-none print:m-0 print:border-none"
            style={{
              width: '210mm',
              minWidth: '210mm',
              maxWidth: '210mm',
              height: '297mm',
              minHeight: '297mm',
              maxHeight: '297mm',
              padding: '8mm 9mm 8mm 9mm',
              boxSizing: 'border-box',
              transformOrigin: 'top center',
              transform: scale !== 1 ? `scale(${scale})` : undefined,
              fontFamily: layout?.fontFamily === 'mono' ? 'monospace' : layout?.fontFamily === 'serif' ? 'serif' : 'Inter, system-ui, -apple-system, sans-serif'
            }}
          >
            {/* Safe Area overlay guide (editor only) */}
            {showSafeArea && (
              <div className="absolute inset-2 border-2 border-dashed border-indigo-400/40 pointer-events-none z-50 no-print flex items-start justify-end p-1">
                <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                  A4 SAFE AREA (5mm) — HALAMAN {pageNum} DARI {totalPages}
                </span>
              </div>
            )}

            {/* Page Flex Container */}
            <div className="h-full flex flex-col justify-between overflow-hidden">
              
              {/* 1. COMPACT SUB-HEADER */}
              <header className="pb-2 border-b-2 border-emerald-600 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg border-2 border-[#162033] flex items-center justify-center p-1 font-black bg-white shadow-2xs">
                      <span className="text-xl font-black italic tracking-tighter text-[#162033]">N</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#00805F] uppercase tracking-tight">
                          {companySettings.name || 'NOMADEN APPAREL'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[8px] font-black uppercase tracking-wider">
                          LEMBAR {pageNum} — LAMPIRAN ROSTER {isLastPage ? `(SISA ${pagePlayers.length} PCS) & QC` : `(FULL ${pagePlayers.length} PCS)`}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-700">
                        SPK: <span className="font-mono text-[#00805F] font-black">{spkNumber || 'SPK-2026-006'}</span> | PO: <span className="font-black">{poName || 'SOLIDARITAS'}</span> | Konsumen: <span className="font-bold">{customer || 'KIERAHA'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Status Summary */}
                  <div className="flex items-center gap-2">
                    <div className="border border-slate-300 rounded-md px-3 py-1 text-center bg-slate-50 text-[9px]">
                      <span className="text-slate-500 font-bold block text-[7.5px]">ROSTER HAL. {pageNum}</span>
                      <span className="font-black text-slate-900">{pagePlayers.length} PCS</span>
                    </div>

                    <div className="rounded-md px-3 py-1 text-center bg-[#00805F] text-white text-[9px]">
                      <span className="opacity-80 font-bold block text-[7.5px]">GRAND TOTAL</span>
                      <span className="font-black">{totalPcs} PCS</span>
                    </div>
                  </div>

                </div>
              </header>

              {/* 2. MAIN CONTENT: LEFT (ROSTER LANJUTAN) + RIGHT (MOCKUP & QC / PANDUAN) */}
              <div className="flex-1 grid grid-cols-12 gap-3 my-2 min-h-0 overflow-hidden">
                
                {/* LEFT COLUMN: ROSTER TABLE LANJUTAN (7 COLS) */}
                <div className="col-span-7 flex flex-col justify-between h-full overflow-hidden">
                  <div className="flex-1 flex flex-col overflow-hidden">
                    
                    <div className="border border-[#CBD5E1] rounded-t-md overflow-hidden flex-1 flex flex-col bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr
                            className="text-white text-[9.5px] uppercase font-black"
                            style={{ backgroundColor: companySettings.darkColor || '#006B50' }}
                          >
                            <th className="py-1 px-1.5 text-center w-8 border-r border-emerald-700/50">NO</th>
                            <th className="py-1 px-2 border-r border-emerald-700/50">NAMA</th>
                            <th className="py-1 px-1.5 text-center w-8 border-r border-emerald-700/50">SZ</th>
                            <th className="py-1 px-2 text-center w-12 border-r border-emerald-700/50">NOP</th>
                            <th className="py-1 px-2 text-center w-20 border-r border-emerald-700/50">MODEL</th>
                            <th className="py-1 px-2 border-r border-emerald-700/50">KETERANGAN</th>
                            <th className="py-1 px-1 text-center w-7">QC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[9px]">
                          {pagePlayers.map((p, idx) => 
                            renderPlayerRow(p, idx, pagePlayers.length, page.startIndex + idx + 1)
                          )}

                          {pagePlayers.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400 font-bold italic">
                                Tidak ada data pemain di halaman ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Footer */}
                    <div className="border-x border-b border-[#CBD5E1] rounded-b-md px-3 py-1.5 flex items-center justify-between bg-slate-50 shrink-0">
                      <span className="text-[9.5px] font-black text-slate-800 tracking-wider uppercase">
                        SUBTOTAL ROSTER HALAMAN {pageNum}:
                      </span>
                      <div className="flex items-center gap-2">
                        {!isLastPage && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                            Lanjut Hal. {pageNum + 1} ➔
                          </span>
                        )}
                        <span className="text-xs font-black text-[#00805F]">
                          {pagePlayers.length} <span className="text-[9px] font-bold">PCS</span>
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* RIGHT COLUMN: DETAIL MOCKUP & QC VERIFIKASI (5 COLS) */}
                <div className="col-span-5 flex flex-col justify-between h-full gap-2.5 overflow-hidden">
                  
                  {/* PANEL 1: MOCKUP PRODUKSI FULL DISPLAY */}
                  <div className="border border-[#CBD5E1] rounded-md overflow-hidden bg-white flex-1 flex flex-col min-h-0">
                    <div
                      className="py-1 px-2 flex items-center justify-between text-white text-[9px] font-black tracking-wider uppercase shrink-0"
                      style={{ backgroundColor: companySettings.darkColor || '#006B50' }}
                    >
                      <span>MOCKUP PRODUKSI & DETAIL VISUAL</span>
                      <span className="text-[7.5px] opacity-85">LAMPIRAN DESAIN</span>
                    </div>
                    
                    <div className="flex-1 p-2 bg-slate-50/60 flex flex-col items-center justify-center overflow-hidden relative min-h-[160px]">
                      {visibleMockups.length > 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 overflow-hidden">
                          {visibleMockups.map(img => (
                            <div key={img.id} className="relative w-full flex-1 flex items-center justify-center overflow-hidden">
                              <img
                                src={img.url}
                                alt={img.title}
                                className="max-h-full max-w-full object-contain transition-transform"
                                style={{
                                  transform: `scale(${img.zoom || 1}) translate(${img.posX || 0}%, ${img.posY || 0}%) rotate(${img.rotation ?? 90}deg)`,
                                  opacity: img.opacity ?? 1
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center p-4 text-slate-400 text-[9px] font-bold">
                          Mockup visual belum diunggah.
                        </div>
                      )}
                    </div>

                    <div className="px-2 py-1 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-600 font-bold">
                      <span>Model: {productModel || 'SETELAN'}</span>
                      <span>Bahan: {material || 'WAFFLE'}</span>
                      <span>Jahit: {sewingModel || 'FULL STIK'}</span>
                    </div>
                  </div>

                  {/* PANEL 2: CATATAN TAMBAHAN & INSTRUKSI QC */}
                  <div className="border border-indigo-200 rounded-md overflow-hidden bg-indigo-50/40 p-2 space-y-1 text-[8px] shrink-0">
                    <div className="flex items-center gap-1 text-indigo-900 font-black uppercase text-[8.5px]">
                      <ShieldCheck className="h-3 w-3 text-indigo-600" />
                      <span>STANDAR QUALITY CONTROL & PACKING</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700 font-medium pl-1">
                      <li>Cek kesesuaian Nomor Punggung & Nama Pemain sesuai daftar.</li>
                      <li>Pastikan kerah model <strong>{collarModel || 'V DATAR + LIDAH'}</strong> terpasang presisi.</li>
                      <li>Bersihkan sisa benang jahit & lakukan setrika uap sebelum packing plastik.</li>
                    </ul>
                  </div>

                  {/* PANEL 3: LEMBAR PENGESAHAN & TANDA TANGAN (Terutama di Halaman Terakhir / QC) */}
                  <div className="border border-slate-300 rounded-md overflow-hidden bg-white p-2 shrink-0">
                    <div className="text-center font-black text-slate-800 text-[8.5px] uppercase tracking-wider mb-1.5 pb-1 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-slate-500 font-bold text-[7.5px]">
                        {isLastPage ? 'LEMBAR AKHIR' : `LEMBAR ${pageNum}`}
                      </span>
                      <span>LEMBAR VERIFIKASI & SERAH TERIMA PRODUKSI</span>
                      <span className="text-slate-500 font-bold text-[7.5px]">
                        QC PASS
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center text-[7.5px]">
                      {/* Sign 1: Admin */}
                      <div className="border border-slate-200 rounded p-1 flex flex-col justify-between h-18 bg-slate-50/50">
                        <span className="font-bold text-slate-500 block">DIBUAT OLEH:</span>
                        <div className="border-b border-dotted border-slate-400 mx-2 my-1" />
                        <span className="font-bold text-slate-800">( Admin / CS )</span>
                      </div>

                      {/* Sign 2: Penjahit */}
                      <div className="border border-slate-200 rounded p-1 flex flex-col justify-between h-18 bg-slate-50/50">
                        <span className="font-bold text-slate-500 block">PRODUKSI / JAHIT:</span>
                        <div className="border-b border-dotted border-slate-400 mx-2 my-1" />
                        <span className="font-bold text-slate-800">( Kepala Jahit )</span>
                      </div>

                      {/* Sign 3: QC Pass */}
                      <div className="border border-emerald-300 rounded p-1 flex flex-col justify-between h-18 bg-emerald-50/50">
                        <span className="font-bold text-[#006B50] block">QC & PACKING:</span>
                        <div className="border-b border-dotted border-emerald-400 mx-2 my-1" />
                        <span className="font-black text-[#006B50]">( QC Lulus )</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* 3. FOOTER NOTE CONTINUATION PAGE */}
              <div className="pt-2 mt-1 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-400 font-medium shrink-0">
                <span className="truncate max-w-[420px]">
                  Lampiran resmi SPK {spkNumber || 'SPK-2026-006'} • {companySettings.name || 'Nomaden Apparel'}. Seluruh hak cipta dilindungi.
                </span>
                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                  Halaman {pageNum} dari {totalPages} (Roster Lanjutan {isLastPage ? '& Verifikasi QC' : ''})
                </span>
              </div>

            </div>
          </div>
        );
      })}

    </div>
  );
};
