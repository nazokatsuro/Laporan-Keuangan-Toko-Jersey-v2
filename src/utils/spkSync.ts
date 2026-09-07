/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pesanan, ShopSettings } from '../types';
import { SPKData, SPKCompanySettings, SPKPlayer, SPKStatus } from '../spkTypes';
import { DEFAULT_COMPANY_SETTINGS, DEFAULT_COLLAR_SVG, DEFAULT_JERSEY_MOCKUP_SVG } from '../spkSampleData';
import { parseRawRosterText } from './spkParser';

/**
 * Creates SPKCompanySettings from ShopSettings with fallback to DEFAULT_COMPANY_SETTINGS
 */
export function getSyncedCompanySettings(
  shopSettings?: ShopSettings,
  spkSettings?: SPKCompanySettings
): SPKCompanySettings {
  const base = spkSettings || DEFAULT_COMPANY_SETTINGS;
  if (!shopSettings) return base;

  return {
    ...base,
    name: shopSettings.namaToko || base.name,
    tagline: shopSettings.taglineToko || base.tagline,
    logoUrl: shopSettings.logoUrl || base.logoUrl,
    wa: shopSettings.noWaToko || base.wa,
    ig: shopSettings.igToko || base.ig,
    address: shopSettings.alamatToko || base.address,
    footerNote: shopSettings.taglineToko 
      ? `Dokumen SPK Resmi ${shopSettings.namaToko || 'Nomaden Apparel'}. ${shopSettings.taglineToko}` 
      : base.footerNote
  };
}

/**
 * Converts a Pesanan transaction into a full SPKData object
 */
