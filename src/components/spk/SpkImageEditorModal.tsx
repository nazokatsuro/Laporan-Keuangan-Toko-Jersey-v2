/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Move, 
  Maximize2, 
  Check, 
  Sliders, 
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Compass,
  Sparkles,
  RefreshCw,
  Eye,
  Layers
} from 'lucide-react';

interface SpkImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  initialZoom?: number;
  initialPosX?: number;
  initialPosY?: number;
  initialRotation?: number;
  initialOpacity?: number;
  onSave: (settings: { zoom: number; posX: number; posY: number; rotation: number; opacity: number }) => void;
}

export const SpkImageEditorModal: React.FC<SpkImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  initialZoom = 1,
  initialPosX = 0,
  initialPosY = 0,
  initialRotation = 90, // Default 90 derajat / vertikal
  initialOpacity = 1,
  onSave
}) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [posX, setPosX] = useState(initialPosX);
  const [posY, setPosY] = useState(initialPosY);
  const [rotation, setRotation] = useState(initialRotation);
  const [opacity, setOpacity] = useState(initialOpacity);
  
  // UI helper state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [previewAspect, setPreviewAspect] = useState<'a4-box' | 'wide'>('a4-box');
  const [showGrid, setShowGrid] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync state if initial props change
  useEffect(() => {
    if (isOpen) {
      setZoom(initialZoom);
      setPosX(initialPosX);
      setPosY(initialPosY);
      setRotation(initialRotation ?? 90);
      setOpacity(initialOpacity ?? 1);
    }
  }, [isOpen, initialZoom, initialPosX, initialPosY, initialRotation, initialOpacity]);

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.clientY - dragStart.y) / rect.height) * 100;

    setPosX(prev => Math.round(Math.max(Math.min(prev + deltaX, 100), -100)));
    setPosY(prev => Math.round(Math.max(Math.min(prev + deltaY, 100), -100)));
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile / tablet drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !canvasRef.current || e.touches.length !== 1) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((e.touches[0].clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((e.touches[0].clientY - dragStart.y) / rect.height) * 100;

    setPosX(prev => Math.round(Math.max(Math.min(prev + deltaX, 100), -100)));
    setPosY(prev => Math.round(Math.max(Math.min(prev + deltaY, 100), -100)));
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(prev => Math.round(Math.max(Math.min(prev + delta, 3), 0.3) * 100) / 100);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!isOpen) return null;

  // Presets
  const handleResetToVertical = () => {
    setZoom(1);
    setPosX(0);
    setPosY(0);
    setRotation(90); // 90 derajat vertikal
    setOpacity(1);
  };

  const handleResetToHorizontal = () => {
    setZoom(1);
    setPosX(0);
    setPosY(0);
    setRotation(0);
    setOpacity(1);
  };

  const handleNudge = (dx: number, dy: number) => {
    setPosX(prev => Math.max(Math.min(prev + dx, 100), -100));
    setPosY(prev => Math.max(Math.min(prev + dy, 100), -100));
  };

  const handleSave = () => {
    onSave({ 
      zoom: Number(zoom.toFixed(2)), 
      posX: Math.round(posX), 
      posY: Math.round(posY), 
      rotation: Math.round(rotation) % 360, 
      opacity: Number(opacity.toFixed(2)) 
    });
    onClose();
  };

  // Determine current orientation label
  const getOrientationLabel = (rot: number) => {
    const normalized = ((rot % 360) + 360) % 360;
    if (normalized === 90) return 'Vertikal (90° Default)';
    if (normalized === 270) return 'Vertikal Terbalik (270°)';
    if (normalized === 0) return 'Horizontal (0°)';
    if (normalized === 180) return 'Horizontal Terbalik (180°)';
    return `${normalized}°`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-[#00805F] dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                  Pengaturan Posisi Desain & Mockup
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-[#00805F] dark:text-emerald-400 border border-emerald-500/30">
                  {getOrientationLabel(rotation)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Target: <span className="font-bold text-slate-700 dark:text-slate-200">{title}</span> — Klik & geser kanvas untuk mengatur posisi, atau gunakan tombol arah.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Visual Canvas Area */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center relative select-none border-b border-slate-200 dark:border-slate-800 shrink-0">
          
          {/* Canvas Toolbar & Toggles */}
          <div className="w-full max-w-xl flex items-center justify-between gap-2 mb-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Mode Preview:</span>
              <button
                type="button"
                onClick={() => setPreviewAspect('a4-box')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  previewAspect === 'a4-box'
                    ? 'bg-[#00805F] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                📐 Kotak SPK A4
              </button>
              <button
                type="button"
                onClick={() => setPreviewAspect('wide')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  previewAspect === 'wide'
                    ? 'bg-[#00805F] text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                🖼️ Kanvas Penuh
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2 py-1 rounded-lg border text-[11px] transition-all flex items-center gap-1 ${
                  showGrid
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white border-slate-300 dark:border-slate-600'
                    : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
                title="Tampilkan / sembunyikan grid panduan"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
              <span className="font-mono text-[11px] text-[#00805F] dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Zoom: {Math.round(zoom * 100)}% | X: {posX}% | Y: {posY}%
              </span>
            </div>
          </div>

          {/* Interactive Workspace Canvas */}
          <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className={`w-full max-w-xl ${
              previewAspect === 'a4-box' ? 'h-64 sm:h-72' : 'h-72 sm:h-80'
            } border-2 border-dashed ${
              isDragging ? 'border-emerald-500 shadow-lg' : 'border-slate-300 dark:border-slate-700'
            } rounded-2xl flex items-center justify-center overflow-hidden bg-white/70 dark:bg-slate-900/80 relative cursor-${
              isDragging ? 'grabbing' : 'grab'
            } transition-all`}
          >
            {/* The Scaled and Transformed Mockup Image */}
            <img
              src={imageUrl}
              alt="Preview Mockup"
              draggable={false}
              className="max-h-full max-w-full object-contain pointer-events-none select-none transition-transform duration-75 ease-out"
              style={{
                transform: `scale(${zoom}) translate(${posX}%, ${posY}%) rotate(${rotation}deg)`,
                opacity: opacity
              }}
            />

            {/* Grid Overlay Guide */}
            {showGrid && (
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25 border border-slate-400">
                <div className="border-r border-b border-slate-400" />
                <div className="border-r border-b border-slate-400" />
                <div className="border-b border-slate-400" />
                <div className="border-r border-b border-slate-400" />
                <div className="border-r border-b border-slate-400 flex items-center justify-center">
                  {/* Center Target Indicator */}
                  <div className="h-3 w-3 rounded-full border border-rose-500 bg-rose-500/20" />
                </div>
                <div className="border-b border-slate-400" />
                <div className="border-r border-slate-400" />
                <div className="border-r border-slate-400" />
                <div />
              </div>
            )}

            {/* Drag Hint Banner */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none px-2 py-1 rounded-lg bg-slate-950/60 backdrop-blur-xs text-white text-[10px] font-medium">
              <span className="flex items-center gap-1">
                <Move className="h-3 w-3 text-emerald-400" />
                Klik & drag untuk menggeser posisi
              </span>
              <span className="opacity-80">Scroll mouse untuk zoom</span>
            </div>
          </div>

        </div>

        {/* Controls Panel (Scrollable) */}
        <div className="p-4 sm:p-6 space-y-4 bg-white dark:bg-slate-900 overflow-y-auto flex-1 text-xs">
          
          {/* SECTION 1: ORIENTASI / ROTASI PRESETS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-[#00805F]" />
                1. Pengaturan Rotasi & Orientasi Mockup
              </span>
              <span className="text-[11px] text-slate-500 font-bold">
                Sudut: <span className="font-black text-[#00805F]">{((rotation % 360) + 360) % 360}°</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Preset Vertikal 90 (DEFAULT) */}
              <button
                type="button"
                onClick={() => setRotation(90)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  ((rotation % 360) + 360) % 360 === 90
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-[#00805F] dark:text-emerald-300 font-black shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold'
                }`}
              >
                <div className="flex items-center gap-1 text-xs mb-0.5">
                  <span className="text-amber-500">⭐</span>
                  <span>Vertikal (90°)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Standar SPK (Default)</span>
              </button>

              {/* Preset Horizontal 0 */}
              <button
                type="button"
                onClick={() => setRotation(0)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  ((rotation % 360) + 360) % 360 === 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-[#00805F] dark:text-emerald-300 font-black shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold'
                }`}
              >
                <span className="text-xs mb-0.5">Horizontal (0°)</span>
                <span className="text-[10px] text-slate-400 font-medium">Melebar / Lanskap</span>
              </button>

              {/* Preset Vertikal 270 */}
              <button
                type="button"
                onClick={() => setRotation(270)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  ((rotation % 360) + 360) % 360 === 270
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-[#00805F] dark:text-emerald-300 font-black shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold'
                }`}
              >
                <span className="text-xs mb-0.5">Vertikal (270°)</span>
                <span className="text-[10px] text-slate-400 font-medium">Putar Kiri 90°</span>
              </button>

              {/* Preset Horizontal 180 */}
              <button
                type="button"
                onClick={() => setRotation(180)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  ((rotation % 360) + 360) % 360 === 180
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-[#00805F] dark:text-emerald-300 font-black shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold'
                }`}
              >
                <span className="text-xs mb-0.5">Terbalik (180°)</span>
                <span className="text-[10px] text-slate-400 font-medium">Rotasi 180°</span>
              </button>
            </div>

            {/* Quick Rotate Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="h-3.5 w-3.5 text-emerald-600" />
                <span>Putar Kanan (+90°)</span>
              </button>
              <button
                type="button"
                onClick={() => setRotation(prev => ((prev - 90) % 360 + 360) % 360)}
                className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-indigo-600" />
                <span>Putar Kiri (-90°)</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: POSISI D-PAD & ZOOM TOOLS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            
            {/* D-Pad Directional Move */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
                  <Move className="h-3.5 w-3.5 text-emerald-500" />
                  Geser Posisi (D-Pad)
                </span>
                <button
                  type="button"
                  onClick={() => { setPosX(0); setPosY(0); }}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Reset Tengah (0,0)
                </button>
              </div>

              <div className="flex items-center justify-center">
                <div className="grid grid-cols-3 gap-1.5 w-36">
                  <div />
                  <button
                    type="button"
                    onClick={() => handleNudge(0, -5)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-2xs cursor-pointer"
                    title="Geser ke Atas (-5%)"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <div />

                  <button
                    type="button"
                    onClick={() => handleNudge(-5, 0)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-2xs cursor-pointer"
                    title="Geser ke Kiri (-5%)"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPosX(0); setPosY(0); }}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white flex items-center justify-center text-[10px] font-black shadow-2xs cursor-pointer"
                    title="Tepat di Tengah"
                  >
                    CENTER
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNudge(5, 0)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-2xs cursor-pointer"
                    title="Geser ke Kanan (+5%)"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div />
                  <button
                    type="button"
                    onClick={() => handleNudge(0, 5)}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-2xs cursor-pointer"
                    title="Geser ke Bawah (+5%)"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <div />
                </div>
              </div>
            </div>

            {/* Quick Zoom Tools */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
                  <ZoomIn className="h-3.5 w-3.5 text-emerald-500" />
                  Skala & Zoom ({Math.round(zoom * 100)}%)
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Reset 100%
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoom(0.75)}
                  className={`p-2 rounded-xl border text-center font-bold text-[11px] cursor-pointer ${
                    zoom === 0.75 ? 'bg-[#00805F] text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className={`p-2 rounded-xl border text-center font-bold text-[11px] cursor-pointer ${
                    zoom === 1 ? 'bg-[#00805F] text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  100% (Fit)
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1.25)}
                  className={`p-2 rounded-xl border text-center font-bold text-[11px] cursor-pointer ${
                    zoom === 1.25 ? 'bg-[#00805F] text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  125%
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(Number((prev - 0.1).toFixed(2)), 0.3))}
                  className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ZoomOut className="h-3.5 w-3.5 text-amber-500" />
                  <span>Zoom Out (-10%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(Number((prev + 0.1).toFixed(2)), 3))}
                  className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Zoom In (+10%)</span>
                </button>
              </div>
            </div>

          </div>

          {/* SECTION 3: FINE-TUNING SLIDERS */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] block">
              2. Penyesuaian Presisi (Slider & Input Angka)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Pos X */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Geser Horizontal (X)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{posX}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={posX}
                  onChange={(e) => setPosX(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Pos Y */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Geser Vertikal (Y)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{posY}%</span>
                </div>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={posY}
                  onChange={(e) => setPosY(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Opacity */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Transparansi (Opacity)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToVertical}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-emerald-600" />
              <span>Reset ke 90° (Vertikal Default)</span>
            </button>
            <button
              type="button"
              onClick={handleResetToHorizontal}
              className="hidden sm:flex px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800 font-bold text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Reset 0° (Horizontal)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#00805F] hover:bg-[#006B50] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Terapkan ke SPK</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
