/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SPKPlayer, SizeRecapRow } from '../spkTypes';

export interface ParseResult {
  players: SPKPlayer[];
  warnings: string[];
  errors: string[];
  totalRows: number;
}

/**
 * Normalizes size string to canonical format (e.g. "2XL", "3XL", "L", "M")
 */
export function normalizeSize(rawSize: string): string {
  if (!rawSize) return 'L';
  const clean = rawSize.trim().toUpperCase().replace(/\s+/g, '');
  
  if (clean === 'XXL' || clean === '2XL' || clean === '2-XL' || clean === 'XX-L') return '2XL';
  if (clean === 'XXXL' || clean === '3XL' || clean === '3-XL') return '3XL';
  if (clean === 'XXXXL' || clean === '4XL' || clean === '4-XL') return '4XL';
  if (clean === 'XXXXXL' || clean === '5XL' || clean === '5-XL') return '5XL';
  if (clean === 'XS' || clean === 'EXTRA-SMALL') return 'XS';
  if (clean === 'S' || clean === 'SMALL') return 'S';
  if (clean === 'M' || clean === 'MEDIUM') return 'M';
  if (clean === 'L' || clean === 'LARGE') return 'L';
  if (clean === 'XL' || clean === 'EXTRA-LARGE') return 'XL';
  if (clean === 'ALLSIZE' || clean === 'ALL-SIZE') return 'ALL SIZE';
  
  return clean;
}

/**
 * Normalizes sleeve/model (PENDEK or LENGAN PANJANG)
 */
export function normalizeModel(rawModel: string, defaultModel = 'PENDEK'): string {
  if (!rawModel) return defaultModel;
  const lower = rawModel.toLowerCase().trim();
  
  if (lower.includes('panjang') || lower.includes('pjg') || lower === 'ls' || lower.includes('long') || lower.includes('sleeve')) {
    return 'LENGAN PANJANG';
  }
  if (lower.includes('buntong') || lower.includes('singlet') || lower.includes('sleeveless')) {
    return 'BUNTONG';
  }
  return 'PENDEK';
}

/**
 * Detects role/notes (KIPER, KAPTEN, etc.)
 */
export function normalizeNotes(rawNotes: string): string {
  if (!rawNotes) return '-';
  const clean = rawNotes.trim().toUpperCase();
  if (clean.includes('KIPER') || clean.includes('GK') || clean.includes('KEEPER') || clean.includes('GOALKEEPER')) {
    return 'KIPER';
  }
  if (clean.includes('KAPTEN') || clean === 'C' || clean.includes('CAPTAIN')) {
    return 'KAPTEN';
  }
  return clean || '-';
}

/**
 * Standard known jersey sizes for priority sorting & regex matching
 */
export const KNOWN_SIZES = [
  '5XL', '4XL', '3XL', '2XL', 'XXXL', 'XXL', 'XL', 'XS', 'S', 'M', 'L', 'ALL SIZE'
];

/**
 * Smart Line Parser for flexible raw lines
 * Handles:
 * "1. Gazer - L - 81"
 * "GAZER L 81"
 * "erick / l / 24"
 * "Rifky XL 47 kiper"
 * "PUTRA L 27 LENGAN PANJANG"
 * "LATUPONO, L, 22"
 * "W. LADJUPA L 17"
 * "M - 10 - RIZKY (Kapten)"
 * "2XL - 99 - HENDRA kiper panjang"
 */
