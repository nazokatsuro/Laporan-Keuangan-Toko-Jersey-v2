/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SPKCompanySettings, SPKData, SPKPlayer, SPKTemplate } from './spkTypes';

export const DEFAULT_COMPANY_SETTINGS: SPKCompanySettings = {
  name: 'NOMADEN APPAREL',
  tagline: 'Spesialis Pembuatan Jersey Custom & Apparel Olahraga',
  logoUrl: '', // uses vector N logo if empty
  wa: '0812-3456-7890',
  ig: '@nomadenapparel',
  address: 'Jl. Industri Konveksi No. 18, Bandung, Jawa Barat',
  website: 'www.nomadenapparel.com',
  email: 'produksi@nomadenapparel.com',
  footerNote: 'Dokumen ini merupakan Surat Perintah Kerja (SPK) resmi Nomaden Apparel. Harap ikuti instruksi spesifikasi dengan seksama.',
  primaryColor: '#00805F',
  darkColor: '#006B50',
  lightColor: '#EEF8F4',
  textColor: '#162033',
  borderColor: '#CBD5E1',
  urgentColor: '#F05B83',
  warningColor: '#F59E0B'
};

// Realistic vector preview for collar matching the reference image (Blue V-neck with white tongue + Gold/Black collar)
export const DEFAULT_COLLAR_SVG = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 180" width="100%" height="100%">
  <defs>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
  </defs>
  <!-- Left Collar (Blue V Datar + Lidah) -->
  <g transform="translate(10, 10)">
    <path d="M 20 20 Q 95 140 170 20 L 150 15 Q 95 100 40 15 Z" fill="#0F172A" />
    <path d="M 30 18 Q 95 125 160 18 L 145 15 Q 95 95 45 15 Z" fill="url(#blueGrad)" />
    <!-- White inner lidah / tongue -->
    <path d="M 80 80 L 110 80 L 95 110 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
    <!-- Collar outline ribs -->
    <path d="M 25 18 Q 95 130 165 18" fill="none" stroke="#1E40AF" stroke-width="6" stroke-linecap="round"/>
    <path d="M 95 110 L 95 130" stroke="#0F172A" stroke-width="3" stroke-dasharray="2 2"/>
  </g>
  <!-- Right Collar (Gold/Black Kiper) -->
  <g transform="translate(200, 10)">
    <path d="M 20 20 Q 95 140 170 20 L 150 15 Q 95 100 40 15 Z" fill="#0F172A" />
    <path d="M 30 18 Q 95 125 160 18 L 145 15 Q 95 95 45 15 Z" fill="#18181B" />
    <!-- Gold inner tongue -->
    <path d="M 80 80 L 110 80 L 95 110 Z" fill="url(#goldGrad)" stroke="#78350F" stroke-width="1"/>
    <!-- Collar outline ribs -->
    <path d="M 25 18 Q 95 130 165 18" fill="none" stroke="#D97706" stroke-width="6" stroke-linecap="round"/>
  </g>
</svg>`)}`;

