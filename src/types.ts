/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StatusProduksi = 'Setting' | 'Print Press' | 'Jahit' | 'Tinggal Kirim' | 'Beres';

export interface PembayaranMasuk {
  id: string;
  tanggal: string; // YYYY-MM-DD
  nominal: number;
  keterangan: string;
}

export interface PesananItem {
  id: string;
  namaProduk: string;
  bahan: string;
  keterangan: string;
  catatanJahit?: string;
  qty: number;
  hargaPerPcs: number;
  printPerPcs: number;
  jahitPerPcs: number;
  modelKerah?: string;
  penerimaKomisi?: string;
  komisiPerPcs?: number;
}

export interface Pesanan {
  id: string;
  createdAt: string;
  deadline: string;
  namaPemesan: string;
  noTelepon: string;
  namaPo: string; // Nama PO / Nama Tim
  namaProduk: string;
  bahan: string;
  keterangan: string;
  catatanJahit?: string;
  qty: number;
  hargaPerPcs: number;
  totalHarga: number; // qty * hargaPerPcs (or sum of items' total)
  uangMasuk: number; // DP / Uang Masuk
  sisaTagihan: number; // totalHarga - uangMasuk
  statusProduksi: StatusProduksi;
  modelKerah?: string; // Model Kerah PO
  
  // Perhitungan Modal
  printPerPcs: number;
  jahitPerPcs: number;
  biayaLainnya: number;
  totalModal: number; // (qty * printPerPcs) + (qty * jahitPerPcs) + biayaLainnya (or sum of items' modal)
  profit: number; // totalHarga - totalModal

  penerimaKomisi?: string; // main/overall commission receiver if any
  komisiPerPcs?: number; // main/overall commission quantity per pcs if any

  // List of multiple products inside 1 PO
  items?: PesananItem[];

  mockupUrl?: string; // Base64 string of the jersey mockup
  fotoKerahUrl?: string; // Base64 string of the uploaded collar image
  pembayaranList?: PembayaranMasuk[];
  detailSizeNama?: string; // Sizing details and name lists for tailoring
  detailSizeNamaGambarUrl?: string; // Base64 string of sizing list image from user
}

export interface CashFlowTransaction {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kategori: string; // Category string (DP pelanggan, Pelunasan pelanggan, Pendapatan lain, etc.)
  keterangan: string;
  jenis: 'masuk' | 'keluar';
  nominal: number;
}

export interface AuditorDismissedAlert {
  id: string;
  dismissedAt: string;
  dismissedBy: string;
  title: string;
  description: string;
  relatedPoNames: string[];
}

export interface ShopSettings {
  namaToko: string;
  logoUrl: string; // Base64 or standard placeholder
  darkMode: boolean;
  targetOmset?: number;
  targetProduksi?: number;
  danaDaruratTerkumpul?: number;
  danaDaruratTargetMonths?: number;
  cashFlowList?: CashFlowTransaction[];
  dismissedAuditorAlerts?: AuditorDismissedAlert[];
  customCollars?: string[];
  alamatToko?: string;
  noWaToko?: string;
  igToko?: string;
  taglineToko?: string;
  stempelTokoText?: string;
  stempelTokoSubtext?: string;
  roleSignToko?: string;
  hormatKamiToko?: string;
}

export interface FinancialStats {
  totalOmset: number;
  totalModal: number;
  totalKeuntungan: number;
  totalProduksi: number;
  totalPesanan: number;
  totalUangMasuk: number;
  totalSisaTagihan: number;
  pesananBelumLunasCount: number;
}