export function parseRosterLine(rawLine: string, lineIndex: number, defaultModel = 'PENDEK'): SPKPlayer | null {
  let line = rawLine.trim();
  if (!line || line.startsWith('#') || line.startsWith('//')) return null;

  // 1. Strip leading numbering like "1. ", "1)", "[1]", "1 - "
  line = line.replace(/^\d+[\.\)\:\-\s]+/, '').trim();

  // 2. Clean out redundant separator keywords: "no. 25", "no 25", "nomor 25", "num 25", "#25" -> "25"
  line = line.replace(/\b(no\.|no|nomor|number|num|#)\s*(\d+)\b/gi, '$2');

  let model = defaultModel;
  let notes = '-';

  // 3. Extract model keywords
  if (/\b(lengan panjang|panjang|pjg|ls|long sleeve|tangan panjang)\b/i.test(line)) {
    model = 'LENGAN PANJANG';
    line = line.replace(/\b(lengan panjang|panjang|pjg|ls|long sleeve|tangan panjang)\b/gi, ' ').trim();
  } else if (/\b(buntong|singlet|sleeveless|kutung)\b/i.test(line)) {
    model = 'BUNTONG';
    line = line.replace(/\b(buntong|singlet|sleeveless|kutung)\b/gi, ' ').trim();
  } else if (/\b(pendek|short sleeve)\b/i.test(line)) {
    model = 'PENDEK';
    line = line.replace(/\b(pendek|short sleeve)\b/gi, ' ').trim();
  }

  // 4. Extract role/notes keywords
  if (/\b(kiper|gk|keeper|goalkeeper|penjaga gawang)\b/i.test(line)) {
    notes = 'KIPER';
    line = line.replace(/\b(kiper|gk|keeper|goalkeeper|penjaga gawang)\b/gi, ' ').trim();
  } else if (/\b(kapten|captain|\(c\))\b/i.test(line)) {
    notes = 'KAPTEN';
    line = line.replace(/\b(kapten|captain|\(c\))\b/gi, ' ').trim();
  }

  // Extract bracketed notes like "(CELANA L)" or "(SIZE KHUSUS)" if remaining
  const bracketMatch = line.match(/\(([^)]+)\)/);
  if (bracketMatch) {
    const bracketContent = bracketMatch[1].trim();
    if (notes === '-') {
      notes = bracketContent.toUpperCase();
    }
    line = line.replace(/\([^)]+\)/g, ' ').trim();
  }

  // 5. Look for standardized size in the line
  const sizeMatch = line.match(/\b(5XL|4XL|3XL|2XL|XXXL|XXL|XL|XS|S|M|L|ALL\s*SIZE)\b/i);
  let foundSize = '';
  if (sizeMatch) {
    foundSize = normalizeSize(sizeMatch[1]);
    line = line.replace(new RegExp(`\\b${sizeMatch[1]}\\b`, 'i'), ' ').trim();
  }

  // 6. Look for number (NOP)
  const numMatch = line.match(/\b(\d{1,3})\b/);
  let foundNum = '';
  if (numMatch) {
    foundNum = numMatch[1];
    line = line.replace(new RegExp(`\\b${numMatch[1]}\\b`, 'g'), ' ').trim();
  }

  // 7. Clean up the remaining text for Name
  let name = line
    .replace(/[\(\)\[\]\{\}\/\,\-\:\.\_\+\*\=\|\;\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // If no size was matched by regex, check single letter tokens
  if (!foundSize) {
    const parts = name.split(/\s+/);
    const sizePartIdx = parts.findIndex(p => KNOWN_SIZES.includes(p));
    if (sizePartIdx !== -1) {
      foundSize = normalizeSize(parts[sizePartIdx]);
      parts.splice(sizePartIdx, 1);
      name = parts.join(' ').trim();
    }
  }

  // Final sanity check
  if (!name && !foundNum) return null;

  return {
    id: `player-${Date.now()}-${lineIndex}-${Math.random().toString(36).substring(2, 6)}`,
    no: lineIndex + 1,
    name: name || `PEMAIN ${lineIndex + 1}`,
    size: foundSize || 'L',
    number: foundNum || '-',
    model: model || defaultModel,
    notes: notes || '-',
    qc: false
  };
}

/**
 * Parses block of text with smart multi-format detection
 */
export function parseRawRosterText(rawText: string, defaultModel = 'PENDEK'): ParseResult {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const players: SPKPlayer[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check if user pasted column format:
  // "Nama:\nGazer\nOckhy\n\nUkuran:\nL\nL\n\nNomor:\n81\n25"
  if (rawText.toLowerCase().includes('nama:') && (rawText.toLowerCase().includes('ukuran:') || rawText.toLowerCase().includes('size:'))) {
    return parseColumnFormat(rawText, defaultModel);
  }

  lines.forEach((line, idx) => {
    try {
      const player = parseRosterLine(line, players.length, defaultModel);
      if (player) {
        players.push(player);
      }
    } catch (e: any) {
      errors.push(`Baris ${idx + 1}: Gagal membaca data ("${line}")`);
    }
  });

  // Re-index row numbers
  players.forEach((p, idx) => {
    p.no = idx + 1;
  });

  // Validation Warnings:
  // 1. Check duplicate numbers
  const numberCount = new Map<string, string[]>();
  players.forEach(p => {
    if (p.number && p.number !== '-') {
      const current = numberCount.get(p.number) || [];
      current.push(p.name);
      numberCount.set(p.number, current);
    }
  });

  numberCount.forEach((names, num) => {
    if (names.length > 1) {
      warnings.push(`Nomor punggung ${num} digunakan oleh ${names.length} pemain (${names.join(', ')}).`);
    }
  });

  // 2. Check empty name or missing number
  players.forEach((p, idx) => {
    if (!p.name || p.name.trim() === '') {
      warnings.push(`Baris ${idx + 1}: Nama pemain masih kosong.`);
    }
    if (!p.number || p.number === '-') {
      warnings.push(`Pemain ${p.name || `#${idx + 1}`} belum memiliki nomor punggung.`);
    }
  });

  return {
    players,
    warnings,
    errors,
    totalRows: players.length
  };
}

/**
 * Handles Column-Wise Raw Paste:
 * Nama:
 * GAZER
 * OCKHY
 * 
 * Ukuran:
 * L
 * L
 * 
 * Nomor:
 * 81
 * 25
 */
function parseColumnFormat(rawText: string, defaultModel: string): ParseResult {
  const sections = rawText.split(/(?=Nama:|Ukuran:|Size:|Nomor:|No:|Nop:|Model:|Keterangan:)/i);
  
  const names: string[] = [];
  const sizes: string[] = [];
  const numbers: string[] = [];
  const models: string[] = [];
  const notesList: string[] = [];

  sections.forEach(sec => {
    const trimmed = sec.trim();
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    
    const header = lines[0].toLowerCase();
    const items = lines.slice(1);

    if (header.includes('nama')) {
      items.forEach(i => names.push(i.toUpperCase()));
    } else if (header.includes('ukuran') || header.includes('size')) {
      items.forEach(i => sizes.push(normalizeSize(i)));
    } else if (header.includes('nomor') || header.includes('no') || header.includes('nop')) {
      items.forEach(i => numbers.push(i));
    } else if (header.includes('model')) {
      items.forEach(i => models.push(normalizeModel(i, defaultModel)));
    } else if (header.includes('keterangan')) {
      items.forEach(i => notesList.push(normalizeNotes(i)));
    }
  });

  const maxRows = Math.max(names.length, sizes.length, numbers.length);
  const players: SPKPlayer[] = [];

  for (let i = 0; i < maxRows; i++) {
    players.push({
      id: `player-col-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      no: i + 1,
      name: names[i] || `PEMAIN ${i + 1}`,
      size: sizes[i] || 'L',
      number: numbers[i] || '-',
      model: models[i] || defaultModel,
      notes: notesList[i] || '-',
      qc: false
    });
  }

  return {
    players,
    warnings: [],
    errors: [],
    totalRows: players.length
  };
}

/**
 * Calculates Automatic Size Recap Matrix
 * SIZE | PENDEK | PJG | TTL
 */
export function calculateSizeRecap(players: SPKPlayer[]): { rows: SizeRecapRow[]; totalPendek: number; totalPjg: number; grandTotal: number } {
  // Ordered standard sizes
  const standardSizes = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
  
  // Also collect any non-standard custom sizes present in player list (e.g. XS, 5XL, All Size)
  const presentSizes = new Set<string>();
  players.forEach(p => {
    if (p.size) presentSizes.add(p.size);
  });

  const allSizeKeys: string[] = [...standardSizes];
  presentSizes.forEach(s => {
    if (!allSizeKeys.includes(s)) {
      allSizeKeys.push(s);
    }
  });

  let totalPendek = 0;
  let totalPjg = 0;

  const rows: SizeRecapRow[] = allSizeKeys.map(size => {
    const matchingPlayers = players.filter(p => p.size === size);
    
    let pendekCount = 0;
    let pjgCount = 0;

    matchingPlayers.forEach(p => {
      const mod = (p.model || '').toUpperCase();
      if (mod.includes('PANJANG') || mod.includes('PJG') || mod === 'LS') {
        pjgCount++;
      } else {
        pendekCount++;
      }
    });

    totalPendek += pendekCount;
    totalPjg += pjgCount;

    return {
      size,
      pendek: pendekCount,
      pjg: pjgCount,
      total: pendekCount + pjgCount
    };
  });

  return {
    rows,
    totalPendek,
    totalPjg,
    grandTotal: totalPendek + totalPjg
  };
}

/**
 * Validates SPK Data before export/print
 */
export function validateSpkData(spk: {
  customer: string;
  spkNumber: string;
  poName: string;
  deadline: string;
  players: SPKPlayer[];
  jerseyImages: any[];
}) {
  const issues: { type: 'error' | 'warning'; message: string; field?: string }[] = [];

  if (!spk.customer || spk.customer.trim() === '') {
    issues.push({ type: 'warning', message: 'Nama Konsumen belum diisi.', field: 'customer' });
  }
  if (!spk.spkNumber || spk.spkNumber.trim() === '') {
    issues.push({ type: 'error', message: 'Nomor SPK wajib diisi.', field: 'spkNumber' });
  }
  if (!spk.poName || spk.poName.trim() === '') {
    issues.push({ type: 'warning', message: 'Nama PO belum diisi.', field: 'poName' });
  }
  if (!spk.deadline || spk.deadline.trim() === '') {
    issues.push({ type: 'warning', message: 'Tanggal kirim / deadline belum ditentukan.', field: 'deadline' });
  }
  if (!spk.players || spk.players.length === 0) {
    issues.push({ type: 'error', message: 'Daftar pemain/roster masih kosong (0 pemain).', field: 'players' });
  } else {
    // Check duplicates and missing fields
    const numMap = new Map<string, string[]>();
    spk.players.forEach((p, idx) => {
      if (!p.name || p.name.trim() === '') {
        issues.push({ type: 'error', message: `Baris ${idx + 1}: Nama pemain kosong.` });
      }
      if (!p.size || p.size.trim() === '') {
        issues.push({ type: 'error', message: `Pemain "${p.name || `#${idx + 1}`}" belum memiliki ukuran.` });
      }
      if (p.number && p.number !== '-') {
        const list = numMap.get(p.number) || [];
        list.push(p.name || `#${idx + 1}`);
        numMap.set(p.number, list);
      }
    });

    numMap.forEach((names, num) => {
      if (names.length > 1) {
        issues.push({
          type: 'warning',
          message: `Nomor punggung ${num} digunakan oleh ${names.length} pemain (${names.join(', ')}).`
        });
      }
    });
  }

  const hasIncludedImage = spk.jerseyImages && spk.jerseyImages.some(img => img.includedInSpk);
  if (!hasIncludedImage) {
    issues.push({ type: 'warning', message: 'Belum ada gambar desain jersey yang diaktifkan untuk dicetak.' });
  }

  return {
    isValid: issues.filter(i => i.type === 'error').length === 0,
    hasWarnings: issues.filter(i => i.type === 'warning').length > 0,
    issues
  };
}

/**
 * Extracts order specifications / header from raw text (WA chat, notes, etc.)
 */
export function extractHeaderSpecsFromText(rawText: string): {
  customer?: string;
  poName?: string;
  collarModel?: string;
  material?: string;
  productModel?: string;
  sleeveModel?: string;
  sewingModel?: string;
  deadline?: string;
  notes?: string;
} {
  const result: any = {};
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Customer
    if (lower.startsWith('konsumen:') || lower.startsWith('pemesan:') || lower.startsWith('nama konsumen:') || lower.startsWith('customer:')) {
      const val = line.split(':')[1]?.trim();
      if (val) result.customer = val.toUpperCase();
    }
    // PO / Team Name
    else if (lower.startsWith('po:') || lower.startsWith('nama po:') || lower.startsWith('po name:') || lower.startsWith('tim:') || lower.startsWith('nama tim:')) {
      const val = line.split(':')[1]?.trim();
      if (val) result.poName = val.toUpperCase();
    }
    // Collar Model
    else if (lower.startsWith('kerah:') || lower.startsWith('model kerah:') || lower.startsWith('collar:')) {
      const val = line.split(':')[1]?.trim();
      if (val) result.collarModel = val.toUpperCase();
    }
    // Material
    else if (lower.startsWith('bahan:') || lower.startsWith('kain:') || lower.startsWith('material:')) {
      const val = line.split(':')[1]?.trim();
      if (val) result.material = val.toUpperCase();
    }
    // Product Model
    else if (lower.startsWith('produk:') || lower.startsWith('model:') || lower.startsWith('jenis:')) {
      const val = line.split(':')[1]?.trim();
      if (val) result.productModel = val.toUpperCase();
    }
    // Sewing Model
    else if (lower.startsWith('jahit:') || lower.startsWith('model jahit:') || lower.startsWith('jahitan:') || lower.startsWith('stik:')) {
      const val = line.split(':')[1]?.trim();
      if (val) result.sewingModel = val.toUpperCase();
    }
    // Deadline
    else if (lower.startsWith('deadline:') || lower.startsWith('kirim:') || lower.startsWith('tgl kirim:') || lower.startsWith('tanggal kirim:')) {
      const val = line.split(':')[1]?.trim();
      if (val) {
        const dateMatch = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dateMatch) {
          const day = dateMatch[1].padStart(2, '0');
          const month = dateMatch[2].padStart(2, '0');
          const year = dateMatch[3];
          result.deadline = `${year}-${month}-${day}`;
        } else {
          result.deadline = val;
        }
      }
    }
    // Main Notes / Catatan
    else if (lower.startsWith('catatan:') || lower.startsWith('notes:') || lower.startsWith('nb:') || lower.startsWith('ket:')) {
      const val = line.split(':')[1]?.trim();
      if (val) result.notes = val;
    }
  }

  return result;
}

