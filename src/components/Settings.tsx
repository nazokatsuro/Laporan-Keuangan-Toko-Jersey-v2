/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { ShopSettings, Pesanan } from '../types';
import { 
  Building, 
  Trash2, 
  Share2, 
  Download, 
  Upload, 
  RefreshCw,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  Info,
  ShieldCheck,
  Globe,
  Database,
  Cloud,
  CloudLightning,
  CloudOff,
  LogOut,
  Loader2
} from 'lucide-react';
import { 
  initAuth, 
  googleSignIn, 
  googleSignOut, 
  searchDraftInDrive, 
  downloadDraftFromDrive, 
  uploadDraftToDrive 
} from '../driveService';
import { User } from 'firebase/auth';

interface SettingsProps {
  settings: ShopSettings;
  onUpdateSettings: (settings: Partial<ShopSettings>) => void;
  pesananList: Pesanan[];
  onImportData: (orders: Pesanan[], shopName?: string, settings?: ShopSettings) => void;
  onResetAll: () => void;
}

export default function Settings({ 
  settings, 
  onUpdateSettings, 
  pesananList, 
  onImportData, 
  onResetAll 
}: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Google Drive integration state
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveDraftMeta, setDriveDraftMeta] = useState<{ id: string; modifiedTime: string } | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('laporan_jersey_gdrive_autosync') === 'true';
  });

  // Helper to check draft existence in Drive
  const checkDriveDraft = async (token: string) => {
    try {
      const meta = await searchDraftInDrive(token);
      if (meta) {
        setDriveDraftMeta({ id: meta.id, modifiedTime: meta.modifiedTime });
      } else {
        setDriveDraftMeta(null);
      }
    } catch (err: any) {
      console.error('Failed to look up Google Drive draft:', err);
      if (err?.message === 'UNAUTHORIZED') {
        await googleSignOut();
      }
    }
  };

  // Subscribe to Authentication state of user
  useEffect(() => {
    const unsubscribe = initAuth((user, token) => {
      setGoogleUser(user);
      setGoogleToken(token);
      if (user && token) {
        checkDriveDraft(token);
      } else {
        setDriveDraftMeta(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleGoogleLogin = async () => {
    setIsDriveSyncing(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        triggerSuccess(`Logged in: ${result.user.email}`);
        await checkDriveDraft(result.accessToken);
      } else {
        alert('Gagal login Google. Jendela pop-up diblokir oleh browser (popup blocker). Harap izinkan jendela pop-up di browser Anda agar dapat login!');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user' || (err.message && err.message.includes('popup-closed-by-user'))) {
        alert('Proses masuk dibatalkan karena jendela login ditutup.');
      } else {
        alert('Gagal login Google: ' + err.message);
      }
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      triggerSuccess('Berhasil keluar dari akun Google.');
    } catch (err: any) {
      console.error(err);
    }
  };

  const syncBackupToDrive = async () => {
    if (!googleToken) {
      alert('Harap login Google terlebih dahulu.');
      return;
    }
    setIsDriveSyncing(true);
    try {
      const result = await uploadDraftToDrive(googleToken, pesananList, settings);
      if (result.success) {
        setDriveDraftMeta({ id: result.fileId, modifiedTime: result.modifiedTime });
        triggerSuccess('Draft berhasil dicadangkan ke Google Drive Cloud!');
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal menyimpan draft ke Google Drive: ' + err.message);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const syncRestoreFromDrive = async () => {
    if (!googleToken || !driveDraftMeta) {
      alert('Tidak ada draft yang ditemukan di Google Drive untuk dimuat.');
      return;
    }
    
    // MANDATORY confirmation dialogue before mutating user cloud/local state
    const formattedTime = new Date(driveDraftMeta.modifiedTime).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const confirmMessage = `Apakah Anda yakin ingin MUAT/DOWNLOAD draft dari Google Drive?\n\nDraft ini disimpan pada: ${formattedTime}\n\nTindakan ini AKAN MENUMPUK & MENGGANTIKAN seluruh data jersey dan setelan lokal Anda saat ini. Berkas lokal saat ini akan terhapus total!`;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setIsDriveSyncing(true);
    try {
      const payload = await downloadDraftFromDrive(googleToken, driveDraftMeta.id);
      if (payload && Array.isArray(payload.pesananList)) {
        onImportData(payload.pesananList, payload.shopName);
        if (payload.settings) {
          onUpdateSettings(payload.settings);
        }
        triggerSuccess('Draft berhasil disinkronkan dari Google Drive!');
      } else {
        alert('Format draft berkas tidak kompatibel.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal memuat draft dari Google Drive: ' + err.message);
    } finally {
      setIsDriveSyncing(false);
    }
  };

  const toggleAutoSyncSetting = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('laporan_jersey_gdrive_autosync', String(enabled));
    triggerSuccess(enabled ? 'Auto-Sync Google Drive Aktif!' : 'Auto-Sync Google Drive Dimatikan');
  };

  // Handle store logo upload convert to Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran logo terlalu besar! Maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      onUpdateSettings({ logoUrl: base64String });
      triggerSuccess('Logo Toko berhasil diperbarui!');
    };
    reader.readAsDataURL(file);
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3050);
  };

  // Convert full state database to neat JSON file and trigger browser download
  const exportAllData = (mode: 'data-only' | 'full-draft') => {
    const payload = {
      appId: 'laporan-jersey-app',
      exportedAt: new Date().toISOString(),
      shopName: settings.namaToko,
      settings,
      pesananList
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `DRAFT_LAPORAN_JERSEY_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerSuccess('Data berhasil diexport ke format JSON!');
  };

  // Read external JSON file upload and parse state updates
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ask user confirmation before overwriting active database values
    const confirmMessage = `Apakah Anda yakin ingin IMPORT draft dari berkas JSON "${file.name}"?\n\nTindakan ini AKAN MENUMPUK & MENGGANTIKAN seluruh data pesanan aktif Anda saat ini di workspace perangkat ini.`;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        let list: Pesanan[] | null = null;
        let shopName = '';
        let fileSettings: ShopSettings | null = null;

        if (parsed) {
          if (Array.isArray(parsed)) {
            list = parsed;
          } else if (typeof parsed === 'object') {
            list = parsed.pesananList || parsed.pesanan || parsed.orders || parsed.data || null;
            shopName = parsed.shopName || parsed.namaToko || '';
            fileSettings = parsed.settings || null;
          }
        }

        if (list && Array.isArray(list)) {
          onImportData(list, shopName, fileSettings || undefined);
          alert(`Berhasil! Draft Laporan Jersey berhasil diimport. Memulihkan ${list.length} data transaksi.`);
        } else {
          alert('Format berkas JSON tidak sesuai standard Laporan Jersey. Pastikan file berisi daftar pesanan.');
        }
      } catch (err) {
        console.error(err);
        alert('Gagal membaca JSON. Berkas corrupt atau rusak.');
      }
    };
    reader.readAsText(file);
    // Reset inputs
    e.target.value = '';
  };

  const triggerResetAction = () => {
    onResetAll();
    setResetConfirm(false);
    triggerSuccess('Data laporan dibersihkan ke pengaturan default!');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Toast alert system feedback */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 bg-slate-900 text-white dark:bg-indigo-950 dark:text-indigo-200 border border-indigo-500/30 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 text-xs font-semibold animate-slide-in">
          <ShieldCheck className="h-4 w-4 text-emerald-400 animate-bounce" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid Settings Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: Shop profile configuration */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Panel 1: Profile Toko */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-slate-705 pb-3">
              <Building className="h-4 w-4 text-indigo-500" />
              Konfigurasi Identitas Toko Jersey
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Nama Resmi Toko / Workshop Atletis
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jersey Tech Indonesia..."
                  value={settings.namaToko}
                  onChange={(e) => onUpdateSettings({ namaToko: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-semibold"
                />
              </div>

              {/* Advanced Invoice custom fields layout */}
              <div className="border-t border-slate-100 dark:border-slate-700/60 my-4 pt-4 space-y-4">
                <h4 className="text-xs font-black text-indigo-550 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  Kustomisasi Template Nota Otomatis
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                  Rincian di bawah ini akan otomatis ditempel di header/footer kop nota transaksi atau rekap tanda terima saat dicetak. Settings tersimpan aman secara terpisah per akun Google yang aktif.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Tulisan Tagline / Subtitle Apparel
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Official Apparel Studio..."
                      value={settings.taglineToko || ''}
                      onChange={(e) => onUpdateSettings({ taglineToko: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Nomor WhatsApp Toko
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: +62 851-6666-4161"
                      value={settings.noWaToko || ''}
                      onChange={(e) => onUpdateSettings({ noWaToko: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Akun Instagram Toko
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: nomadenapparel"
                      value={settings.igToko || ''}
                      onChange={(e) => onUpdateSettings({ igToko: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Alamat Resmi Toko / Workshop
                    </label>
                    <textarea
                      placeholder="Contoh: Komp.Taman Bunga Sukamukti, Katapang..."
                      value={settings.alamatToko || ''}
                      onChange={(e) => onUpdateSettings({ alamatToko: e.target.value })}
                      rows={2}
                      className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-semibold resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Label Tanda Tangan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Hormat Kami,..."
                      value={settings.hormatKamiToko || ''}
                      onChange={(e) => onUpdateSettings({ hormatKamiToko: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Jabatan Penandatangan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Finance Administration..."
                      value={settings.roleSignToko || ''}
                      onChange={(e) => onUpdateSettings({ roleSignToko: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Teks Stempel (Baris Atas)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Nomaden..."
                      value={settings.stempelTokoText || ''}
                      onChange={(e) => onUpdateSettings({ stempelTokoText: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Teks Stempel (Baris Bawah)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Apparel..."
                      value={settings.stempelTokoSubtext || ''}
                      onChange={(e) => onUpdateSettings({ stempelTokoSubtext: e.target.value })}
                      className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Logo upload sector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Logo Toko Resmi (Untuk Kop Nota Pembelian)
                </label>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dotted border-slate-300 dark:border-slate-700">
                  
                  {/* Current logo previewer slot */}
                  {settings.logoUrl ? (
                    <div className="relative group shrink-0">
                      <img 
                        src={settings.logoUrl} 
                        alt="Logo Toko" 
                        className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ logoUrl: '' })}
                        className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow-sm hover:scale-105"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Hubungkan logo kustom Anda</p>
                    <p className="text-[10px] text-slate-400">File format PNG, JPG, atau WEBP. Maksimal 2 Megabyte.</p>
                    
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Pilih Gambar Berkas
                    </button>
                    
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Panel 2: Backup and Import state mechanisms */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-50 dark:border-slate-705 pb-3">
              <Share2 className="h-4 w-4 text-emerald-500" />
              Ekspor & Impor Cadangan Draft JSON
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Anda bisa memindahkan laporan jersey ini secara lengkap dari HP ke Komputer/Laptop, atau mencadangkan draft pembukuan agar aman dari resiko kehilangan data histori.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Export JSON Button */}
              <button
                type="button"
                onClick={() => exportAllData('full-draft')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                <Download className="h-4 w-4 text-indigo-500" />
                Simpan Draft Ke JSON
              </button>

              {/* Import JSON Trigger */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-755 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                <Upload className="h-4 w-4 text-emerald-500" />
                Load/Import Draft JSON
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {/* Panel 3: Google Drive Cloud Sync */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-50 dark:border-slate-705 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-sky-500" />
                <span>Penyimpanan Awan & Google Drive</span>
              </div>
              {googleUser && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-500/10 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-emerald-500" />
                  Terhubung
                </span>
              )}
            </h3>

            {!googleUser ? (
              <div className="space-y-4 py-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Hubungkan akun Google Drive Anda untuk menyimpan draft pengerjaan jersey, sisa tagihan, logo, dan modal secara otomatis di awan (cloud), sehingga Anda bisa mendownload dan memulihkan data kapan pun dibutuhkan.
                </p>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isDriveSyncing}
                    className="flex items-center gap-3 px-5 py-3 border border-slate-200 dark:border-slate-700 hover:border-slate-350 dark:hover:border-slate-600 rounded-xl bg-white dark:bg-slate-900 transition-all font-bold text-xs text-slate-700 dark:text-slate-200 shadow-3xs hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                  >
                    {isDriveSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    ) : (
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    )}
                    <span>Hubungkan dengan Google Drive</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Active Connected User details info */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/60 rounded-xl">
                  <div className="flex items-center gap-3">
                    {googleUser.photoURL ? (
                      <img 
                        src={googleUser.photoURL} 
                        alt={googleUser.displayName || 'Google Profile'} 
                        className="h-10 w-10 rounded-full border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-indigo-500 text-white font-black flex items-center justify-center text-xs uppercase">
                        {googleUser.email ? googleUser.email[0] : 'G'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-white truncate">
                        {googleUser.displayName || 'Akun Google'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {googleUser.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogout}
                    title="Sign Out dari Google"
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>

                {/* Cloud Draft File indicator */}
                <div className="p-3.5 bg-sky-500/5 border border-sky-500/10 rounded-xl space-y-2">
                  <div className="flex items-start gap-2.5">
                    <CloudLightning className="h-4 w-4 text-sky-500 mt-0.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-extrabold text-slate-800 dark:text-slate-200">
                        Status Backup di Google Drive Cloud:
                      </p>
                      {driveDraftMeta ? (
                        <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                          Terdapat berkas <span className="text-sky-400 font-bold">laporan_jersey_draft.json</span> di Drive Anda.<br />
                          Diperbarui pada: <span className="font-semibold text-slate-300 dark:text-slate-200">{new Date(driveDraftMeta.modifiedTime).toLocaleString('id-ID')}</span>
                        </p>
                      ) : (
                        <p className="text-amber-500 text-[11px] font-semibold mt-0.5 leading-relaxed">
                          Belum ada berkas draft di Google Drive. Klik &ldquo;Cadangkan Sekarang&rdquo; untuk membuat backup awal Anda.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Integration control buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  
                  {/* Backup / Upload button */}
                  <button
                    type="button"
                    onClick={syncBackupToDrive}
                    disabled={isDriveSyncing}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl text-xs font-extrabold text-white transition-all cursor-pointer shadow-xs"
                  >
                    {isDriveSyncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    Cadangkan ke Drive
                  </button>

                  {/* Restore / Download button */}
                  <button
                    type="button"
                    onClick={syncRestoreFromDrive}
                    disabled={isDriveSyncing || !driveDraftMeta}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-755 disabled:opacity-40 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    {isDriveSyncing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Muat dari Drive
                  </button>

                </div>

                {/* Auto Cloud Backup Preferences Checkbox Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/60 rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 dark:text-white">Auto-Backup ke Cloud</p>
                    <p className="text-[10px] text-slate-400">Simpan cadangan ke Drive otomatis setiap Anda mengubah data.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={autoSyncEnabled}
                      onChange={(e) => toggleAutoSyncSetting(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
                  </label>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Right column: dangerous action blocks */}
        <div className="space-y-6">
          
          {/* Panel 3: Reset system operations */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-rose-100 dark:border-rose-900/30 p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 border-b border-rose-50 dark:border-rose-900/20 pb-3">
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              Area Bahaya / Reset Sistem
            </h3>

            <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-100/50 leading-relaxed">
              Tindakan di bawah ini bersifat permanen. Seluruh isi laporan keuangan dan histori jersey yang disimpan di LocalStorage perangkat Anda akan terhapus total.
            </p>

            <div className="pt-2">
              {resetConfirm ? (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 space-y-3">
                  <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 animate-bounce">
                    ⚠️ APAKAH ANDA BENAR-BENAR YAKIN INGIN MENGHAPUS SEMUA DATA?
                  </p>
                  
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={triggerResetAction}
                      className="px-3 py-1.5 font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
                    >
                      Ya, Hapus Semua!
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetConfirm(false)}
                      className="px-3 py-1.5 font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setResetConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-100/80 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Mulai Bersihkan Database
                </button>
              )}
            </div>
          </div>

          {/* Panel 4: System specifications summary info */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 p-5 shadow-xs text-xs space-y-3">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Database className="h-4 w-4 text-indigo-500" />
              Statistik Penyimpanan
            </h4>

            <div className="space-y-2 text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Mesin Penyimpanan</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">LocalStorage</span>
              </div>
              
              <div className="flex justify-between">
                <span>Total Record Jersey</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{pesananList.length} Unit</span>
              </div>

              <div className="flex justify-between">
                <span>Mode Tampilan</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{settings.darkMode ? 'Gelap / Dark Mode' : 'Terang / Light Mode'}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center gap-2 text-indigo-620 dark:text-indigo-400 font-bold">
              <Info className="h-3.5 w-3.5" />
              <span>Version: 2.1.0 Stable Build</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
