import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Gemini SDK client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Gemini Smart SPK Parser API Endpoint
app.post('/api/gemini/parse-spk', async (req, res) => {
  try {
    const { rawText, sortBy = 'size_asc', defaultModel = 'PENDEK' } = req.body;

    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ success: false, error: 'Teks input kosong. Masukkan teks pesanan atau roster.' });
    }

    const ai = getGeminiClient();

    const systemPrompt = `Anda adalah asisten AI parser ahli konveksi jersey olahraga profesional (Nomaden Apparel).
Tugas Anda adalah membaca, menganalisis, membersihkan, dan mengekstrak data pesanan SPK jersey serta daftar pemain (roster) dari teks mentah (chat WhatsApp, catatan admin, copy-paste Excel/tabel, atau format bebas).

ATURAN EKSTRAKSI SETIAP KOLOM:

1. HEADER / SPESIFIKASI SPK (Jika ada):
   - customer: Nama konsumen / instansi (huruf kapital).
   - poName: Nama tim / judul PO jersey (huruf kapital).
   - collarModel: Model kerah (contoh: "V DATAR + LIDAH", "O-NECK STANDAR", "KERAH POLO", "V-NECK RIB", "KERAH SHANGHAI").
   - material: Bahan kain (contoh: "WAFFLE", "MILANO", "DRYFIT BILABONG", "SERENA", "BENZEMA", "EMBOS").
   - productModel: Model produk (contoh: "SETELAN", "ATASAN SAJA", "CELANA SAJA").
   - sleeveModel: Model lengan bawaan ("PENDEK", "LENGAN PANJANG", "BUNTONG").
   - sewingModel: Model jahitan (contoh: "FULL STIK", "OVERDECK 3 JARUM", "RANTAI STANDAR").
   - deadline: Tanggal deadline YYYY-MM-DD jika ada, atau string kosong "".
   - mainNote: Catatan khusus penjahit / instruksi produksi.

2. ROSTER PEMAIN (Setiap baris wajib dipetakan dengan rapi ke 5 kolom):
   - name: Nama punggung pemain. BERSIHKAN TOTAL dari nomor urut baris (1., 2.), tanda hubung, kata ukuran (L, XL), kata nomor (NO 10, #81), kata model (PJG, PANJANG), dan kata role (KIPER, GK, KAPTEN). Format: HURUF KAPITAL (contoh: "GAZER", "W. LADJUPA", "M. IRFAN", "BUDI SANTOSO").
   - size: Ukuran standar konveksi. Normalisasi mutlak ke: "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL", atau "ALL SIZE". (Ubah XXL -> 2XL, XXXL -> 3XL, 4XL, 5XL).
   - number: Nomor punggung (NOP). Pertahankan angka asli termasuk angka nol di depan ("01", "07", "09", "10", "81", "99"). Jika pemain tidak pakai nomor / polos / "-", isi "-".
   - model: Model lengan jersey untuk pemain tersebut. Hanya salah satu dari:
     * "LENGAN PANJANG" (jika ada kata: panjang, pjg, ls, long sleeve, tangan panjang)
     * "BUNTONG" (jika ada kata: buntong, singlet, sleeveless, kutung)
     * "PENDEK" (default atau jika tidak disebutkan khusus)
   - notes: Keterangan khusus.
     * "KIPER" jika pemain penjaga gawang (kiper, gk, keeper, goalie).
     * "KAPTEN" jika kapten tim (c, captain, kapten).
     * Catatan khusus (misal: "CELANA L", "SIZE KHUSUS", "TAMBAH NAMA DADA").
     * Jika tidak ada keterangan khusus, isi persis "-".

3. ATURAN PENYORTIRAN (Urutkan hasil array players):
   - Jika sortBy == 'size_asc': Urutkan berdasarkan ukuran dari terkecil ke terbesar (XS -> S -> M -> L -> XL -> 2XL -> 3XL -> 4XL -> 5XL), lalu nomor punggung.
   - Jika sortBy == 'number_asc': Urutkan berdasarkan nomor punggung secara numerik (1, 2, 3.. 81..), pemain tanpa nomor di akhir.
   - Jika sortBy == 'name_asc': Urutkan berdasarkan alfabet nama pemain (A-Z).
   - Jika sortBy == 'role_kiper_first': Pemain KIPER diletakkan paling atas, diikuti pemain lapangan yang tersortir ukuran.

4. WARNINGS (Peringatan):
   - Catat jika ada nomor punggung kembar / duplikat.
   - Catat jika ada nama yang kosong atau mencurigakan.`;

    let parsedJson: any = null;
    let usedModel = 'gemini-3.6-flash';
    let isAiOfflineFallback = false;

    // Call Gemini API with structured responseSchema and robust multi-model failover
    if (ai) {
      const candidateModels = [
        'gemini-3.6-flash',
        'gemini-3.7-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.1-pro-preview'
      ];

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `Mode Urut (Sort): ${sortBy}\nDefault Model: ${defaultModel}\n\nTeks Mentah Pesanan/Roster:\n"""\n${rawText}\n"""` }
                ]
              }
            ],
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  detectedHeader: {
                    type: Type.OBJECT,
                    properties: {
                      customer: { type: Type.STRING },
                      poName: { type: Type.STRING },
                      collarModel: { type: Type.STRING },
                      material: { type: Type.STRING },
                      productModel: { type: Type.STRING },
                      sleeveModel: { type: Type.STRING },
                      sewingModel: { type: Type.STRING },
                      deadline: { type: Type.STRING },
                      mainNote: { type: Type.STRING }
                    }
                  },
                  players: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING, description: "Nama punggung pemain bersih (huruf kapital)" },
                        size: { type: Type.STRING, description: "Ukuran standar: XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL, ALL SIZE" },
                        number: { type: Type.STRING, description: "Nomor punggung NOP (string angka seperti '01', '07', '10', atau '-')" },
                        model: { type: Type.STRING, description: "'PENDEK', 'LENGAN PANJANG', atau 'BUNTONG'" },
                        notes: { type: Type.STRING, description: "'KIPER', 'KAPTEN', catatan ukuran, atau '-'" }
                      },
                      required: ["name", "size", "number", "model", "notes"]
                    }
                  },
                  warnings: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["players"]
              }
            }
          });

          let responseText = response.text?.trim();
          if (responseText) {
            if (responseText.startsWith('```json')) {
              responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (responseText.startsWith('```')) {
              responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            parsedJson = JSON.parse(responseText);
            if (parsedJson && parsedJson.players && Array.isArray(parsedJson.players) && parsedJson.players.length > 0) {
              usedModel = modelName;
              break;
            }
          }
        } catch (modelErr: any) {
          const isHighDemandOrThrottled = modelErr?.status === 503 || modelErr?.message?.includes('503') || modelErr?.message?.includes('high demand');
          if (isHighDemandOrThrottled) {
            console.log(`[Gemini Failover] Model ${modelName} experiencing temporary high demand (503). Switching smoothly to next candidate model...`);
          } else {
            console.warn(`[Gemini Failover] Model ${modelName} unavailable, trying next candidate:`, modelErr?.message || modelErr);
          }
        }
      }
    }

    // High-precision local fallback parser if Gemini client is unavailable or returns empty
    if (!parsedJson || !parsedJson.players || parsedJson.players.length === 0) {
      console.log('Using enhanced local intelligent parser fallback');
      isAiOfflineFallback = true;

      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const extractedPlayers: any[] = [];
      const warnings: string[] = [];

      const sizeOrderMap: { [k: string]: number } = {
        'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, '2XL': 6, 'XXL': 6, '3XL': 7, 'XXXL': 7, '4XL': 8, '5XL': 9, 'ALL SIZE': 10
      };

      const detectedHeader: any = {};

      for (const line of lines) {
        const lower = line.toLowerCase();
        
        // Header extraction
        if (lower.startsWith('konsumen:') || lower.startsWith('pemesan:') || lower.startsWith('nama konsumen:') || lower.startsWith('customer:')) {
          detectedHeader.customer = line.split(':')[1]?.trim()?.toUpperCase() || '';
          continue;
        }
        if (lower.startsWith('bahan:') || lower.startsWith('bahan :') || lower.startsWith('kain:')) {
          detectedHeader.material = line.split(':')[1]?.trim()?.toUpperCase() || '';
          continue;
        }
        if (lower.startsWith('kerah:') || lower.startsWith('model kerah:') || lower.startsWith('kerah jersey:')) {
          detectedHeader.collarModel = line.split(':')[1]?.trim()?.toUpperCase() || '';
          continue;
        }
        if (lower.startsWith('jahit:') || lower.startsWith('model jahit:') || lower.startsWith('jahitan:')) {
          detectedHeader.sewingModel = line.split(':')[1]?.trim()?.toUpperCase() || '';
          continue;
        }
        if (lower.startsWith('po:') || lower.startsWith('nama po:') || lower.startsWith('tim:') || lower.startsWith('nama tim:')) {
          detectedHeader.poName = line.split(':')[1]?.trim()?.toUpperCase() || '';
          continue;
        }
        if (lower.startsWith('deadline:') || lower.startsWith('kirim:') || lower.startsWith('tgl kirim:')) {
          detectedHeader.deadline = line.split(':')[1]?.trim() || '';
          continue;
        }
        if (lower.startsWith('catatan:') || lower.startsWith('notes:') || lower.startsWith('nb:')) {
          detectedHeader.mainNote = line.split(':')[1]?.trim() || '';
          continue;
        }

        // Clean out leading numbers "1. ", "1)", "[1]"
        let clean = line.replace(/^\d+[\.\)\:\-\s]+/, '').trim();
        clean = clean.replace(/\b(no\.|no|nomor|number|num|#)\s*(\d+)\b/gi, '$2');

        // Look for model
        let model = defaultModel;
        if (/\b(lengan panjang|panjang|pjg|ls|long sleeve)\b/i.test(clean)) {
          model = 'LENGAN PANJANG';
          clean = clean.replace(/\b(lengan panjang|panjang|pjg|ls|long sleeve)\b/gi, ' ');
        } else if (/\b(buntong|singlet|sleeveless|kutung)\b/i.test(clean)) {
          model = 'BUNTONG';
          clean = clean.replace(/\b(buntong|singlet|sleeveless|kutung)\b/gi, ' ');
        }

        // Look for role / notes
        let notes = '-';
        if (/\b(kiper|gk|keeper|goalkeeper)\b/i.test(clean)) {
          notes = 'KIPER';
          clean = clean.replace(/\b(kiper|gk|keeper|goalkeeper)\b/gi, ' ');
        } else if (/\b(kapten|captain|\(c\))\b/i.test(clean)) {
          notes = 'KAPTEN';
          clean = clean.replace(/\b(kapten|captain|\(c\))\b/gi, ' ');
        }

        // Look for size
        const sizeMatch = clean.match(/\b(5XL|4XL|3XL|2XL|XXXL|XXL|XL|XS|S|M|L|ALL\s*SIZE)\b/i);
        let size = 'L';
        if (sizeMatch) {
          size = sizeMatch[1].toUpperCase().replace(/\s+/g, '');
          if (size === 'XXL') size = '2XL';
          if (size === 'XXXL') size = '3XL';
          clean = clean.replace(new RegExp(`\\b${sizeMatch[1]}\\b`, 'i'), ' ');
        }

        // Look for number (NOP)
        const numMatch = clean.match(/\b(\d{1,3})\b/);
        let number = '-';
        if (numMatch) {
          number = numMatch[1];
          clean = clean.replace(new RegExp(`\\b${numMatch[1]}\\b`, 'g'), ' ');
        }

        // Clean name
        let name = clean
          .replace(/[\(\)\[\]\{\}\/\,\-\:\.\_\+\*\=\|\;\\]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();

        if (name || number !== '-') {
          extractedPlayers.push({
            name: name || `PEMAIN ${extractedPlayers.length + 1}`,
            size,
            number,
            model,
            notes
          });
        }
      }

      // Sort extracted players according to sortBy
      extractedPlayers.sort((a, b) => {
        if (sortBy === 'size_asc') {
          const ordA = sizeOrderMap[a.size] || 99;
          const ordB = sizeOrderMap[b.size] || 99;
          if (ordA !== ordB) return ordA - ordB;
          const nA = parseInt(a.number, 10) || 999;
          const nB = parseInt(b.number, 10) || 999;
          return nA - nB;
        }
        if (sortBy === 'number_asc') {
          const nA = parseInt(a.number, 10) || 999;
          const nB = parseInt(b.number, 10) || 999;
          return nA - nB;
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'role_kiper_first') {
          const kA = a.notes.includes('KIPER') ? 0 : 1;
          const kB = b.notes.includes('KIPER') ? 0 : 1;
          if (kA !== kB) return kA - kB;
          const ordA = sizeOrderMap[a.size] || 99;
          const ordB = sizeOrderMap[b.size] || 99;
          return ordA - ordB;
        }
        return 0;
      });

      parsedJson = {
        detectedHeader,
        players: extractedPlayers,
        warnings,
        isAiOfflineFallback: true
      };
    }

    // Check duplicate numbers for warnings
    const numberMap = new Map<string, string[]>();
    (parsedJson.players || []).forEach((p: any) => {
      const cleanNum = (p.number || '').trim();
      if (cleanNum && cleanNum !== '-') {
        const list = numberMap.get(cleanNum) || [];
        list.push(p.name || 'Pemain');
        numberMap.set(cleanNum, list);
      }
    });

    const finalWarnings = parsedJson.warnings || [];
    numberMap.forEach((names, num) => {
      if (names.length > 1) {
        const warningMsg = `Nomor punggung ${num} terdeteksi duplikat pada ${names.length} pemain: (${names.join(', ')})`;
        if (!finalWarnings.includes(warningMsg)) {
          finalWarnings.push(warningMsg);
        }
      }
    });

    // Give unique ids to each player and normalize values
    const processedPlayers = (parsedJson.players || []).map((p: any, idx: number) => {
      let normSize = (p.size || 'L').trim().toUpperCase().replace(/\s+/g, '');
      if (normSize === 'XXL') normSize = '2XL';
      if (normSize === 'XXXL') normSize = '3XL';
      if (normSize === 'XXXXL') normSize = '4XL';

      let normModel = (p.model || defaultModel).trim().toUpperCase();
      if (normModel.includes('PANJANG') || normModel.includes('PJG') || normModel === 'LS') normModel = 'LENGAN PANJANG';
      else if (normModel.includes('BUNTONG') || normModel.includes('SINGLET')) normModel = 'BUNTONG';
      else normModel = 'PENDEK';

      let normNotes = (p.notes || '-').trim().toUpperCase();
      if (normNotes.includes('KIPER') || normNotes.includes('GK') || normNotes.includes('KEEPER')) normNotes = 'KIPER';
      else if (normNotes.includes('KAPTEN') || normNotes === 'C' || normNotes.includes('CAPTAIN')) normNotes = 'KAPTEN';
      else if (!normNotes || normNotes === '') normNotes = '-';

      return {
        id: `p-gemini-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        no: idx + 1,
        name: (p.name || `PEMAIN ${idx + 1}`).trim().toUpperCase(),
        size: normSize,
        number: (p.number || '-').trim(),
        model: normModel,
        notes: normNotes,
        qc: false
      };
    });

    return res.json({
      success: true,
      data: {
        ...parsedJson,
        players: processedPlayers,
        warnings: finalWarnings,
        usedModel: isAiOfflineFallback ? 'Smart Engine (Local)' : usedModel
      }
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/parse-spk:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat memproses data dengan Gemini AI'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Explicit API 404 handler to prevent HTML from ever returning for /api requests
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `API route ${req.originalUrl || req.url} not found` });
});

// Serve frontend in production or development
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    // Extra fallback for any unmatched requests
    app.use((req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupServer();
