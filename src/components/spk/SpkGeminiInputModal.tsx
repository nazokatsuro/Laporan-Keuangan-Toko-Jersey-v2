/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId } from 'react';
import { SPKPlayer, SPKData } from '../../spkTypes';
import { parseRawRosterText, extractHeaderSpecsFromText, sortPlayersList } from '../../utils/spkParser';
import { 
  Sparkles, 
  X, 
  Check, 
  AlertTriangle, 
  Clipboard, 
  RotateCcw, 
  Loader2, 
  ArrowUpDown, 
  SlidersHorizontal, 
  Shirt, 
  Hash, 
  FileText, 
  ShieldAlert, 
  Trash2, 
  Plus,
  Layers,
  CheckCircle2,
  Cpu
} from 'lucide-react';

interface SpkGeminiInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (players: SPKPlayer[], appendMode: boolean, detectedHeader?: Partial<SPKData>) => void;
  defaultModel?: string;
  currentSpkData?: Partial<SPKData>;
}

export type SortMode = 'size_asc' | 'number_asc' | 'name_asc' | 'role_kiper_first';

const SAMPLE_CHATS = [
  {
    title: 'Chat WhatsApp Lengkap (PO + Roster)',
    text: `Halo min, mau order jersey tim SOLIDARITAS FC
Bahan: WAFFLE
Model Kerah: V DATAR + LIDAH
Jahit: FULL STIK
Deadline: 2026-09-05
Catatan: Kerah belakang tutup polos warna hitam.

Daftar nama dan ukuran:
1. Gazer - L - 81
2. Ockhy L no 25
3. erick / l / 24
4. Rifky XL 47 (Kiper lengan panjang)
5. TodUho L 03
6. LATUPONO L 22
7. PITALOKA L 13
8. W. LADJUPA L 17
9. M. IRFAN L 12
10. TUBULI L 10
11. Putra, L, 27 lengan panjang
12. RIVALDI XL 30
13. ARSHAQ XL 19
14. SAKEN XL 41 (Kiper)
15. NAUREEN 2XL 31
16. JULEX 2XL 23
17. SANDUAN 2XL 18 panjang
18. Farhan S no 09`
  },
  {
    title: 'Daftar Roster Acak & Variasi Lengan',
    text: `ROSTER TIM KIERAHA:
M - 10 - RIZKY (Kapten)
L - 07 - ALDI
XL - 21 - BAYU pjg
L - 08 - DIMAS
S - 04 - ILHAM
2XL - 99 - HENDRA kiper panjang
M - 11 - ANDRI
L - 14 - YUDHA
XL - 18 - FAJAR
M - 05 - DANI panjang`
  },
  {
    title: 'Format Tabel / Copy Paste Excel',
    text: `BAGAS	L	12	PENDEK	-
FARUQ	XL	01	LENGAN PANJANG	KIPER
DANDI	M	08	PENDEK	-
RIO	2XL	20	PENDEK	-
IQBAL	L	15	PENDEK	-
GEMA	S	03	PENDEK	-
KURNIA	L	22	PENDEK	KAPTEN`
  }
];

