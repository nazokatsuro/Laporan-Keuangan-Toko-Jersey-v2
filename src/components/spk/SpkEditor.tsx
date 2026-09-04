/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useId } from 'react';
import { SPKData, SPKPlayer, SPKJerseyImage } from '../../spkTypes';
import { SpkSheetA4 } from './SpkSheetA4';
import { SpkQuickInputModal } from './SpkQuickInputModal';
import { SpkImageEditorModal } from './SpkImageEditorModal';
import { SpkValidationModal } from './SpkValidationModal';
import { SpkFullscreenModal } from './SpkFullscreenModal';
import { validateSpkData, calculateSizeRecap, normalizeSize } from '../../utils/spkParser';
import { exportSpkPdf, exportSpkImage, printSpkDocument } from '../../utils/spkExport';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Upload, 
  Printer, 
  FileDown, 
  Image as ImageIcon, 
  Maximize2, 
  Eye, 
  Save, 
  Sliders, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  Shirt, 
  Scissors, 
  FileText,
  Clock,
  ArrowUpDown,
  RotateCcw,
  RotateCw,
  Check,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface SpkEditorProps {
  data: SPKData;
  onChange: (updated: SPKData) => void;
  onSaveSpk: (data: SPKData) => void;
}

const PRESET_BAHAN = ['WAFFLE', 'MILANO', 'DRYFIT BILABONG', 'BRAZIL', 'SERENA', 'BENZEMA', 'EMBOS', 'LOTTO', 'TASLAN'];
const PRESET_KERAH = ['V DATAR + LIDAH', 'V-NECK RIB', 'O-NECK STANDAR', 'O-NECK VARIATION', 'KERAH POLO', 'KERAH SHANGHAI', 'HOODIE'];
const PRESET_MODEL = ['SETELAN', 'ATASAN SAJA', 'CELANA SAJA', 'JAKET HOODIE', 'SETELAN BASKET', 'KAOS O-NECK'];
const PRESET_JAHIT = ['FULL STIK', 'OVERDECK 3 JARUM', 'RANTAI STANDAR', 'OBRAS + STIK PUNDAK'];
const PRESET_TANGAN = ['PENDEK', 'LENGAN PANJANG', 'BUNTONG / SLEEVELESS', 'RAGLAN 3/4'];

