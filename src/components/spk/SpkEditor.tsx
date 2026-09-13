/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useRef, useEffect, useDeferredValue } from 'react';
import { SPKData, SPKPlayer, SPKJerseyImage } from '../../spkTypes';
import { SpkSheetA4 } from './SpkSheetA4';
import { SpkQuickInputModal } from './SpkQuickInputModal';
import { SpkImageEditorModal } from './SpkImageEditorModal';
import { SpkValidationModal } from './SpkValidationModal';
import { SpkFullscreenModal } from './SpkFullscreenModal';
import { validateSpkData, normalizeSize, mergeDuplicatePlayers } from '../../utils/spkParser';
import { exportSpkPdf, exportSpkImage, printSpkDocument } from '../../utils/spkExport';
import { compressImage } from '../../utils';
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
  AlertTriangle, 
  Shirt, 
  FileText,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ClipboardPaste,
  Copy,
  X
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

// Memoized Player Row for ultra-smooth 60 FPS roster editing
interface PlayerRowProps {
  player: SPKPlayer;
  index: number;
  onUpdate: (id: string, field: keyof SPKPlayer, value: any) => void;
  onDelete: (id: string) => void;
}

const MemoizedPlayerRow = React.memo<PlayerRowProps>(({ player, index, onUpdate, onDelete }) => {
  return (
    <tr className="hover:bg-white dark:hover:bg-slate-800/80 transition-colors">
      {/* Number # */}
      <td className="py-1 px-2 text-center text-slate-400 font-mono text-[10px]">
        {index + 1}
      </td>

      {/* Name */}
      <td className="py-1 px-2">
        <input
          type="text"
          value={player.name}
          onChange={(e) => {
            const val = e.target.value;
            // Detect if user typed e.g. "5pcs", "5 pcs" into the name
            const pcsMatch = val.match(/^(\d+)\s*pcs?$/i);
            if (pcsMatch) {
              const detected = parseInt(pcsMatch[1], 10);
              if (!isNaN(detected) && detected > 0) {
                onUpdate(player.id, 'qty', detected);
                onUpdate(player.id, 'name', '-');
                return;
              }
            }
            onUpdate(player.id, 'name', val);
          }}
          placeholder="Nama Pemain"
          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-black text-slate-900 dark:text-white"
        />
      </td>

      {/* QTY */}
      <td className="py-1 px-1 text-center w-14">
        <input
          type="number"
          min="1"
          value={player.qty || 1}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            onUpdate(player.id, 'qty', isNaN(val) || val < 1 ? 1 : val);
          }}
          className="w-full px-1 py-1 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-black text-emerald-700 dark:text-emerald-400"
          title="Jumlah pcs untuk baris ini"
        />
      </td>

      {/* Size */}
      <td className="py-1 px-1 text-center">
        <input
          type="text"
          value={player.size}
          onChange={(e) => onUpdate(player.id, 'size', normalizeSize(e.target.value))}
          className="w-full px-1.5 py-1 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-black text-indigo-600 dark:text-indigo-400"
        />
      </td>

      {/* Jersey Number */}
      <td className="py-1 px-1 text-center">
        <input
          type="text"
          value={player.number}
          onChange={(e) => onUpdate(player.id, 'number', e.target.value)}
          placeholder="No"
          className="w-full px-1.5 py-1 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-black text-emerald-700 dark:text-emerald-400"
        />
      </td>

      {/* Model */}
      <td className="py-1 px-1">
        <select
          value={player.model || 'PENDEK'}
          onChange={(e) => onUpdate(player.id, 'model', e.target.value)}
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
          value={player.notes === '-' ? '' : (player.notes || '')}
          onChange={(e) => onUpdate(player.id, 'notes', e.target.value)}
          placeholder="Keterangan (misal: Kiper)"
          className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-bold"
        />
      </td>

      {/* Delete button */}
      <td className="py-1 px-1 text-center">
        <button
          type="button"
          onClick={() => onDelete(player.id)}
          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
});

