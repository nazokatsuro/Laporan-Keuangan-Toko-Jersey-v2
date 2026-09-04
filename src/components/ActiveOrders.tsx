/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Pesanan, StatusProduksi, ShopSettings, CashFlowTransaction } from '../types';
import { formatRupiah, checkOrderPaymentStatus } from '../utils';
import { SPKData, SPKCompanySettings, SPKTemplate } from '../spkTypes';
import { 
  DEFAULT_COMPANY_SETTINGS, 
  INITIAL_DEFAULT_SPK, 
  DEFAULT_TEMPLATES 
} from '../spkSampleData';
import { 
  orderToSpkData, 
  syncSpkToOrder, 
  getSyncedCompanySettings 
} from '../utils/spkSync';
import { SpkDashboard } from './spk/SpkDashboard';
import { SpkEditor } from './spk/SpkEditor';
import { SpkDatabase } from './spk/SpkDatabase';
import { SpkTemplates } from './spk/SpkTemplates';
import { SpkSettings } from './spk/SpkSettings';
import { SpkFullscreenModal } from './spk/SpkFullscreenModal';
import { NotaModal } from './nota/NotaModal';
import { BatchNotaModal } from './nota/BatchNotaModal';
import { VendorPayablesModal } from './nota/VendorPayablesModal';
import { VendorPayableCategory } from './nota/VendorPayablesCard';
import { printSpkDocument } from '../utils/spkExport';
import { persistOrders } from '../storageService';
import { 
  Search, 
  Filter, 
  Calendar, 
  Edit2, 
  Trash2, 
  Check, 
  Clock, 
  AlertCircle,
  TrendingDown,
  User,
  Plus,
  Play,
  CheckCircle,
  MoreVertical,
  XSquare,
  ArrowUpDown,
  Eye,
  MessageSquare,
  Send,
  AlertTriangle,
  DollarSign,
  Copy,
  FileText,
  Printer,
  Sparkles,
  ClipboardList,
  FileCheck,
  Layers,
  Settings as SettingsIcon,
  LayoutDashboard,
  FileEdit,
  FileSpreadsheet,
  PlusCircle,
  QrCode,
  CheckSquare,
  Square,
  Receipt,
  Scissors
} from 'lucide-react';

interface ActiveOrdersProps {
  pesananList: Pesanan[];
  settings: ShopSettings;
  onUpdateSettings?: (updates: Partial<ShopSettings>) => void;
  onLogToCashFlow: (kategori: string, jenis: 'masuk'|'keluar', nominal: number, keterangan: string, orderId?: string) => void;
  onAddNew: () => void;
  onEdit: (pesanan: Pesanan) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, newStatus: StatusProduksi) => void;
  onUpdatePesananList?: (list: Pesanan[]) => void;
  onSavePesanan?: (pesanan: Pesanan) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

const STORAGE_KEY_SPK_TEMPLATES = 'nomaden_spk_templates_v1';
const STORAGE_KEY_SPK_SETTINGS = 'nomaden_spk_settings_v1';
const STORAGE_KEY_SPK_STANDALONE = 'nomaden_spk_standalone_v1';
const STORAGE_KEY_SPK_ACTIVE_ID = 'nomaden_spk_active_id_v2';
const STORAGE_KEY_SPK_MAIN_VIEW = 'nomaden_spk_main_view_v2';
const STORAGE_KEY_SPK_TAB = 'nomaden_spk_tab_v2';