export function orderToSpkData(
  order: Pesanan,
  companySettings?: SPKCompanySettings,
  shopSettings?: ShopSettings
): SPKData {
  const mergedCompany = getSyncedCompanySettings(shopSettings, companySettings);

  const primaryCollar = order.modelKerah || order.items?.[0]?.modelKerah || 'O-Neck (Standar)';
  const primaryBahan = order.bahan || order.items?.[0]?.bahan || 'WAFFLE';
  const primaryModel = order.namaProduk || order.items?.[0]?.namaProduk || 'SETELAN';
  const primaryLengan = order.modelLengan || order.items?.[0]?.modelLengan || 'PENDEK';
  const primaryJahit = order.modelJahit || order.items?.[0]?.modelJahit || order.catatanJahit || 'BIASA';

  const defaultMainNote = order.catatanKhususPenjahit?.mainNote || order.keterangan || 'TUTUP KERAH POLOS, JAHIT BIASA';
  const defaultJahitNote = order.catatanKhususPenjahit?.jahit || primaryJahit;
  const defaultBahanNote = order.catatanKhususPenjahit?.bahan || primaryBahan;
  const defaultTanganNote = order.catatanKhususPenjahit?.tangan || primaryLengan;
  const defaultKerahNote = order.catatanKhususPenjahit?.kerah || primaryCollar;

  // Derive unique SPK Number e.g. SPK-2026-LVX0 or reuse custom assigned
  const year = order.createdAt ? order.createdAt.substring(0, 4) : String(new Date().getFullYear());
  const idClean = (order.id || '').replace(/[^a-zA-Z0-9]/g, '');
  const idShort = idClean.slice(-4).toUpperCase() || '001';
  const defaultSpkNum = order.nomorSpk || `SPK-${year}-${idShort}`;

  // Map status
  let spkStatus: SPKStatus = order.spkStatus || 'NORMAL';
  if (!order.spkStatus) {
    if (order.statusProduksi === 'Beres') {
      spkStatus = 'SELESAI';
    } else {
      const diff = new Date(order.deadline).getTime() - new Date().getTime();
      const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (diffDays <= 3 && diffDays >= 0) {
        spkStatus = 'URGENT';
      } else if (diffDays < 0) {
        spkStatus = 'URGENT';
      } else if (order.statusProduksi === 'Print Press' || order.statusProduksi === 'Jahit') {
        spkStatus = 'PRIORITAS';
      }
    }
  }

  // If order already has cached SPK data, reuse and freshen header & tailoring info
  if (order.spkData) {
    return {
      ...order.spkData,
      id: order.spkData.id || `spk-ord-${order.id}`,
      spkNumber: order.nomorSpk || order.spkData.spkNumber || defaultSpkNum,
      customer: order.namaPemesan || order.spkData.customer || 'KONSUMEN',
      poName: order.namaPo || order.spkData.poName || 'PO JERSEY',
      deadline: order.deadline || order.spkData.deadline,
      material: primaryBahan || order.spkData.material || 'WAFFLE',
      productModel: primaryModel || order.spkData.productModel || 'SETELAN',
      collarModel: primaryCollar || order.spkData.collarModel || 'O-Neck (Standar)',
      sleeveModel: primaryLengan || order.spkData.sleeveModel || 'PENDEK',
      sewingModel: primaryJahit || order.spkData.sewingModel || 'BIASA',
      collarCaption: primaryCollar || order.spkData.collarCaption || 'O-Neck (Standar)',
      collarImage: order.fotoKerahUrl || order.spkData.collarImage || DEFAULT_COLLAR_SVG,
      vendorJahit: order.vendorJahit || order.items?.[0]?.vendorJahit || order.spkData.vendorJahit || '',
      mitraJahit: order.vendorJahit || order.items?.[0]?.vendorJahit || order.spkData.mitraJahit || '',
      status: spkStatus,
      productionStatus: order.statusProduksi || (order.spkData as any).productionStatus || 'Setting',
      notes: {
        mainNote: defaultMainNote || order.spkData.notes?.mainNote || 'TUTUP KERAH POLOS, JAHIT BIASA',
        jahit: defaultJahitNote || order.spkData.notes?.jahit || 'BIASA',
        bahan: defaultBahanNote || order.spkData.notes?.bahan || 'WAFFLE',
        tangan: defaultTanganNote || order.spkData.notes?.tangan || 'PENDEK',
        kerah: defaultKerahNote || order.spkData.notes?.kerah || primaryCollar,
        additionalNotes: order.spkData.notes?.additionalNotes || `Pesanan ID: ${order.id} | Telp: ${order.noTelepon || '-'}`
      },
      companySettings: mergedCompany,
      updatedAt: order.spkData.updatedAt || new Date().toISOString()
    };
  }

  // Parse player roster from detailSizeNama
  let players: SPKPlayer[] = [];
  if (order.detailSizeNama && order.detailSizeNama.trim()) {
    const parseRes = parseRawRosterText(order.detailSizeNama, primaryLengan);
    if (parseRes.players && parseRes.players.length > 0) {
      players = parseRes.players;
    }
  }

  // If detailSizeNama was empty or unparseable, generate default rows matching order qty or items
  if (players.length === 0) {
    if (order.items && order.items.length > 0) {
      let counter = 1;
      order.items.forEach(it => {
        const itemQty = Math.max(1, Math.min(it.qty || 1, 100));
        for (let i = 0; i < itemQty; i++) {
          players.push({
            id: `p-${order.id}-${counter}`,
            no: counter,
            name: `${it.namaProduk} #${i + 1}`,
            size: 'L',
            number: String(counter).padStart(2, '0'),
            model: it.modelLengan || primaryLengan || 'PENDEK',
            notes: it.keterangan ? it.keterangan.slice(0, 15) : '-',
            qc: false
          });
          counter++;
        }
      });
    } else {
      const targetQty = order.qty > 0 ? Math.min(order.qty, 50) : 1;
      for (let i = 1; i <= targetQty; i++) {
        players.push({
          id: `p-${order.id}-${i}`,
          no: i,
          name: `Pemain ${i}`,
          size: 'L',
          number: String(i).padStart(2, '0'),
          model: primaryLengan || 'PENDEK',
          notes: '-',
          qc: false
        });
      }
    }
  }

  const collarImg = order.fotoKerahUrl || DEFAULT_COLLAR_SVG;
  const jerseyImgUrl = order.mockupUrl || DEFAULT_JERSEY_MOCKUP_SVG;

  return {
    id: `spk-ord-${order.id}`,
    spkNumber: defaultSpkNum,
    customer: order.namaPemesan || 'KONSUMEN',
    poName: order.namaPo || 'PO JERSEY',
    collarModel: primaryCollar,
    productModel: primaryModel,
    material: primaryBahan,
    sleeveModel: primaryLengan,
    sewingModel: primaryJahit,
    vendorJahit: order.vendorJahit || order.items?.[0]?.vendorJahit || '',
    mitraJahit: order.vendorJahit || order.items?.[0]?.vendorJahit || '',
    status: spkStatus,
    productionStatus: order.statusProduksi || 'Setting',
    productionDate: order.createdAt ? order.createdAt.substring(0, 10) : new Date().toISOString().substring(0, 10),
    deadline: order.deadline || new Date().toISOString().substring(0, 10),
    players: players,
    
    collarImage: collarImg,
    collarCaption: primaryCollar,
    collarZoom: 1,
    collarPosX: 0,
    collarPosY: 0,
    collarRotation: 0,
    
    jerseyImages: [
      {
        id: `img-${order.id}-1`,
        title: `Mockup ${order.namaPo || 'Jersey'}`,
        url: jerseyImgUrl,
        includedInSpk: true,
        zoom: 1,
        posX: 0,
        posY: 0,
        rotation: 0,
        opacity: 1,
        fitMode: 'contain'
      }
    ],
    
    notes: {
      mainNote: defaultMainNote,
      jahit: defaultJahitNote,
      bahan: defaultBahanNote,
      tangan: defaultTanganNote,
      kerah: defaultKerahNote,
      additionalNotes: `Pesanan ID: ${order.id} | Telp: ${order.noTelepon || '-'}`
    },
    
    companySettings: mergedCompany,
    
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
    
    createdAt: order.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Synchronizes SPKData edits back into the Pesanan record
 */
export function syncSpkToOrder(spk: SPKData, order: Pesanan): Pesanan {
  // Format players into readable text for detailSizeNama
  const playerLines = (spk.players || []).map((p, idx) => {
    const numStr = p.number && p.number !== '-' ? ` [No: ${p.number}]` : '';
    const modelStr = p.model && p.model !== 'PENDEK' ? ` (${p.model})` : '';
    const noteStr = p.notes && p.notes !== '-' ? ` - ${p.notes}` : '';
    return `${idx + 1}. ${p.name || 'Pemain'} - Size ${p.size || 'L'}${numStr}${modelStr}${noteStr}`;
  });
  const detailSizeNama = playerLines.join('\n');

  // If status is updated in SPK, map it back if appropriate
  let newStatusProduksi = order.statusProduksi;
  if ((spk as any).productionStatus) {
    newStatusProduksi = (spk as any).productionStatus;
  } else if (spk.status === 'SELESAI' && order.statusProduksi !== 'Beres') {
    newStatusProduksi = 'Beres';
  }

  const sleeveModel = spk.sleeveModel || spk.notes?.tangan || 'PENDEK';
  const sewingModel = spk.sewingModel || spk.notes?.jahit || 'BIASA';

  return {
    ...order,
    nomorSpk: spk.spkNumber || order.nomorSpk,
    namaPemesan: spk.customer || order.namaPemesan,
    namaPo: spk.poName || order.namaPo,
    deadline: spk.deadline || order.deadline,
    bahan: spk.material || order.bahan,
    namaProduk: spk.productModel || order.namaProduk,
    modelKerah: spk.collarModel || order.modelKerah,
    modelLengan: sleeveModel,
    modelJahit: sewingModel,
    spkStatus: spk.status || order.spkStatus,
    catatanJahit: spk.notes?.jahit || sewingModel || order.catatanJahit,
    vendorJahit: spk.vendorJahit || spk.mitraJahit || order.vendorJahit,
    items: order.items?.map(it => ({
      ...it,
      bahan: spk.material || it.bahan,
      modelKerah: spk.collarModel || it.modelKerah,
      modelLengan: sleeveModel,
      modelJahit: sewingModel,
      vendorJahit: it.vendorJahit || spk.vendorJahit || spk.mitraJahit || order.vendorJahit
    })),
    keterangan: spk.notes?.mainNote || order.keterangan,
    catatanKhususPenjahit: {
      mainNote: spk.notes?.mainNote || 'TUTUP KERAH POLOS, JAHIT BIASA',
      jahit: spk.notes?.jahit || sewingModel,
      bahan: spk.notes?.bahan || spk.material || 'WAFFLE',
      tangan: spk.notes?.tangan || sleeveModel,
      kerah: spk.notes?.kerah || spk.collarModel || 'O-Neck (Standar)',
      additionalNotes: spk.notes?.additionalNotes
    },
    detailSizeNama: detailSizeNama || order.detailSizeNama,
    statusProduksi: newStatusProduksi,
    fotoKerahUrl: (spk.collarImage && !spk.collarImage.startsWith('data:image/svg+xml')) 
      ? spk.collarImage 
      : order.fotoKerahUrl,
    mockupUrl: (spk.jerseyImages?.[0]?.url && !spk.jerseyImages[0].url.startsWith('data:image/svg+xml')) 
      ? spk.jerseyImages[0].url 
      : order.mockupUrl,
    spkData: spk
  };
}
