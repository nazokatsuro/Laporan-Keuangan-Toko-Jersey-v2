/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SPKStatus = 'NORMAL' | 'PRIORITAS' | 'URGENT' | 'SELESAI' | 'HOLD';

export interface SPKPlayer {
  id: string;
  no: number;
  name: string;
  size: string; // S, M, L, XL, 2XL, 3XL, 4XL, etc.
  number: string; // e.g. "81", "25", "03", "-"
  model: string; // "PENDEK" | "LENGAN PANJANG" | etc.
  notes: string; // "KIPER" | "KAPTEN" | "-"
  qc: boolean;
}

export interface SPKJerseyImage {
  id: string;
  title: string; // e.g. "Jersey Pemain", "Jersey Kiper", "Celana", "Detail Kerah"
  url: string; // Base64 data URL
  includedInSpk: boolean;
  zoom: number; // 0.5 to 2.5
  posX: number; // percentage offset -50 to 50
  posY: number; // percentage offset -50 to 50
  rotation: number; // 0, 90, 180, 270
  opacity: number; // 0 to 1
  fitMode: 'contain' | 'cover' | 'fill';
}

export interface SPKCompanySettings {
  name: string;
  tagline: string;
  logoUrl: string;
  wa: string;
  ig: string;
  address: string;
  website: string;
  email: string;
  footerNote: string;
  primaryColor: string; // #00805F
  darkColor: string; // #006B50
  lightColor: string; // #EEF8F4
  textColor: string; // #162033
  borderColor: string; // #CBD5E1
  urgentColor: string; // #F05B83
  warningColor: string; // #F59E0B
}

export interface SPKNotes {
  mainNote: string; // e.g. "TUTUP KERAH POLOS, FULL STIK"
  jahit: string; // e.g. "FULL STIK"
  bahan: string; // e.g. "WAFFLE"
  tangan: string; // e.g. "PENDEK"
  kerah: string; // e.g. "V DATAR + LIDAH"
  additionalNotes?: string;
}

export interface SPKLayoutSettings {
  scale: number; // 100%
  compactDensity: boolean;
  pageMode?: 'auto' | '1page' | '2page' | 'multi'; // Auto (dynamically split to 2, 3, or N pages), 1page (force 1 page), 2page (force max 2 pages), multi (always allow multi-page)
  maxPlayersPerPage?: number; // Page 1 max players (default 50)
  continuationPageSize?: number; // Page 2+ players per page (default 50)
  fontFamily: 'sans' | 'mono' | 'serif' | 'condensed';
  fontSize: 'xs' | 'sm' | 'base';
  showHeader: boolean;
  showOrderInfo: boolean;
  showPlayerTable: boolean;
  showCollarPreview: boolean;
  showSizeRecap: boolean;
  showJerseyDesign: boolean;
  showTailorNotes: boolean;
  showFooter: boolean;
}

export interface SPKData {
  id: string;
  spkNumber: string; // e.g. "SPK-2026-006"
  customer: string; // e.g. "KIERAHA"
  poName: string; // e.g. "SOLIDARITAS"
  collarModel: string; // e.g. "V DATAR + LIDAH"
  productModel: string; // e.g. "SETELAN"
  material: string; // e.g. "WAFFLE"
  sleeveModel: string; // e.g. "PENDEK"
  sewingModel: string; // e.g. "FULL STIK"
  vendorJahit?: string; // e.g. "Konveksi Mas Joko"
  mitraJahit?: string; // alias for vendorJahit
  status: SPKStatus;
  productionStatus?: string; // "Setting" | "Print Press" | "Jahit" | "Tinggal Kirim" | "Beres"
  productionDate: string; // e.g. "2026-08-28" or "-"
  deadline: string; // e.g. "2026-08-28"
  players: SPKPlayer[];
  
  collarImage: string; // Base64 image
  collarCaption: string; // e.g. "V DATAR + LIDAH"
  collarZoom: number;
  collarPosX: number;
  collarPosY: number;
  collarRotation: number;
  
  jerseyImages: SPKJerseyImage[];
  notes: SPKNotes;
  companySettings: SPKCompanySettings;
  layout: SPKLayoutSettings;
  
  createdAt: string;
  updatedAt: string;
}

export interface SPKTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Jersey' | 'Jaket' | 'Kaos' | 'Training' | 'Komunitas' | 'Custom';
  data: Partial<SPKData>;
}

export interface SizeRecapRow {
  size: string;
  pendek: number;
  pjg: number;
  total: number;
}
