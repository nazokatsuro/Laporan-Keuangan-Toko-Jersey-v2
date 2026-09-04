/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SPKData, SPKCompanySettings, SPKTemplate } from '../../spkTypes';
import { syncSpkToOrder } from '../../utils/spkSync';
import { persistOrders } from '../../storageService';
import { 
  DEFAULT_COMPANY_SETTINGS, 
  INITIAL_DEFAULT_SPK, 
  DEFAULT_TEMPLATES 
} from '../../spkSampleData';
import { SpkDashboard } from './SpkDashboard';
import { SpkEditor } from './SpkEditor';
import { SpkDatabase } from './SpkDatabase';
import { SpkTemplates } from './SpkTemplates';
import { SpkSettings } from './SpkSettings';
import { SpkFullscreenModal } from './SpkFullscreenModal';
import { 
  LayoutDashboard, 
  FileEdit, 
  FileSpreadsheet, 
  Layers, 
  Settings as SettingsIcon,
  Shirt,
  Sparkles,
  PlusCircle
} from 'lucide-react';

const STORAGE_KEY_SPK_LIST = 'nomaden_spk_list_v1';
const STORAGE_KEY_SETTINGS = 'nomaden_spk_settings_v1';
const STORAGE_KEY_TEMPLATES = 'nomaden_spk_templates_v1';
const STORAGE_KEY_ACTIVE_SPK_ID = 'nomaden_spk_active_id_v2';
const STORAGE_KEY_SPK_TAB = 'nomaden_spk_tab_v2';

