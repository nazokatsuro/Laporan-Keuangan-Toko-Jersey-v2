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

/**
 * Checks if a cash flow transaction belongs to a specific order (Pesanan).
 * Prioritizes explicit `orderId`, then checks for order ID markers in keterangan,
 * and falls back to clean namaPo matching ONLY if no other order shares the same namaPo.
 */
export function isTransactionForOrder(
  cf: CashFlowTransaction,
  order: Pesanan,
  allOrders?: Pesanan[]
): boolean {
  // 1. Explicit orderId field
  if (cf.orderId) {
    return cf.orderId === order.id;
  }

  const desc = (cf.keterangan || '').toLowerCase();
  const orderIdLower = order.id.toLowerCase();

  // 2. Explicit order ID embedded in description [ID:ORD-...] or (#ORD-...)
  if (
    desc.includes(`[id:${orderIdLower}]`) ||
    desc.includes(`[id: ${orderIdLower}]`) ||
    desc.includes(`(id:${orderIdLower})`) ||
    desc.includes(`(#${orderIdLower})`) ||
    desc.includes(orderIdLower)
  ) {
    return true;
  }

  // If another order ID is explicitly in description, do not match this order
  const idMatch = desc.match(/\bord-[a-z0-9]+/i);
  if (idMatch && idMatch[0].toLowerCase() !== orderIdLower) {
    return false;
  }

  // 3. Fallback for legacy records without orderId or ID marker in description:
  const cleanPoName = (order.namaPo || '').toLowerCase().trim();
  if (!cleanPoName || !desc.includes(cleanPoName)) {
    return false;
  }

  // If multiple orders share this exact namaPo, legacy transactions without ID
  // should only match the earliest created order to prevent newly created orders from inheriting old paid statuses!
  if (allOrders && allOrders.length > 0) {
    const ordersWithSamePo = allOrders.filter(
      o => (o.namaPo || '').toLowerCase().trim() === cleanPoName
    );
    if (ordersWithSamePo.length > 1) {
      const earliestOrder = [...ordersWithSamePo].sort((a, b) => 
        (a.createdAt || '').localeCompare(b.createdAt || '')
      )[0];
      return earliestOrder.id === order.id;
    }
  }

  return true;
}

/**
 * Accurately determines vendor debts and profit status for a given order
 */
export function checkOrderPaymentStatus(
  order: Pesanan,
  cashFlowList: CashFlowTransaction[] | undefined,
  allOrders?: Pesanan[]
) {
  const cfList = cashFlowList || [];

  const isSublimPaid = cfList.some(cf => {
    if (cf.jenis !== 'keluar') return false;
    const cat = (cf.kategori || '').toLowerCase();
    const desc = (cf.keterangan || '').toLowerCase();
    const isSublimTx = cat.includes('sublim') || desc.includes('sublim');
    return isSublimTx && isTransactionForOrder(cf, order, allOrders);
  });

  const isJahitPaid = cfList.some(cf => {
    if (cf.jenis !== 'keluar') return false;
    const cat = (cf.kategori || '').toLowerCase();
    const desc = (cf.keterangan || '').toLowerCase();
    const isJahitTx = cat.includes('jahit') || desc.includes('jahit');
    return isJahitTx && isTransactionForOrder(cf, order, allOrders);
  });

  const isKomisiPaid = cfList.some(cf => {
    if (cf.jenis !== 'keluar') return false;
    const cat = (cf.kategori || '').toLowerCase();
    const desc = (cf.keterangan || '').toLowerCase();
    const isKomisiTx = cat.includes('komisi') || desc.includes('komisi');
    return isKomisiTx && isTransactionForOrder(cf, order, allOrders);
  });

  const isProfitTaken = cfList.some(cf => {
    if (cf.jenis !== 'keluar') return false;
    const cat = (cf.kategori || '').toLowerCase();
    const desc = (cf.keterangan || '').toLowerCase();
    const isProfitTx = cat.includes('ambil keuntungan') || cat.includes('keuntungan') || desc.includes('ambil keuntungan');
    return isProfitTx && isTransactionForOrder(cf, order, allOrders);
  });

  return {
    isSublimPaid,
    isJahitPaid,
    isKomisiPaid,
    isProfitTaken
  };
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
  namaBankToko: 'BCA',
  nomorRekeningToko: '8105-9281-33',
  atasNamaRekeningToko: 'Nomaden Apparel',
  qrisImageUrl: '',
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

  const rect = element.getBoundingClientRect();
  const actualWidth = element.offsetWidth || rect.width || 760;
  const actualHeight = element.scrollHeight || element.offsetHeight || rect.height || 1000;

  // Create a clean options object for pixel-perfect screenshotting
  const captureOptions: any = {
    scale: 2.5, // Crisp HD rendering
    useCORS: true,
    allowTaint: true,
    backgroundColor: options.backgroundColor || '#ffffff',
    scrollX: 0,
    scrollY: 0,
    windowWidth: Math.max(document.documentElement.scrollWidth, window.innerWidth, actualWidth + 200),
    windowHeight: Math.max(document.documentElement.scrollHeight, window.innerHeight, actualHeight + 200),
    logging: false,
    ...options
  };

  const originalOnClone = captureOptions.onclone;
  
  captureOptions.onclone = (clonedDoc: Document) => {
    cleanOklchInDocument(clonedDoc);

    const isFinancialReport = element.id === 'financial-report-paper';

    if (isFinancialReport) {
      clonedDoc.documentElement.classList.add('dark');
      clonedDoc.body.classList.add('dark');
    } else {
      clonedDoc.documentElement.classList.remove('dark');
      clonedDoc.body.classList.remove('dark');
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