// Realistic vector preview for Jersey Mockup matching the reference image
export const DEFAULT_JERSEY_MOCKUP_SVG = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 620" width="100%" height="100%">
  <defs>
    <linearGradient id="jerseyBlue" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E40AF"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="jerseyGold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>

  <!-- Player Front & Shorts (Blue) -->
  <g transform="translate(10, 5)">
    <!-- Shorts Left -->
    <g transform="translate(10, 15)">
      <polygon points="10,0 70,0 80,60 55,60 45,35 35,60 0,60" fill="#1E3A8A" stroke="#0F172A" stroke-width="1.5"/>
      <text x="35" y="25" font-family="sans-serif" font-weight="900" font-size="14" fill="#FFFFFF" text-anchor="middle" transform="rotate(-90 35 25)">9</text>
    </g>
    <!-- Jersey Front -->
    <g transform="translate(90, 0)">
      <path d="M 25,0 L 55,10 L 85,0 L 110,25 L 90,45 L 85,35 L 85,120 L 25,120 L 25,35 L 20,45 L 0,25 Z" fill="url(#jerseyBlue)" stroke="#0F172A" stroke-width="1.5"/>
      <!-- Collar -->
      <polygon points="45,3 55,18 65,3 55,8" fill="#FFFFFF"/>
      <!-- Chest Sponsor -->
      <rect x="38" y="40" width="34" height="40" rx="3" fill="#0F172A" opacity="0.15"/>
      <text x="55" y="58" font-family="sans-serif" font-weight="900" font-size="7" fill="#FACC15" text-anchor="middle" letter-spacing="1">SOLIDARITAS</text>
      <text x="55" y="67" font-family="sans-serif" font-weight="700" font-size="5" fill="#FFFFFF" text-anchor="middle">TALIBAN</text>
    </g>
  </g>

  <!-- Player Back (Blue) -->
  <g transform="translate(10, 145)">
    <!-- Shorts Back Side -->
    <g transform="translate(10, 20)">
      <polygon points="10,0 70,0 75,40 50,40 40,25 30,40 5,40" fill="#1E3A8A" stroke="#0F172A" stroke-width="1.5"/>
      <path d="M 10,20 Q 40,35 70,20" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    </g>
    <!-- Jersey Back -->
    <g transform="translate(90, 0)">
      <path d="M 25,0 L 55,5 L 85,0 L 110,25 L 90,45 L 85,35 L 85,120 L 25,120 L 25,35 L 20,45 L 0,25 Z" fill="url(#jerseyBlue)" stroke="#0F172A" stroke-width="1.5"/>
      <!-- Back Number -->
      <text x="55" y="70" font-family="sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" stroke="#0F172A" stroke-width="1" text-anchor="middle" transform="rotate(90 55 70)">9</text>
      <text x="80" y="70" font-family="sans-serif" font-weight="900" font-size="6" fill="#FFFFFF" text-anchor="middle" transform="rotate(90 80 70)">PLAYER</text>
    </g>
  </g>

  <!-- GK Front & Shorts (Gold / Black) -->
  <g transform="translate(10, 290)">
    <!-- Shorts Left -->
    <g transform="translate(10, 15)">
      <polygon points="10,0 70,0 80,60 55,60 45,35 35,60 0,60" fill="#18181B" stroke="#0F172A" stroke-width="1.5"/>
      <text x="35" y="25" font-family="sans-serif" font-weight="900" font-size="14" fill="#FACC15" text-anchor="middle" transform="rotate(-90 35 25)">9</text>
    </g>
    <!-- GK Jersey Front -->
    <g transform="translate(90, 0)">
      <path d="M 25,0 L 55,10 L 85,0 L 110,25 L 90,45 L 85,35 L 85,120 L 25,120 L 25,35 L 20,45 L 0,25 Z" fill="url(#jerseyGold)" stroke="#0F172A" stroke-width="1.5"/>
      <!-- Collar -->
      <polygon points="45,3 55,18 65,3 55,8" fill="#18181B"/>
      <!-- Chest Sponsor -->
      <rect x="38" y="40" width="34" height="40" rx="3" fill="#0F172A" opacity="0.2"/>
      <text x="55" y="58" font-family="sans-serif" font-weight="900" font-size="7" fill="#18181B" text-anchor="middle" letter-spacing="1">SOLIDARITAS</text>
      <text x="55" y="67" font-family="sans-serif" font-weight="700" font-size="5" fill="#FFFFFF" text-anchor="middle">TALIBAN</text>
    </g>
  </g>

  <!-- GK Back (Gold / Black) -->
  <g transform="translate(10, 435)">
    <!-- Shorts Back -->
    <g transform="translate(10, 20)">
      <polygon points="10,0 70,0 75,40 50,40 40,25 30,40 5,40" fill="#18181B" stroke="#0F172A" stroke-width="1.5"/>
      <path d="M 10,20 Q 40,35 70,20" fill="none" stroke="#D97706" stroke-width="2"/>
    </g>
    <!-- GK Jersey Back -->
    <g transform="translate(90, 0)">
      <path d="M 25,0 L 55,5 L 85,0 L 110,25 L 90,45 L 85,35 L 85,120 L 25,120 L 25,35 L 20,45 L 0,25 Z" fill="url(#jerseyGold)" stroke="#0F172A" stroke-width="1.5"/>
      <!-- Back Number -->
      <text x="55" y="70" font-family="sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" stroke="#18181B" stroke-width="1.5" text-anchor="middle" transform="rotate(90 55 70)">9</text>
      <text x="80" y="70" font-family="sans-serif" font-weight="900" font-size="6" fill="#18181B" text-anchor="middle" transform="rotate(90 80 70)">KIPER</text>
    </g>
  </g>