export const SpkApp: React.FC = () => {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'database' | 'templates' | 'settings'>(() => {
    return (localStorage.getItem(STORAGE_KEY_SPK_TAB) as any) || 'dashboard';
  });

  // Master State
  const [spkList, setSpkList] = useState<SPKData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SPK_LIST);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved SPK list', e);
      }
    }
    return [INITIAL_DEFAULT_SPK];
  });

  const [companySettings, setCompanySettings] = useState<SPKCompanySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved settings', e);
      }
    }
    return DEFAULT_COMPANY_SETTINGS;
  });

  const [templates, setTemplates] = useState<SPKTemplate[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved templates', e);
      }
    }
    return DEFAULT_TEMPLATES;
  });

  // Current SPK being edited
  const [activeSpk, setActiveSpk] = useState<SPKData>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_SPK_ID);
    if (savedId) {
      const found = spkList.find(s => s.id === savedId);
      if (found) return found;
    }
    return spkList[0] || INITIAL_DEFAULT_SPK;
  });

  // Fullscreen preview modal
  const [fullscreenTarget, setFullscreenTarget] = useState<SPKData | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SPK_LIST, JSON.stringify(spkList));
  }, [spkList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(companySettings));
  }, [companySettings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SPK_TAB, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (activeSpk && activeSpk.id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SPK_ID, activeSpk.id);
    }
  }, [activeSpk?.id]);

  // Keyboard Shortcuts (Ctrl+S to save current SPK, Ctrl+P to print)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveSpk(activeSpk);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSpk]);

  // Handle SPK changes with auto-save
  const handleSpkChange = (updated: SPKData) => {
    setActiveSpk(updated);
    if (updated.id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SPK_ID, updated.id);
    }

    const updatedWithCompany = {
      ...updated,
      companySettings: companySettings,
      updatedAt: new Date().toISOString()
    };

    setSpkList(prev => {
      const exists = prev.some(item => item.id === updatedWithCompany.id);
      if (exists) {
        return prev.map(item => item.id === updatedWithCompany.id ? updatedWithCompany : item);
      } else {
        return [updatedWithCompany, ...prev];
      }
    });

    const orderId = updatedWithCompany.id.startsWith('spk-ord-') ? updatedWithCompany.id.replace('spk-ord-', '') : null;
    const savedOrdersRaw = localStorage.getItem('laporan_jersey_data');
    if (savedOrdersRaw) {
      try {
        const orders = JSON.parse(savedOrdersRaw);
        const targetOrder = orders.find((o: any) => o.id === orderId || `spk-ord-${o.id}` === updatedWithCompany.id || o.namaPo?.toUpperCase() === updatedWithCompany.poName?.toUpperCase());
        if (targetOrder) {
          const updatedOrder = syncSpkToOrder(updatedWithCompany, targetOrder);
          const newOrders = orders.map((o: any) => o.id === updatedOrder.id ? updatedOrder : o);
          persistOrders(newOrders).catch(() => {});
          window.dispatchEvent(new Event('storage'));
        }
      } catch (e) {
        console.error('Failed to sync SPK to order list in SpkApp', e);
      }
    }
  };

  // Actions
  const handleSaveSpk = (spkToSave: SPKData) => {
    const updatedWithCompany = {
      ...spkToSave,
      companySettings: companySettings,
      updatedAt: new Date().toISOString()
    };

    setSpkList(prev => {
      const exists = prev.some(item => item.id === updatedWithCompany.id);
      if (exists) {
        return prev.map(item => item.id === updatedWithCompany.id ? updatedWithCompany : item);
      } else {
        return [updatedWithCompany, ...prev];
      }
    });

    // Synchronize SPK back into order list in laporan_jersey_data
    const orderId = updatedWithCompany.id.startsWith('spk-ord-') ? updatedWithCompany.id.replace('spk-ord-', '') : null;
    const savedOrdersRaw = localStorage.getItem('laporan_jersey_data');
    if (savedOrdersRaw) {
      try {
        const orders = JSON.parse(savedOrdersRaw);
        const targetOrder = orders.find((o: any) => o.id === orderId || `spk-ord-${o.id}` === updatedWithCompany.id || o.namaPo?.toUpperCase() === updatedWithCompany.poName?.toUpperCase());
        if (targetOrder) {
          const updatedOrder = syncSpkToOrder(updatedWithCompany, targetOrder);
          const newOrders = orders.map((o: any) => o.id === updatedOrder.id ? updatedOrder : o);
          persistOrders(newOrders).catch(() => {});
          window.dispatchEvent(new Event('storage'));
        }
      } catch (e) {
        console.error('Failed to sync SPK to order list in SpkApp', e);
      }
    }

    setActiveSpk(updatedWithCompany);
    if (updatedWithCompany.id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SPK_ID, updatedWithCompany.id);
    }
  };

  const handleNewSpk = () => {
    const year = new Date().getFullYear();
    const randNum = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    
    const newSpk: SPKData = {
      ...INITIAL_DEFAULT_SPK,
      id: `spk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      spkNumber: `SPK-${year}-${randNum}`,
      customer: 'KONSUMEN BARU',
      poName: 'PO BARU',
      players: [],
      companySettings: companySettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSpkList(prev => [newSpk, ...prev]);
    setActiveSpk(newSpk);
    localStorage.setItem(STORAGE_KEY_ACTIVE_SPK_ID, newSpk.id);
    setActiveTab('editor');
  };

  const handleOpenSpk = (spk: SPKData) => {
    setActiveSpk(spk);
    localStorage.setItem(STORAGE_KEY_ACTIVE_SPK_ID, spk.id);
    setActiveTab('editor');
  };

  const handleDuplicateSpk = (spk: SPKData) => {
    const year = new Date().getFullYear();
    const randNum = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');

    const duplicated: SPKData = {
      ...spk,
      id: `spk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      spkNumber: `SPK-${year}-${randNum}`,
      poName: `${spk.poName} (SALINAN)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSpkList(prev => [duplicated, ...prev]);
    setActiveSpk(duplicated);
    localStorage.setItem(STORAGE_KEY_ACTIVE_SPK_ID, duplicated.id);
    setActiveTab('editor');
  };

  const handleDeleteSpk = (id: string) => {
    setSpkList(prev => prev.filter(item => item.id !== id));
    if (activeSpk.id === id) {
      const remaining = spkList.filter(item => item.id !== id);
      if (remaining.length > 0) {
        setActiveSpk(remaining[0]);
      } else {
        handleNewSpk();
      }
    }
  };

  const handleApplyTemplate = (tmpl: SPKTemplate) => {
    const year = new Date().getFullYear();
    const randNum = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');

    const newFromTemplate: SPKData = {
      ...INITIAL_DEFAULT_SPK,
      ...tmpl.data,
      id: `spk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      spkNumber: `SPK-${year}-${randNum}`,
      customer: activeSpk.customer || 'KONSUMEN',
      poName: activeSpk.poName || 'PO BARU',
      companySettings: companySettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setActiveSpk(newFromTemplate);
    setActiveTab('editor');
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
    // Update active SPK with new company settings
    setActiveSpk(prev => ({
      ...prev,
      companySettings: newSettings
    }));
  };

  const handleExportAllData = () => {
    const backupObj = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      companySettings,
      templates,
      spkList
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `BACKUP_NOMADEN_SPK_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportAllData = (jsonData: string) => {
    const parsed = JSON.parse(jsonData);
    if (parsed.spkList && Array.isArray(parsed.spkList)) {
      setSpkList(parsed.spkList);
      if (parsed.spkList.length > 0) setActiveSpk(parsed.spkList[0]);
    }
    if (parsed.companySettings) {
      setCompanySettings(parsed.companySettings);
    }
    if (parsed.templates && Array.isArray(parsed.templates)) {
      setTemplates(parsed.templates);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sub-Header Navigation Bar for SPK Module */}
      <div className="bg-white dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700/80 rounded-2xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#00805F] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-[#00805F] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <FileEdit className="h-4 w-4" />
            <span>Generator & Editor SPK</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-[#00805F] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Daftar SPK ({spkList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'templates'
                ? 'bg-[#00805F] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Template</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#00805F] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            <span>Identitas & Warna</span>
          </button>
        </div>

        {/* Quick New SPK button */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewSpk}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>+ SPK Baru</span>
          </button>
        </div>

      </div>

      {/* Main Tab Content */}
      <div>
        {activeTab === 'dashboard' && (
          <SpkDashboard
            spkList={spkList}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenSpk={handleOpenSpk}
            onDuplicateSpk={handleDuplicateSpk}
            onNewSpk={handleNewSpk}
            onFullscreenPreview={(spk) => setFullscreenTarget(spk)}
          />
        )}

        {activeTab === 'editor' && (
          <SpkEditor
            data={activeSpk}
            onChange={handleSpkChange}
            onSaveSpk={handleSaveSpk}
          />
        )}

        {activeTab === 'database' && (
          <SpkDatabase
            spkList={spkList}
            onOpenSpk={handleOpenSpk}
            onDuplicateSpk={handleDuplicateSpk}
            onDeleteSpk={handleDeleteSpk}
            onNewSpk={handleNewSpk}
            onFullscreenPreview={(spk) => setFullscreenTarget(spk)}
          />
        )}

        {activeTab === 'templates' && (
          <SpkTemplates
            templates={templates}
            currentSpk={activeSpk}
            onApplyTemplate={handleApplyTemplate}
            onSaveAsTemplate={handleSaveAsTemplate}
            onDeleteTemplate={handleDeleteTemplate}
          />
        )}

        {activeTab === 'settings' && (
          <SpkSettings
            settings={companySettings}
            onSaveSettings={handleSaveSettings}
            onExportAllData={handleExportAllData}
            onImportAllData={handleImportAllData}
          />
        )}
      </div>

      {/* Fullscreen Modal if triggered */}
      {fullscreenTarget && (
        <SpkFullscreenModal
          isOpen={true}
          onClose={() => setFullscreenTarget(null)}
          data={fullscreenTarget}
        />
      )}

    </div>
  );
};