export const SpkEditor: React.FC<SpkEditorProps> = ({
  data,
  onChange,
  onSaveSpk
}) => {
  const [activeTab, setActiveTab] = useState<'order' | 'roster' | 'design' | 'notes'>('order');
  const [previewScale, setPreviewScale] = useState<number>(0.72);
  const [previewPageTab, setPreviewPageTab] = useState<'all' | string>('all');
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  const totalPlayers = data.players?.length || 0;
  const rawMaxPage1 = data.layout?.maxPlayersPerPage;
  const maxPage1Rows = typeof rawMaxPage1 === 'number' && rawMaxPage1 >= 20 ? rawMaxPage1 : 50;

  const rawContinuation = data.layout?.continuationPageSize;
  const continuationPageSize = typeof rawContinuation === 'number' && rawContinuation >= 20 ? rawContinuation : 50;

  const totalPages = useMemo(() => {
    if (data.layout?.pageMode === '1page') return 1;
    if (totalPlayers <= maxPage1Rows) return 1;
    if (data.layout?.pageMode === '2page') return 2;
    return 1 + Math.ceil((totalPlayers - maxPage1Rows) / continuationPageSize);
  }, [totalPlayers, maxPage1Rows, continuationPageSize, data.layout?.pageMode]);

  // Modals state
  const [showQuickInput, setShowQuickInput] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [activeImageEditor, setActiveImageEditor] = useState<{
    isOpen: boolean;
    type: 'collar' | 'jersey';
    jerseyId?: string;
    url: string;
    title: string;
    zoom: number;
    posX: number;
    posY: number;
    rotation: number;
    opacity?: number;
  } | null>(null);

  // Form Field Updates
  const updateField = (field: keyof SPKData, value: any) => {
    onChange({
      ...data,
      [field]: value,
      updatedAt: new Date().toISOString()
    });
  };

  const updateNotesField = (field: string, value: string) => {
    onChange({
      ...data,
      notes: {
        ...data.notes,
        [field]: value
      },
      updatedAt: new Date().toISOString()
    });
  };

  const updateLayoutField = (field: string, value: any) => {
    onChange({
      ...data,
      layout: {
        ...data.layout,
        [field]: value
      }
    });
  };

  // Players / Roster Handlers
  const handleAddPlayer = () => {
    const newPlayer: SPKPlayer = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      no: data.players.length + 1,
      name: '',
      size: 'L',
      number: '',
      model: data.sleeveModel || 'PENDEK',
      notes: '-',
      qc: false
    };
    updateField('players', [...data.players, newPlayer]);
  };

  const handleUpdatePlayer = (id: string, field: keyof SPKPlayer, value: any) => {
    const updated = data.players.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    });
    updateField('players', updated);
  };

  const handleDeletePlayer = (id: string) => {
    const filtered = data.players.filter(p => p.id !== id);
    // Re-index row numbers
    const reindexed = filtered.map((p, idx) => ({ ...p, no: idx + 1 }));
    updateField('players', reindexed);
  };

  const handleToggleQc = (playerId: string) => {
    const updated = data.players.map(p => {
      if (p.id === playerId) {
        return { ...p, qc: !p.qc };
      }
      return p;
    });
    updateField('players', updated);
  };

  const handleSortRoster = (mode: 'size_asc' | 'number_asc' | 'role_kiper_first' | 'name_asc') => {
    const list = [...data.players];
    const sizeWeights: Record<string, number> = {
      'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, '2XL': 6, 'XXL': 6,
      '3XL': 7, 'XXXL': 7, '4XL': 8, 'XXXXL': 8, '5XL': 9, 'XXXXXL': 9,
      'ALL SIZE': 99
    };

    if (mode === 'size_asc') {
      list.sort((a, b) => {
        const szA = (a.size || '').toUpperCase().trim();
        const szB = (b.size || '').toUpperCase().trim();
        const wA = sizeWeights[szA] || 50;
        const wB = sizeWeights[szB] || 50;
        if (wA !== wB) return wA - wB;
        const numA = parseInt(a.number || '') || 9999;
        const numB = parseInt(b.number || '') || 9999;
        return numA - numB;
      });
    } else if (mode === 'number_asc') {
      list.sort((a, b) => {
        const numA = parseInt(a.number || '') || 9999;
        const numB = parseInt(b.number || '') || 9999;
        return numA - numB;
      });
    } else if (mode === 'role_kiper_first') {
      list.sort((a, b) => {
        const aIsKiper = (a.notes || '').toUpperCase().includes('KIPER') || (a.model || '').toUpperCase().includes('KIPER');
        const bIsKiper = (b.notes || '').toUpperCase().includes('KIPER') || (b.model || '').toUpperCase().includes('KIPER');
        if (aIsKiper && !bIsKiper) return -1;
        if (!aIsKiper && bIsKiper) return 1;
        const szA = (a.size || '').toUpperCase().trim();
        const szB = (b.size || '').toUpperCase().trim();
        const wA = sizeWeights[szA] || 50;
        const wB = sizeWeights[szB] || 50;
        return wA - wB;
      });
    } else if (mode === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const reindexed = list.map((p, idx) => ({ ...p, no: idx + 1 }));
    updateField('players', reindexed);
  };

  const handleApplyQuickInput = (newPlayers: SPKPlayer[], appendMode: boolean, detectedHeader?: Partial<SPKData>) => {
    let finalPlayers: SPKPlayer[];
    if (appendMode) {
      finalPlayers = [...data.players, ...newPlayers];
    } else {
      finalPlayers = newPlayers;
    }
    // Re-index row numbers
    finalPlayers = finalPlayers.map((p, idx) => ({ ...p, no: idx + 1 }));

    const updatedData: SPKData = {
      ...data,
      players: finalPlayers,
      updatedAt: new Date().toISOString()
    };

    // If Gemini extracted header specs (Customer, PO, Collar, Material, etc.), apply them
    if (detectedHeader) {
      if (detectedHeader.customer) updatedData.customer = detectedHeader.customer;
      if (detectedHeader.poName) updatedData.poName = detectedHeader.poName;
      if (detectedHeader.collarModel) {
        updatedData.collarModel = detectedHeader.collarModel;
        if (!data.collarCaption) updatedData.collarCaption = detectedHeader.collarModel;
      }
      if (detectedHeader.material) updatedData.material = detectedHeader.material;
      if (detectedHeader.productModel) updatedData.productModel = detectedHeader.productModel;
      if (detectedHeader.sleeveModel) updatedData.sleeveModel = detectedHeader.sleeveModel;
      if (detectedHeader.sewingModel) updatedData.sewingModel = detectedHeader.sewingModel;
      if (detectedHeader.deadline) updatedData.deadline = detectedHeader.deadline;
      if (detectedHeader.notes) {
        updatedData.notes = {
          ...data.notes,
          ...detectedHeader.notes
        };
      }
    }

    onChange(updatedData);
  };

  // Image Upload Handlers
  const handleUploadCollar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onChange({
          ...data,
          collarImage: reader.result as string,
          updatedAt: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadJersey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newImg: SPKJerseyImage = {
          id: `jimg-${Date.now()}`,
          title: `Desain Mockup #${data.jerseyImages.length + 1}`,
          url: reader.result as string,
          includedInSpk: true,
          zoom: 1,
          posX: 0,
          posY: 0,
          rotation: 90, // Default 90 derajat / vertikal sesuai permintaan
          opacity: 1,
          fitMode: 'contain'
        };
        updateField('jerseyImages', [...data.jerseyImages, newImg]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuickRotateMockup = (id: string, customDeg?: number) => {
    const updated = data.jerseyImages.map(img => {
      if (img.id === id) {
        const nextRot = customDeg !== undefined ? customDeg : ((img.rotation ?? 90) + 90) % 360;
        return { ...img, rotation: nextRot };
      }
      return img;
    });
    updateField('jerseyImages', updated);
  };

  const handleQuickZoomMockup = (id: string, delta: number) => {
    const updated = data.jerseyImages.map(img => {
      if (img.id === id) {
        const currentZoom = img.zoom ?? 1;
        const nextZoom = Math.max(Number((currentZoom + delta).toFixed(2)), 0.3);
        return { ...img, zoom: Math.min(nextZoom, 3) };
      }
      return img;
    });
    updateField('jerseyImages', updated);
  };

  const handleSetAllMockupsVertical = () => {
    const updated = data.jerseyImages.map(img => ({
      ...img,
      rotation: 90,
      zoom: 1,
      posX: 0,
      posY: 0
    }));
    updateField('jerseyImages', updated);
  };

  const handleDeleteJerseyImage = (id: string) => {
    const filtered = data.jerseyImages.filter(img => img.id !== id);
    updateField('jerseyImages', filtered);
  };

  const handleToggleJerseyImage = (id: string) => {
    const updated = data.jerseyImages.map(img => {
      if (img.id === id) {
        return { ...img, includedInSpk: !img.includedInSpk };
      }
      return img;
    });
    updateField('jerseyImages', updated);
  };

  // Auto Generate SPK Number
  const handleGenerateSpkNumber = () => {
    const year = new Date().getFullYear();
    const randNum = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    updateField('spkNumber', `SPK-${year}-${randNum}`);
  };

  // Validation
  const validationResult = validateSpkData({
    customer: data.customer,
    spkNumber: data.spkNumber,
    poName: data.poName,
    deadline: data.deadline,
    players: data.players,
    jerseyImages: data.jerseyImages
  });

  // Save SPK
  const handleSave = () => {
    onSaveSpk(data);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Export handlers
  const handlePrint = () => {
    printSpkDocument();
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('PDF');
      await exportSpkPdf('spk-editor-live-sheet', data);
    } catch (err: any) {
      alert(`Gagal export PDF: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportImage = async (format: 'png' | 'jpeg') => {
    try {
      setIsExporting(format.toUpperCase());
      await exportSpkImage('spk-editor-live-sheet', data, format);
    } catch (err: any) {
      alert(`Gagal export Gambar: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Workspace Action Toolbar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* SPK Title Indicator */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-[#00805F] dark:text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/20">
            A4
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white font-mono">{data.spkNumber}</span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-bold text-[#00805F] dark:text-emerald-400 uppercase">{data.poName || 'BELUM ADA PO'}</span>
              <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${
                data.status === 'URGENT' ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
              }`}>
                {data.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Total Roster: <b className="text-slate-900 dark:text-white">{data.players.length} PCS</b> | Konsumen: <b className="text-slate-900 dark:text-white">{data.customer || '-'}</b>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Gemini AI Smart Input Button */}
          <button
            type="button"
            onClick={() => setShowQuickInput(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00805F] hover:from-emerald-700 hover:to-[#006B50] text-white font-black text-xs shadow-xs transition-all cursor-pointer transform active:scale-95"
            title="Ekstrak chat WA / teks roster otomatis dengan AI Gemini terbaru dan urutkan rapi"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span>AI Gemini Smart Input</span>
          </button>

          {/* Validation Check Button */}
          <button
            type="button"
            onClick={() => setShowValidation(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
              validationResult.isValid
                ? 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span>Validasi Data</span>
          </button>

          {/* Fullscreen Preview */}
          <button
            type="button"
            onClick={() => setShowFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Mode Full Preview</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#00805F] hover:bg-[#006B50] text-white font-black text-xs shadow-xs transition-all cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saveToast ? 'Tersimpan!' : 'Simpan SPK'}</span>
          </button>

          {/* Print & Export Actions */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />

          {/* Unduh PDF Button */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={!!isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
            title="Unduh dokumen SPK dalam format PDF A4 siap cetak"
          >
            {isExporting === 'PDF' ? (
              <RotateCcw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            <span>{isExporting === 'PDF' ? 'Memproses PDF...' : 'Unduh PDF'}</span>
          </button>

          {/* Unduh PNG / Gambar Button */}
          <button
            type="button"
            onClick={() => handleExportImage('png')}
            disabled={!!isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
            title="Unduh dokumen SPK dalam format gambar PNG resolusi tinggi"
          >
            {isExporting === 'PNG' ? (
              <RotateCcw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
            <span>{isExporting === 'PNG' ? 'Memproses...' : 'Unduh PNG'}</span>
          </button>

          {/* Cetak Langsung Button */}
          <button
            type="button"
            onClick={handlePrint}
            title="Buka dialog Cetak / Print A4"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Cetak</span>
          </button>

        </div>

      </div>

      {/* Main Dual-Panel Workspace: Left Form Editor + Right Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================
            LEFT COLUMN: FORM EDITORS (5 COLS)
           ======================================================== */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-5 shadow-xs space-y-5">
          
          {/* Editor Tabs Navigation */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('order')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'order'
                  ? 'bg-white dark:bg-slate-800 text-[#00805F] dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>1. Order</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-white dark:bg-slate-800 text-[#00805F] dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shirt className="h-3.5 w-3.5" />
              <span>2. Roster ({data.players.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('design')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'design'
                  ? 'bg-white dark:bg-slate-800 text-[#00805F] dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>3. Visual</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-slate-800 text-[#00805F] dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>4. Catatan</span>
            </button>
          </div>

          {/* TAB 1: ORDER DATA */}
          {activeTab === 'order' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              
              {/* SPK Number & PO Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Nomor SPK:</label>
                    <button
                      type="button"
                      onClick={handleGenerateSpkNumber}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      Auto No
                    </button>
                  </div>
                  <input
                    type="text"
                    value={data.spkNumber}
                    onChange={(e) => updateField('spkNumber', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Konsumen:</label>
                  <input
                    type="text"
                    value={data.customer}
                    onChange={(e) => updateField('customer', e.target.value)}
                    placeholder="Contoh: KIERAHA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-black uppercase text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* PO Name & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama PO / Tim:</label>
                  <input
                    type="text"
                    value={data.poName}
                    onChange={(e) => updateField('poName', e.target.value)}
                    placeholder="Contoh: SOLIDARITAS"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-black uppercase text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Produksi:</label>
                  <select
                    value={data.status}
                    onChange={(e) => updateField('status', e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-black text-slate-900 dark:text-white"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="PRIORITAS">PRIORITAS</option>
                    <option value="URGENT">URGENT</option>
                    <option value="SELESAI">SELESAI</option>
                    <option value="HOLD">HOLD</option>
                  </select>
                </div>
              </div>

              {/* Status Pengerjaan (Setting -> Print Press -> Jahit -> Tinggal Kirim -> Beres) */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Pengerjaan Pesanan (Sinkron Otomatis ke App.tsx):</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'] as string[]).map((st) => {
                    const currentProdStatus = (data as any).productionStatus || 'Setting';
                    const isActive = currentProdStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          updateField('productionStatus', st);
                          if (st === 'Beres') {
                            updateField('status', 'SELESAI');
                          }
                        }}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer truncate ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {st === 'Print Press' ? 'Print' : st === 'Tinggal Kirim' ? 'Kirim' : st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model Kerah & Bahan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Model Kerah:</label>
                  <input
                    type="text"
                    list="kerah-list"
                    value={data.collarModel}
                    onChange={(e) => {
                      updateField('collarModel', e.target.value);
                      if (!data.collarCaption) updateField('collarCaption', e.target.value);
                    }}
                    placeholder="Contoh: V DATAR + LIDAH"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold uppercase text-slate-900 dark:text-white"
                  />
                  <datalist id="kerah-list">
                    {PRESET_KERAH.map(k => <option key={k} value={k} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bahan Kain:</label>
                  <input
                    type="text"
                    list="bahan-list"
                    value={data.material}
                    onChange={(e) => updateField('material', e.target.value)}
                    placeholder="Contoh: WAFFLE"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold uppercase text-slate-900 dark:text-white"
                  />
                  <datalist id="bahan-list">
                    {PRESET_BAHAN.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
              </div>

              {/* Model Pesanan & Model Tangan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Model Pesanan:</label>
                  <input
                    type="text"
                    list="model-list"
                    value={data.productModel}
                    onChange={(e) => updateField('productModel', e.target.value)}
                    placeholder="Contoh: SETELAN"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold uppercase text-slate-900 dark:text-white"
                  />
                  <datalist id="model-list">
                    {PRESET_MODEL.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Model Tangan Standar:</label>
                  <input
                    type="text"
                    list="tangan-list"
                    value={data.sleeveModel}
                    onChange={(e) => updateField('sleeveModel', e.target.value)}
                    placeholder="Contoh: PENDEK"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold uppercase text-slate-900 dark:text-white"
                  />
                  <datalist id="tangan-list">
                    {PRESET_TANGAN.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
              </div>

              {/* Jahitan & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Model Jahitan:</label>
                  <input
                    type="text"
                    list="jahit-list"
                    value={data.sewingModel}
                    onChange={(e) => updateField('sewingModel', e.target.value)}
                    placeholder="Contoh: FULL STIK"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold uppercase text-slate-900 dark:text-white"
                  />
                  <datalist id="jahit-list">
                    {PRESET_JAHIT.map(j => <option key={j} value={j} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-rose-600 dark:text-rose-400 mb-1">Deadline / Tgl Kirim:</label>
                  <input
                    type="date"
                    value={data.deadline}
                    onChange={(e) => updateField('deadline', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 font-bold text-rose-700 dark:text-rose-300"
                  />
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ROSTER PEMAIN */}
          {activeTab === 'roster' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-black text-slate-900 dark:text-white text-sm block">
                    Daftar Pemain / Roster ({data.players.length} Pemain)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Edit langsung baris pemain atau gunakan tombol "Input Cepat"
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickInput(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-[#00805F] dark:text-emerald-400 font-bold text-xs hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>✨ AI Gemini Smart Input</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddPlayer}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>
              </div>

              {/* Quick Sorting Toolbar */}
              {data.players.length > 1 && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Urutkan Roster:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSortRoster('size_asc')}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 font-bold text-[10px] text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition-colors"
                      title="Urutkan dari ukuran terkecil ke terbesar (XS -> 5XL)"
                    >
                      👕 Ukuran (XS-5XL)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSortRoster('number_asc')}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 font-bold text-[10px] text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition-colors"
                      title="Urutkan dari nomor punggung terkecil ke terbesar"
                    >
                      # No Punggung
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSortRoster('role_kiper_first')}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 font-bold text-[10px] text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition-colors"
                      title="Tempatkan Kiper di baris paling atas"
                    >
                      🧤 Kiper di Atas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSortRoster('name_asc')}
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 font-bold text-[10px] text-slate-700 dark:text-slate-200 cursor-pointer shadow-2xs transition-colors"
                      title="Urutkan abjad nama A-Z"
                    >
                      🔤 Nama (A-Z)
                    </button>
                  </div>
                </div>
              )}

              {/* Player Rows Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl max-h-[380px] overflow-y-auto bg-slate-50/40 dark:bg-slate-900/40">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-black z-10">
                    <tr>
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-2">NAMA</th>
                      <th className="py-2 px-1 text-center w-14">SIZE</th>
                      <th className="py-2 px-1 text-center w-14">NO</th>
                      <th className="py-2 px-1 w-24">MODEL</th>
                      <th className="py-2 px-1 w-20">KET</th>
                      <th className="py-2 px-1 text-center w-8">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.players.map((player, idx) => (
                      <tr key={player.id} className="hover:bg-white dark:hover:bg-slate-800/80 transition-colors">
                        
                        {/* Number # */}
                        <td className="py-1 px-2 text-center text-slate-400 font-mono text-[10px]">
                          {idx + 1}
                        </td>

                        {/* Name */}
                        <td className="py-1 px-2">
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) => handleUpdatePlayer(player.id, 'name', e.target.value.toUpperCase())}
                            placeholder="Nama Pemain"
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-black uppercase text-slate-900 dark:text-white"
                          />
                        </td>

                        {/* Size */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="text"
                            value={player.size}
                            onChange={(e) => handleUpdatePlayer(player.id, 'size', normalizeSize(e.target.value))}
                            className="w-full px-1.5 py-1 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-black text-indigo-600 dark:text-indigo-400"
                          />
                        </td>

                        {/* Jersey Number */}
                        <td className="py-1 px-1 text-center">
                          <input
                            type="text"
                            value={player.number}
                            onChange={(e) => handleUpdatePlayer(player.id, 'number', e.target.value)}
                            placeholder="No"
                            className="w-full px-1.5 py-1 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-black text-emerald-700 dark:text-emerald-400"
                          />
                        </td>

                        {/* Model */}
                        <td className="py-1 px-1">
                          <select
                            value={player.model || 'PENDEK'}
                            onChange={(e) => handleUpdatePlayer(player.id, 'model', e.target.value)}
                            className="w-full px-1 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                          >
                            <option value="PENDEK">PENDEK</option>
                            <option value="LENGAN PANJANG">L. PANJANG</option>
                            <option value="BUNTONG">BUNTONG</option>
                          </select>
                        </td>

                        {/* Notes */}
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            value={player.notes || '-'}
                            onChange={(e) => handleUpdatePlayer(player.id, 'notes', e.target.value.toUpperCase())}
                            placeholder="Keterangan"
                            className="w-full px-1.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-bold"
                          />
                        </td>

                        {/* Delete button */}
                        <td className="py-1 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(player.id)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {data.players.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
                          Belum ada pemain di roster. Klik "Input Data Cepat" atau "Tambah Baris".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: VISUAL & IMAGE UPLOAD */}
          {activeTab === 'design' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              
              {/* Collar Preview Box */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                    1. Preview Gambar Kerah
                  </span>
                  {data.collarImage && (
                    <button
                      type="button"
                      onClick={() => setActiveImageEditor({
                        isOpen: true,
                        type: 'collar',
                        url: data.collarImage || '',
                        title: 'Gambar Kerah',
                        zoom: data.collarZoom || 1,
                        posX: data.collarPosX || 0,
                        posY: data.collarPosY || 0,
                        rotation: data.collarRotation || 0
                      })}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      <span>Edit Posisi & Zoom</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-20 w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
                    {data.collarImage ? (
                      <img src={data.collarImage} alt="Collar" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold text-center px-1">Kosong</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Keterangan / Caption Kerah:
                      </label>
                      <input
                        type="text"
                        value={data.collarCaption || data.collarModel || ''}
                        onChange={(e) => updateField('collarCaption', e.target.value.toUpperCase())}
                        placeholder="Contoh: V DATAR + LIDAH"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold uppercase text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-[#00805F] hover:bg-[#006B50] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Ganti Gambar Kerah</span>
                        <input type="file" accept="image/*" onChange={handleUploadCollar} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jersey Mockups Gallery Box */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                      2. Desain Jersey & Mockup Produksi
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Default orientasi: <strong className="text-[#00805F]">90° (Vertikal)</strong>. Anda dapat menggeser posisi X/Y, zoom, atau memutar sudut mockup.
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {data.jerseyImages.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSetAllMockupsVertical}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        title="Setel semua mockup menjadi vertikal 90°"
                      >
                        🔄 Set Semua 90° Vertikal
                      </button>
                    )}
                    <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Mockup Baru</span>
                      <input type="file" accept="image/*" onChange={handleUploadJersey} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  {data.jerseyImages.map((img) => {
                    const currentRot = img.rotation ?? 90;
                    const isVertical = ((currentRot % 360) + 360) % 360 === 90;

                    return (
                      <div
                        key={img.id}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          
                          {/* Left: Checkbox & Live Thumbnail */}
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={img.includedInSpk}
                                onChange={() => handleToggleJerseyImage(img.id)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                              />
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hidden sm:inline">SPK</span>
                            </label>

                            {/* Thumbnail with actual live transform */}
                            <div 
                              onClick={() => setActiveImageEditor({
                                isOpen: true,
                                type: 'jersey',
                                jerseyId: img.id,
                                url: img.url,
                                title: img.title,
                                zoom: img.zoom ?? 1,
                                posX: img.posX ?? 0,
                                posY: img.posY ?? 0,
                                rotation: img.rotation ?? 90,
                                opacity: img.opacity ?? 1
                              })}
                              className="h-12 w-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors relative group"
                              title="Klik untuk membuka editor posisi visual"
                            >
                              <img 
                                src={img.url} 
                                alt={img.title} 
                                className="max-h-full max-w-full object-contain"
                                style={{
                                  transform: `scale(${img.zoom ?? 1}) translate(${img.posX ?? 0}%, ${img.posY ?? 0}%) rotate(${img.rotation ?? 90}deg)`,
                                  opacity: img.opacity ?? 1
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Sliders className="h-3.5 w-3.5" />
                              </div>
                            </div>

                            {/* Title & Specs */}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-900 dark:text-white text-xs truncate max-w-[150px] sm:max-w-[200px]">
                                  {img.title}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                  isVertical 
                                    ? 'bg-emerald-500/15 text-[#00805F] dark:text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}>
                                  {currentRot === 90 ? 'Vertikal (90°)' : currentRot === 0 ? 'Horizontal (0°)' : `${currentRot}°`}
                                </span>
                              </div>
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                Zoom: {Math.round((img.zoom ?? 1) * 100)}% | X: {img.posX ?? 0}% | Y: {img.posY ?? 0}%
                              </p>
                            </div>
                          </div>

                          {/* Right: Quick Tools */}
                          <div className="flex items-center gap-1">
                            {/* Quick Rotate Button */}
                            <button
                              type="button"
                              onClick={() => handleQuickRotateMockup(img.id)}
                              className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Putar rotasi (+90°)"
                            >
                              <RotateCw className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="hidden md:inline">Putar 90°</span>
                            </button>

                            {/* Quick Zoom In/Out */}
                            <button
                              type="button"
                              onClick={() => handleQuickZoomMockup(img.id, -0.1)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Zoom Out (-10%)"
                            >
                              <ZoomOut className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickZoomMockup(img.id, 0.1)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Zoom In (+10%)"
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                            </button>

                            {/* Main Open Visual Editor Modal */}
                            <button
                              type="button"
                              onClick={() => setActiveImageEditor({
                                isOpen: true,
                                type: 'jersey',
                                jerseyId: img.id,
                                url: img.url,
                                title: img.title,
                                zoom: img.zoom ?? 1,
                                posX: img.posX ?? 0,
                                posY: img.posY ?? 0,
                                rotation: img.rotation ?? 90,
                                opacity: img.opacity ?? 1
                              })}
                              className="px-2.5 py-1.5 bg-[#00805F] hover:bg-[#006B50] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                              title="Buka Editor Posisi Visual"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Sesuaikan Posisi</span>
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteJerseyImage(img.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                              title="Hapus Mockup"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}

                  {data.jerseyImages.length === 0 && (
                    <div className="text-center py-6 text-slate-400 italic">
                      Belum ada mockup jersey yang diupload. Klik "Upload Mockup Baru" di atas.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: CATATAN PENJAHIT & LAYOUT TOGGLES */}
          {activeTab === 'notes' && (
            <div className="space-y-4 animate-fadeIn text-xs">
              
              <div className="border border-amber-300 dark:border-amber-900/60 rounded-2xl p-4 space-y-3 bg-amber-50/30 dark:bg-amber-950/20">
                <span className="font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider block">
                  Catatan Khusus Penjahit & QC
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Instruksi Utama (Highlight Tebal):
                  </label>
                  <input
                    type="text"
                    value={data.notes?.mainNote || ''}
                    onChange={(e) => updateNotesField('mainNote', e.target.value.toUpperCase())}
                    placeholder="Contoh: TUTUP KERAH POLOS, FULL STIK"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-950 font-black uppercase text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Jahit:</label>
                    <input
                      type="text"
                      value={data.notes?.jahit || data.sewingModel || ''}
                      onChange={(e) => updateNotesField('jahit', e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Bahan:</label>
                    <input
                      type="text"
                      value={data.notes?.bahan || data.material || ''}
                      onChange={(e) => updateNotesField('bahan', e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Tangan:</label>
                    <input
                      type="text"
                      value={data.notes?.tangan || data.sleeveModel || ''}
                      onChange={(e) => updateNotesField('tangan', e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Layout Display Section Toggles */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
                <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                  Pengaturan Halaman & Pagination (A4)
                </span>

                {/* Page Mode Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Mode Pagination & Halaman:
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => updateLayoutField('pageMode', 'auto')}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        (data.layout?.pageMode ?? 'auto') === 'auto' || data.layout?.pageMode === 'multi'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="block text-[11px] font-black">Otomatis (Multi-Page)</span>
                      <span className="text-[9px] font-normal opacity-80">1, 2, 3+ Hal sesuai data</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateLayoutField('pageMode', '1page')}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        data.layout?.pageMode === '1page'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="block text-[11px] font-black">1 Halaman</span>
                      <span className="text-[9px] font-normal opacity-80">Padatkan ke 1 lembar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateLayoutField('pageMode', '2page')}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        data.layout?.pageMode === '2page'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="block text-[11px] font-black">2 Halaman A4</span>
                      <span className="text-[9px] font-normal opacity-80">Maksimal 2 lembar</span>
                    </button>
                  </div>
                </div>

                {/* Fine-Tuning Capacity */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kapasitas Roster Hal. 1:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={10}
                        max={75}
                        value={data.layout?.maxPlayersPerPage || 50}
                        onChange={(e) => updateLayoutField('maxPlayersPerPage', parseInt(e.target.value) || 50)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                      />
                      <span className="text-slate-400 text-[10px]">Pcs</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kapasitas Hal. Lanjutan:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={10}
                        max={75}
                        value={data.layout?.continuationPageSize || 50}
                        onChange={(e) => updateLayoutField('continuationPageSize', parseInt(e.target.value) || 50)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                      />
                      <span className="text-slate-400 text-[10px]">Pcs</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Visibilitas Komponen Lembar A4:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.layout?.showHeader ?? true}
                        onChange={(e) => updateLayoutField('showHeader', e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>Kop Header Apparel</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.layout?.showOrderInfo ?? true}
                        onChange={(e) => updateLayoutField('showOrderInfo', e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>Informasi Order 2 Kolom</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.layout?.showCollarPreview ?? true}
                        onChange={(e) => updateLayoutField('showCollarPreview', e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>Preview Kerah</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.layout?.showSizeRecap ?? true}
                        onChange={(e) => updateLayoutField('showSizeRecap', e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>Rekap Ukuran</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.layout?.showJerseyDesign ?? true}
                        onChange={(e) => updateLayoutField('showJerseyDesign', e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>Mockup Desain Jersey</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.layout?.showTailorNotes ?? true}
                        onChange={(e) => updateLayoutField('showTailorNotes', e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      <span>Catatan Penjahit</span>
                    </label>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ========================================================
            RIGHT COLUMN: LIVE WYSIWYG A4 PREVIEW (7 COLS)
           ======================================================== */}
        <div className="xl:col-span-7 bg-slate-200/80 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-start overflow-hidden shadow-inner min-h-[600px]">
          
          {/* Live Preview Viewport Controls */}
          <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-300 dark:border-slate-800 select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Live A4 Preview
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                totalPages > 1 
                  ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' 
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}>
                {totalPages} Halaman A4 ({totalPlayers} Pemain)
              </span>
            </div>

            {/* Page Tabs in Preview if multiple pages */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewPageTab('all')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    previewPageTab === 'all'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Semua ({totalPages})
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setPreviewPageTab(String(pageNum))}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      previewPageTab === String(pageNum)
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Hal {pageNum}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Safe Area Guide Toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={showSafeArea}
                  onChange={(e) => setShowSafeArea(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>Garis Aman</span>
              </label>

              {/* Scale Zoom Slider & Presets */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPreviewScale(prev => Math.max(Number((prev - 0.05).toFixed(2)), 0.35))}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-md cursor-pointer"
                  title="Perkecil (-5%)"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(0.72)}
                  className="text-[10px] font-mono font-black text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Reset Zoom ke Standar"
                >
                  {Math.round(previewScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(prev => Math.min(Number((prev + 0.05).toFixed(2)), 1.3))}
                  className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-md cursor-pointer"
                  title="Perbesar (+5%)"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <div className="h-3 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setPreviewScale(0.55)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    Math.abs(previewScale - 0.55) < 0.03 ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Pas
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewScale(0.9)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    Math.abs(previewScale - 0.9) < 0.03 ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  90%
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Viewport Scroll Area */}
          <div className="w-full flex-1 overflow-auto flex justify-center py-3 px-2 min-h-[520px]">
            <div
              className="transition-transform duration-150 origin-top shadow-2xl rounded-sm shrink-0"
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
                marginBottom: totalPages > 1 
                  ? `calc((${totalPages} * 297mm * ${previewScale}) - (${totalPages} * 297mm) + 24px)` 
                  : `calc((297mm * ${previewScale}) - 297mm + 24px)`
              }}
            >
              <SpkSheetA4
                id="spk-editor-live-sheet"
                data={data}
                showSafeArea={showSafeArea}
                onToggleQc={handleToggleQc}
                activePageTab={previewPageTab}
              />
            </div>
          </div>

        </div>

      </div>

      {/* Gemini AI Smart Input Modal */}
      <SpkQuickInputModal
        isOpen={showQuickInput}
        onClose={() => setShowQuickInput(false)}
        onApply={handleApplyQuickInput}
        defaultModel={data.sleeveModel || 'PENDEK'}
        currentSpkData={data}
      />

      {/* Validation Modal */}
      <SpkValidationModal
        isOpen={showValidation}
        onClose={() => setShowValidation(false)}
        onProceed={() => handleSave()}
        issues={validationResult.issues}
        actionTitle="Simpan Data"
      />

      {/* Fullscreen Preview Modal */}
      <SpkFullscreenModal
        isOpen={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        data={data}
      />

      {/* Image Editor Modal */}
      {activeImageEditor && activeImageEditor.isOpen && (
        <SpkImageEditorModal
          isOpen={true}
          onClose={() => setActiveImageEditor(null)}
          imageUrl={activeImageEditor.url}
          title={activeImageEditor.title}
          initialZoom={activeImageEditor.zoom}
          initialPosX={activeImageEditor.posX}
          initialPosY={activeImageEditor.posY}
          initialRotation={activeImageEditor.rotation}
          initialOpacity={activeImageEditor.opacity}
          onSave={(settings) => {
            if (activeImageEditor.type === 'collar') {
              onChange({
                ...data,
                collarZoom: settings.zoom,
                collarPosX: settings.posX,
                collarPosY: settings.posY,
                collarRotation: settings.rotation
              });
            } else if (activeImageEditor.type === 'jersey' && activeImageEditor.jerseyId) {
              const updated = data.jerseyImages.map(img => {
                if (img.id === activeImageEditor.jerseyId) {
                  return {
                    ...img,
                    zoom: settings.zoom,
                    posX: settings.posX,
                    posY: settings.posY,
                    rotation: settings.rotation,
                    opacity: settings.opacity
                  };
                }
                return img;
              });
              updateField('jerseyImages', updated);
            }
          }}
        />
      )}

    </div>
  );
};
