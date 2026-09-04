/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { toPng, toJpeg, toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { SPKData } from '../spkTypes';
import { calculateSizeRecap } from './spkParser';

export function getExportFileName(spk: SPKData, ext: 'pdf' | 'jpg' | 'png'): string {
  const spkClean = (spk.spkNumber || 'SPK').replace(/[^a-zA-Z0-9-_]/g, '_');
  const poClean = (spk.poName || 'PO').replace(/[^a-zA-Z0-9-_]/g, '_');
  const customerClean = (spk.customer || 'KONSUMEN').replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${spkClean}_${poClean}_${customerClean}.${ext}`;
}

/**
 * Trigger native browser print for the active SPK
 */
export function printSpkDocument() {
  window.print();
}

/**
 * Helper to download any Data URL safely in browser
 */
function triggerBrowserDownload(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 300);
}

/**
 * Fallback: Vector / Text PDF Generator using jsPDF if HTML conversion encounters issues
 */
export function generateDirectVectorPdf(spk: SPKData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = spk.companySettings?.primaryColor || '#00805F';
  const darkColor = spk.companySettings?.darkColor || '#006B50';
  const recap = calculateSizeRecap(spk.players || []);

  // Header Banner
  doc.setFillColor(primaryColor);
  doc.rect(10, 10, 190, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(spk.companySettings?.name || 'NOMADEN APPAREL', 15, 19);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('SURAT PERINTAH KERJA PRODUKSI JERSEY (SPK)', 15, 24);

  // Status & Date on top right
  doc.setFont('helvetica', 'bold');
  doc.text(`STATUS: ${spk.status || 'NORMAL'}`, 195, 19, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`DEADLINE: ${spk.deadline || '-'}`, 195, 24, { align: 'right' });

  // Order Details Box
  doc.setDrawColor(200, 210, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(10, 32, 190, 24, 'FD');
  
  doc.setTextColor(22, 32, 51);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`NO. SPK: ${spk.spkNumber || '-'}`, 14, 38);
  doc.text(`KONSUMEN: ${spk.customer || '-'}`, 14, 44);
  doc.text(`NAMA PO: ${spk.poName || '-'}`, 14, 50);

  doc.text(`BAHAN: ${spk.material || '-'}`, 105, 38);
  doc.text(`KERAH: ${spk.collarModel || '-'}`, 105, 44);
  doc.text(`QTY TOTAL: ${spk.players?.length || 0} PCS`, 105, 50);

  // Player Table Header
  doc.setFillColor(darkColor);
  doc.rect(10, 60, 115, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('NO', 12, 65);
  doc.text('NAMA PEMAIN', 20, 65);
  doc.text('SZ', 65, 65);
  doc.text('NOP', 75, 65);
  doc.text('MODEL', 90, 65);
  doc.text('KET', 110, 65);

  // Player Rows
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'normal');
  let y = 72;
  const players = spk.players || [];
  players.slice(0, 28).forEach((p, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 4.5, 115, 6, 'F');
    }
    doc.setFontSize(7.5);
    doc.text(String(idx + 1), 12, y);
    doc.setFont('helvetica', 'bold');
    doc.text(p.name ? p.name.substring(0, 24) : '-', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(p.size || 'L', 65, y);
    doc.text(p.number || '-', 75, y);
    doc.text(p.model || 'PENDEK', 90, y);
    doc.text(p.notes || '-', 110, y);
    y += 6;
  });

  // Size Recap Table (Right Side)
  doc.setFillColor(darkColor);
  doc.rect(130, 60, 70, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REKAP UKURAN (SIZE BREAKDOWN)', 133, 65);

  let ry = 72;
  doc.setFontSize(8);
  recap.rows.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(241, 245, 249);
      doc.rect(130, ry - 4.5, 70, 5.5, 'F');
    }
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(`SIZE ${r.size}`, 133, ry);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pdk: ${r.pendek || 0}  |  Pjg: ${r.pjg || 0}  |  Total: ${r.total || 0}`, 155, ry);
    ry += 5.5;
  });

  // Total Summary Row
  doc.setFillColor(230, 247, 240);
  doc.rect(130, ry - 4, 70, 6, 'F');
  doc.setTextColor(0, 107, 80);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL KESELURUHAN: ${recap.grandTotal} PCS`, 133, ry);

  // Tailor Notes Section (Bottom Right)
  const noteY = ry + 8;
  doc.setDrawColor(245, 158, 11);
  doc.setFillColor(254, 243, 199);
  doc.rect(130, noteY, 70, 32, 'FD');
  doc.setTextColor(146, 64, 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTRUKSI & CATATAN JAHIT:', 133, noteY + 5);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`Kerah: ${spk.notes?.kerah || spk.collarModel || '-'}`, 133, noteY + 11);
  doc.text(`Jahit: ${spk.notes?.jahit || spk.sewingModel || '-'}`, 133, noteY + 16);
  doc.text(`Bahan: ${spk.notes?.bahan || spk.material || '-'}`, 133, noteY + 21);
  doc.text(`Catatan: ${spk.notes?.mainNote || '-'}`, 133, noteY + 26, { maxWidth: 64 });

  // Footer Note
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    spk.companySettings?.footerNote || 'Surat Perintah Kerja (SPK) resmi Nomaden Apparel. Harap ikuti spesifikasi dengan seksama.',
    105,
    290,
    { align: 'center' }
  );

  doc.save(getExportFileName(spk, 'pdf'));
}

/**
 * Get target DOM element with verification
 */
function getTargetElement(elementId: string): HTMLElement {
  const sourceElement = document.getElementById(elementId);
  if (!sourceElement) {
    throw new Error(`Elemen dokumen SPK dengan ID "${elementId}" tidak ditemukan.`);
  }
  return sourceElement;
}

/**
 * High-Resolution PNG / JPEG Image Export using html-to-image (supports 1 or 2 Pages)
 */
export async function exportSpkImage(
  elementId: string,
  spk: SPKData,
  format: 'png' | 'jpeg' = 'png',
  quality = 0.96
): Promise<void> {
  const target = getTargetElement(elementId);
  const pageElements = target.querySelectorAll<HTMLElement>('.spk-page-a4');
  const pages = pageElements.length > 0 ? Array.from(pageElements) : [target];

  try {
    const exportOptions = {
      quality: quality,
      pixelRatio: 2, // 2x gives 1588x2246 sharp A4 result
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: false
    };

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      let dataUrl: string;
      if (format === 'jpeg') {
        dataUrl = await toJpeg(page, exportOptions);
      } else {
        dataUrl = await toPng(page, exportOptions);
      }

      const baseName = getExportFileName(spk, format === 'jpeg' ? 'jpg' : 'png');
      const fileName = pages.length > 1 
        ? baseName.replace(/\.(jpg|png)$/i, `_Hal_${i + 1}.$1`)
        : baseName;

      triggerBrowserDownload(dataUrl, fileName);
    }
  } catch (err: any) {
    console.error('Export image failed with html-to-image:', err);
    throw new Error(
      `Gagal mengunduh gambar SPK: ${err?.message || 'Terjadi kesalahan saat merender dokumen.'}`
    );
  }
}

/**
 * High-Resolution Exact Multi-Page A4 PDF Export (using html-to-image + jsPDF with Vector Fallback)
 */
export async function exportSpkPdf(elementId: string, spk: SPKData): Promise<void> {
  const target = getTargetElement(elementId);
  const pageElements = target.querySelectorAll<HTMLElement>('.spk-page-a4');
  const pages = pageElements.length > 0 ? Array.from(pageElements) : [target];

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = 210;
    const pdfHeight = 297;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const dataUrl = await toJpeg(page, {
        quality: 0.96,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true
      });

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }

    pdf.save(getExportFileName(spk, 'pdf'));
  } catch (err: any) {
    console.warn('High-res image PDF export failed, triggering robust Vector PDF generator fallback...', err);
    try {
      generateDirectVectorPdf(spk);
    } catch (vectorErr: any) {
      console.error('Vector PDF fallback also failed, opening print window...', vectorErr);
      window.print();
      throw new Error(`Gagal membuat PDF otomatis. Dialog cetak dibuka sebagai alternatif.`);
    }
  }
}