export const SpkGeminiInputModal: React.FC<SpkGeminiInputModalProps> = ({
  isOpen,
  onClose,
  onApply,
  defaultModel = 'PENDEK',
  currentSpkData
}) => {
  const [rawText, setRawText] = useState(SAMPLE_CHATS[0].text);
  const [sortMode, setSortMode] = useState<SortMode>('size_asc');
  const [appendMode, setAppendMode] = useState(false);
  const [applyHeaderInfo, setApplyHeaderInfo] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Parsed states from Gemini
  const [parsedPlayers, setParsedPlayers] = useState<SPKPlayer[]>([]);
  const [detectedHeader, setDetectedHeader] = useState<any>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  // Quick Recap summary
  const sizeSummary = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    parsedPlayers.forEach(p => {
      counts[p.size] = (counts[p.size] || 0) + 1;
    });
    return counts;
  }, [parsedPlayers]);

  if (!isOpen) return null;

  // Function to call Gemini AI backend with resilient client-side fallback
  const handleProcessWithGemini = async (selectedSort = sortMode) => {
    if (!rawText.trim()) {
      setErrorMessage('Silakan masukkan teks pesanan atau roster terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    let isSuccess = false;

    try {
      // 1. Try server-side Gemini API
      try {
        const response = await fetch('/api/gemini/parse-spk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            rawText,
            sortBy: selectedSort,
            defaultModel
          })
        });

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const resJson = await response.json();
          if (resJson.success && resJson.data && resJson.data.players && resJson.data.players.length > 0) {
            const data = resJson.data;
            setParsedPlayers(data.players || []);
            setDetectedHeader(data.detectedHeader || null);
            setWarnings(data.warnings || []);
            setHasProcessed(true);
            isSuccess = true;
          }
        }
      } catch (apiErr) {
        console.warn('Backend API unavailable or non-JSON, switching seamlessly to local smart parser:', apiErr);
      }

      // 2. Seamless local intelligent parser if server was not reached or returned non-JSON/offline
      if (!isSuccess) {
        const parsed = parseRawRosterText(rawText, defaultModel);
        const header = extractHeaderSpecsFromText(rawText);
        const sorted = sortPlayersList(parsed.players, selectedSort);

        if (sorted.length === 0) {
          throw new Error('Tidak ada data roster pemain atau pesanan yang terdeteksi dari teks input. Silakan periksa kembali teks yang dimasukkan.');
        }

        setParsedPlayers(sorted);
        setDetectedHeader(Object.keys(header).length > 0 ? header : null);
        setWarnings(parsed.warnings || []);
        setHasProcessed(true);
      }
    } catch (err: any) {
      console.error('Smart Extraction Error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses data. Silakan periksa kembali format teks.');
    } finally {
      setIsLoading(false);
    }
  };

  // Re-sort existing parsed list on client if already parsed
  const handleClientSort = (newSort: SortMode) => {
    setSortMode(newSort);
    if (parsedPlayers.length === 0) return;
    const sorted = sortPlayersList(parsedPlayers, newSort);
    setParsedPlayers(sorted);
  };

  const handleUpdatePlayerRow = (id: string, field: keyof SPKPlayer, value: any) => {
    setParsedPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDeletePlayerRow = (id: string) => {
    const filtered = parsedPlayers.filter(p => p.id !== id);
    setParsedPlayers(filtered.map((p, idx) => ({ ...p, no: idx + 1 })));
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        setHasProcessed(false);
      }
    } catch (e) {
      alert('Silakan gunakan keyboard shortcut Ctrl+V untuk menempel data.');
    }
  };

  const handleApply = () => {
    if (parsedPlayers.length === 0) {
      alert('Belum ada data pemain yang diproses. Silakan klik tombol "Proses dengan Gemini AI" terlebih dahulu.');
      return;
    }

    let headerUpdates: Partial<SPKData> | undefined = undefined;
    if (applyHeaderInfo && detectedHeader) {
      headerUpdates = {};
      if (detectedHeader.customer) headerUpdates.customer = detectedHeader.customer;
      if (detectedHeader.poName) headerUpdates.poName = detectedHeader.poName;
      if (detectedHeader.collarModel) headerUpdates.collarModel = detectedHeader.collarModel;
      if (detectedHeader.material) headerUpdates.material = detectedHeader.material;
      if (detectedHeader.productModel) headerUpdates.productModel = detectedHeader.productModel;
      if (detectedHeader.sleeveModel) headerUpdates.sleeveModel = detectedHeader.sleeveModel;
      if (detectedHeader.sewingModel) headerUpdates.sewingModel = detectedHeader.sewingModel;
      if (detectedHeader.deadline) headerUpdates.deadline = detectedHeader.deadline;
      if (detectedHeader.mainNote) {
        headerUpdates.notes = {
          mainNote: detectedHeader.mainNote,
          jahit: detectedHeader.sewingModel || 'FULL STIK',
          bahan: detectedHeader.material || 'WAFFLE',
          tangan: detectedHeader.sleeveModel || 'PENDEK',
          kerah: detectedHeader.collarModel || 'V DATAR + LIDAH'
        };
      }
    }

    onApply(parsedPlayers, appendMode, headerUpdates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-gradient-to-tr from-[#00805F] to-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                  Gemini AI — Smart Input & Auto Sort SPK
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-[#00805F] dark:text-emerald-400 border border-emerald-500/30">
                  Gemini AI Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Otomatis membaca chat WhatsApp, membersihkan nama/nomor, mendeteksi spesifikasi, dan mengurutkan roster dengan sangat rapi.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 sm:p-6 overflow-hidden min-h-[420px]">
          
          {/* LEFT COLUMN: Input Textarea & Configuration (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 overflow-hidden">
            
            {/* Quick Sample Selector */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tempel Teks Chat / Roster:</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  <span>Paste</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRawText('');
                    setHasProcessed(false);
                    setParsedPlayers([]);
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Bersihkan</span>
                </button>
              </div>
            </div>

            {/* Presets Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">Contoh:</span>
              {SAMPLE_CHATS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setRawText(sample.text);
                    setHasProcessed(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-[#00805F] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                >
                  {sample.title}
                </button>
              ))}
            </div>

            {/* Input Textarea */}
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setHasProcessed(false);
              }}
              placeholder="Tempel chat WA mentah, spesifikasi jersey, atau daftar pemain di sini..."
              className="flex-1 w-full font-mono text-xs p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none leading-relaxed min-h-[160px]"
            />

            {/* Sort Mode Controls Before/After Process */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Aturan Urutan / Sortir Otomatis:</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleClientSort('size_asc')}
                  className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    sortMode === 'size_asc'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Shirt className="h-3.5 w-3.5" />
                  <span>Urut Ukuran (S-3XL)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClientSort('number_asc')}
                  className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    sortMode === 'number_asc'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Hash className="h-3.5 w-3.5" />
                  <span>Urut Nomor Punggung</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClientSort('role_kiper_first')}
                  className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    sortMode === 'role_kiper_first'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Kiper di Baris Awal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClientSort('name_asc')}
                  className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    sortMode === 'name_asc'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Urut Nama (A-Z)</span>
                </button>
              </div>
            </div>

            {/* Action Button: Parse with Gemini */}
            <button
              type="button"
              onClick={() => handleProcessWithGemini()}
              disabled={isLoading || !rawText.trim()}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#00805F] to-emerald-600 hover:from-[#006B50] hover:to-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-98"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Gemini AI Sedang Menganalisis & Mengurutkan...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>{hasProcessed ? 'Proses Ulang dengan Gemini AI' : 'Ekstrak & Rapihkan dengan Gemini AI'}</span>
                </>
              )}
            </button>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <p className="font-bold">Gagal Memproses Data</p>
                  <p className="text-[11px]">{errorMessage}</p>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Parsed Result Preview & Detected Order Info (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3 overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 lg:pl-4">
            
            {/* Header & Status Indicator */}
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span>HASIL EKSTRAKSI GEMINI AI</span>
                {parsedPlayers.length > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                    {parsedPlayers.length} Pemain Tersortir
                  </span>
                )}
              </label>

              {hasProcessed && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Tersortir Rapi</span>
                </span>
              )}
            </div>

            {/* Detected SPK Order Specs Banner */}
            {detectedHeader && Object.values(detectedHeader).some(v => !!v) && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#00805F] dark:text-emerald-400 flex items-center gap-1.5 uppercase text-[11px]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Info Pesanan Terdeteksi:</span>
                  </span>
                  
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={applyHeaderInfo}
                      onChange={(e) => setApplyHeaderInfo(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                    />
                    <span>Terapkan ke Header SPK</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {detectedHeader.customer && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-emerald-500/20">
                      <span className="text-[9px] text-slate-400 block font-bold">KONSUMEN</span>
                      <b className="text-slate-900 dark:text-white uppercase">{detectedHeader.customer}</b>
                    </div>
                  )}
                  {detectedHeader.poName && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-emerald-500/20">
                      <span className="text-[9px] text-slate-400 block font-bold">NAMA PO</span>
                      <b className="text-slate-900 dark:text-white uppercase">{detectedHeader.poName}</b>
                    </div>
                  )}
                  {detectedHeader.collarModel && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-emerald-500/20">
                      <span className="text-[9px] text-slate-400 block font-bold">KERAH</span>
                      <b className="text-slate-900 dark:text-white uppercase">{detectedHeader.collarModel}</b>
                    </div>
                  )}
                  {detectedHeader.material && (
                    <div className="bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-lg border border-emerald-500/20">
                      <span className="text-[9px] text-slate-400 block font-bold">BAHAN</span>
                      <b className="text-slate-900 dark:text-white uppercase">{detectedHeader.material}</b>
                    </div>
                  )}
                </div>

                {detectedHeader.mainNote && (
                  <p className="text-[11px] text-emerald-900 dark:text-emerald-300 font-medium">
                    <b>Catatan Penjahit:</b> {detectedHeader.mainNote}
                  </p>
                )}
              </div>
            )}

            {/* Warnings from Gemini */}
            {warnings.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-amber-700 dark:text-amber-300 text-xs space-y-1">
                <p className="font-black flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>Peringatan AI:</span>
                </p>
                {warnings.map((w, idx) => (
                  <p key={idx} className="text-[11px]">• {w}</p>
                ))}
              </div>
            )}

            {/* Quick Size Summary Chips */}
            {parsedPlayers.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-slate-500">Rekap Ukuran:</span>
                {Object.entries(sizeSummary).map(([sz, count]) => (
                  <span key={sz} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-800 dark:text-slate-200">
                    {sz}: <b className="text-emerald-600 dark:text-emerald-400">{count}</b>
                  </span>
                ))}
              </div>
            )}

            {/* Parsed Players Table */}
            <div className="flex-1 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-y-auto bg-white dark:bg-slate-950 min-h-[220px]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/90 backdrop-blur-xs text-slate-700 dark:text-slate-200 text-[10px] uppercase font-black z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-2 text-center w-9">#</th>
                    <th className="py-2.5 px-3">NAMA PEMAIN</th>
                    <th className="py-2.5 px-2 text-center w-16">SIZE</th>
                    <th className="py-2.5 px-2 text-center w-16">NOP</th>
                    <th className="py-2.5 px-2 w-32">MODEL</th>
                    <th className="py-2.5 px-2">KETERANGAN</th>
                    <th className="py-2.5 px-1 text-center w-9">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {parsedPlayers.map((p, idx) => {
                    const isKiper = p.notes?.toUpperCase().includes('KIPER');
                    const isKapten = p.notes?.toUpperCase().includes('KAPTEN');
                    const isPanjang = p.model?.toUpperCase().includes('PANJANG');

                    return (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors ${
                          isKiper ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="py-1.5 px-2 text-center text-slate-400 font-mono text-[10px] font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => handleUpdatePlayerRow(p.id, 'name', e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-emerald-500 font-black text-slate-900 dark:text-white uppercase bg-transparent"
                            placeholder="NAMA PEMAIN"
                          />
                        </td>
                        <td className="py-1 px-1 text-center">
                          <select
                            value={p.size}
                            onChange={(e) => handleUpdatePlayerRow(p.id, 'size', e.target.value.toUpperCase())}
                            className="w-full px-1 py-1 text-xs text-center rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-emerald-500 font-black text-indigo-600 dark:text-indigo-400 bg-transparent cursor-pointer"
                          >
                            {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'ALL SIZE'].map(sz => (
                              <option key={sz} value={sz}>{sz}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1 px-1 text-center">
                          <input
                            type="text"
                            value={p.number}
                            onChange={(e) => handleUpdatePlayerRow(p.id, 'number', e.target.value)}
                            className="w-full px-1 py-1 text-xs text-center rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-emerald-500 font-mono font-black text-emerald-700 dark:text-emerald-400 bg-transparent"
                            placeholder="-"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <select
                            value={p.model || defaultModel}
                            onChange={(e) => handleUpdatePlayerRow(p.id, 'model', e.target.value)}
                            className={`w-full px-2 py-1 text-[11px] rounded-lg border font-bold bg-white dark:bg-slate-900 cursor-pointer ${
                              isPanjang 
                                ? 'border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300' 
                                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <option value="PENDEK">PENDEK</option>
                            <option value="LENGAN PANJANG">LENGAN PANJANG</option>
                            <option value="BUNTONG">BUNTONG</option>
                          </select>
                        </td>
                        <td className="py-1 px-1">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={p.notes || '-'}
                              onChange={(e) => handleUpdatePlayerRow(p.id, 'notes', e.target.value.toUpperCase())}
                              className={`w-full px-2 py-1 text-[11px] rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-emerald-500 font-bold bg-transparent uppercase ${
                                isKiper 
                                  ? 'text-amber-700 dark:text-amber-400 font-black' 
                                  : isKapten 
                                    ? 'text-purple-700 dark:text-purple-400 font-black' 
                                    : 'text-slate-600 dark:text-slate-400'
                              }`}
                              placeholder="-"
                            />
                            {isKiper && (
                              <span className="pointer-events-none absolute right-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/20 text-amber-700 dark:text-amber-400 uppercase">
                                GK
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-1 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePlayerRow(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Hapus baris"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {parsedPlayers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                        {isLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                            <span>Gemini AI sedang membaca dan menyortir data...</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Cpu className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto" />
                            <p className="font-bold text-slate-500">Belum ada hasil ekstraksi.</p>
                            <p className="text-[11px]">Masukkan teks di sebelah kiri lalu klik tombol "Ekstrak & Rapihkan dengan Gemini AI".</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={appendMode}
              onChange={(e) => setAppendMode(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <span>Tambahkan ke roster yang sudah ada (jangan hapus data lama)</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={parsedPlayers.length === 0}
              className="px-6 py-2.5 rounded-xl bg-[#00805F] hover:bg-[#006B50] text-white font-black text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-98"
            >
              <Check className="h-4 w-4" />
              <span>Terapkan ke SPK ({parsedPlayers.length} Pemain)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
