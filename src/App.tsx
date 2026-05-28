/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Pesanan, ShopSettings } from './types';
import { 
  DEFAULT_ORDERS, 
  DEFAULT_SETTINGS, 
  generateId, 
  formatRupiah 
} from './utils';

// Import Modular Components
import Dashboard from './components/Dashboard';
import ActiveOrders from './components/ActiveOrders';
import OrderForm from './components/OrderForm';
import FinancialReports from './components/FinancialReports';
import ReceiptGenerator from './components/ReceiptGenerator';
import Settings from './components/Settings';

// Lucide Icons
import { 
  LayoutDashboard, 
  TrendingUp, 
  ClipboardList, 
  PlusCircle, 
  Settings as SettingsIcon, 
  Sun, 
  Moon, 
  Bell, 
  Clock, 
  DollarSign,
  AlertTriangle,
  Flame,
  Shirt,
  X,
  CheckCircle,
  Cloud,
  Loader2,
  Lock,
  Shield
} from 'lucide-react';

import { 
  initAuth, 
  searchDraftInDrive, 
  downloadDraftFromDrive, 
  uploadDraftToDrive,
  googleSignIn
} from './driveService';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Load initial orders state
  const [pesananList, setPesananList] = useState<Pesanan[]>(() => {
    try {
      const saved = localStorage.getItem('laporan_jersey_data');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Gagal meload data dari LocalStorage, menggunakan default.', e);
    }
    return DEFAULT_ORDERS;
  });

  // Load initial settings state
  const [settings, setSettings] = useState<ShopSettings>(() => {
    try {
      const saved = localStorage.getItem('laporan_jersey_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.darkMode = true; // Force dark mode enabled!
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return { ...DEFAULT_SETTINGS, darkMode: true };
  });

  // Navigation system tabs: 'dashboard' | 'transaksi' | 'formulir' | 'laporan' | 'pengaturan'
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Active editing order placeholder pointer
  const [pesananToEdit, setPesananToEdit] = useState<Pesanan | null>(null);

  // Active invoice being active previewed or batch invoices
  const [pesananForNota, setPesananForNota] = useState<Pesanan | Pesanan[] | null>(null);

  // Active state for Warning center modal
  const [showAlertsModal, setShowAlertsModal] = useState<boolean>(false);

  // Shared active period selected month & year (fully synchronized with localStorage)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return localStorage.getItem('laporan_jersey_dashboard_month') || String(new Date().getMonth() + 1).padStart(2, '0');
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return localStorage.getItem('laporan_jersey_dashboard_year') || String(new Date().getFullYear());
  });

  useEffect(() => {
    localStorage.setItem('laporan_jersey_dashboard_month', selectedMonth);
    localStorage.setItem('laporan_jersey_filter_month', selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('laporan_jersey_dashboard_year', selectedYear);
    localStorage.setItem('laporan_jersey_filter_year', selectedYear);
  }, [selectedYear]);

  // Sync orders to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('laporan_jersey_data', JSON.stringify(pesananList));
  }, [pesananList]);

  // Sync settings to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('laporan_jersey_settings', JSON.stringify({ ...settings, darkMode: true }));
    // Always apply dark mode class
    document.documentElement.classList.add('dark');
  }, [settings]);

  // Google Drive Sync states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [showSyncOffer, setShowSyncOffer] = useState(false);
  const [cloudDraftInfo, setCloudDraftInfo] = useState<{ id: string; modifiedTime: string; payload: any } | null>(null);
  const [isDriveSyncActive, setIsDriveSyncActive] = useState(false);
  const [syncMessage, setSyncMessage] = useState('Mengotorisasi akses...');

  // States & handler for blocking login popup before page entry
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const handleBlockLogin = async () => {
    setIsSigningInGoogle(true);
    setSignInError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        // Default set automatic backup to true if not specified
        if (localStorage.getItem('laporan_jersey_gdrive_autosync') !== 'false') {
          localStorage.setItem('laporan_jersey_gdrive_autosync', 'true');
        }
      }
    } catch (err: any) {
      console.error('Locker Login Error:', err);
      setSignInError(err.message || 'Keluar atau gagal melakukan login Google. Silakan coba lagi.');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  // Subscribe to Authentication state
  useEffect(() => {
    const unsubscribe = initAuth((user, token) => {
      setGoogleUser(user);
      setGoogleToken(token);
    });
    return unsubscribe;
  }, []);

  // Automatic Cloud Draft Check and Load on login with dynamic state loading descriptions
  useEffect(() => {
    if (googleUser && googleToken) {
      const checkAndAutoLoad = async () => {
        try {
          setIsDriveSyncActive(true);
          setSyncMessage('Menghubungkan ke Google Drive...');
          await new Promise(resolve => setTimeout(resolve, 600));

          setSyncMessage('Memeriksa berkas cadangan draf laporan...');
          const meta = await searchDraftInDrive(googleToken);
          
          if (meta) {
            setSyncMessage('Ditemukan Backup Cloud! Mengunduh draf...');
            await new Promise(resolve => setTimeout(resolve, 800));

            const payload = await downloadDraftFromDrive(googleToken, meta.id);
            if (payload && Array.isArray(payload.pesananList)) {
              setSyncMessage('Memulihkan draf pesanan & pengaturan toko...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              setPesananList(payload.pesananList);
              if (payload.settings) {
                setSettings(payload.settings);
              }
              console.log('Draft dari Google Drive berhasil dimuat secara otomatis!');
              setSyncMessage('Sinkronisasi selesai! Menyiapkan dokumen workspace...');
              await new Promise(resolve => setTimeout(resolve, 800));
            } else {
              setSyncMessage('Data cadangan kosong. Menyiapkan draf lokal...');
              await new Promise(resolve => setTimeout(resolve, 600));
            }
          } else {
            setSyncMessage('Tidak ditemukan berkas cadangan cloud sebelumnya. Menyiapkan workspace lokal...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (err) {
          console.error('Error auto-syncing Drive:', err);
          setSyncMessage('Gagal menyinkronkan data draf dari Penyimpanan Awan.');
          await new Promise(resolve => setTimeout(resolve, 1200));
        } finally {
          setIsDriveSyncActive(false);
        }
      };

      checkAndAutoLoad();
    } else {
      setCloudDraftInfo(null);
      setShowSyncOffer(false);
    }
  }, [googleUser, googleToken]);

  // Ambient Auto-Backup to Drive whenever data changes (debounced by 4s to prevent API spam)
  useEffect(() => {
    const isAutoSyncOn = localStorage.getItem('laporan_jersey_gdrive_autosync') === 'true';
    if (googleUser && googleToken && isAutoSyncOn) {
      const timer = setTimeout(async () => {
        try {
          console.log('Background Auto-Sync ke Google Drive berjalan...');
          await uploadDraftToDrive(googleToken, pesananList, settings);
        } catch (err) {
          console.error('Failed to auto-backup draft:', err);
        }
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [pesananList, settings, googleUser, googleToken]);

  // Warning Details memoized calculation (All warnings in details list)
  const warningDetails = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'unpaid' | 'deadline' | 'overdue';
      title: string;
      message: string;
      severity: 'high' | 'medium';
      order: Pesanan;
    }> = [];
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    pesananList.forEach(item => {
      // 1. Unpaid debt alert
      if (item.sisaTagihan > 0) {
        list.push({
          id: `${item.id}-unpaid`,
          type: 'unpaid',
          title: `Sisa Tagihan: ${item.namaPo}`,
          message: `Pemesan ${item.namaPemesan} belum melunasi ${formatRupiah(item.sisaTagihan)}. (${item.noTelepon || 'No HP tidak ada'})`,
          severity: 'medium',
          order: item
        });
      }

      // 2. Production deadline alert
      if (item.statusProduksi !== 'Beres') {
        const dlParts = item.deadline.split('-');
        if (dlParts.length === 3) {
          const dlDate = new Date(parseInt(dlParts[0]), parseInt(dlParts[1]) - 1, parseInt(dlParts[2]));
          const diffTime = dlDate.getTime() - todayStart.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 3 && diffDays >= 0) {
            list.push({
              id: `${item.id}-deadline`,
              type: 'deadline',
              title: `Deadline Dekat! ${item.namaPo}`,
              message: `Harus diselesaikan dalam ${diffDays} hari (${item.deadline}) - Status: ${item.statusProduksi}`,
              severity: 'high',
              order: item
            });
          } else if (diffDays < 0) {
            list.push({
              id: `${item.id}-overdue`,
              type: 'overdue',
              title: `⚠️ OVERDUE: ${item.namaPo}`,
              message: `Pengerjaan jersey terlambat ${Math.abs(diffDays)} hari! Batas pengerjaan: ${item.deadline}`,
              severity: 'high',
              order: item
            });
          }
        }
      }
    });

    return list;
  }, [pesananList]);

  // Notifications summary list (for badge indicator)
  const notificationsOverview = useMemo(() => {
    const unpaidCount = warningDetails.filter(w => w.type === 'unpaid').length;
    const urgentDeadlineCount = warningDetails.filter(w => w.type !== 'unpaid').length;

    return {
      unpaidCount,
      urgentDeadlineCount,
      totalAlerts: warningDetails.length
    };
  }, [warningDetails]);

  // Actions modifiers
  const handleSavePesanan = (newOrUpdated: Pesanan) => {
    setPesananList(prev => {
      const matchedIdx = prev.findIndex(item => item.id === newOrUpdated.id);
      if (matchedIdx !== -1) {
        // Redraw updated list
        const updated = [...prev];
        updated[matchedIdx] = newOrUpdated;
        return updated;
      } else {
        // Enqueue brand new order
        return [newOrUpdated, ...prev];
      }
    });
    
    // Clear out edit pointers and return back to list
    setPesananToEdit(null);
    setActiveTab('transaksi');
  };

  const handleDeletePesanan = (id: string) => {
    setPesananList(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateStatus = (id: string, newStatus: any) => {
    setPesananList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, statusProduksi: newStatus };
      }
      return item;
    }));
  };

  // Launch order Editor from index lists
  const handleLaunchEdit = (item: Pesanan) => {
    setPesananToEdit(item);
    setPesananForNota(null);
    setActiveTab('formulir');
  };

  // Launch Invoice Generator View
  const handleLaunchNota = (item: Pesanan | Pesanan[]) => {
    setPesananForNota(item);
  };

  // Update specific setting values
  const handleUpdateSettings = (updates: Partial<ShopSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Import draft backups fully
  const handleImportData = (importedOrders: Pesanan[], importedShopName?: string) => {
    if (importedOrders && Array.isArray(importedOrders)) {
      setPesananList(importedOrders);
    }
    if (importedShopName) {
      setSettings(prev => ({ ...prev, namaToko: importedShopName }));
    }
  };

  // Reset database values back to factory defaults (Starting completely from 0)
  const handleResetAll = () => {
    setPesananList([]);
    setSettings(DEFAULT_SETTINGS);
    setPesananToEdit(null);
    setPesananForNota(null);
    setActiveTab('dashboard');
  };

  if (!googleUser || !googleToken) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Abstract futuristic glowing backgrounds */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/15 blur-[130px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[130px]" />
        
        {/* Main card */}
        <div className="w-full max-w-md bg-slate-900/65 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10 select-none text-slate-100 flex flex-col items-center">
          
          {/* Cloud with circular animation */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl scale-125 animate-pulse" />
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white border border-indigo-400/30 shadow-lg relative">
              <Cloud className="h-8 w-8 shrink-0" />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-center text-white tracking-tight leading-tight mb-2">
            Penyimpanan Awan & Google Drive
          </h1>
          
          <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/25 px-3 py-1 rounded-full text-indigo-400 text-[10px] font-black tracking-wider uppercase mb-5">
            <Lock className="h-3 w-3 shrink-0 text-indigo-400" />
            <span>Otorisasi Akses Diwajibkan</span>
          </div>

          <p className="text-xs text-slate-400 text-center leading-relaxed mb-6">
            Akses ke aplikasi manajemen keuangan dan produksi ini mewajibkan sinkronisasi cloud. Keamanan data pesanan, draf cadangan, dan pengaturan toko Anda terintegrasi langsung dengan <strong>Google Drive</strong> secara otomatis dan real-time.
          </p>

          <div className="w-full border-t border-slate-800/50 pt-5 pb-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center mt-0.5 text-[10px] shrink-0 font-black">1</div>
              <p className="text-[11px] text-slate-350 leading-relaxed">
                Setiap kali membuka halaman atau refresh, Anda akan otomatis logout demi keamanan data keuangan.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 flex items-center justify-center mt-0.5 text-[10px] shrink-0 font-black">2</div>
              <p className="text-[11px] text-slate-350 leading-relaxed">
                Login wajib dilakukan di awal sehingga draf terbaru dari Google Drive dapat dimuat secara instan dan aman.
              </p>
            </div>
          </div>

          {signInError && (
            <div className="w-full bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl text-rose-400 text-xs font-medium text-center mb-5 leading-normal">
              {signInError}
            </div>
          )}

          <button
            onClick={handleBlockLogin}
            disabled={isSigningInGoogle}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs tracking-wide transition-all select-none shadow-md shadow-slate-950/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
          >
            {isSigningInGoogle ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-slate-900" />
                <span>Menghubungkan ke Google...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Masuk dengan Google</span>
              </>
            )}
          </button>

          <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase mt-5">
            Laporan Jersey App v2.0
          </span>
        </div>
      </div>
    );
  }

  if (isDriveSyncActive) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none text-slate-100">
        {/* Futuristic glowing radial particles */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-550/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-505/10 blur-[120px]" />

        {/* Outer orbital path simulation */}
        <div className="relative flex flex-col items-center z-10">
          
          {/* Main Visual Loading Gear/Cloud with custom spinning outer borders */}
          <div className="relative mb-8 h-24 w-24">
            {/* Spinning active ring */}
            <div className="absolute inset-0 border-4 border-slate-900 rounded-full" />
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute inset-0 border-4 border-t-indigo-550 border-r-indigo-400 border-b-transparent border-l-transparent rounded-full"
            />
            
            {/* Pulsing glow inside */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white border border-indigo-400/20 shadow-lg shadow-indigo-500/20">
              <Cloud className="h-7 w-7 animate-pulse text-white shrink-0" />
            </div>

            {/* Micro data bits flying up or orbiting */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-indigo-400 border border-slate-950 shadow-sm"
            />
          </div>

          {/* Dynamic synchronized state title */}
          <h2 className="text-lg sm:text-xl font-black text-center text-white tracking-tight leading-none mb-3">
            Sinkronisasi Cadangan Cloud
          </h2>

          {/* Loader status with a beautifully smooth layout transition */}
          <div className="min-h-[46px] flex items-center justify-center px-6 max-w-sm">
            <AnimatePresence mode="wait">
              <motion.p 
                key={syncMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-xs text-indigo-300 font-mono tracking-wide text-center leading-relaxed"
              >
                {syncMessage}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Subtitle / Loader bar */}
          <div className="mt-6 w-48 h-1 bg-slate-900 rounded-full overflow-hidden relative">
            <motion.div 
              style={{ originX: 0 }}
              animate={{ 
                x: ["-100%", "100%"]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.6, 
                ease: "easeInOut" 
              }}
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
            />
          </div>
          
          <div className="mt-12 flex items-center gap-1.5 bg-slate-900/80 border border-slate-800/80 px-3.5 py-1.5 rounded-full text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">
            <Loader2 className="h-3 w-3 animate-spin text-indigo-400 shrink-0" />
            <span>Sedang Memproses Laporan Jersey</span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans`}>
      
      {/* Upper Navigation Header bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/60 transition-colors duration-300 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt="Logo Toko" 
                className="h-9 w-9 object-contain rounded-lg border border-slate-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-xs font-black">
                JT
              </div>
            )}
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white leading-none">
                {settings.namaToko || 'Toko Jersey'}
              </h1>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold tracking-wide uppercase leading-none mt-1 inline-block">
                Keuangan & Produksi
              </span>
            </div>
          </div>

          {/* Quick controls right slot */}
          <div className="flex items-center gap-3">
            
            {/* Urgent Warning Counter badge */}
            {notificationsOverview.totalAlerts > 0 && (
              <button 
                onClick={() => {
                  setShowAlertsModal(true);
                }} 
                title={`${notificationsOverview.totalAlerts} Peringatan Aktif (Sisa tagihan / deadline dekat)`}
                className="flex items-center gap-1.5 p-1 px-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold animate-pulse cursor-pointer hover:bg-rose-500/20 transition-all outline-hidden"
              >
                <Bell className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                <span className="text-[10px] sm:inline hidden">Hati-hati:</span>
                <span>{notificationsOverview.totalAlerts}</span>
              </button>
            )}

            {/* Dark Mode Theme Active indicator tag */}
            <div
              title="Aplikasi Berjalan dalam Mode Gelap"
              className="p-2 border border-slate-700/60 text-amber-500 rounded-xl bg-slate-800/40 text-xs flex items-center gap-1.5 cursor-default select-none header-glow"
            >
              <Moon className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500/20" />
              <span className="text-[10px] hidden sm:inline text-slate-300 font-bold uppercase tracking-wider">Mode Gelap</span>
            </div>
          </div>

        </div>
      </header>

      {/* Primary responsive Full width flex structural container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 sm:pb-8 flex flex-col md:flex-row gap-6">
        
        {/* Responsive Desktop Left Sidebar Menu */}
        <aside className="w-full md:w-64 shrink-0 no-print hidden md:block">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-750 p-4 shadow-3xs sticky top-24 space-y-6">
            
            <p className="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase px-3">
              Menu Utama
            </p>

            <nav className="space-y-1">
              
              {/* Dashboard Tab */}
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setPesananForNota(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'dashboard' && !pesananForNota
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-indigo-650'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </div>
              </button>

              {/* Active Orders List */}
              <button
                onClick={() => {
                  setActiveTab('transaksi');
                  setPesananForNota(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'transaksi' && !pesananForNota
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-indigo-650'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="h-4 w-4" />
                  <span>Daftar Transaksi</span>
                </div>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                  activeTab === 'transaksi' ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                }`}>
                  {pesananList.length}
                </span>
              </button>

              {/* Order form drafting */}
              <button
                onClick={() => {
                  setPesananToEdit(null);
                  setPesananForNota(null);
                  setActiveTab('formulir');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'formulir' && !pesananForNota
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-indigo-650'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="h-4 w-4" />
                  <span>Buat Pesanan Baru</span>
                </div>
              </button>

              {/* Financial calculations and downloadable summaries */}
              <button
                onClick={() => {
                  setPesananForNota(null);
                  setActiveTab('laporan');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'laporan' && !pesananForNota
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-indigo-650'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-4 w-4" />
                  <span>Laporan Laba Rugi</span>
                </div>
              </button>

              {/* Configuration panel */}
              <button
                onClick={() => {
                  setPesananForNota(null);
                  setActiveTab('pengaturan');
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  activeTab === 'pengaturan' && !pesananForNota
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-indigo-650'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SettingsIcon className="h-4 w-4" />
                  <span>Pengaturan Toko</span>
                </div>
              </button>

            </nav>

            {/* Visual workshop stats summary */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider px-1">Kas Kerja</span>
              
              <div className="space-y-1.5 text-xs">
                <div className="rounded-2xl p-3.5 bg-slate-900 border border-emerald-500/30 shadow-xs relative overflow-hidden">
                  <div className="absolute right-[-12px] bottom-[-12px] opacity-10">
                    <DollarSign className="h-14 w-14 text-emerald-400" />
                  </div>
                  <span className="text-[10px] text-emerald-400 block uppercase leading-none font-black tracking-wider">Uang Terkumpul</span>
                  <p className="text-base font-black text-white mt-2 leading-none">
                    {formatRupiah(pesananList.reduce((acc, item) => acc + item.uangMasuk, 0))}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </aside>

        {/* Primary Central Content viewport renderer */}
        <main className="flex-1 min-w-0">
          
          {/* Override view layer IF we are generating the specific Invoice receipt */}
          {pesananForNota ? (
            <ReceiptGenerator
              pesanan={pesananForNota}
              settings={settings}
              onCancel={() => setPesananForNota(null)}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  pesananList={pesananList} 
                  onNavigate={(tab) => setActiveTab(tab)}
                  onSelectOrder={(order) => {
                    setPesananForNota(order);
                  }}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  selectedYear={selectedYear}
                  setSelectedYear={setSelectedYear}
                />
              )}

              {activeTab === 'transaksi' && (
                <ActiveOrders 
                  pesananList={pesananList}
                  onAddNew={() => {
                    setPesananToEdit(null);
                    setActiveTab('formulir');
                  }}
                  onEdit={handleLaunchEdit}
                  onDelete={handleDeletePesanan}
                  onGenerateNota={handleLaunchNota}
                  onUpdateStatus={handleUpdateStatus}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  selectedYear={selectedYear}
                  setSelectedYear={setSelectedYear}
                />
              )}

              {activeTab === 'formulir' && (
                <OrderForm 
                  pesananToEdit={pesananToEdit}
                  onSave={handleSavePesanan}
                  onCancel={() => {
                    setPesananToEdit(null);
                    setActiveTab('transaksi');
                  }}
                />
              )}

              {activeTab === 'laporan' && (
                <FinancialReports 
                  pesananList={pesananList} 
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  selectedYear={selectedYear}
                  setSelectedYear={setSelectedYear}
                />
              )}

              {activeTab === 'pengaturan' && (
                <Settings 
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  pesananList={pesananList}
                  onImportData={handleImportData}
                  onResetAll={handleResetAll}
                />
              )}
            </>
          )}

        </main>

      </div>

      {/* Sticky Bottom Tab bar exclusively for mobile devices */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 pr-2 pl-2 pt-2 pb-5 flex justify-around items-center md:hidden z-40 no-print shadow-xl">
        
        {/* Dashboard trigger */}
        <button
          onClick={() => {
            setActiveTab('dashboard');
            setPesananForNota(null);
          }}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'dashboard' && !pesananForNota ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>

        {/* Transactions trigger */}
        <button
          onClick={() => {
            setActiveTab('transaksi');
            setPesananForNota(null);
          }}
          className={`flex flex-col items-center gap-1 relative ${
            activeTab === 'transaksi' && !pesananForNota ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <ClipboardList className="h-5 w-5" />
          <span className="text-[10px] font-bold">Transaksi</span>
          {pesananList.length > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-indigo-600 text-white text-[9px] font-black h-4 w-4 flex items-center justify-center rounded-full">
              {pesananList.length}
            </span>
          )}
        </button>

        {/* New draft order trigger */}
        <button
          onClick={() => {
            setPesananToEdit(null);
            setPesananForNota(null);
            setActiveTab('formulir');
          }}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'formulir' && !pesananForNota ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <PlusCircle className="h-5 w-5" />
          <span className="text-[10px] font-bold">+ Jersey</span>
        </button>

        {/* Monthly Profit report tab */}
        <button
          onClick={() => {
            setPesananForNota(null);
            setActiveTab('laporan');
          }}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'laporan' && !pesananForNota ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <TrendingUp className="h-5 w-5" />
          <span className="text-[10px] font-bold">Laporan</span>
        </button>

        {/* Settings tab trigger */}
        <button
          onClick={() => {
            setPesananForNota(null);
            setActiveTab('pengaturan');
          }}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'pengaturan' && !pesananForNota ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <SettingsIcon className="h-5 w-5" />
          <span className="text-[10px] font-bold">Setelan</span>
        </button>

      </nav>

      {/* Pusat Peringatan & Tindakan Cepat (Alert & Warning Action Center Modal) */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] overflow-hidden flex flex-col animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-rose-500/10 rounded-xl relative">
                  <Bell className="h-5 w-5 text-rose-500" />
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-600 h-2 w-2 rounded-full animate-ping" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-white">Pusat Peringatan & Cepat Tanggap</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Daftar sisa penjualan belum lunas & pengerjaan mendekati deadline.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAlertsModal(false)}
                className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                aria-label="Tutup Peringatan"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Container with customized scroll view */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1.5">
              {warningDetails.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-extrabold text-slate-200">Semua Berjalan Lancar!</p>
                  <p className="text-xs text-slate-400 mt-1">Tidak ada sisa tagihan terutang maupun batas deadline kritis.</p>
                </div>
              ) : (
                warningDetails.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      alert.severity === 'high' 
                        ? 'bg-rose-500/5 border-rose-500/20 text-slate-100' 
                        : 'bg-amber-500/5 border-amber-500/20 text-slate-100'
                    }`}
                  >
                    {/* Warning Information Description Block */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="mt-1 shrink-0">
                        {alert.type === 'overdue' ? (
                          <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
                        ) : alert.type === 'deadline' ? (
                          <Clock className="h-5 w-5 text-rose-400" />
                        ) : (
                          <DollarSign className="h-5 w-5 text-amber-500" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-sm text-white truncate">{alert.title}</h4>
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase text-[10px] tracking-wide border ${
                            alert.severity === 'high' 
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {alert.type === 'unpaid' ? 'Belum Lunas' : alert.type === 'overdue' ? 'MENDESAK' : 'Hari H Dekat'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-350 mt-1 leading-relaxed">
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    {/* Quick Interactive Actions Panel */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                      
                      {/* Interactive Live Status Selector */}
                      {alert.type !== 'unpaid' && (
                        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700/80">
                          <span className="text-[10px] px-1.5 text-slate-400 font-bold">Fase:</span>
                          <select
                            value={alert.order.statusProduksi}
                            onChange={(e) => handleUpdateStatus(alert.order.id, e.target.value)}
                            className="bg-transparent focus:outline-hidden text-xs text-white rounded outline-hidden border-none font-bold py-0.5 pl-0.5 pr-4 cursor-pointer"
                          >
                            <option value="Setting" className="bg-slate-900 text-white">Setting</option>
                            <option value="Print Press" className="bg-slate-900 text-white">Print Press</option>
                            <option value="Jahit" className="bg-slate-900 text-white">Jahit</option>
                            <option value="Tinggal Kirim" className="bg-slate-900 text-white">Tinggal Kirim</option>
                            <option value="Beres" className="bg-slate-900 text-white">Beres</option>
                          </select>
                        </div>
                      )}

                      {/* Action trigger: view invoice preview */}
                      <button
                        type="button"
                        onClick={() => {
                          handleLaunchNota(alert.order);
                          setShowAlertsModal(false);
                        }}
                        className="text-[10px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 font-bold rounded-lg text-slate-200 transition-all cursor-pointer"
                      >
                        Nota
                      </button>

                      {/* Action trigger: edit full order details */}
                      <button
                        type="button"
                        onClick={() => {
                          handleLaunchEdit(alert.order);
                          setShowAlertsModal(false);
                        }}
                        className="text-[10px] px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg text-white transition-all cursor-pointer shadow-xs"
                      >
                        Edit PO
                      </button>

                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Modal Footer Info block */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400 shrink-0">
              <p>Klik tombol untuk memperbarui status pesanan secepat kilat.</p>
              <span className="font-bold text-slate-450 uppercase">Workshop App v2.1</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