</svg>`)}`;

export const SAMPLE_PLAYERS: SPKPlayer[] = [
  { id: 'p-1', no: 1, name: 'GAZER', size: 'L', number: '81', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-2', no: 2, name: 'OCKHY', size: 'L', number: '25', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-3', no: 3, name: 'ERICK', size: 'L', number: '24', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-4', no: 4, name: 'TODUHO', size: 'L', number: '03', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-5', no: 5, name: 'LATUPONO', size: 'L', number: '22', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-6', no: 6, name: 'PITALOKA', size: 'L', number: '13', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-7', no: 7, name: 'W. LADJUPA', size: 'L', number: '17', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-8', no: 8, name: 'M. IRFAN', size: 'L', number: '12', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-9', no: 9, name: 'TUBULI', size: 'L', number: '10', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-10', no: 10, name: 'RIFKY', size: 'L', number: '47', model: 'PENDEK', notes: 'KIPER', qc: false },
  { id: 'p-11', no: 11, name: 'PUTRA', size: 'L', number: '27', model: 'LENGAN PANJANG', notes: '-', qc: false },
  { id: 'p-12', no: 12, name: 'RIVALDI', size: 'XL', number: '30', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-13', no: 13, name: 'ARSHAQ', size: 'XL', number: '19', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-14', no: 14, name: 'SAKEN', size: 'XL', number: '41', model: 'LENGAN PANJANG', notes: '-', qc: false },
  { id: 'p-15', no: 15, name: 'NAUREEN', size: '2XL', number: '31', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-16', no: 16, name: 'JULEX', size: '2XL', number: '23', model: 'PENDEK', notes: '-', qc: false },
  { id: 'p-17', no: 17, name: 'SANDUAN', size: '2XL', number: '18', model: 'LENGAN PANJANG', notes: '-', qc: false },
];

export const INITIAL_DEFAULT_SPK: SPKData = {
  id: 'spk-init-001',
  spkNumber: 'SPK-2026-006',
  customer: 'KIERAHA',
  poName: 'SOLIDARITAS',
  collarModel: 'V DATAR + LIDAH',
  productModel: 'SETELAN',
  material: 'WAFFLE',
  sleeveModel: 'PENDEK',
  sewingModel: 'FULL STIK',
  status: 'URGENT',
  productionDate: '2026-08-28',
  deadline: '2026-08-28',
  players: SAMPLE_PLAYERS,
  
  collarImage: DEFAULT_COLLAR_SVG,
  collarCaption: 'V DATAR + LIDAH',
  collarZoom: 1,
  collarPosX: 0,
  collarPosY: 0,
  collarRotation: 0,
  
  jerseyImages: [
    {
      id: 'img-1',
      title: 'Mockup Solidaritas Setelan',
      url: DEFAULT_JERSEY_MOCKUP_SVG,
      includedInSpk: true,
      zoom: 1,
      posX: 0,
      posY: 0,
      rotation: 90, // Default 90 derajat / vertikal
      opacity: 1,
      fitMode: 'contain'
    }
  ],
  
  notes: {
    mainNote: 'TUTUP KERAH POLOS, FULL STIK',
    jahit: 'FULL STIK',
    bahan: 'WAFFLE',
    tangan: 'PENDEK',
    kerah: 'V DATAR + LIDAH',
    additionalNotes: 'Perhatikan jahitan stik leher dan nomor kiper emas/hitam.'
  },
  
  companySettings: DEFAULT_COMPANY_SETTINGS,
  
  layout: {
    scale: 100,
    compactDensity: false,
    pageMode: 'auto',
    maxPlayersPerPage: 50,
    continuationPageSize: 50,
    fontFamily: 'sans',
    fontSize: 'sm',
    showHeader: true,
    showOrderInfo: true,
    showPlayerTable: true,
    showCollarPreview: true,
    showSizeRecap: true,
    showJerseyDesign: true,
    showTailorNotes: true,
    showFooter: true
  },
  
  createdAt: '2026-08-27T10:00:00.000Z',
  updatedAt: '2026-08-27T10:00:00.000Z'
};

export const DEFAULT_TEMPLATES: SPKTemplate[] = [
  {
    id: 'tmpl-1',
    name: 'Template 01 — Nomaden Apparel (Default)',
    description: 'Template standar produksi jersey setelan custom sepakbola/futsal lengkap dengan mockup, kerah, dan rekap ukuran.',
    category: 'Jersey',
    data: INITIAL_DEFAULT_SPK
  },
  {
    id: 'tmpl-2',
    name: 'SPK Jersey Basket (Sleeveless)',
    description: 'Template produksi jersey basket tanpa lengan dengan bahan Drifit Milano/Bintik.',
    category: 'Jersey',
    data: {
      ...INITIAL_DEFAULT_SPK,
      productModel: 'SETELAN BASKET',
      sleeveModel: 'BUNTONG / SLEEVELESS',
      collarModel: 'V-NECK RIB',
      material: 'MILANO PREMIUM',
      notes: {
        mainNote: 'RIB LEHER & KETIAK SESUAI WARNA LIST',
        jahit: 'OVERDECK 3 JARUM',
        bahan: 'MILANO PREMIUM',
        tangan: 'BUNTONG',
        kerah: 'V-NECK RIB'
      }
    }
  },
  {
    id: 'tmpl-3',
    name: 'SPK Jaket & Hoodie Printing',
    description: 'Template SPK jaket windbreaker / hoodie parasut atau lotto elvana.',
    category: 'Jaket',
    data: {
      ...INITIAL_DEFAULT_SPK,
      productModel: 'JAKET HOODIE RESLETING',
      sleeveModel: 'LENGAN PANJANG RIB',
      collarModel: 'HOODIE + TALI',
      material: 'TASLAN WATERPROOF / LOTTO',
      notes: {
        mainNote: 'RESLETING YKK GIGI BESI, KARET PINGGANG ELASTIS',
        jahit: 'FULL STIK + OBRAS RAPI',
        bahan: 'TASLAN WATERPROOF',
        tangan: 'LENGAN PANJANG + RIB',
        kerah: 'HOODIE'
      }
    }
  },
  {
    id: 'tmpl-4',
    name: 'SPK Kaos / T-Shirt Komunitas',
    description: 'Template kaos sablon / sublim katun combed & dryfit santai.',
    category: 'Kaos',
    data: {
      ...INITIAL_DEFAULT_SPK,
      productModel: 'KAOS O-NECK',
      sleeveModel: 'PENDEK',
      collarModel: 'O-NECK STANDAR',
      material: 'COTTON COMBED 24S',
      notes: {
        mainNote: 'JAHITAN RANTAI PUNDAK, OVERDECK BAWAH',
        jahit: 'RANTAI STANDAR DISTRO',
        bahan: 'COTTON COMBED 24S',
        tangan: 'PENDEK',
        kerah: 'O-NECK RIB 2.5CM'
      }
    }
  }
];
