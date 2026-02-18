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

  // ── Real OCR: canvas ──────────────────────────────────────
  async function performOCR(canvas) {
    _showOverlay();
    _setProgress(2, 'Hazırlanıyor...', 'Görüntü işleniyor');

    try {
      if (!canvas) throw new Error('Çerçeve yakalanamadı');
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));

      const w = await _getWorker();
      _setProgress(30, 'Metin tanınıyor...', 'OCR çalışıyor');

      const { data } = await w.recognize(blob);
      const text = (data.text || '').trim();

      _setProgress(100, 'Tamamlandı!', `${text.split(/\s+/).length} kelime bulundu`);
      await _sleep(400);
      _hideOverlay();

      const tokens = tokenize(text);
      return { text: text || 'Metin tespit edilemedi.', tokens };
    } catch (err) {
      console.error('[OCRModule] OCR error:', err);
      _hideOverlay();
      return { text: 'OCR işlemi sırasında hata oluştu.', tokens: [] };
    }
  }

  // ── Real OCR: image file ──────────────────────────────────
  async function performOCRFromImage(file) {
    _showOverlay();
    _setProgress(2, 'Görsel yükleniyor...', file.name || 'dosya');

    try {
      // Optionally preprocess the image via an off-screen canvas
      const imageBitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width  = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0);
      _preprocessCanvas(ctx, canvas.width, canvas.height);

      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));

      const w = await _getWorker();
      _setProgress(30, 'Metin tanınıyor...', 'OCR çalışıyor');

      const { data } = await w.recognize(blob);
      const text = (data.text || '').trim();

      _setProgress(100, 'Tamamlandı!', `${text.split(/\s+/).length} kelime bulundu`);
      await _sleep(400);
      _hideOverlay();

      const tokens = tokenize(text);
      return { text: text || 'Metin tespit edilemedi.', tokens };
    } catch (err) {
      console.error('[OCRModule] Image OCR error:', err);
      _hideOverlay();
      return { text: 'Görsel OCR işlemi sırasında hata oluştu.', tokens: [] };
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
    performOCR, performOCRFromImage,
    tokenize, toggleFlash, getVideoTrack, terminateWorker,
  };
})();