export const SpkEditor: React.FC<SpkEditorProps> = ({
  data,
  onChange,
  onSaveSpk
}) => {
  // Local state for instantaneous input responsiveness without blocking main thread
  const [localData, setLocalData] = useState<SPKData>(data);
  const deferredLocalData = useDeferredValue(localData);

  // Keep latest onChange in a ref
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Synchronize when active SPK changes from parent (e.g. user selected another SPK)
  const currentIdRef = useRef(data.id);
  const isSyncingFromParentRef = useRef(true);

  useEffect(() => {
    if (data.id !== currentIdRef.current) {
      currentIdRef.current = data.id;
      isSyncingFromParentRef.current = true;
      setLocalData(data);
    }
  }, [data.id, data]);

  // Debounced parent onChange to completely eliminate keystroke lag and prevent setState-during-render errors
  useEffect(() => {
    if (isSyncingFromParentRef.current) {
      isSyncingFromParentRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onChangeRef.current(localData);
    }, 350);

    return () => clearTimeout(timer);
  }, [localData]);

  const [activeTab, setActiveTab] = useState<'order' | 'roster' | 'design' | 'notes'>('order');
  const [previewScale, setPreviewScale] = useState<number>(0.72);
  const [previewPageTab, setPreviewPageTab] = useState<'all' | string>('all');
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  const totalPlayers = localData.players?.length || 0;
  const totalRosterPcs = useMemo(() => {
    return (localData.players || []).reduce((sum, p) => sum + (p.qty && p.qty > 0 ? p.qty : 1), 0);
  }, [localData.players]);
  const rawMaxPage1 = localData.layout?.maxPlayersPerPage;
  const maxPage1Rows = typeof rawMaxPage1 === 'number' && rawMaxPage1 >= 20 ? rawMaxPage1 : 50;

  const rawContinuation = localData.layout?.continuationPageSize;
  const continuationPageSize = typeof rawContinuation === 'number' && rawContinuation >= 20 ? rawContinuation : 50;

  const totalPages = useMemo(() => {
    if (localData.layout?.pageMode === '1page') return 1;
    if (totalPlayers <= maxPage1Rows) return 1;
    if (localData.layout?.pageMode === '2page') return 2;
    return 1 + Math.ceil((totalPlayers - maxPage1Rows) / continuationPageSize);
  }, [totalPlayers, maxPage1Rows, continuationPageSize, localData.layout?.pageMode]);

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

  // Form Field Updates (Pure state updates without side-effects inside updater)
  const updateField = useCallback((field: keyof SPKData, value: any) => {
    setLocalData(prev => {
      const nextNotes = { ...prev.notes };
      // Two-way synchronization of material, sleeve, collar, and sewing to notes
      if (field === 'material') {
        nextNotes.bahan = value;
      } else if (field === 'sleeveModel') {
        nextNotes.tangan = value;
      } else if (field === 'collarModel') {
        nextNotes.kerah = value;
      } else if (field === 'sewingModel') {
        nextNotes.jahit = value;
      }

      return {
        ...prev,
        [field]: value,
        notes: nextNotes,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const updateNotesField = useCallback((field: string, value: string) => {
    setLocalData(prev => ({
      ...prev,
      material: field === 'bahan' ? value : prev.material,
      sleeveModel: field === 'tangan' ? value : prev.sleeveModel,
      sewingModel: field === 'jahit' ? value : prev.sewingModel,
      collarModel: field === 'kerah' ? value : prev.collarModel,
      notes: {
        ...prev.notes,
        [field]: value
      },
      updatedAt: new Date().toISOString()
    }));
  }, []);

  const updateLayoutField = useCallback((field: string, value: any) => {
    setLocalData(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [field]: value
      }
    }));
  }, []);

  // Players / Roster Handlers
  const handleAddPlayer = useCallback(() => {
    setLocalData(prev => {
      const newPlayer: SPKPlayer = {
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        no: (prev.players?.length || 0) + 1,
        name: '',
        qty: 1,
        size: 'L',
        number: '',
        model: prev.sleeveModel || 'PENDEK',
        notes: '-',
        qc: false
      };
      return {
        ...prev,
        players: [...(prev.players || []), newPlayer],
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const handleUpdatePlayer = useCallback((id: string, field: keyof SPKPlayer, value: any) => {
    setLocalData(prev => {
      const updatedPlayers = (prev.players || []).map(p => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      });
      return {
        ...prev,
        players: updatedPlayers,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const handleDeletePlayer = useCallback((id: string) => {
    setLocalData(prev => {
      const filtered = (prev.players || []).filter(p => p.id !== id);
      const reindexed = filtered.map((p, idx) => ({ ...p, no: idx + 1 }));
      return {
        ...prev,
        players: reindexed,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const handleToggleQc = useCallback((playerId: string) => {
    setLocalData(prev => {
      const updated = (prev.players || []).map(p => {
        if (p.id === playerId) {
          return { ...p, qc: !p.qc };
        }
        return p;
      });
      return {
        ...prev,
        players: updated,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const handleSortRoster = useCallback((mode: 'size_asc' | 'number_asc' | 'role_kiper_first' | 'name_asc') => {
    setLocalData(prev => {
      const list = [...(prev.players || [])];
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
      return {
        ...prev,
        players: reindexed,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const handleMergeDuplicateRoster = useCallback(() => {
    setLocalData(prev => {
      const merged = mergeDuplicatePlayers(prev.players || []);
      const reindexed = merged.map((p, idx) => ({ ...p, no: idx + 1 }));
      return {
        ...prev,
        players: reindexed,
        updatedAt: new Date().toISOString()
      };
    });
  }, []);

  const handleApplyQuickInput = useCallback((newPlayers: SPKPlayer[], appendMode: boolean, detectedHeader?: Partial<SPKData>) => {
    setLocalData(prev => {
      let finalPlayers: SPKPlayer[];
      if (appendMode) {
        finalPlayers = [...(prev.players || []), ...newPlayers];
      } else {
        finalPlayers = newPlayers;
      }
      finalPlayers = mergeDuplicatePlayers(finalPlayers).map((p, idx) => ({ ...p, no: idx + 1 }));

      const updatedData: SPKData = {
        ...prev,
        players: finalPlayers,
        updatedAt: new Date().toISOString()
      };

      if (detectedHeader) {
        if (detectedHeader.customer) updatedData.customer = detectedHeader.customer;
        if (detectedHeader.poName) updatedData.poName = detectedHeader.poName;
        if (detectedHeader.collarModel) {
          updatedData.collarModel = detectedHeader.collarModel;
          if (!prev.collarCaption) updatedData.collarCaption = detectedHeader.collarModel;
        }
        if (detectedHeader.material) updatedData.material = detectedHeader.material;
        if (detectedHeader.productModel) updatedData.productModel = detectedHeader.productModel;
        if (detectedHeader.sleeveModel) updatedData.sleeveModel = detectedHeader.sleeveModel;
        if (detectedHeader.sewingModel) updatedData.sewingModel = detectedHeader.sewingModel;
        if (detectedHeader.deadline) updatedData.deadline = detectedHeader.deadline;
        if (detectedHeader.notes) {
          updatedData.notes = {
            ...prev.notes,
            ...detectedHeader.notes
          };
        }
      }

      return updatedData;
    });
  }, []);

  // Non-blocking in-app notification toast (replaces blocking alert)
  const [spkToast, setSpkToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setSpkToast({ message, type });
    setTimeout(() => {
      setSpkToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Safe image downscaling & loader to prevent browser Out-of-Memory (OOM) renderer crashes and speed up saving
  const optimizeSpkImage = useCallback(async (blob: Blob): Promise<string> => {
    return compressImage(blob, 1600, 1600, 0.85);
  }, []);

  // Image Upload Handlers
  const handleUploadCollar = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await optimizeSpkImage(file);
        setLocalData(prev => ({
          ...prev,
          collarImage: dataUrl,
          updatedAt: new Date().toISOString()
        }));
        showToast("Gambar kerah berhasil diupload!", "success");
      } catch (err) {
        console.error("Gagal memproses gambar kerah:", err);
        showToast("Gagal memuat gambar kerah", "warning");
      }
      e.target.value = '';
    }
  }, [optimizeSpkImage, showToast]);

  const handlePasteCollar = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const dataUrl = await optimizeSpkImage(blob);
            setLocalData(prev => ({
              ...prev,
              collarImage: dataUrl,
              updatedAt: new Date().toISOString()
            }));
            showToast("Gambar kerah berhasil ditempel (Paste)!", "success");
            return;
          }
        }
        showToast("Tidak ada gambar di clipboard. Copy gambar kerah dulu lalu klik tombol ini.", "info");
      } else {
        showToast("Klik area Kerah dan gunakan tombol Ctrl+V (atau Cmd+V).", "info");
      }
    } catch (err) {
      console.warn("Clipboard access notice:", err);
      showToast("Akses clipboard otomatis dibatasi. Klik kotak Kerah dan tekan Ctrl+V.", "info");
    }
  }, [optimizeSpkImage, showToast]);

  const handleCollarPasteEvent = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          e.stopPropagation();
          try {
            const dataUrl = await optimizeSpkImage(file);
            setLocalData(prev => ({
              ...prev,
              collarImage: dataUrl,
              updatedAt: new Date().toISOString()
            }));
            showToast("Gambar kerah berhasil ditempel!", "success");
          } catch (err) {
            console.error("Gagal paste gambar kerah:", err);
          }
          return;
        }
      }
    }
  }, [optimizeSpkImage, showToast]);

  const handleUploadJersey = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await optimizeSpkImage(file);
        setLocalData(prev => {
          const newImg: SPKJerseyImage = {
            id: `jimg-${Date.now()}`,
            title: `Desain Mockup #${(prev.jerseyImages || []).length + 1}`,
            url: dataUrl,
            includedInSpk: true,
            zoom: 1,
            posX: 0,
            posY: 0,
            rotation: 90,
            opacity: 1,
            fitMode: 'contain'
          };
          return {
            ...prev,
            jerseyImages: [...(prev.jerseyImages || []), newImg],
            updatedAt: new Date().toISOString()
          };
        });
        showToast("Mockup jersey berhasil diupload!", "success");
      } catch (err) {
        console.error("Gagal upload mockup:", err);
        showToast("Gagal memuat file gambar mockup", "warning");
      }
      e.target.value = '';
    }
  }, [optimizeSpkImage, showToast]);

  const handlePasteJersey = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find(t => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const dataUrl = await optimizeSpkImage(blob);
            setLocalData(prev => {
              const newImg: SPKJerseyImage = {
                id: `jimg-${Date.now()}`,
                title: `Desain Mockup #${(prev.jerseyImages || []).length + 1}`,
                url: dataUrl,
                includedInSpk: true,
                zoom: 1,
                posX: 0,
                posY: 0,
                rotation: 90,
                opacity: 1,
                fitMode: 'contain'
              };
              return {
                ...prev,
                jerseyImages: [...(prev.jerseyImages || []), newImg],
                updatedAt: new Date().toISOString()
              };
            });
            showToast("Mockup jersey berhasil ditempel (Paste)!", "success");
            return;
          }
        }
        showToast("Tidak ada gambar di clipboard. Copy gambar mockup dulu lalu klik tombol ini.", "info");
      } else {
        showToast("Klik area galeri mockup dan tekan shortcut Ctrl+V.", "info");
      }
    } catch (err) {
      console.warn("Clipboard access notice:", err);
      showToast("Akses clipboard otomatis dibatasi. Klik area mockup dan tekan Ctrl+V.", "info");
    }
  }, [optimizeSpkImage, showToast]);

  const handleJerseyPasteEvent = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          e.stopPropagation();
          try {
            const dataUrl = await optimizeSpkImage(file);
            setLocalData(prev => {
              const newImg: SPKJerseyImage = {
                id: `jimg-${Date.now()}`,
                title: `Desain Mockup #${(prev.jerseyImages || []).length + 1}`,
                url: dataUrl,
                includedInSpk: true,
                zoom: 1,
                posX: 0,
                posY: 0,
                rotation: 90,
                opacity: 1,
                fitMode: 'contain'
              };
              return {
                ...prev,
                jerseyImages: [...(prev.jerseyImages || []), newImg],
                updatedAt: new Date().toISOString()
              };
            });
            showToast("Mockup jersey berhasil ditempel!", "success");
          } catch (err) {
            console.error("Gagal paste mockup:", err);
          }
          return;
        }
      }
    }
  }, [optimizeSpkImage, showToast]);

  const handleCopyImage = useCallback(async (dataUrl: string, label: string) => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      if (blob.type === 'image/png') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast(`Gambar ${label} berhasil disalin ke clipboard!`, "success");
      } else {
        const img = new Image();
        img.src = dataUrl;
        await new Promise(resolve => { img.onload = resolve; });
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          if (pngBlob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob })
              ]);
              showToast(`Gambar ${label} berhasil disalin ke clipboard!`, "success");
            } catch {
              showToast(`Gagal menyalin gambar ${label}`, "warning");
            }
          }
        }, 'image/png');
      }
    } catch (err) {
      console.warn("Gagal menyalin gambar:", err);
      showToast(`Gagal menyalin gambar ${label} ke clipboard`, "warning");
    }
  }, [showToast]);

  const handleQuickRotateMockup = useCallback((id: string, customDeg?: number) => {
    setLocalData(prev => {
      const updated = (prev.jerseyImages || []).map(img => {
        if (img.id === id) {
          const nextRot = customDeg !== undefined ? customDeg : ((img.rotation ?? 90) + 90) % 360;
          return { ...img, rotation: nextRot };
        }
        return img;
      });
      return { ...prev, jerseyImages: updated };
    });
  }, []);

  const handleQuickZoomMockup = useCallback((id: string, delta: number) => {
    setLocalData(prev => {
      const updated = (prev.jerseyImages || []).map(img => {
        if (img.id === id) {
          const currentZoom = img.zoom ?? 1;
          const nextZoom = Math.max(Number((currentZoom + delta).toFixed(2)), 0.3);
          return { ...img, zoom: Math.min(nextZoom, 3) };
        }
        return img;
      });
      return { ...prev, jerseyImages: updated };
    });
  }, []);

  const handleSetAllMockupsVertical = useCallback(() => {
    setLocalData(prev => {
      const updated = (prev.jerseyImages || []).map(img => ({
        ...img,
        rotation: 90,
        zoom: 1,
        posX: 0,
        posY: 0
      }));
      return { ...prev, jerseyImages: updated };
    });
  }, []);

  const handleDeleteJerseyImage = useCallback((id: string) => {
    setLocalData(prev => {
      const filtered = (prev.jerseyImages || []).filter(img => img.id !== id);
      return { ...prev, jerseyImages: filtered };
    });
  }, []);

  const handleToggleJerseyImage = useCallback((id: string) => {
    setLocalData(prev => {
      const updated = (prev.jerseyImages || []).map(img => {
        if (img.id === id) {
          return { ...img, includedInSpk: !img.includedInSpk };
        }
        return img;
      });
      return { ...prev, jerseyImages: updated };
    });
  }, []);

  // Auto Generate SPK Number
  const handleGenerateSpkNumber = useCallback(() => {
    const year = new Date().getFullYear();
    const randNum = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    updateField('spkNumber', `SPK-${year}-${randNum}`);
  }, [updateField]);

  // Validation
  const validationResult = useMemo(() => {
    return validateSpkData({
      customer: localData.customer,
      spkNumber: localData.spkNumber,
      poName: localData.poName,
      deadline: localData.deadline,
      players: localData.players,
      jerseyImages: localData.jerseyImages
    });
  }, [localData.customer, localData.spkNumber, localData.poName, localData.deadline, localData.players, localData.jerseyImages]);

  // Save SPK
  const handleSave = () => {
    onChangeRef.current(localData);
    onSaveSpk(localData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Export handlers
  const handlePrint = () => {
    onChangeRef.current(localData);
    printSpkDocument();
  };

  const handleExportPdf = async () => {
    try {
      onChangeRef.current(localData);
      setIsExporting('PDF');
      await exportSpkPdf('spk-editor-live-sheet', localData);
    } catch (err: any) {
      alert(`Gagal export PDF: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportImage = async (format: 'png' | 'jpeg') => {
    try {
      onChangeRef.current(localData);
      setIsExporting(format.toUpperCase());
      await exportSpkImage('spk-editor-live-sheet', localData, format);
    } catch (err: any) {
      alert(`Gagal export Gambar: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-4 relative">
      {/* Floating Notification Toast */}
      {spkToast && (
        <div className="fixed top-5 right-5 z-50 max-w-md animate-bounce-short shadow-2xl">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold backdrop-blur-md border ${
            spkToast.type === 'success' 
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-950/30' 
              : spkToast.type === 'warning'
              ? 'bg-amber-950/90 text-amber-200 border-amber-500/40 shadow-amber-950/30'
              : 'bg-slate-900/90 text-emerald-200 border-emerald-500/40 shadow-slate-950/40'
          }`}>
            <span className="flex-1">{spkToast.message}</span>
            <button 
              type="button" 
              onClick={() => setSpkToast(null)}
              className="p-1 hover:bg-white/10 rounded-lg transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Top Workspace Action Toolbar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* SPK Title Indicator */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-[#00805F] dark:text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/20">
            A4
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white font-mono">{localData.spkNumber}</span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-bold text-[#00805F] dark:text-emerald-400 uppercase">{localData.poName || 'BELUM ADA PO'}</span>
              <span className={`px-2 py-0.2 rounded text-[9px] font-black uppercase ${
                localData.status === 'URGENT' ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
              }`}>
                {localData.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Total Roster: <b className="text-slate-900 dark:text-white">{(localData.players || []).length} PCS</b> | Konsumen: <b className="text-slate-900 dark:text-white">{localData.customer || '-'}</b>
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
              <span>2. Roster ({(localData.players || []).length})</span>
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
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                    >
                      Auto No
                    </button>
                  </div>
                  <input
                    type="text"
                    value={localData.spkNumber}
                    onChange={(e) => updateField('spkNumber', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nama Konsumen:</label>
                  <input
                    type="text"
                    value={localData.customer}
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
                    value={localData.poName}
                    onChange={(e) => updateField('poName', e.target.value)}
                    placeholder="Contoh: SOLIDARITAS"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-black uppercase text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Produksi:</label>
                  <select
                    value={localData.status}
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
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status Pengerjaan Pesanan:</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'] as string[]).map((st) => {
                    const currentProdStatus = (localData as any).productionStatus || 'Setting';
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
                    value={localData.collarModel}
                    onChange={(e) => {
                      updateField('collarModel', e.target.value);
                      if (!localData.collarCaption) updateField('collarCaption', e.target.value);
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
                    value={localData.material}
                    onChange={(e) => updateField('material', e.target.value)}
                    placeholder="Contoh: WAFFLE"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold uppercase text-slate-900 dark:text-white"
                  />
                  <datalist id="bahan-list">
                    {PRESET_BAHAN.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
              </div>

              {/* Model Produk & Model Lengan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Model Produk:</label>
                  <input
                    type="text"
                    list="model-list"
                    value={localData.productModel}
                    onChange={(e) => updateField('productModel', e.target.value)}
                    placeholder="Contoh: SETELAN"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold uppercase text-slate-900 dark:text-white"
                  />
                  <datalist id="model-list">
                    {PRESET_MODEL.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Model Lengan:</label>
                  <input
                    type="text"
                    list="tangan-list"
                    value={localData.sleeveModel}
                    onChange={(e) => updateField('sleeveModel', e.target.value)}
                    placeholder="Contoh: PENDEK"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold uppercase text-slate-900 dark:text-white"
                  />
                  <datalist id="tangan-list">
                    {PRESET_TANGAN.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
              </div>

              {/* Model Jahitan & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Model Jahitan:</label>
                  <input
                    type="text"
                    list="jahit-list"
                    value={localData.sewingModel}
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
                    value={localData.deadline}
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
                    Daftar Pemain / Roster ({(localData.players || []).length} Baris &bull; {totalRosterPcs} Pcs)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Ketik langsung di baris pemain — isi QTY jika ada nama/ukuran yang sama.
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

              {/* Quick Sorting & Aggregating Toolbar */}
              {(localData.players || []).length > 1 && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Kelola Roster:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleMergeDuplicateRoster}
                      className="px-2 py-1 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200/80 text-emerald-900 dark:text-emerald-200 font-black text-[10px] cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                      title="Gabungkan baris yang memiliki nama, ukuran, nomor, dan model sama ke kolom QTY"
                    >
                      ⚡ Gabung Duplikat (Qty)
                    </button>
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
                      <th className="py-2 px-2 min-w-[130px]">NAMA</th>
                      <th className="py-2 px-1 text-center w-12">QTY</th>
                      <th className="py-2 px-1 text-center w-14">SIZE</th>
                      <th className="py-2 px-1 text-center w-12">NO</th>
                      <th className="py-2 px-1 w-24">MODEL</th>
                      <th className="py-2 px-2 min-w-[140px]">KETERANGAN</th>
                      <th className="py-2 px-1 text-center w-8">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(localData.players || []).map((player, idx) => (
                      <MemoizedPlayerRow
                        key={player.id}
                        player={player}
                        index={idx}
                        onUpdate={handleUpdatePlayer}
                        onDelete={handleDeletePlayer}
                      />
                    ))}

                    {(localData.players || []).length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500 italic">
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
              <div 
                tabIndex={0}
                onPaste={handleCollarPasteEvent}
                className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 bg-slate-50/40 dark:bg-slate-900/40 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider block">
                    1. Preview Gambar Kerah
                  </span>
                  {localData.collarImage && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyImage(localData.collarImage!, 'Kerah')}
                        className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                        title="Salin (Copy) gambar kerah ke clipboard"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Kerah</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveImageEditor({
                          isOpen: true,
                          type: 'collar',
                          url: localData.collarImage || '',
                          title: 'Gambar Kerah',
                          zoom: localData.collarZoom || 1,
                          posX: localData.collarPosX || 0,
                          posY: localData.collarPosY || 0,
                          rotation: localData.collarRotation || 0
                        })}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Edit Posisi & Zoom</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-20 w-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
                    {localData.collarImage ? (
                      <img src={localData.collarImage} alt="Collar" className="max-h-full max-w-full object-contain" />
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
                        value={localData.collarCaption || localData.collarModel || ''}
                        onChange={(e) => updateField('collarCaption', e.target.value)}
                        placeholder="Contoh: V Datar + Lidah"
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-[#00805F] hover:bg-[#006B50] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Ganti Gambar Kerah</span>
                        <input type="file" accept="image/*" onChange={handleUploadCollar} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={handlePasteCollar}
                        className="cursor-pointer px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                        title="Tempel gambar kerah dari clipboard (Ctrl+V)"
                      >
                        <ClipboardPaste className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Paste Kerah (Ctrl+V)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jersey Mockups Gallery Box */}
              <div 
                tabIndex={0}
                onPaste={handleJerseyPasteEvent}
                className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/50 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
              >
                {/* Header Title & Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                      2. Desain Jersey & Mockup Produksi
                    </span>
                    {(localData.jerseyImages || []).length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#00805F]/10 text-[#00805F] dark:text-emerald-400 border border-[#00805F]/20">
                        {localData.jerseyImages.length} Mockup
                      </span>
                    )}
                  </div>
                </div>

                {/* Full-width Explanatory Text */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed m-0">
                  Default orientasi lembar SPK: <strong className="text-[#00805F] dark:text-emerald-400 font-bold">90° (Vertikal)</strong>. Anda dapat upload, paste gambar (Ctrl+V), geser posisi X/Y, zoom, atau memutar sudut mockup secara langsung.
                </p>
                
                {/* Action Buttons Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
                  <label className="cursor-pointer px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors select-none">
                    <Upload className="h-4 w-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
                    <span>Upload Mockup Baru</span>
                    <input type="file" accept="image/*" onChange={handleUploadJersey} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={handlePasteJersey}
                    className="cursor-pointer px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors"
                    title="Tempel gambar mockup baru dari clipboard (Ctrl+V)"
                  >
                    <ClipboardPaste className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Paste Mockup (Ctrl+V)</span>
                  </button>

                  {(localData.jerseyImages || []).length > 0 && (
                    <button
                      type="button"
                      onClick={handleSetAllMockupsVertical}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-center gap-2 shadow-2xs transition-colors"
                      title="Setel semua sudut mockup ke 90° (Vertikal)"
                    >
                      <RotateCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Set Semua 90° Vertikal</span>
                    </button>
                  )}
                </div>

                {/* Mockup Cards List */}
                <div className="space-y-3 pt-1">
                  {(localData.jerseyImages || []).map((img) => {
                    const currentRot = img.rotation ?? 90;
                    const isVertical = ((currentRot % 360) + 360) % 360 === 90;

                    return (
                      <div
                        key={img.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                      >
                        {/* Top Row: Checkbox, Thumbnail, Details & Delete */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* SPK Include Toggle */}
                            <label 
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer shrink-0 hover:border-emerald-500 transition-colors"
                              title="Centang untuk menyertakan mockup ini pada lembar cetak SPK"
                            >
                              <input
                                type="checkbox"
                                checked={img.includedInSpk}
                                onChange={() => handleToggleJerseyImage(img.id)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                              />
                              <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 select-none">SPK</span>
                            </label>

                            {/* Live Transform Thumbnail */}
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
                              className="h-12 w-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors relative group shrink-0"
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
                              <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Sliders className="h-4 w-4" />
                              </div>
                            </div>

                            {/* Title, Orientation Badge, & Coordinate Specs */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <span className="font-bold text-slate-900 dark:text-white text-xs block truncate" title={img.title}>
                                {img.title}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider whitespace-nowrap ${
                                  isVertical 
                                    ? 'bg-emerald-500/15 text-[#00805F] dark:text-emerald-400 border border-emerald-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}>
                                  {currentRot === 90 ? 'VERTIKAL (90°)' : currentRot === 0 ? 'HORIZONTAL (0°)' : `${currentRot}°`}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                                  Zoom: {Math.round((img.zoom ?? 1) * 100)}% | X: {img.posX ?? 0}% | Y: {img.posY ?? 0}%
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Copy Image Button */}
                            <button
                              type="button"
                              onClick={() => handleCopyImage(img.url, img.title)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors"
                              title="Salin (Copy) gambar mockup ini ke clipboard"
                            >
                              <Copy className="h-4 w-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteJerseyImage(img.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                              title="Hapus mockup ini"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Bottom Row: Control Toolbar */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                          {/* 1. Open Position Editor */}
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
                            className="w-full py-1.5 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            title="Buka panel geser posisi visual, zoom & rotasi"
                          >
                            <Sliders className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">Atur Posisi & Zoom</span>
                          </button>

                          {/* 2. Rotate 90° */}
                          <button
                            type="button"
                            onClick={() => handleQuickRotateMockup(img.id)}
                            className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            title="Putar rotasi (+90°)"
                          >
                            <RotateCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Putar 90°</span>
                          </button>

                          {/* 3. Zoom Stepper */}
                          <div className="w-full flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
                            <button
                              type="button"
                              onClick={() => handleQuickZoomMockup(img.id, -0.1)}
                              className="px-2.5 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                              title="Perkecil Zoom (-10%)"
                            >
                              <ZoomOut className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-[11px] font-mono px-2 text-slate-700 dark:text-slate-300 font-bold select-none">
                              {Math.round((img.zoom ?? 1) * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickZoomMockup(img.id, 0.1)}
                              className="px-2.5 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                              title="Perbesar Zoom (+10%)"
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {(localData.jerseyImages || []).length === 0 && (
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
                  Catatan Khusus Penjahit
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Instruksi Utama (Highlight Tebal):
                  </label>
                  <input
                    type="text"
                    value={localData.notes?.mainNote || ''}
                    onChange={(e) => updateNotesField('mainNote', e.target.value)}
                    placeholder="Contoh: TUTUP KERAH POLOS, FULL STIK"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-950 font-black text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Jahit:</label>
                    <input
                      type="text"
                      value={localData.notes?.jahit || localData.sewingModel || ''}
                      onChange={(e) => updateNotesField('jahit', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Bahan:</label>
                    <input
                      type="text"
                      value={localData.notes?.bahan || localData.material || ''}
                      onChange={(e) => updateNotesField('bahan', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">Tangan:</label>
                    <input
                      type="text"
                      value={localData.notes?.tangan || localData.sleeveModel || ''}
                      onChange={(e) => updateNotesField('tangan', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
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
                        (localData.layout?.pageMode ?? 'auto') === 'auto' || localData.layout?.pageMode === 'multi'
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
                        localData.layout?.pageMode === '1page'
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
                        localData.layout?.pageMode === '2page'
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
                        value={localData.layout?.maxPlayersPerPage || 50}
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
                        value={localData.layout?.continuationPageSize || 50}
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
                        checked={localData.layout?.showHeader ?? true}
                        onChange={(e) => updateLayoutField('showHeader', e.target.checked)}
                        className="rounded text-emerald-600 cursor-pointer"
                      />
                      <span>Kop Header Apparel</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localData.layout?.showOrderInfo ?? true}
                        onChange={(e) => updateLayoutField('showOrderInfo', e.target.checked)}
                        className="rounded text-emerald-600 cursor-pointer"
                      />
                      <span>Informasi Order 2 Kolom</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localData.layout?.showCollarPreview ?? true}
                        onChange={(e) => updateLayoutField('showCollarPreview', e.target.checked)}
                        className="rounded text-emerald-600 cursor-pointer"
                      />
                      <span>Preview Kerah</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localData.layout?.showSizeRecap ?? true}
                        onChange={(e) => updateLayoutField('showSizeRecap', e.target.checked)}
                        className="rounded text-emerald-600 cursor-pointer"
                      />
                      <span>Rekap Ukuran</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localData.layout?.showJerseyDesign ?? true}
                        onChange={(e) => updateLayoutField('showJerseyDesign', e.target.checked)}
                        className="rounded text-emerald-600 cursor-pointer"
                      />
                      <span>Mockup Desain Jersey</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localData.layout?.showTailorNotes ?? true}
                        onChange={(e) => updateLayoutField('showTailorNotes', e.target.checked)}
                        className="rounded text-emerald-600 cursor-pointer"
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
                  className="rounded text-emerald-600 cursor-pointer"
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
                data={deferredLocalData}
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
        defaultModel={localData.sleeveModel || 'PENDEK'}
        currentSpkData={localData}
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
        data={localData}
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
              setLocalData(prev => ({
                ...prev,
                collarZoom: settings.zoom,
                collarPosX: settings.posX,
                collarPosY: settings.posY,
                collarRotation: settings.rotation
              }));
            } else if (activeImageEditor.type === 'jersey' && activeImageEditor.jerseyId) {
              setLocalData(prev => {
                const updated = (prev.jerseyImages || []).map(img => {
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
                return { ...prev, jerseyImages: updated };
              });
            }
          }}
        />
      )}

    </div>
  );
};