export default function ActiveOrders({ 
  pesananList, 
  settings,
  onUpdateSettings,
  onLogToCashFlow,
  onAddNew, 
  onEdit, 
  onDelete, 
  onUpdateStatus,
  onUpdatePesananList,
  onSavePesanan,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}: ActiveOrdersProps) {
  // Primary View Mode: 'transaksi' (Tabel Pesanan) vs 'spk' (Modul SPK)
  const [activeMainView, setActiveMainView] = useState<'transaksi' | 'spk'>(() => {
    return (localStorage.getItem(STORAGE_KEY_SPK_MAIN_VIEW) as any) || 'transaksi';
  });
  
  // SPK Sub Navigation
  const [spkTab, setSpkTab] = useState<'dashboard' | 'editor' | 'database' | 'templates' | 'settings'>(() => {
    return (localStorage.getItem(STORAGE_KEY_SPK_TAB) as any) || 'dashboard';
  });

  // SPK Settings & Templates
  const [companySettings, setCompanySettings] = useState<SPKCompanySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SPK_SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return getSyncedCompanySettings(settings, parsed);
      } catch (e) {
        console.error('Failed to parse SPK settings', e);
      }
    }
    return getSyncedCompanySettings(settings, DEFAULT_COMPANY_SETTINGS);
  });

  // Keep SPK company branding in sync whenever Toko Settings update
  useEffect(() => {
    setCompanySettings(prev => getSyncedCompanySettings(settings, prev));
  }, [settings]);

  const [templates, setTemplates] = useState<SPKTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SPK_TEMPLATES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse SPK templates', e);
      }
    }
    return DEFAULT_TEMPLATES;
  });

  // Standalone SPK list (not tied to a Pesanan)
  const [standaloneSpkList, setStandaloneSpkList] = useState<SPKData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SPK_STANDALONE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse standalone SPK list', e);
      }
    }
    return [];
  });

  // Active SPK in Editor
  const [activeSpk, setActiveSpk] = useState<SPKData>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_SPK_ACTIVE_ID);
    if (savedId) {
      const orderId = savedId.startsWith('spk-ord-') ? savedId.replace('spk-ord-', '') : savedId;
      const matchedOrder = pesananList.find(p => p.id === orderId || `spk-ord-${p.id}` === savedId);
      if (matchedOrder) {
        return orderToSpkData(matchedOrder, companySettings, settings);
      }
      const savedStandalone = localStorage.getItem(STORAGE_KEY_SPK_STANDALONE);
      if (savedStandalone) {
        try {
          const list: SPKData[] = JSON.parse(savedStandalone);
          const matched = list.find(s => s.id === savedId);
          if (matched) return matched;
        } catch {}
      }
    }
    if (pesananList.length > 0) {
      return orderToSpkData(pesananList[0], companySettings, settings);
    }
    return INITIAL_DEFAULT_SPK;
  });

  // Linked Order ID if current SPK belongs to a transaction
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_SPK_ACTIVE_ID);
    if (savedId) {
      const orderId = savedId.startsWith('spk-ord-') ? savedId.replace('spk-ord-', '') : savedId;
      const matchedOrder = pesananList.find(p => p.id === orderId || `spk-ord-${p.id}` === savedId);
      if (matchedOrder) return matchedOrder.id;
      if (savedId.startsWith('spk-custom-') || savedId.startsWith('spk-init-')) return null;
    }
    return pesananList.length > 0 ? pesananList[0].id : null;
  });

  // Fullscreen SPK Modal Target
  const [fullscreenTarget, setFullscreenTarget] = useState<SPKData | null>(null);

  // Selected order for Nota & QRIS Modal
  const [selectedNotaOrder, setSelectedNotaOrder] = useState<Pesanan | null>(null);

  // Selected order IDs for Batch Nota & Actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchNotaModalOpen, setIsBatchNotaModalOpen] = useState<boolean>(false);
  const [batchNotaOrders, setBatchNotaOrders] = useState<Pesanan[]>([]);

  // Vendor Payables (Belum Lunas Jahit, Sublim, Komisi) Modal State
  const [isVendorPayablesModalOpen, setIsVendorPayablesModalOpen] = useState<boolean>(false);
  const [vendorPayablesOrders, setVendorPayablesOrders] = useState<Pesanan[]>([]);
  const [vendorPayablesInitialCategory, setVendorPayablesInitialCategory] = useState<VendorPayableCategory>('semua');

  // Sync SPK states to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SPK_SETTINGS, JSON.stringify(companySettings));
  }, [companySettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SPK_TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SPK_STANDALONE, JSON.stringify(standaloneSpkList));
  }, [standaloneSpkList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SPK_MAIN_VIEW, activeMainView);
  }, [activeMainView]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SPK_TAB, spkTab);
  }, [spkTab]);

  useEffect(() => {
    if (activeSpk && activeSpk.id) {
      localStorage.setItem(STORAGE_KEY_SPK_ACTIVE_ID, activeSpk.id);
    }
  }, [activeSpk?.id]);

  // Keep activeSpk refreshed when pesananList loads
  useEffect(() => {
    if (pesananList.length === 0) return;
    const savedId = localStorage.getItem(STORAGE_KEY_SPK_ACTIVE_ID);
    if (savedId) {
      const orderId = savedId.startsWith('spk-ord-') ? savedId.replace('spk-ord-', '') : savedId;
      const matchedOrder = pesananList.find(p => p.id === orderId || `spk-ord-${p.id}` === savedId);
      if (matchedOrder && (activeSpk.id === `spk-ord-${matchedOrder.id}` || activeSpk.id === 'spk-init-001')) {
        const fresh = orderToSpkData(matchedOrder, companySettings, settings);
        setActiveSpk(fresh);
        setLinkedOrderId(matchedOrder.id);
      }
    }
  }, [pesananList]);

  // Combined synchronized SPK list: All transactions mapped to SPK + any standalone SPKs
  const combinedSpkList = useMemo<SPKData[]>(() => {
    const fromOrders = pesananList.map(order => orderToSpkData(order, companySettings, settings));
    return [...fromOrders, ...standaloneSpkList];
  }, [pesananList, companySettings, settings, standaloneSpkList]);

  // Filters and Sort State for Transactions
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('laporan_jersey_tx_search') || '');
  const [progressFilter, setProgressFilter] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_progress') || 'Semua');
  const [paymentFilter, setPaymentFilter] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_payment') || 'Semua');
  const [deadlineFilter, setDeadlineFilter] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_deadline') || 'Semua');
  const [customerFilter, setCustomerFilter] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_customer') || 'Semua');
  const [tableMonth, setTableMonth] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_month') || 'Semua');
  const [tableYear, setTableYear] = useState<string>(() => localStorage.getItem('laporan_jersey_tx_year') || 'Semua');
  
  const [sortBy, setSortBy] = useState<'deadline' | 'qty' | 'totalHarga' | 'sisaTagihan' | 'createdAt'>(() => (localStorage.getItem('laporan_jersey_tx_sort_by') as any) || 'deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (localStorage.getItem('laporan_jersey_tx_sort_order') as any) || 'asc');

  // Sync filter states to localStorage
  useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_search', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_progress', progressFilter);
  }, [progressFilter]);

  useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_payment', paymentFilter);
  }, [paymentFilter]);

  useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_deadline', deadlineFilter);
  }, [deadlineFilter]);

  useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_customer', customerFilter);
  }, [customerFilter]);

  useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_month', tableMonth);
  }, [tableMonth]);

  useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_year', tableYear);
  }, [tableYear]);

  useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_sort_by', sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem('laporan_jersey_tx_sort_order', sortOrder);
  }, [sortOrder]);
  
  // Modal state for deletion confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // State to confirm profit extraction safely
  const [confirmProfitId, setConfirmProfitId] = useState<string | null>(null);

  // State for copying feedback
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const handleCopyTailorDescription = (item: Pesanan) => {
    const lines = [
      `Nama Konsumen : ${item.namaPemesan || ''}`,
      `Nama PO/Tim   : ${item.namaPo || ''}`,
      `Bahan         : ${item.items && item.items.length > 0 ? item.items.map(it => `${it.namaProduk} (${it.bahan})`).join(', ') : (item.bahan || '')}`,
      `Tgl Deadline  : ${item.deadline || ''}`,
      `Bentuk Kerah  : ${item.items && item.items.length > 0 ? item.items.map(it => `${it.namaProduk} (${it.modelKerah || ''})`).join(', ') : (item.modelKerah || '')}`,
      `Catatan Konsumen (Desain/Spesifikasi) :\n${item.items && item.items.length > 0 ? item.items.map(it => `- ${it.namaProduk}: ${it.keterangan || '(Tanpa Catatan)'}`).join('\n') : (item.keterangan || '(Tanpa Catatan)')}`,
      `Catatan Khusus Jahit (Penjahit) :\n${item.items && item.items.length > 0 ? item.items.map(it => `- ${it.namaProduk}: ${it.catatanJahit || '(Tanpa Catatan Khusus)'}`).join('\n') : (item.catatanJahit || '(Tanpa Catatan Khusus)')}`,
      `Data size atau data nama nama dari konsumen :\n${item.detailSizeNama || '(Belum Ada Data Size / Nama)'}`
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedOrderId(item.id);
      setTimeout(() => setCopiedOrderId(null), 2500);
    }).catch(err => {
      console.error("Gagal menyalin teks:", err);
    });
  };

  // Open SPK specifically for a selected order
  const handleOpenSpkForOrder = (order: Pesanan) => {
    const spk = orderToSpkData(order, companySettings, settings);
    setActiveSpk(spk);
    setLinkedOrderId(order.id);
    localStorage.setItem(STORAGE_KEY_SPK_ACTIVE_ID, spk.id);
    setSpkTab('editor');
    setActiveMainView('spk');
  };

  // Quick print / preview SPK directly from transaction card
  const handleQuickPrintSpk = (order: Pesanan) => {
    const spk = orderToSpkData(order, companySettings, settings);
    setFullscreenTarget(spk);
  };

  // Auto-sync & auto-save SPK edits so refreshing or navigating never loses changes
  const handleSpkChange = (updated: SPKData) => {
    setActiveSpk(updated);
    if (updated.id) {
      localStorage.setItem(STORAGE_KEY_SPK_ACTIVE_ID, updated.id);
    }

    const updatedWithCompany = {
      ...updated,
      companySettings: companySettings,
      updatedAt: new Date().toISOString()
    };

    const orderId = linkedOrderId || (updated.id.startsWith('spk-ord-') ? updated.id.replace('spk-ord-', '') : null);
    const targetOrder = pesananList.find(p => p.id === orderId || `spk-ord-${p.id}` === updated.id);

    if (targetOrder) {
      const updatedOrder = syncSpkToOrder(updatedWithCompany, targetOrder);
      if (onSavePesanan) {
        onSavePesanan(updatedOrder);
      } else if (onUpdatePesananList) {
        const newList = pesananList.map(p => p.id === updatedOrder.id ? updatedOrder : p);
        onUpdatePesananList(newList);
        persistOrders(newList).catch(() => {});
      }
    } else {
      setStandaloneSpkList(prev => {
        const exists = prev.some(item => item.id === updatedWithCompany.id);
        const nextList = exists 
          ? prev.map(item => item.id === updatedWithCompany.id ? updatedWithCompany : item)
          : [updatedWithCompany, ...prev];
        localStorage.setItem(STORAGE_KEY_SPK_STANDALONE, JSON.stringify(nextList));
        return nextList;
      });
    }
  };

  // Save SPK and synchronize back into transaction list
  const handleSaveSpk = (spkToSave: SPKData) => {
    const updatedWithCompany = {
      ...spkToSave,
      companySettings: companySettings,
      updatedAt: new Date().toISOString()
    };

    setActiveSpk(updatedWithCompany);
    if (updatedWithCompany.id) {
      localStorage.setItem(STORAGE_KEY_SPK_ACTIVE_ID, updatedWithCompany.id);
    }

    // Check if this SPK corresponds to a transaction order
    const orderId = linkedOrderId || (spkToSave.id.startsWith('spk-ord-') ? spkToSave.id.replace('spk-ord-', '') : null);
    const targetOrder = pesananList.find(p => p.id === orderId || `spk-ord-${p.id}` === spkToSave.id);

    if (targetOrder) {
      const updatedOrder = syncSpkToOrder(updatedWithCompany, targetOrder);
      if (onSavePesanan) {
        onSavePesanan(updatedOrder);
      } else if (onUpdatePesananList) {
        const newList = pesananList.map(p => p.id === updatedOrder.id ? updatedOrder : p);
        onUpdatePesananList(newList);
        persistOrders(newList).catch(() => {});
      }
    } else {
      // It's a standalone SPK
      setStandaloneSpkList(prev => {
        const exists = prev.some(item => item.id === updatedWithCompany.id);
        const nextList = exists 
          ? prev.map(item => item.id === updatedWithCompany.id ? updatedWithCompany : item)
          : [updatedWithCompany, ...prev];
        localStorage.setItem(STORAGE_KEY_SPK_STANDALONE, JSON.stringify(nextList));
        return nextList;
      });
    }
  };

  // New Standalone SPK Handler
  const handleNewSpk = () => {
    const year = new Date().getFullYear();
    const randNum = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    
    const newSpk: SPKData = {
      ...INITIAL_DEFAULT_SPK,
      id: `spk-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      spkNumber: `SPK-${year}-${randNum}`,
      customer: 'KONSUMEN BARU',
      poName: 'PO BARU',
      players: [],
      companySettings: companySettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setStandaloneSpkList(prev => {
      const nextList = [newSpk, ...prev];
      localStorage.setItem(STORAGE_KEY_SPK_STANDALONE, JSON.stringify(nextList));
      return nextList;
    });
    setActiveSpk(newSpk);
    setLinkedOrderId(null);
    localStorage.setItem(STORAGE_KEY_SPK_ACTIVE_ID, newSpk.id);
    setSpkTab('editor');
  };

  const handleOpenSpkFromDatabase = (spk: SPKData) => {
    setActiveSpk(spk);
    const orderId = spk.id.startsWith('spk-ord-') ? spk.id.replace('spk-ord-', '') : null;
    setLinkedOrderId(orderId);
    localStorage.setItem(STORAGE_KEY_SPK_ACTIVE_ID, spk.id);
    setSpkTab('editor');
  };

  const handleDuplicateSpk = (spk: SPKData) => {
    const year = new Date().getFullYear();
    const randNum = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');

    const duplicated: SPKData = {
      ...spk,
      id: `spk-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      spkNumber: `SPK-${year}-${randNum}`,
      poName: `${spk.poName} (SALINAN)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setStandaloneSpkList(prev => {
      const nextList = [duplicated, ...prev];
      localStorage.setItem(STORAGE_KEY_SPK_STANDALONE, JSON.stringify(nextList));
      return nextList;
    });
    setActiveSpk(duplicated);
    setLinkedOrderId(null);
    localStorage.setItem(STORAGE_KEY_SPK_ACTIVE_ID, duplicated.id);
    setSpkTab('editor');
  };

  const handleDeleteSpk = (id: string) => {
    if (id.startsWith('spk-ord-')) {
      const orderId = id.replace('spk-ord-', '');
      if (window.confirm('SPK ini terhubung dengan transaksi. Hapus pesanan transaksi ini?')) {
        onDelete(orderId);
      }
    } else {
      setStandaloneSpkList(prev => prev.filter(item => item.id !== id));
      if (activeSpk.id === id) {
        if (combinedSpkList.length > 0) {
          setActiveSpk(combinedSpkList[0]);
        } else {
          handleNewSpk();
        }
      }
    }
  };

  const handleApplyTemplate = (tmpl: SPKTemplate) => {
    const year = new Date().getFullYear();
    const randNum = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');

    const newFromTemplate: SPKData = {
      ...INITIAL_DEFAULT_SPK,
      ...tmpl.data,
      id: linkedOrderId ? `spk-ord-${linkedOrderId}` : `spk-custom-${Date.now()}`,
      spkNumber: activeSpk.spkNumber || `SPK-${year}-${randNum}`,
      customer: activeSpk.customer || 'KONSUMEN',
      poName: activeSpk.poName || 'PO BARU',
      companySettings: companySettings,
      createdAt: activeSpk.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setActiveSpk(newFromTemplate);
    setSpkTab('editor');
  };

  const handleSaveAsTemplate = (name: string, description: string, category: any) => {
    const newTmpl: SPKTemplate = {
      id: `custom-${Date.now()}`,
      name,
      description,
      category: category as SPKTemplate['category'],
      data: activeSpk
    };
    setTemplates(prev => [newTmpl, ...prev]);
    alert('Template baru berhasil disimpan!');
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Hapus template custom ini?')) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
  };

  const handleSaveSettings = (newSettings: SPKCompanySettings) => {
    setCompanySettings(newSettings);
    setActiveSpk(prev => ({
      ...prev,
      companySettings: newSettings
    }));
  };

  const handleExportAllSpkData = () => {
    const backupObj = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      companySettings,
      templates,
      spkList: combinedSpkList
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `BACKUP_NOMADEN_SPK_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportAllSpkData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.companySettings) setCompanySettings(parsed.companySettings);
      if (parsed.templates && Array.isArray(parsed.templates)) setTemplates(parsed.templates);
      if (parsed.spkList && Array.isArray(parsed.spkList)) {
        setStandaloneSpkList(parsed.spkList.filter((s: SPKData) => !s.id.startsWith('spk-ord-')));
      }
      alert('Data SPK berhasil diimpor!');
    } catch (e) {
      alert('Format file JSON tidak valid!');
    }
  };

  // Derive unique customer list dynamically for filtering
  const uniqueCustomers = useMemo(() => {
    const names = new Set<string>();
    pesananList.forEach(item => {
      if (item.namaPemesan && item.namaPemesan.trim()) {
        names.add(item.namaPemesan.trim());
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'id'));
  }, [pesananList]);

  // Derive unique years from actual transaction history
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    const currentYear = new Date().getFullYear();
    for (let yr = 2020; yr <= currentYear + 10; yr++) {
      years.add(String(yr));
    }
    pesananList.forEach(item => {
      const yr = item.createdAt.substring(0, 4);
      if (yr) years.add(yr);
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [pesananList]);

  // Months listing helper
  const MONTHS_LIST = [
    { value: 'Semua', name: 'Semua Bulan' },
    { value: '01', name: 'Januari' },
    { value: '02', name: 'Februari' },
    { value: '03', name: 'Maret' },
    { value: '04', name: 'April' },
    { value: '05', name: 'Mei' },
    { value: '06', name: 'Juni' },
    { value: '07', name: 'Juli' },
    { value: '08', name: 'Agustus' },
    { value: '09', name: 'September' },
    { value: '10', name: 'Oktober' },
    { value: '11', name: 'November' },
    { value: '12', name: 'Desember' }
  ];

  const handleToggleSort = (field: 'deadline' | 'qty' | 'totalHarga' | 'sisaTagihan' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      if (field === 'totalHarga' || field === 'sisaTagihan') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  // Process sorting & filtering
  const filteredAndSortedList = useMemo(() => {
    return pesananList
      .filter(item => {
        // 1. Search term (case insensitive search matches multiple fields)
        const safeSearch = searchTerm.toLowerCase().trim();
        let matchesSearch = true;
        if (safeSearch) {
          const itemMatch = 
            (item.namaPemesan || '').toLowerCase().includes(safeSearch) ||
            (item.namaPo || '').toLowerCase().includes(safeSearch) ||
            (item.id || '').toLowerCase().includes(safeSearch) ||
            (item.namaProduk || '').toLowerCase().includes(safeSearch) ||
            (item.bahan || '').toLowerCase().includes(safeSearch) ||
            (item.keterangan || '').toLowerCase().includes(safeSearch) ||
            (item.catatanJahit || '').toLowerCase().includes(safeSearch) ||
            (item.modelKerah || '').toLowerCase().includes(safeSearch) ||
            (item.noTelepon || '').includes(safeSearch);

          const itemsMatch = item.items && item.items.some(it => 
            (it.namaProduk || '').toLowerCase().includes(safeSearch) ||
            (it.bahan || '').toLowerCase().includes(safeSearch) ||
            (it.keterangan || '').toLowerCase().includes(safeSearch) ||
            (it.catatanJahit || '').toLowerCase().includes(safeSearch) ||
            (it.modelKerah || '').toLowerCase().includes(safeSearch)
          );

          matchesSearch = itemMatch || !!itemsMatch;
        }

        // 2. Month and Year from creation date
        const dtStr = item.createdAt || '';
        const itemYear = dtStr.substring(0, 4);
        const itemMonth = dtStr.substring(5, 7); // "MM"

        const yearMatches = tableYear === 'Semua' || itemYear === tableYear;
        const monthMatches = tableMonth === 'Semua' || itemMonth === tableMonth;

        // 3. Progress status filter
        const matchesProgress = progressFilter === 'Semua' || item.statusProduksi === progressFilter;

        // 4. Payment/Finance status filter
        let matchesPayment = true;
        const isFullyPaid = (Number(item.sisaTagihan) || 0) <= 0;

        const sublimCost = item.items && item.items.length > 0
          ? item.items.reduce((sum, it) => sum + (it.qty * (it.printPerPcs || 0)), 0)
          : (item.qty * (item.printPerPcs || 0));

        const jahitCost = item.items && item.items.length > 0
          ? item.items.reduce((sum, it) => sum + (it.qty * (it.jahitPerPcs || 0)), 0)
          : (item.qty * (item.jahitPerPcs || 0));

        const baseKomisi = item.komisiPerPcs || 0;
        const hasPenerimaKomisi = !!item.penerimaKomisi?.trim();
        const komisiCost = hasPenerimaKomisi
          ? (item.items && item.items.length > 0
              ? item.items.reduce((sum, it) => sum + (it.qty * (it.komisiPerPcs !== undefined ? it.komisiPerPcs : baseKomisi)), 0)
              : item.qty * baseKomisi)
          : 0;

        const paymentStatus = checkOrderPaymentStatus(item, settings.cashFlowList, pesananList);
        const hasPaidSublim = paymentStatus.isSublimPaid;
        const hasPaidJahit = paymentStatus.isJahitPaid;
        const hasPaidKomisi = paymentStatus.isKomisiPaid;
        const hasTakenProfit = paymentStatus.isProfitTaken;

        if (paymentFilter === 'Lunas') {
          matchesPayment = isFullyPaid;
        } else if (paymentFilter === 'Belum Lunas') {
          matchesPayment = !isFullyPaid;
        } else if (paymentFilter === 'Belum Bayar Sublim') {
          matchesPayment = !hasPaidSublim && sublimCost > 0;
        } else if (paymentFilter === 'Belum Bayar Jahit') {
          matchesPayment = !hasPaidJahit && jahitCost > 0;
        } else if (paymentFilter === 'Belum Bayar Komisi') {
          matchesPayment = !hasPaidKomisi && komisiCost > 0;
        } else if (paymentFilter === 'Belum Ambil Keuntungan') {
          matchesPayment = !hasTakenProfit && item.profit > 0;
        } else if (paymentFilter === 'Sudah Ambil Keuntungan') {
          matchesPayment = hasTakenProfit;
        }

        // 5. Deadline status filter
        let matchesDeadline = true;
        if (deadlineFilter !== 'Semua') {
          const isFinished = item.statusProduksi === 'Beres';
          const diff = new Date(item.deadline).getTime() - new Date().getTime();
          const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));

          if (deadlineFilter === 'Mendesak (≤ 3 Hari)') {
            matchesDeadline = !isFinished && diffDays <= 3 && diffDays >= 0;
          } else if (deadlineFilter === 'Lewat Deadline') {
            matchesDeadline = !isFinished && diffDays < 0;
          } else if (deadlineFilter === 'Aman (> 3 Hari)') {
            matchesDeadline = !isFinished && diffDays > 3;
          }
        }

        // 6. Customer filter
        const matchesCustomer = customerFilter === 'Semua' || (item.namaPemesan && item.namaPemesan.trim() === customerFilter);

        return matchesSearch && yearMatches && monthMatches && matchesProgress && matchesPayment && matchesDeadline && matchesCustomer;
      })
      .sort((a, b) => {
        let valueA: any = a[sortBy];
        let valueB: any = b[sortBy];

        if (sortBy === 'deadline' || sortBy === 'createdAt') {
          valueA = new Date(valueA).getTime();
          valueB = new Date(valueB).getTime();
        }

        if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [pesananList, searchTerm, progressFilter, paymentFilter, deadlineFilter, customerFilter, tableMonth, tableYear, sortBy, sortOrder, settings.cashFlowList]);

  // Color mapping function
  const getStatusStyle = (status: StatusProduksi) => {
    switch (status) {
      case 'Setting':
        return 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-905 text-indigo-700 dark:text-indigo-300';
      case 'Print Press':
        return 'bg-pink-50 border-pink-100 dark:bg-pink-950/40 dark:border-pink-905 text-pink-700 dark:text-pink-300';
      case 'Jahit':
        return 'bg-amber-50 border-amber-100 dark:bg-amber-950/45 dark:border-amber-900/40 text-amber-700 dark:text-amber-300';
      case 'Tinggal Kirim':
        return 'bg-teal-50 border-teal-100 dark:bg-teal-950/40 dark:border-teal-905 text-teal-700 dark:text-teal-300';
      case 'Beres':
        return 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-905 text-emerald-700 dark:text-emerald-300';
    }
  };

  // Next status cycle trigger
  const triggerNextStatus = (item: Pesanan) => {
    const sequence: StatusProduksi[] = ['Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'];
    const idx = sequence.indexOf(item.statusProduksi);
    if (idx !== -1 && idx < sequence.length - 1) {
      onUpdateStatus(item.id, sequence[idx + 1]);
    }
  };

  const isNearDeadline = (deadlineStr: string, isFinished: boolean) => {
    if (isFinished) return false;
    const diff = new Date(deadlineStr).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  // Batch selection handlers
  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedOrderIds.length === filteredAndSortedList.length && filteredAndSortedList.length > 0) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredAndSortedList.map(item => item.id));
    }
  };

  const handleOpenBatchNota = (customOrders?: Pesanan[]) => {
    if (customOrders && customOrders.length > 0) {
      setBatchNotaOrders(customOrders);
      setIsBatchNotaModalOpen(true);
      return;
    }

    if (selectedOrderIds.length > 0) {
      const selectedList = pesananList.filter(o => selectedOrderIds.includes(o.id));
      setBatchNotaOrders(selectedList);
      setIsBatchNotaModalOpen(true);
    } else if (filteredAndSortedList.length > 0) {
      setBatchNotaOrders(filteredAndSortedList);
      setIsBatchNotaModalOpen(true);
    } else {
      alert('Tidak ada pesanan yang tersedia untuk dibuatkan batch nota.');
    }
  };

  const handleOpenVendorPayables = (customOrders?: Pesanan[], initialCat: VendorPayableCategory = 'semua') => {
    setVendorPayablesInitialCategory(initialCat);
    if (customOrders && customOrders.length > 0) {
      setVendorPayablesOrders(customOrders);
      setIsVendorPayablesModalOpen(true);
      return;
    }

    if (selectedOrderIds.length > 0) {
      const selectedList = pesananList.filter(o => selectedOrderIds.includes(o.id));
      setVendorPayablesOrders(selectedList);
      setIsVendorPayablesModalOpen(true);
    } else if (filteredAndSortedList.length > 0) {
      setVendorPayablesOrders(filteredAndSortedList);
      setIsVendorPayablesModalOpen(true);
    } else if (pesananList.length > 0) {
      setVendorPayablesOrders(pesananList);
      setIsVendorPayablesModalOpen(true);
    } else {
      alert('Tidak ada pesanan yang tersedia untuk dibuatkan nota tagihan belum lunas.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header Switcher: Daftar Transaksi vs SPK Produksi */}
      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Main Tab Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMainView('transaksi')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeMainView === 'transaksi'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Daftar Transaksi ({pesananList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainView('spk')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeMainView === 'spk'
                ? 'bg-[#00805F] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-[#00805F] dark:hover:text-emerald-400'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            <span>Surat Perintah Kerja (SPK)</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
              activeMainView === 'spk' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              Tersinkron
            </span>
          </button>
        </div>

        {/* Action button helper */}
        <div className="flex flex-wrap items-center gap-2">
          {activeMainView === 'transaksi' ? (
            <>
              {/* Button Nota Belum Lunas Jahit, Sublim, Komisi */}
              <button
                type="button"
                onClick={() => handleOpenVendorPayables()}
                title="Buka Nota Tagihan Belum Lunas Jahit, Sublim, & Komisi (Tanpa No Rekening & Barcode)"
                className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer flex-1 sm:flex-none"
              >
                <Scissors className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Nota Belum Lunas</span>
                <span className="text-[9.5px] bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded-md font-extrabold uppercase">
                  Vendor
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenBatchNota()}
                title="Buka Generator & Cetak Batch Nota A4 (Semua / Yang Dipilih)"
                className="flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3.5 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer flex-1 sm:flex-none"
              >
                <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Batch Nota A4</span>
                {selectedOrderIds.length > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                    {selectedOrderIds.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onAddNew}
                className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-600/10 hover:shadow-lg transition-transform cursor-pointer flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4" />
                <span>+ Jersey Baru</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleNewSpk}
              className="flex items-center justify-center gap-1.5 bg-[#00805F] hover:bg-[#006B50] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-transform cursor-pointer w-full sm:w-auto"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ SPK Baru</span>
            </button>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DAFTAR TRANSAKSI (TABEL / CARD PESANAN LENGKAP)                  */}
      {/* ========================================================================= */}
      {activeMainView === 'transaksi' && (
        <div className="space-y-6">
          
          {/* Top action & advanced filters panel */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-xs space-y-4">
            
            {/* Row 1: Search and Sort */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Pesanan (Nama Konsumen, PO/Tim, ID PO, Bahan, Kerah, Keterangan, No HP)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-705 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Sort trigger panel */}
                <div className="flex items-center gap-1 bg-slate-55 dark:bg-slate-905 border border-slate-155 dark:border-slate-705/85 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleToggleSort('deadline')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      sortBy === 'deadline' 
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Urut: Deadline {sortBy === 'deadline' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSort('sisaTagihan')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      sortBy === 'sisaTagihan' 
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Urut: Sisa Tagihan {sortBy === 'sisaTagihan' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSort('totalHarga')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      sortBy === 'totalHarga' 
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    Urut: Total Tagihan {sortBy === 'totalHarga' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Advanced filters grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 pt-4 border-t border-slate-100 dark:border-slate-750/70">
              
              {/* 1. Filter Bulan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bulan Produksi</label>
                <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <select
                    value={tableMonth}
                    onChange={(e) => setTableMonth(e.target.value)}
                    className="bg-transparent focus:outline-hidden cursor-pointer w-full"
                  >
                    {MONTHS_LIST.map(m => (
                      <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Filter Tahun */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tahun Produksi</label>
                <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <select
                    value={tableYear}
                    onChange={(e) => setTableYear(e.target.value)}
                    className="bg-transparent focus:outline-hidden cursor-pointer w-full"
                  >
                    <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">Semua Tahun</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr} className="bg-white dark:bg-slate-900 text-slate-850 dark:text-white">
                        Tahun {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Filter Progress */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Progress Produksi</label>
                <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Filter className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <select
                    value={progressFilter}
                    onChange={(e) => setProgressFilter(e.target.value)}
                    className="bg-transparent focus:outline-hidden cursor-pointer w-full"
                  >
                    <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Semua Progress</option>
                    <option value="Setting" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Setting</option>
                    <option value="Print Press" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Print Press</option>
                    <option value="Jahit" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Jahit</option>
                    <option value="Tinggal Kirim" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Tinggal Kirim</option>
                    <option value="Beres" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Beres</option>
                  </select>
                </div>
              </div>

              {/* 4. Filter Tagihan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status Tagihan</label>
                <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <DollarSign className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="bg-transparent focus:outline-hidden cursor-pointer w-full"
                  >
                    <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Semua Status Bayar</option>
                    <option value="Lunas" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Lunas</option>
                    <option value="Belum Lunas" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Lunas</option>
                    <option value="Belum Bayar Sublim" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Bayar Sublim</option>
                    <option value="Belum Bayar Jahit" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Bayar Jahit</option>
                    <option value="Belum Bayar Komisi" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Bayar Komisi</option>
                    <option value="Belum Ambil Keuntungan" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Belum Ambil Untung</option>
                    <option value="Sudah Ambil Keuntungan" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Sudah Ambil Untung</option>
                  </select>
                </div>
              </div>

              {/* 5. Filter Deadline */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Batas Waktu (Deadline)</label>
                <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <select
                    value={deadlineFilter}
                    onChange={(e) => setDeadlineFilter(e.target.value)}
                    className="bg-transparent focus:outline-hidden cursor-pointer w-full"
                  >
                    <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Semua Deadline</option>
                    <option value="Mendesak (≤ 3 Hari)" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">⚡ Mendesak (≤ 3 Hari)</option>
                    <option value="Lewat Deadline" className="bg-white dark:bg-slate-900 text-rose-500 font-bold dark:text-rose-400">⚠️ Lewat Deadline</option>
                    <option value="Aman (> 3 Hari)" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">✓ Aman (&gt; 3 Hari)</option>
                  </select>
                </div>
              </div>

              {/* 6. Filter Nama Konsumen */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nama Konsumen</label>
                <div className="flex items-center gap-1.5 bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="bg-transparent focus:outline-hidden cursor-pointer w-full"
                  >
                    <option value="Semua" className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">Semua Konsumen</option>
                    {uniqueCustomers.map(cust => (
                      <option key={cust} value={cust} className="bg-white dark:bg-slate-900 text-slate-855 dark:text-white">
                        {cust}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Clear Filter Toolbar summary */}
            {(searchTerm || tableMonth !== 'Semua' || tableYear !== 'Semua' || progressFilter !== 'Semua' || paymentFilter !== 'Semua' || deadlineFilter !== 'Semua' || customerFilter !== 'Semua') && (
              <div className="flex items-center justify-between pt-2.5 text-xs text-indigo-650 dark:text-indigo-400 bg-indigo-500/5 px-3 py-2 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20">
                <div className="font-medium truncate flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-indigo-505 animate-pulse shrink-0" />
                  <span>Filter aktif: Menampilkan {filteredAndSortedList.length} pesanan hasil penyaringan.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setTableMonth('Semua');
                    setTableYear('Semua');
                    setProgressFilter('Semua');
                    setPaymentFilter('Semua');
                    setDeadlineFilter('Semua');
                    setCustomerFilter('Semua');
                  }}
                  className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg shadow-3xs cursor-pointer transition-all"
                >
                  Reset Filter
                </button>
              </div>
            )}

          </div>

          {/* Orders count & Batch Selection Toolbar */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title={selectedOrderIds.length === filteredAndSortedList.length && filteredAndSortedList.length > 0 ? "Batalkan semua pilihan" : "Pilih semua pesanan hasil filter"}
                >
                  {selectedOrderIds.length > 0 && selectedOrderIds.length === filteredAndSortedList.length ? (
                    <CheckSquare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>
                    {selectedOrderIds.length > 0 && selectedOrderIds.length === filteredAndSortedList.length
                      ? 'Batalkan Semua'
                      : `Pilih Semua (${filteredAndSortedList.length})`}
                  </span>
                </button>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Menampilkan <span className="text-slate-800 dark:text-white font-bold">{filteredAndSortedList.length}</span> dari {pesananList.length} total pesanan
                </p>
              </div>

              {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    {selectedOrderIds.length} PO Terpilih
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenBatchNota()}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-black shadow-xs cursor-pointer transition-transform"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Buka Batch Nota A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds([])}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-1 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>

            {/* Sticky/Floating Batch Action Bar when active */}
            {selectedOrderIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-linear-to-r from-indigo-900 to-indigo-700 text-white p-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-xl shadow-indigo-950/20 border border-indigo-500/30 animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm shadow-inner shrink-0">
                    {selectedOrderIds.length}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-sm leading-tight text-white">
                      {selectedOrderIds.length} Pesanan Dipilih untuk Batch Nota
                    </h5>
                    <p className="text-[11px] text-indigo-200">
                      Cetak massal, ekspor multi-halaman PDF, atau unduh paket gambar PNG.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenVendorPayables()}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    <Scissors className="h-4 w-4" />
                    <span>Nota Belum Lunas ({selectedOrderIds.length} PO)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenBatchNota()}
                    className="flex items-center gap-1.5 bg-white text-indigo-900 hover:bg-indigo-50 font-black text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    <Receipt className="h-4 w-4 text-indigo-600" />
                    <span>Buka Generator Batch Nota ({selectedOrderIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds([])}
                    className="text-xs text-indigo-200 hover:text-white hover:bg-white/10 px-3 py-2 rounded-xl transition-colors cursor-pointer font-bold"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Primary orders renderer (Card list) */}
          {filteredAndSortedList.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl py-16 text-center text-slate-400">
              <XSquare className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Data Pesanan Tidak Ditemukan</p>
              <p className="text-xs mt-1">Coba sesuaikan kata pencarian atau buat transaksi baru.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredAndSortedList.map((item) => {
                const isSelected = selectedOrderIds.includes(item.id);
                const nearDeadline = isNearDeadline(item.deadline, item.statusProduksi === 'Beres');
                const isFullyPaid = (Number(item.sisaTagihan) || 0) <= 0;
                
                const sublimCost = item.items && item.items.length > 0
                  ? item.items.reduce((sum, it) => sum + (it.qty * (it.printPerPcs || 0)), 0)
                  : (item.qty * (item.printPerPcs || 0));

                const jahitCost = item.items && item.items.length > 0
                  ? item.items.reduce((sum, it) => sum + (it.qty * (it.jahitPerPcs || 0)), 0)
                  : (item.qty * (item.jahitPerPcs || 0));

                const baseKomisi = item.komisiPerPcs || 0;
                const hasPenerimaKomisi = !!item.penerimaKomisi?.trim();
                const komisiCost = hasPenerimaKomisi
                  ? (item.items && item.items.length > 0
                      ? item.items.reduce((sum, it) => sum + (it.qty * (it.komisiPerPcs !== undefined ? it.komisiPerPcs : baseKomisi)), 0)
                      : item.qty * baseKomisi)
                  : 0;

                const paymentStatus = checkOrderPaymentStatus(item, settings.cashFlowList, pesananList);
                const hasPaidSublim = paymentStatus.isSublimPaid;
                const hasPaidJahit = paymentStatus.isJahitPaid;
                const hasPaidKomisi = paymentStatus.isKomisiPaid;
                const hasTakenProfit = paymentStatus.isProfitTaken;

                return (
                  <div 
                    key={item.id}
                    className={`group bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden ${
                      isSelected
                        ? 'ring-2 ring-indigo-600 border-indigo-500 bg-indigo-50/15 dark:bg-indigo-950/20'
                        : nearDeadline 
                          ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/5' 
                          : 'border-slate-100 dark:border-slate-750'
                    }`}
                  >
                    {/* Decorative deadline warning sash */}
                    {nearDeadline && (
                      <div className="absolute top-0 right-0 bg-rose-600 text-[10px] text-white px-3 py-1 font-bold rounded-bl-xl uppercase tracking-widest flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-pulse" />
                        Mendesak
                      </div>
                    )}

                    {/* Grid Layout inside Card */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                      
                      {/* Left Column (Cols 1-2): Selection Checkbox + ID & Basic identities */}
                      <div className="lg:col-span-2 flex items-start gap-2.5 min-w-0">
                        {/* Interactive Checkbox for Batch Selection */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelectOrder(item.id);
                          }}
                          title={isSelected ? "Batalkan pilihan pesanan ini" : "Pilih pesanan ini untuk batch nota"}
                          className={`mt-0.5 p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            isSelected
                              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60'
                              : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 stroke-[2.5]" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>

                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md shrink-0">
                              {item.id}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold shrink-0">
                              {new Date(item.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white leading-snug line-clamp-2 break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={item.namaPo}>
                            {item.namaPo}
                          </h4>

                          {/* Contact details */}
                          <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <User className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                              <span className="truncate font-semibold text-slate-700 dark:text-slate-350">
                                {item.namaPemesan}
                              </span>
                            </div>
                            {item.noTelepon && (
                              <div className="flex flex-col gap-1 pl-5 mt-0.5">
                                <div className="font-mono text-[11px] text-slate-450 dark:text-slate-400 leading-none">
                                  {item.noTelepon}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 no-print">
                                  <a
                                    href={`https://wa.me/${item.noTelepon.replace(/[^0-9]/g, '').startsWith('0') ? '62' + item.noTelepon.replace(/[^0-9]/g, '').substring(1) : item.noTelepon.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak,\n\nMengingatkan sisa pembayaran PO:\n\n*${item.namaPo}*\n\nSisa Tagihan:\n*${formatRupiah(item.sisaTagihan)}*\n\nTerima kasih.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-4xs shrink-0 select-none"
                                    title="Kirim WA Pengingat Sisa Pembayaran Tagihan"
                                  >
                                    <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                                    <span>WA Tagihan</span>
                                  </a>
                                  <a
                                    href={`https://wa.me/${item.noTelepon.replace(/[^0-9]/g, '').startsWith('0') ? '62' + item.noTelepon.replace(/[^0-9]/g, '').substring(1) : item.noTelepon.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Halo Kak,\n\nPesanan *${item.namaPo}* sedang dalam proses produksi.\n\nEstimasi selesai:\n*${item.deadline}*\n\nTerima kasih.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[9px] font-black bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:bg-sky-500 hover:text-white transition-all cursor-pointer shadow-4xs shrink-0 select-none"
                                    title="Kirim WA Pembaruan Estimasi Selesai Produksi"
                                  >
                                    <Send className="h-2.5 w-2.5 shrink-0" />
                                    <span>WA Deadline</span>
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle Column 1 (Cols 3-4): Product detail spec */}
                      <div className="space-y-1.5 lg:col-span-2 min-w-0">
                        <p className="text-slate-800 dark:text-slate-200 text-xs font-bold truncate">
                          {item.namaProduk} <span className="text-slate-400 dark:text-slate-500 font-semibold font-sans">({item.bahan})</span>
                        </p>
                        {item.items && item.items.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.items.slice(0, 3).map((it) => (
                              <span 
                                key={it.id} 
                                title={`${it.namaProduk} (${it.qty} Pcs)`}
                                className="text-[10px] max-w-[120px] truncate inline-block bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold border border-slate-150/60 dark:border-slate-755/50 shrink-0"
                              >
                                {it.namaProduk} ({it.qty} Pcs)
                              </span>
                            ))}
                            {item.items.length > 3 && (
                              <span className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5">
                                +{item.items.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 italic leading-relaxed">
                            &ldquo;{item.keterangan || 'Tanpa keterangan tambahan.'}&rdquo;
                          </p>
                        )}

                        {/* Pembayaran List badges */}
                        {item.pembayaranList && item.pembayaranList.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1.5 text-[9.5px] items-center">
                            <span className="text-slate-400 dark:text-slate-500 font-bold mr-1 shrink-0">Histori DP:</span>
                            {item.pembayaranList.map((p, idx) => (
                              <span
                                key={p.id || idx}
                                className={`px-1.5 py-0.5 rounded-sm font-bold border leading-none shrink-0 select-none ${
                                  p.nominal > 0 
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-450 dark:text-slate-500 border-slate-200 dark:border-slate-800'
                                }`}
                                title={`Tanggal: ${p.tanggal} - ${p.keterangan}`}
                              >
                                {p.keterangan || `Bayar ${idx + 1}`}: {formatRupiah(p.nominal)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Middle Column 2 (Cols 5-9): Financial recap */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-center min-w-0 w-full gap-2">
                        <div className="flex flex-row items-stretch justify-center bg-slate-50 dark:bg-slate-900/40 p-2.5 sm:p-3 rounded-xl border border-slate-100 dark:border-slate-750/80 min-w-0 w-full text-center">
                          {/* Qty Section */}
                          <div className="pr-2.5 max-w-[70px] border-r border-slate-205 dark:border-slate-700/80 shrink-0 flex flex-col items-center justify-center">
                            <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none">Qty</span>
                            <span className="text-[11px] sm:text-xs xl:text-sm font-extrabold text-slate-800 dark:text-white block mt-1.5 truncate max-w-full" title={`${item.qty} Pcs`}>
                              {item.qty} Pcs
                            </span>
                          </div>
                          
                          {/* Total Tagihan Section */}
                          <div className="px-3 flex-1 min-w-0 flex flex-col items-center justify-center">
                            <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate max-w-full">Total Tagihan</span>
                            <span className="text-[11px] sm:text-xs xl:text-sm font-extrabold text-slate-800 dark:text-white block mt-1.5 truncate max-w-full" title={formatRupiah(item.totalHarga)}>
                              {formatRupiah(item.totalHarga)}
                            </span>
                          </div>

                          {/* Sisa Bayar Section */}
                          <div className="border-l border-slate-205 dark:border-slate-700/80 px-3 flex-1 min-w-0 flex flex-col items-center justify-center">
                            <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate max-w-full">Sisa Bayar</span>
                            <span className={`text-[11px] sm:text-xs xl:text-sm font-black block mt-1.5 truncate max-w-full ${isFullyPaid ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'}`} title={isFullyPaid ? 'Lunas' : formatRupiah(item.sisaTagihan)}>
                              {isFullyPaid ? 'Lunas ✓' : formatRupiah(item.sisaTagihan)}
                            </span>
                          </div>

                          {/* Profit Section */}
                          <div className="border-l border-slate-205 dark:border-slate-700/80 pl-3 flex-1 min-w-0 flex flex-col items-center justify-center">
                            <span className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider leading-none truncate max-w-full">
                              Profit {hasTakenProfit ? '(Ambil ✓)' : '(Belum)'}
                            </span>
                            <span className={`text-[11px] sm:text-xs xl:text-sm font-black block mt-1.5 truncate max-w-full ${hasTakenProfit ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-[#10b981]'}`} title={formatRupiah(item.profit)}>
                              {formatRupiah(item.profit)}
                            </span>
                          </div>
                        </div>

                        {/* Notifikasi Pembayaran Produksi & Komisi */}
                        {((!hasPaidSublim && sublimCost > 0) || (!hasPaidJahit && jahitCost > 0) || (!hasPaidKomisi && komisiCost > 0)) && (
                          <div 
                            className="text-[10px] sm:text-[11px] font-bold text-[#ff3b5c] animate-pulse truncate"
                            style={{ animationDuration: '1.5s' }}
                            title="Masih ada biaya produksi atau komisi yang belum dibayar"
                          >
                            {(() => {
                              const badges = [];
                              if (!hasPaidSublim && sublimCost > 0) badges.push('BELUM BAYAR SUBLIM');
                              if (!hasPaidJahit && jahitCost > 0) badges.push('BELUM BAYAR JAHIT');
                              if (!hasPaidKomisi && komisiCost > 0) badges.push('BELUM BAYAR KOMISI');
                              return '🔴 ' + badges.join(' • ');
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Right Column (Cols 10-12): Actions, Status, SPK */}
                      <div className="lg:col-span-3 flex flex-col items-stretch justify-start gap-2 border-t lg:border-t-0 border-slate-100 dark:border-slate-755/80 pt-3.5 lg:pt-0 min-w-0 w-full lg:shrink-0">
                        
                        {/* Top row: Deadline badge and Edit/Trash Action helpers */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Deadline:</span>
                            <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/35 px-1.5 py-0.5 rounded-md leading-none">{item.deadline}</span>
                          </div>

                          {/* Edit / Trash Actions panel */}
                          <div className="flex items-center gap-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-750 p-0.5 rounded-lg shrink-0">
                            <button
                              type="button"
                              onClick={() => onEdit(item)}
                              title="Ubah Rincian Pesanan"
                              className="p-1 text-slate-700 dark:text-slate-300 hover:text-amber-500 hover:bg-white dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer shrink-0"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            {confirmDeleteId === item.id ? (
                              <div className="flex items-center gap-1 px-1 bg-rose-50 dark:bg-rose-950/40 rounded-lg shrink-0">
                                <span className="text-[9px] font-black text-rose-600 animate-pulse">Hapus?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDelete(item.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="p-1 text-rose-600 hover:bg-rose-100 rounded-md transition-colors font-black text-[10px]"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="p-1 text-slate-400 hover:bg-slate-200 rounded-md transition-colors text-[10px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                title="Hapus Pesanan Jersey"
                                className="p-1 text-slate-700 dark:text-slate-300 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* SPK Button: Buka / Cetak SPK (High Priority Synchronized Feature) */}
                        <div className="flex items-center gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => handleOpenSpkForOrder(item)}
                            title="Buka & Edit SPK (Surat Perintah Kerja) Produksi 1 Halaman A4"
                            className="flex-1 flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer shadow-3xs shrink-0 select-none bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-[#00805F] dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-800/60 hover:scale-[1.01] active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-[#00805F] dark:text-emerald-400 shrink-0" />
                              <span>Buka / Edit SPK</span>
                            </div>
                            <span className="text-[9px] bg-[#00805F] text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                              A4
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickPrintSpk(item)}
                            title="Cetak Cepat SPK A4"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-650 transition-all cursor-pointer shrink-0 shadow-3xs"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Nota & QRIS Generator Button & Vendor Payables Button */}
                        <div className="grid grid-cols-2 gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNotaOrder(item);
                            }}
                            title="Generator Nota Otomatis & QRIS Barcode Pembayaran Pelanggan"
                            className="relative z-10 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer shadow-3xs select-none bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-300/60 dark:border-indigo-800/60 hover:scale-[1.01] active:scale-[0.99]"
                          >
                            <QrCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>Nota & QRIS</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenVendorPayables([item], 'semua');
                            }}
                            title="Nota Tagihan Belum Lunas Jahit, Sublim, & Komisi PO Ini (Tanpa No Rekening & Barcode)"
                            className="relative z-10 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-3xs select-none bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-800/60 hover:scale-[1.01] active:scale-[0.99]"
                          >
                            <Scissors className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>Nota Vendor</span>
                          </button>
                        </div>

                        {/* Vertically stacked aligned buttons */}
                        <div className="flex flex-col gap-1.5 w-full">
                          
                          {/* 1. Status Produksi */}
                          <button
                            type="button"
                            onClick={() => triggerNextStatus(item)}
                            disabled={item.statusProduksi === 'Beres'}
                            title={item.statusProduksi === 'Beres' ? 'Produksi Selesai!' : 'Klik untuk ubah status pengerjaan berikutnya'}
                            className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border flex items-center justify-between gap-1.5 transition-all ${getStatusStyle(item.statusProduksi)} ${
                              item.statusProduksi !== 'Beres' ? 'hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-3xs' : 'cursor-default opacity-85'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse shrink-0" />
                              <span className="truncate">Status: {item.statusProduksi}</span>
                            </div>
                            {item.statusProduksi !== 'Beres' && (
                              <Play className="h-2.5 w-2.5 ml-0.5 animate-pulse text-current shrink-0" />
                            )}
                          </button>

                          {/* Quick Progress Stage Jump Buttons (A -> B -> C -> D -> E) */}
                          <div className="grid grid-cols-5 gap-1 pt-0.5">
                            {(['Setting', 'Print Press', 'Jahit', 'Tinggal Kirim', 'Beres'] as StatusProduksi[]).map((st) => {
                              const isActive = item.statusProduksi === st;
                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateStatus(item.id, st);
                                  }}
                                  title={`Pindah status langsung ke: ${st}`}
                                  className={`px-1 py-1 rounded text-[8px] font-black uppercase transition-all cursor-pointer truncate ${
                                    isActive 
                                      ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400' 
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {st === 'Print Press' ? 'Print' : st === 'Tinggal Kirim' ? 'Kirim' : st}
                                </button>
                              );
                            })}
                          </div>

                          {/* 2. Salin Deskripsi Jahit (WA Penjahit) */}
                          <button
                            type="button"
                            onClick={() => handleCopyTailorDescription(item)}
                            title="Salin deskripsi lengkap pesanan ke clipboard untuk langsung dikirim ke WhatsApp penjahit"
                            className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-3xs shrink-0 select-none border ${
                              copiedOrderId === item.id 
                                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30' 
                                : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/45 hover:bg-indigo-100 dark:hover:bg-indigo-950/75 border-indigo-150 dark:border-indigo-900/50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {copiedOrderId === item.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-550 shrink-0" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              )}
                              <span>{copiedOrderId === item.id ? 'Tersalin!' : 'Salin Deskripsi Jahit'}</span>
                            </div>
                            <span className="text-[10px] text-indigo-400 font-normal">WA</span>
                          </button>

                          {/* 3. Ambil Keuntungan */}
                          {item.profit > 0 && (
                            <div className="w-full flex flex-col gap-1 shrink-0">
                              {confirmProfitId === item.id ? (
                                <div className="flex gap-1.5 w-full">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onLogToCashFlow('Ambil Keuntungan', 'keluar', item.profit, `Ambil Keuntungan PO ${item.namaPo} [ID:${item.id}]`, item.id);
                                      setConfirmProfitId(null);
                                    }}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1 px-2 rounded-lg transition-all border border-emerald-600 shadow-3xs cursor-pointer text-center"
                                  >
                                    Ya, Ambil
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmProfitId(null)}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold py-1 px-2 rounded-lg transition-all border border-slate-200 dark:border-slate-700 shadow-3xs cursor-pointer text-center"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={hasTakenProfit}
                                  onClick={() => setConfirmProfitId(item.id)}
                                  title={hasTakenProfit ? "Keuntungan PO sudah diambil" : "Mencatat pengambilan keuntungan PO"}
                                  className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-3xs border ${
                                    hasTakenProfit
                                      ? "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-750 cursor-not-allowed"
                                      : "text-emerald-600 dark:text-emerald-400 bg-emerald-50/75 dark:bg-emerald-950/45 hover:bg-emerald-100/90 dark:hover:bg-emerald-950/75 border-emerald-200 dark:border-emerald-800 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {hasTakenProfit ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                                    <span>Ambil Untung</span>
                                  </div>
                                  <span className={`text-[10px] ${hasTakenProfit ? 'text-slate-400 font-normal line-through' : 'text-emerald-500 font-extrabold'}`}>
                                    {hasTakenProfit ? 'Selesai' : formatRupiah(item.profit)}
                                  </span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SURAT PERINTAH KERJA (SPK SUITE TERSINKRONISASI)                  */}
      {/* ========================================================================= */}
      {activeMainView === 'spk' && (
        <div className="space-y-6">
          
          {/* Sub-Header Navigation Bar for SPK Module */}
          <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
            
            {/* Sub-Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSpkTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  spkTab === 'dashboard'
                    ? 'bg-[#00805F] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard SPK</span>
              </button>

              <button
                type="button"
                onClick={() => setSpkTab('editor')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  spkTab === 'editor'
                    ? 'bg-[#00805F] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <FileEdit className="h-4 w-4" />
                <span>Editor & Generator A4</span>
              </button>

              <button
                type="button"
                onClick={() => setSpkTab('database')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  spkTab === 'database'
                    ? 'bg-[#00805F] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Daftar SPK ({combinedSpkList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSpkTab('templates')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  spkTab === 'templates'
                    ? 'bg-[#00805F] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Template</span>
              </button>

              <button
                type="button"
                onClick={() => setSpkTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  spkTab === 'settings'
                    ? 'bg-[#00805F] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <SettingsIcon className="h-4 w-4" />
                <span>Identitas & Warna</span>
              </button>
            </div>

            {/* Quick Status / New button */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewSpk}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-[#00805F] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>+ SPK Baru</span>
              </button>
            </div>

          </div>

          {/* SPK Active Order Link Notification Banner */}
          {linkedOrderId && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#00805F] shrink-0" />
                <span>
                  SPK ini terhubung langsung dengan transaksi: <strong>{activeSpk.poName}</strong> (Konsumen: {activeSpk.customer}). Perubahan akan otomatis tersinkronisasi.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveMainView('transaksi')}
                className="font-bold underline text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 cursor-pointer text-[11px]"
              >
                Kembali ke Transaksi
              </button>
            </div>
          )}

          {/* SPK Tab Contents */}
          <div>
            {spkTab === 'dashboard' && (
              <SpkDashboard
                spkList={combinedSpkList}
                onNavigate={(tab) => setSpkTab(tab)}
                onOpenSpk={handleOpenSpkFromDatabase}
                onDuplicateSpk={handleDuplicateSpk}
                onNewSpk={handleNewSpk}
                onFullscreenPreview={(spk) => setFullscreenTarget(spk)}
              />
            )}

            {spkTab === 'editor' && (
              <SpkEditor
                data={activeSpk}
                onChange={handleSpkChange}
                onSaveSpk={handleSaveSpk}
              />
            )}

            {spkTab === 'database' && (
              <SpkDatabase
                spkList={combinedSpkList}
                onOpenSpk={handleOpenSpkFromDatabase}
                onDuplicateSpk={handleDuplicateSpk}
                onDeleteSpk={handleDeleteSpk}
                onNewSpk={handleNewSpk}
                onFullscreenPreview={(spk) => setFullscreenTarget(spk)}
              />
            )}

            {spkTab === 'templates' && (
              <SpkTemplates
                templates={templates}
                currentSpk={activeSpk}
                onApplyTemplate={handleApplyTemplate}
                onSaveAsTemplate={handleSaveAsTemplate}
                onDeleteTemplate={handleDeleteTemplate}
              />
            )}

            {spkTab === 'settings' && (
              <SpkSettings
                settings={companySettings}
                onSaveSettings={handleSaveSettings}
                onExportAllData={handleExportAllSpkData}
                onImportAllData={handleImportAllSpkData}
              />
            )}
          </div>

          {/* Fullscreen Preview Modal */}
          {fullscreenTarget && (
            <SpkFullscreenModal
              isOpen={true}
              onClose={() => setFullscreenTarget(null)}
              data={fullscreenTarget}
            />
          )}

        </div>
      )}

      {/* Nota & QRIS Modal - Accessible from All Views */}
      {selectedNotaOrder && (
        <NotaModal
          order={selectedNotaOrder}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onClose={() => setSelectedNotaOrder(null)}
        />
      )}

      {/* Batch Nota & QRIS Modal */}
      {isBatchNotaModalOpen && batchNotaOrders.length > 0 && (
        <BatchNotaModal
          orders={batchNotaOrders}
          settings={settings}
          onClose={() => setIsBatchNotaModalOpen(false)}
        />
      )}

      {/* Vendor Payables Modal (Belum Lunas Jahit, Sublim, Komisi - Tanpa No Rekening & Barcode) */}
      {isVendorPayablesModalOpen && vendorPayablesOrders.length > 0 && (
        <VendorPayablesModal
          orders={vendorPayablesOrders}
          settings={settings}
          initialCategory={vendorPayablesInitialCategory}
          onClose={() => setIsVendorPayablesModalOpen(false)}
        />
      )}

    </div>
  );
}
