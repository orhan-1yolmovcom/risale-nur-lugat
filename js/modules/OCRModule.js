/**
 * OCRModule - Handles camera access and OCR text processing
 */
export class OCRModule {
    constructor() {
        this.videoElement = null;
        this.canvas = null;
        this.stream = null;
    }

    /**
     * Initialize camera access
     */
    async initCamera() {
        this.videoElement = document.getElementById('videoElement');
        this.canvas = document.getElementById('canvas');
        
        try {
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            
            this.videoElement.srcObject = this.stream;
            return true;
        } catch (error) {
            console.error('Camera access error:', error);
            alert('Kamera erişimi reddedildi. Lütfen kamera izinlerini kontrol edin.');
            return false;
        }
    }

    /**
     * Capture image from video stream
     */
    captureImage() {
        if (!this.videoElement || !this.canvas) {
            return null;
        }

        const context = this.canvas.getContext('2d');
        this.canvas.width = this.videoElement.videoWidth;
        this.canvas.height = this.videoElement.videoHeight;
        
        context.drawImage(this.videoElement, 0, 0);
        
        return this.canvas.toDataURL('image/jpeg', 0.95);
    }

    /**
     * Process image with OCR (simulated)
     * In production, this would call a real OCR API like Google Vision
     */
    async processOCR(imageData) {
        // Simulate OCR processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For demo purposes, return sample Risale-i Nur text
        const sampleTexts = [
            {
                text: "Bu zamanda hakaik-i imaniyenin inkişafı ve tenviri zamanıdır.",
                tokens: ["Bu", "zamanda", "hakaik-i", "imaniyenin", "inkişafı", "ve", "tenviri", "zamanıdır"]
            },
            {
                text: "Mesail-i diniyye, iman ve İslâm esaslarını teyid eder.",
                tokens: ["Mesail-i", "diniyye", "iman", "ve", "İslâm", "esaslarını", "teyid", "eder"]
            },
            {
                text: "Küllî kaideler, cüz'î meselelere tatbik olunur.",
                tokens: ["Küllî", "kaideler", "cüz'î", "meselelere", "tatbik", "olunur"]
            },
            {
                text: "Hakikat-i Kur'aniye parlak bir nur gibi gösterir.",
                tokens: ["Hakikat-i", "Kur'aniye", "parlak", "bir", "nur", "gibi", "gösterir"]
            }
        ];
        
        // Return a random sample text
        const randomIndex = Math.floor(Math.random() * sampleTexts.length);
        return sampleTexts[randomIndex];
    }

    /**
     * Capture and process image
     */
    async captureAndProcess() {
        const imageData = this.captureImage();
        if (!imageData) {
            alert('Görüntü yakalanamadı');
            return null;
        }
        
        try {
            const result = await this.processOCR(imageData);
            return result;
        } catch (error) {
            console.error('OCR processing error:', error);
            alert('Metin işleme hatası');
            return null;
        }
    }

    /**
     * Stop camera stream
     */
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}
