/* ===== OCRModule — Camera & Real OCR via Tesseract.js ===== */

const OCRModule = (() => {
  let videoStream = null;
  let videoEl = null;
  let worker = null;

  // ── Progress UI helpers ──────────────────────────────────
  function _showOverlay() {
    const el = document.getElementById('ocr-overlay');
    if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
  }
  function _hideOverlay() {
    const el = document.getElementById('ocr-overlay');
    if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
  }
  function _setProgress(pct, status, detail) {
    const bar     = document.getElementById('ocr-overlay-progress');
    const pctEl   = document.getElementById('ocr-overlay-percent');
    const statEl  = document.getElementById('ocr-overlay-status');
    const detEl   = document.getElementById('ocr-overlay-detail');
    if (bar)    bar.style.width = pct + '%';
    if (pctEl)  pctEl.textContent = Math.round(pct) + '%';
    if (status && statEl) statEl.textContent = status;
    if (detail && detEl)  detEl.textContent  = detail;
  }

  // ── Tesseract worker lifecycle ────────────────────────────
  /**
   * Lazily create & initialise a Tesseract worker.
   * Uses Turkish + Ottoman/Latin recognition.
   */
  async function _getWorker() {
    if (worker) return worker;

    _setProgress(5, 'OCR motoru yükleniyor...', 'Tesseract başlatılıyor');

    worker = await Tesseract.createWorker('tur', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const p = Math.round((m.progress || 0) * 100);
          _setProgress(30 + p * 0.65, 'Metin tanınıyor...', `İşleniyor ${p}%`);
        } else if (m.status === 'loading language traineddata') {
          const p = Math.round((m.progress || 0) * 100);
          _setProgress(5 + p * 0.2, 'Dil verisi indiriliyor...', `Türkçe ${p}%`);
        }
      },
    });

    _setProgress(28, 'Motor hazır', 'Tanıma başlıyor...');
    return worker;
  }

  // ── Camera ────────────────────────────────────────────────
  async function startCamera(video) {
    videoEl = video;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      videoStream = stream;
      video.srcObject = stream;
      await video.play();
      return true;
    } catch (err) {
      console.error('[OCRModule] Camera error:', err);
      return false;
    }
  }

  function stopCamera() {
    if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
    if (videoEl)     { videoEl.srcObject = null; videoEl = null; }
  }

  // ── Frame capture: full frame (no crop) ───────────────────
  /**
   * Captures the entire video frame without any cropping or preprocessing.
   * Used as source for the crop-selection UI.
   */
  function captureFullFrame() {
    if (!videoEl) return null;
    const vw = videoEl.videoWidth  || 640;
    const vh = videoEl.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width  = vw;
    canvas.height = vh;
    canvas.getContext('2d').drawImage(videoEl, 0, 0, vw, vh);
    return canvas;
  }

  // ── Frame capture with preprocessing (legacy / fallback) ─
  function captureFrame() {
    if (!videoEl) return null;
    const vw = videoEl.videoWidth  || 640;
    const vh = videoEl.videoHeight || 480;

    // Crop to the center 85 % area (matches the red viewfinder)
    const cropW = Math.round(vw * 0.85);
    const cropH = Math.round(vh * 0.85);
    const sx = Math.round((vw - cropW) / 2);
    const sy = Math.round((vh - cropH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width  = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoEl, sx, sy, cropW, cropH, 0, 0, cropW, cropH);

    _preprocessCanvas(ctx, cropW, cropH);
    return canvas;
  }

  // ── Crop a source canvas to pixel rect + preprocess ───────
  /**
   * @param {HTMLCanvasElement} sourceCanvas  – full captured frame
   * @param {number} x  – pixel x in source
   * @param {number} y  – pixel y in source
   * @param {number} w  – pixel width in source
   * @param {number} h  – pixel height in source
   * @returns {HTMLCanvasElement} cropped & preprocessed canvas ready for OCR
   */
  function cropForOCR(sourceCanvas, x, y, w, h) {
    const sw = sourceCanvas.width;
    const sh = sourceCanvas.height;
    // Clamp to source bounds
    x = Math.max(0, Math.min(x, sw - 1));
    y = Math.max(0, Math.min(y, sh - 1));
    w = Math.max(4, Math.min(w, sw - x));
    h = Math.max(4, Math.min(h, sh - y));

    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Draw selected region
    ctx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);

    // Fill outside area with white (already cropped so nothing outside)
    // Preprocess for OCR accuracy
    _preprocessCanvas(ctx, w, h);
    return canvas;
  }

  /**
   * Simple greyscale + contrast boost to help Tesseract accuracy
   */
  function _preprocessCanvas(ctx, w, h) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      // Greyscale
      const grey = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
      // Contrast stretch (factor 1.5 around midpoint 128)
      let v = 128 + 1.5 * (grey - 128);
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      d[i] = d[i+1] = d[i+2] = v;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // ── GPT OCR response helpers ─────────────────────────────
  function _stripCodeFences(s) {
    if (!s) return '';
    return s
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/```$/i, '')
      .trim();
  }

  function _tryParseJson(s) {
    try { return JSON.parse(s); } catch { return null; }
  }

  function _extractJsonObjectString(s) {
    if (!s) return '';
    const m = s.match(/\{[\s\S]*\}/);
    return m ? m[0] : '';
  }

  function _normalizeJsonString(s) {
    // Minimal repair for common model formatting noise
    return (s || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/,\s*([}\]])/g, '$1')
      .trim();
  }

  function _sanitizeLines(lines) {
    if (!Array.isArray(lines)) return [];
    return lines
      .map(line => Array.isArray(line) ? line : [])
      .map(line => line.map(w => String(w).trim()).filter(Boolean))
      .filter(line => line.length > 0);
  }

  function _linesFromFullText(text) {
    if (!text) return [];
    return text
      .split(/\r?\n+/)
      .map(line => line.split(/\s+/).map(w => w.trim()).filter(Boolean))
      .filter(line => line.length > 0);
  }

  function _parseModelOCRResponse(raw) {
    const stripped = _stripCodeFences((raw || '').trim());

    // 1) direct parse
    let parsed = _tryParseJson(stripped);

    // 2) extract {...} block parse
    if (!parsed) {
      const objStr = _extractJsonObjectString(stripped);
      parsed = _tryParseJson(objStr);
    }

    // 3) normalized parse (smart quotes / trailing commas)
    if (!parsed) {
      const repaired = _normalizeJsonString(_extractJsonObjectString(stripped) || stripped);
      parsed = _tryParseJson(repaired);
    }

    // 4) fallback: treat response as plain text
    if (!parsed || typeof parsed !== 'object') {
      const plain = stripped;
      const lines = _linesFromFullText(plain);
      return {
        full_text: plain,
        lines,
      };
    }

    const fullText = String(parsed.full_text || '').trim();
    let lines = _sanitizeLines(parsed.lines);
    if (!lines.length && fullText) lines = _linesFromFullText(fullText);

    return {
      full_text: fullText,
      lines,
    };
  }

  // ── GPT-4o-mini Vision OCR ──────────────────────────────────
  /**
   * Sends the canvas to GPT-4o-mini with an ultra-minimal OCR prompt.
   * Returns { text, tokens, lines } in the same shape as performOCR.
   *
   * Cost optimisation:
   *   • Image resized to ≤ 1024 px longest side before encoding
   *   • JPEG q=0.88 (smaller payload than PNG)
   *   • temperature=0  — no creative variation
   *   • max_tokens=1500 — enough for a full page, not wasteful
   *   • No preprocessing (greyscale) — GPT handles colour natively
   */
  async function performOCRWithGPT(canvas) {
    _showOverlay();
    _setProgress(5, 'GPT-4o-mini bağlanıyor...', 'OpenAI API hazırlanıyor');
    console.info('[GPT-OCR] Başladı: görsel OCR akışı başlatılıyor');

    try {
      if (!canvas) throw new Error('OCR için görsel bulunamadı');
      const apiKey = (window.APP_CONFIG && window.APP_CONFIG.OPENAI_API_KEY) || '';
      if (!apiKey || apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
        throw new Error('OpenAI API key ayarlanmamış (config.js)');
      }

      // ── Resize to ≤ 1024 px (reduces tokens & cost) ─────────
      const MAX = 1024;
      let sw = canvas.width, sh = canvas.height;
      if (sw > MAX || sh > MAX) {
        const s = MAX / Math.max(sw, sh);
        sw = Math.round(sw * s);
        sh = Math.round(sh * s);
      }
      const resized = document.createElement('canvas');
      resized.width = sw; resized.height = sh;
      resized.getContext('2d').drawImage(canvas, 0, 0, sw, sh);
      const base64 = resized.toDataURL('image/jpeg', 0.88).split(',')[1];
      console.info(`[GPT-OCR] Görsel hazırlandı: ${canvas.width}x${canvas.height} → ${sw}x${sh}`);

      _setProgress(20, 'Görsel gönderiliyor...', `${sw}×${sh} px · JPEG`);
      console.info('[GPT-OCR] Görsel gönderildi: OpenAI API çağrısı yapılıyor');
      _setProgress(45, 'Görsel inceleniyor...', 'Model yanıtı bekleniyor');

      // ── API request ──────────────────────────────────────────
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model:       'gpt-4o-mini',
          temperature: 0,
          max_tokens:  1500,
          messages: [
            {
              role: 'system',
              content:
                'Sen minimal çıktılar üreten, düşük token kullanarak çalışan bir OCR ve metin ayrıştırma asistanısın.\n' +
                'Görevin sadece şunlardır:\n' +
                '1. Görüntüdeki tüm metni oku.\n' +
                '2. Türkçe/Osmanlıca kelimeleri ayıkla.\n' +
                '3. Kelimeleri satır satır ve kelime kelime JSON formatında döndür.\n' +
                '4. Ek yorum, açıklama, analiz veya tahmin yapma.\n' +
                '5. Çıkış tamamen sade olmalı, sadece işlenebilir veri üretmelisin.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text:
                    'Aşağıdaki görseldeki metni oku ve SADECE şu JSON formatında cevap ver — başka hiçbir şey yazma:\n\n' +
                    '{"full_text":"...tam metin...","lines":[["kelime1","kelime2"],["kelime1","kelime2"]]}\n\n' +
                    '- Kelimeleri normalize etme.\n' +
                    '- Harf düzeltme yapma.\n' +
                    '- Osmanlıca-Türkçe ayırma.\n' +
                    '- Sadece gördüğünü aynen çıkar.',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'auto' },
                },
              ],
            },
          ],
        }),
      });
      console.info(`[GPT-OCR] API döndü: HTTP ${res.status}`);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`OpenAI ${res.status}: ${errBody?.error?.message || 'bilinmeyen hata'}`);
      }

      const data  = await res.json();
      const raw   = (data.choices?.[0]?.message?.content || '').trim();
      console.info('[GPT-OCR] API yanıt içeriği alındı, JSON ayrıştırılıyor');

      _setProgress(85, 'Yanıt işleniyor...', 'JSON ayrıştırılıyor');

      const parsed = _parseModelOCRResponse(raw);
      const text   = parsed.full_text;
      const lines  = parsed.lines;
      const tokens = lines.flat();

      // Usage info (nice for debugging)
      const usage = data.usage || {};
      console.info(
        `[GPT-OCR] prompt=${usage.prompt_tokens}t · completion=${usage.completion_tokens}t · total=${usage.total_tokens}t`
      );
      console.info('[GPT-OCR] Metinler böyle (ilk 20 token):', tokens.slice(0, 20));

      _setProgress(100, 'Tamamlandı!', `${tokens.length} kelime · ${usage.total_tokens || '?'} token`);
      await _sleep(400);
      _hideOverlay();

      return { text: text || 'Metin tespit edilemedi.', tokens, lines };

    } catch (err) {
      console.error('[OCRModule] GPT OCR error:', err);
      _hideOverlay();
      throw err; // re-throw so callers can fall back to Tesseract
    }
  }

  // ── Real OCR: canvas (GPT-first, Tesseract fallback) ──────
  async function performOCR(canvas) {
    // Try GPT-4o-mini first if API key is configured
    const apiKey = (window.APP_CONFIG && window.APP_CONFIG.OPENAI_API_KEY) || '';
    if (apiKey && apiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
      try {
        console.info('[OCRModule] OCR yolu: GPT-4o-mini (öncelikli)');
        return await performOCRWithGPT(canvas);
      } catch (err) {
        console.warn('[OCRModule] GPT failed, falling back to Tesseract:', err.message);
        // fall through to Tesseract
      }
    }

    // ── Tesseract fallback ────────────────────────────────────
    _showOverlay();
    _setProgress(2, 'Hazırlanıyor...', 'Tesseract motoru kullanılıyor');
    try {
      if (!canvas) throw new Error('Çerçeve yakalanamadı');
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const w    = await _getWorker();
      _setProgress(30, 'Metin tanınıyor...', 'Tesseract çalışıyor');
      const { data } = await w.recognize(blob);
      const text = (data.text || '').trim();
      _setProgress(100, 'Tamamlandı!', `${text.split(/\s+/).length} kelime bulundu`);
      await _sleep(400);
      _hideOverlay();
      const tokens = tokenize(text);
      return { text: text || 'Metin tespit edilemedi.', tokens, lines: [] };
    } catch (err) {
      console.error('[OCRModule] Tesseract OCR error:', err);
      _hideOverlay();
      return { text: 'OCR işlemi sırasında hata oluştu.', tokens: [], lines: [] };
    }
  }

  // ── Real OCR: image file (GPT-first, Tesseract fallback) ─
  async function performOCRFromImage(file) {
    // Build canvas from the file first (needed for both GPT and Tesseract paths)
    let canvas;
    try {
      const imageBitmap = await createImageBitmap(file);
      canvas = document.createElement('canvas');
      canvas.width  = imageBitmap.width;
      canvas.height = imageBitmap.height;
      canvas.getContext('2d').drawImage(imageBitmap, 0, 0);
    } catch (err) {
      console.error('[OCRModule] Image load error:', err);
      return { text: 'Görsel yüklenirken hata oluştu.', tokens: [], lines: [] };
    }

    // Try GPT-4o-mini first if key is configured
    const apiKey = (window.APP_CONFIG && window.APP_CONFIG.OPENAI_API_KEY) || '';
    if (apiKey && apiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
      try {
        console.info('[OCRModule] Görsel dosya OCR yolu: GPT-4o-mini (öncelikli)');
        return await performOCRWithGPT(canvas);
      } catch (err) {
        console.warn('[OCRModule] GPT failed for image file, falling back to Tesseract:', err.message);
      }
    }

    // ── Tesseract fallback ────────────────────────────────────
    _showOverlay();
    _setProgress(2, 'Görsel yükleniyor...', file.name || 'dosya');
    try {
      // Preprocess for Tesseract
      const ctx = canvas.getContext('2d');
      _preprocessCanvas(ctx, canvas.width, canvas.height);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      const w    = await _getWorker();
      _setProgress(30, 'Metin tanınıyor...', 'Tesseract çalışıyor');
      const { data } = await w.recognize(blob);
      const text = (data.text || '').trim();
      _setProgress(100, 'Tamamlandı!', `${text.split(/\s+/).length} kelime bulundu`);
      await _sleep(400);
      _hideOverlay();
      const tokens = tokenize(text);
      return { text: text || 'Metin tespit edilemedi.', tokens, lines: [] };
    } catch (err) {
      console.error('[OCRModule] Tesseract image OCR error:', err);
      _hideOverlay();
      return { text: 'Görsel OCR işlemi sırasında hata oluştu.', tokens: [], lines: [] };
    }
  }

  // ── Tokenize ─────────────────────────────────────────────
  function tokenize(text) {
    if (!text) return [];
    return text
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }

  // ── Flash toggle ─────────────────────────────────────────
  async function toggleFlash() {
    if (!videoStream) return false;
    const track = videoStream.getVideoTracks()[0];
    if (!track) return false;
    try {
      const caps = track.getCapabilities();
      if (caps.torch) {
        const settings = track.getSettings();
        await track.applyConstraints({ advanced: [{ torch: !settings.torch }] });
        return true;
      }
    } catch (e) { console.warn('[OCRModule] Flash not supported:', e); }
    return false;
  }

  // ── Get active video track (used for pinch-to-zoom) ───────
  function getVideoTrack() {
    if (!videoStream) return null;
    return videoStream.getVideoTracks()[0] || null;
  }

  // ── Terminate worker (clean up) ──────────────────────────
  async function terminateWorker() {
    if (worker) { await worker.terminate(); worker = null; }
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return {
    startCamera, stopCamera,
    captureFullFrame, captureFrame, cropForOCR,
    performOCR, performOCRWithGPT, performOCRFromImage,
    tokenize, toggleFlash, getVideoTrack, terminateWorker,
  };
})();
