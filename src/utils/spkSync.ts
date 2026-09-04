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

  // If order already has cached SPK data, reuse and freshen header info
  if (order.spkData) {
    return {
      ...order.spkData,
      id: order.spkData.id || `spk-ord-${order.id}`,
      customer: order.spkData.customer || order.namaPemesan || 'KONSUMEN',
      poName: order.spkData.poName || order.namaPo || 'PO JERSEY',
      deadline: order.spkData.deadline || order.deadline,
      material: order.spkData.material || order.items?.[0]?.bahan || order.bahan || 'WAFFLE',
      collarModel: order.spkData.collarModel || order.items?.[0]?.modelKerah || order.modelKerah || 'O-Neck (Standar)',
      collarCaption: order.spkData.collarCaption || order.spkData.collarModel || order.items?.[0]?.modelKerah || order.modelKerah || 'O-Neck (Standar)',
      collarImage: order.spkData.collarImage || order.fotoKerahUrl || DEFAULT_COLLAR_SVG,
      vendorJahit: order.spkData.vendorJahit || order.vendorJahit || order.items?.[0]?.vendorJahit || '',
      companySettings: mergedCompany,
      updatedAt: order.spkData.updatedAt || new Date().toISOString()
    };
  }

  // Derive unique SPK Number e.g. SPK-2026-A1B2
  const year = order.createdAt ? order.createdAt.substring(0, 4) : String(new Date().getFullYear());
  const idClean = (order.id || '').replace(/[^a-zA-Z0-9]/g, '');
  const idShort = idClean.slice(-4).toUpperCase() || '001';
  const spkNum = `SPK-${year}-${idShort}`;

  // Parse player roster from detailSizeNama
  let players: SPKPlayer[] = [];
  if (order.detailSizeNama && order.detailSizeNama.trim()) {
    const parseRes = parseRawRosterText(order.detailSizeNama);
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
            name: `${it.namaProduk.toUpperCase()} #${i + 1}`,
            size: 'L',
            number: String(counter).padStart(2, '0'),
            model: 'PENDEK',
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
          name: `PEMAIN ${i}`,
          size: 'L',
          number: String(i).padStart(2, '0'),
          model: 'PENDEK',
          notes: '-',
          qc: false
        });
      }
    }
  }

  const primaryCollar = order.items?.[0]?.modelKerah || order.modelKerah || 'O-Neck (Standar)';
  const primaryBahan = order.items?.[0]?.bahan || order.bahan || 'WAFFLE';
  const primaryModel = order.items?.[0]?.namaProduk || order.namaProduk || 'SETELAN';

  // Map status
  let spkStatus: SPKStatus = 'NORMAL';
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

  const collarImg = order.fotoKerahUrl || DEFAULT_COLLAR_SVG;
  const jerseyImgUrl = order.mockupUrl || DEFAULT_JERSEY_MOCKUP_SVG;

  return {
    id: `spk-ord-${order.id}`,
    spkNumber: spkNum,
    customer: order.namaPemesan || 'KONSUMEN',
    poName: order.namaPo || 'PO JERSEY',
    collarModel: primaryCollar,
    productModel: primaryModel,
    material: primaryBahan,
    sleeveModel: 'PENDEK',
    sewingModel: 'FULL STIK',
    vendorJahit: order.vendorJahit || order.items?.[0]?.vendorJahit || '',
    mitraJahit: order.vendorJahit || order.items?.[0]?.vendorJahit || '',
    status: spkStatus,
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
        title: `Mockup ${order.namaPo}`,
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
      mainNote: order.keterangan || 'TUTUP KERAH POLOS, FULL STIK',
      jahit: order.catatanJahit || 'FULL STIK',
      bahan: primaryBahan,
      tangan: 'PENDEK',
      kerah: primaryCollar,
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

  return {
    ...order,
    namaPemesan: spk.customer || order.namaPemesan,
    namaPo: spk.poName || order.namaPo,
    deadline: spk.deadline || order.deadline,
    bahan: spk.material || order.bahan,
    modelKerah: spk.collarModel || order.modelKerah,
    catatanJahit: spk.notes?.jahit || order.catatanJahit,
    vendorJahit: spk.vendorJahit || spk.mitraJahit || order.vendorJahit,
    items: order.items?.map(it => ({
      ...it,
      vendorJahit: it.vendorJahit || spk.vendorJahit || spk.mitraJahit || order.vendorJahit
    })),
    keterangan: spk.notes?.mainNote || order.keterangan,
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
