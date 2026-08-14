/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pesanan, ShopSettings, CashFlowTransaction } from './types';
import html2canvas from 'html2canvas';

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function generateId(): string {
  return 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

export function calculateCashFlowAkhir(pesananList: Pesanan[], manualList: ShopSettings['cashFlowList']): number {
  let saldo = 0;
  
  // Automated DPs
  pesananList.forEach(po => {
    if (po.uangMasuk > 0) saldo += po.uangMasuk;
  });

  // Manual Transactions (ignoring legacy sample CF-001..CF-009)
  if (manualList) {
    manualList.forEach(tx => {
      if (!['CF-001', 'CF-002', 'CF-003', 'CF-004', 'CF-005', 'CF-006', 'CF-007', 'CF-008', 'CF-009'].includes(tx.id)) {
        if (tx.jenis === 'masuk') saldo += tx.nominal;
        else saldo -= tx.nominal;
      }
    });
  }

  return saldo;
}

export function checkHasPaidSublim(order: Pesanan, cashFlowList?: CashFlowTransaction[]): boolean {
  if (!cashFlowList || cashFlowList.length === 0 || !order.id) return false;
  const orderId = order.id.toLowerCase();

  return cashFlowList.some(cf => {
    if (cf.jenis !== 'keluar') return false;
    
    // 1. Direct ID match (most accurate)
    if (cf.relatedOrderId) {
      if (cf.relatedOrderId.toLowerCase() === orderId) {
        return cf.tipeBiaya === 'sublim' || 
               (cf.kategori || '').toLowerCase().includes('sublim') || 
               (cf.keterangan || '').toLowerCase().includes('sublim');
      }
      return false;
    }

    // 2. Legacy fallback: only match if description explicitly mentions this specific order's ID
    const desc = (cf.keterangan || '').toLowerCase();
    const cat = (cf.kategori || '').toLowerCase();
    const isSublimTx = cat.includes('sublim') || desc.includes('sublim');
    if (!isSublimTx) return false;

    return desc.includes(orderId);
  });
}

export function checkHasPaidJahit(order: Pesanan, cashFlowList?: CashFlowTransaction[]): boolean {
  if (!cashFlowList || cashFlowList.length === 0 || !order.id) return false;
  const orderId = order.id.toLowerCase();

  return cashFlowList.some(cf => {
    if (cf.jenis !== 'keluar') return false;

    // 1. Direct ID match (most accurate)
    if (cf.relatedOrderId) {
      if (cf.relatedOrderId.toLowerCase() === orderId) {
        return cf.tipeBiaya === 'jahit' || 
               (cf.kategori || '').toLowerCase().includes('jahit') || 
               (cf.keterangan || '').toLowerCase().includes('jahit');
      }
      return false;
    }

    // 2. Legacy fallback: only match if description explicitly mentions this specific order's ID
    const desc = (cf.keterangan || '').toLowerCase();
    const cat = (cf.kategori || '').toLowerCase();
    const isJahitTx = cat.includes('jahit') || desc.includes('jahit');
    if (!isJahitTx) return false;

    return desc.includes(orderId);
  });
}

export function checkHasPaidKomisi(order: Pesanan, cashFlowList?: CashFlowTransaction[]): boolean {
  if (!cashFlowList || cashFlowList.length === 0 || !order.id) return false;
  const orderId = order.id.toLowerCase();

  return cashFlowList.some(cf => {
    if (cf.jenis !== 'keluar') return false;

    // 1. Direct ID match (most accurate)
    if (cf.relatedOrderId) {
      if (cf.relatedOrderId.toLowerCase() === orderId) {
        return cf.tipeBiaya === 'komisi' || 
               (cf.kategori || '').toLowerCase().includes('komisi') || 
               (cf.keterangan || '').toLowerCase().includes('komisi');
      }
      return false;
    }

    // 2. Legacy fallback: only match if description explicitly mentions this specific order's ID
    const desc = (cf.keterangan || '').toLowerCase();
    const cat = (cf.kategori || '').toLowerCase();
    const isKomisiTx = cat.includes('komisi') || desc.includes('komisi');
    if (!isKomisiTx) return false;

    return desc.includes(orderId);
  });
}

export function checkHasTakenProfit(order: Pesanan, cashFlowList?: CashFlowTransaction[]): boolean {
  if (!cashFlowList || cashFlowList.length === 0 || !order.id) return false;
  const orderId = order.id.toLowerCase();

  return cashFlowList.some(cf => {
    if (cf.jenis !== 'keluar') return false;

    // 1. Direct ID match (most accurate)
    if (cf.relatedOrderId) {
      if (cf.relatedOrderId.toLowerCase() === orderId) {
        return cf.tipeBiaya === 'profit' || 
               (cf.kategori || '').toLowerCase().includes('keuntungan') || 
               (cf.keterangan || '').toLowerCase().includes('ambil keuntungan') ||
               (cf.keterangan || '').toLowerCase().includes('ambil untung');
      }
      return false;
    }

    // 2. Legacy fallback: only match if description explicitly mentions this specific order's ID
    const desc = (cf.keterangan || '').toLowerCase();
    const cat = (cf.kategori || '').toLowerCase();
    const isProfitTx = cat.includes('keuntungan') || desc.includes('ambil keuntungan') || desc.includes('ambil untung');
    if (!isProfitTx) return false;

    return desc.includes(orderId);
  });
}

const curYear = new Date().getFullYear();
const curMonth = String(new Date().getMonth() + 1).padStart(2, '0');

export const DEFAULT_SETTINGS: ShopSettings = {
  namaToko: 'Jersey Tech Indonesia',
  logoUrl: '', // Will default to a beautiful vector logo if blank
  darkMode: true,
  targetOmset: 20000000,
  targetProduksi: 500,
  danaDaruratTerkumpul: 12500000,
  danaDaruratTargetMonths: 3,
  customCollars: [],
  alamatToko: 'Komp.Taman Bunga Sukamukti,\nKec. Katapang, Kabupaten Bandung, Jawa Barat 40921',
  noWaToko: '+62 851-6666-4161',
  igToko: 'nomadenapparel',
  taglineToko: 'Official Apparel Studio',
  stempelTokoText: 'Nomaden',
  stempelTokoSubtext: 'Apparel',
  roleSignToko: 'Finance Administration',
  hormatKamiToko: 'Hormat Kami,',
  cashFlowList: []
};

export const DEFAULT_ORDERS: Pesanan[] = [
  {
    id: 'ORD-J001',
    createdAt: `${curYear}-${curMonth}-05T10:00:00.000Z`,
    deadline: `${curYear}-${curMonth}-29`,
    namaPemesan: 'Andi Wijaya',
    noTelepon: '081234567890',
    namaPo: 'FC Garuda Jaya',
    namaProduk: 'Jersey Home Premium',
    bahan: 'Dryfit Jarum',
    keterangan: 'Fullprint depan belakang, logo bordir timbul, lengan pendek.',
    qty: 24,
    hargaPerPcs: 120000,
    totalHarga: 2880000,
    uangMasuk: 1500000,
    sisaTagihan: 1380000,
    statusProduksi: 'Setting',
    printPerPcs: 35000,
    jahitPerPcs: 20000,
    biayaLainnya: 150000,
    totalModal: (24 * 35000) + (24 * 20000) + 150000, // 840000 + 480000 + 150000 = 1470000
    profit: 2880000 - 1470000 // 1410000
  },
  {
    id: 'ORD-J002',
    createdAt: `${curYear}-${curMonth}-10T14:30:00.000Z`,
    deadline: `${curYear}-${curMonth}-30`,
    namaPemesan: 'Siti Rahma',
    noTelepon: '085712345678',
    namaPo: 'Srikandi FC',
    namaProduk: 'Jersey Voli Ladies',
    bahan: 'Dryfit Milano',
    keterangan: 'Atasan fullprint, celana polos hitam pekat.',
    qty: 15,
    hargaPerPcs: 135000,
    totalHarga: 2025000,
    uangMasuk: 2025000,
    sisaTagihan: 0,
    statusProduksi: 'Jahit',
    printPerPcs: 35000,
    jahitPerPcs: 18000,
    biayaLainnya: 100000,
    totalModal: (15 * 35000) + (15 * 18000) + 100000, // 525000 + 270000 + 100000 = 895000
    profit: 2025000 - 895000 // 1130000
  },
  {
    id: 'ORD-J003',
    createdAt: `${curYear}-${curMonth}-01T08:00:00.000Z`,
    deadline: `${curYear}-${curMonth}-15`,
    namaPemesan: 'Hendra Saputra',
    noTelepon: '089987654321',
    namaPo: 'Esport Legend',
    namaProduk: 'Jaket Hoodie Gaming',
    bahan: 'Lotto Premium',
    keterangan: 'Hoodie resleting depan, kantong kangguru, tali hoodie hitam.',
    qty: 12,
    hargaPerPcs: 180000,
    totalHarga: 2160000,
    uangMasuk: 2160000,
    sisaTagihan: 0,
    statusProduksi: 'Beres',
    printPerPcs: 45000,
    jahitPerPcs: 30000,
    biayaLainnya: 180000,
    totalModal: (12 * 45000) + (12 * 30000) + 180000, // 540000 + 360000 + 180000 = 1080000
    profit: 2160000 - 1080000 // 1080000
  }
];

function parsePercentOrNum(val: string, maxVal: number = 1): number {
  if (!val) return 0;
  const cleaned = val.trim();
  if (cleaned.endsWith('%')) {
    return (parseFloat(cleaned) / 100) * maxVal;
  }
  return parseFloat(cleaned);
}

export function oklchToRgb(L: number, C: number, H: number, alpha?: number): string {
  L = Math.max(0, Math.min(1, L));
  C = Math.max(0, Math.min(0.4, C));
  H = ((H % 360) + 360) % 360;

  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855414 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.7076172321 * s;

  const f = (x: number) => {
    if (x <= 0.0031308) return 12.92 * x;
    return 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055;
  };

  const red = Math.min(255, Math.max(0, Math.round(f(rLinear) * 255)));
  const green = Math.min(255, Math.max(0, Math.round(f(gLinear) * 255)));
  const blue = Math.min(255, Math.max(0, Math.round(f(bLinear) * 255)));

  if (alpha !== undefined) {
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  return `rgb(${red}, ${green}, ${blue})`;
}

export function oklabToRgb(L: number, a: number, b: number, alpha?: number): string {
  L = Math.max(0, Math.min(1, L));
  a = Math.max(-0.4, Math.min(0.4, a));
  b = Math.max(-0.4, Math.min(0.4, b));

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855414 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.7076172321 * s;

  const f = (x: number) => {
    if (x <= 0.0031308) return 12.92 * x;
    return 1.055 * Math.pow(Math.max(0, x), 1 / 2.4) - 0.055;
  };

  const red = Math.min(255, Math.max(0, Math.round(f(rLinear) * 255)));
  const green = Math.min(255, Math.max(0, Math.round(f(gLinear) * 255)));
  const blue = Math.min(255, Math.max(0, Math.round(f(bLinear) * 255)));

  if (alpha !== undefined) {
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  return `rgb(${red}, ${green}, ${blue})`;
}

export function replaceOklchAndOklab(cssText: string): string {
  if (!cssText) return '';
  
  let cleaned = cssText.replace(
    /oklch\(\s*([0-9.]+%?)[,\s]+([0-9.]+%?)[,\s]+([0-9.]+%?)(?:\s*[\/\,]\s*([0-9.]+%?))?\s*\)/gi,
    (match, lStr, cStr, hStr, aStr) => {
      try {
        const L = parsePercentOrNum(lStr, 1);
        const C = parsePercentOrNum(cStr, 1);
        const H = parsePercentOrNum(hStr, 360);
        const alpha = aStr ? parsePercentOrNum(aStr, 1) : undefined;
        return oklchToRgb(L, C, H, alpha);
      } catch (err) {
        return 'rgb(0, 0, 0)';
      }
    }
  );

  cleaned = cleaned.replace(
    /oklab\(\s*([0-9.]+%?)[,\s]+([+-]?[0-9.]+%?)[,\s]+([+-]?[0-9.]+%?)(?:\s*[\/\,]\s*([0-9.]+%?))?\s*\)/gi,
    (match, lStr, aStr, bStr, alphaStr) => {
      try {
        const L = parsePercentOrNum(lStr, 1);
        const aVal = parsePercentOrNum(aStr, 1);
        const bVal = parsePercentOrNum(bStr, 1);
        const alpha = alphaStr ? parsePercentOrNum(alphaStr, 1) : undefined;
        return oklabToRgb(L, aVal, bVal, alpha);
      } catch (err) {
        return 'rgb(0, 0, 0)';
      }
    }
  );

  return cleaned;
}

export function cleanOklchInDocument(clonedDoc: Document): void {
  // 1. Process all <style> elements
  try {
    const styleTags = clonedDoc.getElementsByTagName('style');
    for (let i = 0; i < styleTags.length; i++) {
      const style = styleTags[i];
      if (style.textContent) {
        style.textContent = replaceOklchAndOklab(style.textContent);
      }
    }
  } catch (err) {
    console.error('Failed to clean style tags:', err);
  }

  // 2. Process recursively all inline element styles in body
  try {
    const allElements = clonedDoc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
      const el = allElements[i] as HTMLElement;
      if (el && el.style && el.style.cssText) {
        el.style.cssText = replaceOklchAndOklab(el.style.cssText);
      }
    }
  } catch (err) {
    console.error('Failed to clean element inline styles:', err);
  }
}

export function patchGetComputedStyle(win: any): () => void {
  const originalGetComputedStyle = win.getComputedStyle;
  if (!originalGetComputedStyle) return () => {};

  const patchedGetComputedStyle = function(elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    let style: CSSStyleDeclaration;
    try {
      style = originalGetComputedStyle.call(win, elt, pseudoElt);
    } catch (err) {
      try {
        style = originalGetComputedStyle(elt, pseudoElt);
      } catch (err2) {
        // Fallback to standard window getComputedStyle
        style = window.getComputedStyle(elt, pseudoElt);
      }
    }

    return new Proxy(style, {
      get(target, prop) {
        // Do not pass receiver (third argument) to Reflect.get.
        // Doing so propagates the Proxy as 'this' to native getters, causing "Illegal invocation".
        const value = Reflect.get(target, prop);
        
        if (typeof prop === 'string' && typeof value === 'string') {
          if (value.includes('oklch') || value.includes('oklab')) {
            return replaceOklchAndOklab(value);
          }
        }
        
        if (typeof value === 'function') {
          if (prop === 'getPropertyValue') {
            return function(propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                return replaceOklchAndOklab(val);
              }
              return val;
            };
          }
          return value.bind(target);
        }
        
        return value;
      }
    }) as any;
  };

  win.getComputedStyle = patchedGetComputedStyle;

  return () => {
    win.getComputedStyle = originalGetComputedStyle;
  };
}

export async function safeHtml2canvas(element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement> {
  const restoreMain = patchGetComputedStyle(window);
  
  // Clean oklch in the main document's styles right now to avoid stylesheet read failures
  cleanOklchInDocument(document);

  const isInvoice = element.id && (element.id === 'invoice-paper' || element.id.startsWith('invoice-paper'));
  const isFinancialReport = element.id === 'financial-report-paper';
  
  // Create a clean options object
  const captureOptions: any = {
    scale: 3, // HD scaling
    useCORS: true,
    allowTaint: true,
    backgroundColor: options.backgroundColor || '#ffffff',
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
    ...options
  };

  if (isInvoice) {
    // Force desktop-like window rendering inside html2canvas virtual viewport
    captureOptions.windowWidth = 750;
    captureOptions.width = 680;
    captureOptions.height = element.scrollHeight + 60; // 60px safety buffer to prevent bottom truncating
    captureOptions.windowHeight = element.scrollHeight + 260;
  } else if (isFinancialReport) {
    // For financial report, force exact desktop dimension rendering
    captureOptions.windowWidth = 1250;
    captureOptions.width = 1200;
    captureOptions.height = element.scrollHeight;
    captureOptions.windowHeight = element.scrollHeight + 200;
  } else {
    // Large view for financial report charts
    captureOptions.windowWidth = 1200;
    captureOptions.height = element.scrollHeight;
    captureOptions.windowHeight = element.scrollHeight + 200;
  }

  const originalOnClone = captureOptions.onclone;
  
  captureOptions.onclone = (clonedDoc: Document) => {
    cleanOklchInDocument(clonedDoc);

    const clonedEl = clonedDoc.getElementById(element.id || 'invoice-paper') as HTMLElement;
    if (clonedEl) {
      clonedEl.style.contentVisibility = 'visible';
      clonedEl.style.display = 'block';
      clonedEl.style.transform = 'none';
      
      if (isInvoice || clonedEl.id === 'invoice-paper') {
        // Ensure light-theme context inside the cloned canvas
        clonedDoc.documentElement.classList.remove('dark');
        clonedDoc.body.classList.remove('dark');

        // Absolute control on width and layout inside the cloned document
        clonedEl.style.width = '680px';
        clonedEl.style.minWidth = '680px';
        clonedEl.style.maxWidth = '680px';
        clonedEl.style.boxShadow = 'none';
        clonedEl.style.margin = '0';
        clonedEl.style.position = 'absolute';
        clonedEl.style.top = '0';
        clonedEl.style.left = '0';

        const parent = clonedEl.parentElement;
        if (parent) {
          parent.style.position = 'relative';
          parent.style.width = '700px';
          parent.style.height = `${clonedEl.scrollHeight + 80}px`;
          parent.style.overflow = 'visible';
        }
      } else if (isFinancialReport || clonedEl.id === 'financial-report-paper') {
        // Force Gorgeous Dark Mode inside the cloned document context to ensure 
        // consistent high-contrast colors match the user's visual reference perfectly
        clonedDoc.documentElement.classList.add('dark');
        clonedDoc.body.classList.add('dark');

        // Absolute control on width and layout inside the cloned document to prevent viewport styling responsive conflicts
        clonedEl.style.width = '1200px';
        clonedEl.style.minWidth = '1200px';
        clonedEl.style.maxWidth = '1200px';
        clonedEl.style.boxShadow = 'none';
        clonedEl.style.margin = '0';
        clonedEl.style.position = 'absolute';
        clonedEl.style.top = '0';
        clonedEl.style.left = '0';

        const parent = clonedEl.parentElement;
        if (parent) {
          parent.style.position = 'relative';
          parent.style.width = '1220px';
          parent.style.height = `${clonedEl.scrollHeight + 20}px`;
          parent.style.overflow = 'visible';
        }
      }
    }

    if (clonedDoc.defaultView) {
      patchGetComputedStyle(clonedDoc.defaultView);
    }
    
    if (originalOnClone) {
      originalOnClone(clonedDoc);
    }
  };

  try {
    const canvas = await html2canvas(element, captureOptions);
    return canvas;
  } finally {
    restoreMain();
  }
}

/**
 * Reads an image file as a Data URL retaining 100% losslessly uncompressed HD quality.
 */
export function compressImage(
  file: File, 
  maxWidth: number = 3840, 
  maxHeight: number = 3840, 
  quality: number = 0.98
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Gagal membaca berkas gambar"));
      }
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}
