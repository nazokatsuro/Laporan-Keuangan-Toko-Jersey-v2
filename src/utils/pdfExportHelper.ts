/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import jsPDF from 'jspdf';
import { toCanvas } from 'html-to-image';

export interface SmartPdfOptions {
  filename?: string;
  marginMm?: number;
  pixelRatio?: number;
  pdfQuality?: number;
  elementWidthPx?: number;
}

/**
 * Calculates safe vertical cut points on a canvas corresponding to DOM element boundaries
 * (such as table rows, summary blocks, signature sections, and cards).
 */
export function getSafeCutLines(element: HTMLElement, canvasHeight: number): number[] {
  const rootRect = element.getBoundingClientRect();
  if (rootRect.height <= 0) return [];

  const scale = canvasHeight / rootRect.height;
  const safeLines = new Set<number>();

  // Query all elements that should remain intact and not get split horizontally
  const candidates = Array.from(element.querySelectorAll<HTMLElement>(
    'tr, .rekap-header-block, .rekap-kpi-block, .rekap-summary-block, .rekap-signatures-block, .break-inside-avoid, [data-po-boundary="true"], table, thead, tfoot'
  ));

  candidates.forEach(node => {
    const rect = node.getBoundingClientRect();
    const relativeTop = Math.round((rect.top - rootRect.top) * scale);
    const relativeBottom = Math.round((rect.bottom - rootRect.top) * scale);

    if (relativeTop > 15 && relativeTop < canvasHeight - 15) {
      safeLines.add(relativeTop);
    }
    if (relativeBottom > 15 && relativeBottom < canvasHeight - 15) {
      safeLines.add(relativeBottom);
    }
  });

  return Array.from(safeLines).sort((a, b) => a - b);
}

/**
 * Appends a rendered HTML element into an existing jsPDF document using smart page-break boundaries.
 */
export async function appendSmartElementToPdf(
  pdf: jsPDF,
  element: HTMLElement,
  options?: SmartPdfOptions
): Promise<void> {
  const margin = options?.marginMm ?? 8;
  const pixelRatio = options?.pixelRatio ?? 2.2;
  const pdfQuality = options?.pdfQuality ?? 0.98;
  const elementWidthPx = options?.elementWidthPx ?? 840;

  const canvas = await toCanvas(element, {
    quality: 1.0,
    pixelRatio,
    backgroundColor: '#ffffff',
    cacheBust: true,
    skipFonts: false,
    style: {
      transform: 'none',
      width: `${elementWidthPx}px`,
      minWidth: `${elementWidthPx}px`,
      maxWidth: `${elementWidthPx}px`,
      margin: '0',
    }
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - (margin * 2);
  const contentHeightPerPage = pageHeight - (margin * 2);

  const totalHeightMm = (canvas.height / canvas.width) * contentWidth;

  // If content fits comfortably on a single A4 page
  if (totalHeightMm <= contentHeightPerPage) {
    const imgData = canvas.toDataURL('image/jpeg', pdfQuality);
    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, totalHeightMm, undefined, 'FAST');
    return;
  }

  // Multi-page content: perform smart boundary slicing
  const safeCutLines = getSafeCutLines(element, canvas.height);
  const sliceHeightPx = Math.floor((contentHeightPerPage / contentWidth) * canvas.width);

  let renderedY = 0;
  let isFirstSliceOfElement = true;

  while (renderedY < canvas.height) {
    const remainingHeightPx = canvas.height - renderedY;
    let currentSliceHeightPx = remainingHeightPx;

    if (remainingHeightPx > sliceHeightPx) {
      const idealBreakY = renderedY + sliceHeightPx;
      const minAcceptableBreakY = renderedY + Math.floor(sliceHeightPx * 0.4);

      // Find the highest safe cut line that is <= idealBreakY
      let chosenCutY = -1;
      for (let i = safeCutLines.length - 1; i >= 0; i--) {
        const cutY = safeCutLines[i];
        if (cutY <= idealBreakY && cutY >= minAcceptableBreakY) {
          chosenCutY = cutY;
          break;
        }
      }

      // If nothing in [minAcceptableBreakY, idealBreakY], try wider search
      if (chosenCutY === -1) {
        for (let i = safeCutLines.length - 1; i >= 0; i--) {
          const cutY = safeCutLines[i];
          if (cutY <= idealBreakY && cutY >= renderedY + Math.floor(sliceHeightPx * 0.25)) {
            chosenCutY = cutY;
            break;
          }
        }
      }

      currentSliceHeightPx = chosenCutY !== -1 ? (chosenCutY - renderedY) : sliceHeightPx;
    }

    // Render current slice onto temporary canvas
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSliceHeightPx;

    const sliceCtx = sliceCanvas.getContext('2d');
    if (sliceCtx) {
      sliceCtx.fillStyle = '#ffffff';
      sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sliceCtx.drawImage(
        canvas,
        0,
        renderedY,
        canvas.width,
        currentSliceHeightPx,
        0,
        0,
        canvas.width,
        currentSliceHeightPx
      );
    }

    const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', pdfQuality);
    const currentHeightMm = (currentSliceHeightPx / canvas.width) * contentWidth;

    if (!isFirstSliceOfElement) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(sliceDataUrl, 'JPEG', margin, margin, contentWidth, currentHeightMm, undefined, 'FAST');

    renderedY += currentSliceHeightPx;
    isFirstSliceOfElement = false;
  }
}

/**
 * Creates and saves a smart multi-page PDF for a single HTML element.
 */
export async function saveElementToSmartMultiPagePdf(
  element: HTMLElement,
  options: SmartPdfOptions & { filename: string }
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  await appendSmartElementToPdf(pdf, element, options);
  pdf.save(options.filename);
}