/**
 * Sorts an array of players according to the specified sort criteria
 */
export function sortPlayersList(players: SPKPlayer[], sortMode: string): SPKPlayer[] {
  const sizeOrder: { [key: string]: number } = {
    'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, '2XL': 6, 'XXL': 6, '3XL': 7, 'XXXL': 7, '4XL': 8, '5XL': 9, 'ALL SIZE': 10
  };

  const copy = [...players];

  copy.sort((a, b) => {
    if (sortMode === 'size_asc') {
      const orderA = sizeOrder[a.size] || 99;
      const orderB = sizeOrder[b.size] || 99;
      if (orderA !== orderB) return orderA - orderB;
      const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 999;
      const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 999;
      return numA - numB;
    }
    if (sortMode === 'number_asc') {
      const numA = parseInt(a.number.replace(/\D/g, ''), 10) || 999;
      const numB = parseInt(b.number.replace(/\D/g, ''), 10) || 999;
      return numA - numB;
    }
    if (sortMode === 'name_asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortMode === 'role_kiper_first') {
      const isKiperA = a.notes?.includes('KIPER') ? 0 : 1;
      const isKiperB = b.notes?.includes('KIPER') ? 0 : 1;
      if (isKiperA !== isKiperB) return isKiperA - isKiperB;
      const orderA = sizeOrder[a.size] || 99;
      const orderB = sizeOrder[b.size] || 99;
      return orderA - orderB;
    }
    return 0;
  });

  return copy.map((p, idx) => ({ ...p, no: idx + 1 }));
}

