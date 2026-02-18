# Risale-i Nur Lûgat

## 📖 Açıklama

Risale-i Nur Lûgat, kamera ile Risale-i Nur metinlerini tarayıp bilinmeyen kelimelerin anlamlarını gösteren bir web uygulamasıdır. Uygulama, OCR (Optik Karakter Tanıma) teknolojisi kullanarak metinleri analiz eder ve kullanıcılara kelime anlamlarını sunar.

## ✨ Özellikler

- **📸 Kamera ile Metin Tarama (OCR)**: Kameranızı kullanarak Risale-i Nur metinlerini tarayın
- **🔍 Kelime Seçimi**: Taranan metindeki kelimelere dokunarak anlamlarını öğrenin
- **📚 Sözlük Sorgulama**: Geniş Osmanlıca/Türkçe kelime veritabanı
- **🔊 Sesli Okuma (TTS)**: Kelimelerin sesli okunması
- **⭐ Favoriler**: Öğrendiğiniz kelimeleri kaydedin
- **⚙️ Ayarlar**: Tema, yazı boyutu, OCR doğruluk ayarları
- **🎨 Modern Tasarım**: Likit glass kırmızı tema

## 🚀 Kullanım

### Kurulum

1. Repository'yi klonlayın:
```bash
git clone https://github.com/orhan-1yolmovcom/risale-nur-lugat.git
cd risale-nur-lugat
```

2. Uygulamayı bir web sunucusu ile açın:
```bash
# Python kullanarak
python -m http.server 8000

# veya Node.js kullanarak
npx serve
```

3. Tarayıcınızda `http://localhost:8000` adresini açın

### Uygulama Akışı

1. **Giriş Ekranı** (`index.html`)
   - E-posta ve şifre ile giriş yapın
   - Veya misafir olarak devam edin

2. **Kamera Tarama** (`camera.html`)
   - Kamera açılır
   - Metni kırmızı çerçeve içine hizalayın
   - Yakalama butonuna tıklayın

3. **Kelime Seçimi** (`dictionary.html`)
   - Tanımlanan metindeki kelimeleri görün
   - Bir kelimeye dokunun
   - Anlamını, örneklerini ve kökünü görün
   - Favorilere ekleyin veya seslendirin

4. **Favoriler** (`favorites.html`)
   - Kaydettiğiniz kelimeleri görüntüleyin
   - İstediğiniz favorileri silin

5. **Ayarlar** (`settings.html`)
   - Tema seçimi
   - Yazı boyutu ayarı
   - OCR doğruluk ayarı
   - Offline sözlük indirme

## 📁 Proje Yapısı

```
risale-nur-lugat/
├── index.html              # Giriş sayfası
├── camera.html             # OCR kamera tarama
├── dictionary.html         # Kelime seçimi ve anlam gösterimi
├── favorites.html          # Favori kelimeler
├── settings.html           # Ayarlar
├── js/
│   └── modules/
│       ├── UserModule.js       # Kullanıcı yönetimi
│       ├── OCRModule.js        # OCR işlemleri
│       ├── DictionaryModule.js # Sözlük sorguları
│       └── FavoriteModule.js   # Favori yönetimi
├── data/
│   └── dictionary.json     # Kelime veritabanı
└── README.md
```

## 🔧 Modüller

### UserModule
- Kullanıcı girişi ve oturum yönetimi
- Misafir kullanıcı desteği
- Session ve localStorage entegrasyonu

### OCRModule
- Kamera erişimi ve görüntü yakalama
- OCR metin işleme (demo implementasyonu)
- Token çıkarma

### DictionaryModule
- Kelime arama ve normalizasyon
- JSON veritabanı yönetimi
- Benzer kelime önerileri

### FavoriteModule
- Favori ekleme/çıkarma
- LocalStorage ile kalıcı saklama
- Favori dışa/içe aktarma

## 🎨 Tasarım

Uygulama, likit glass efektli kırmızı tema ile tasarlanmıştır:
- **Ana Renk**: #c70024 (Kırmızı)
- **Arka Plan**: #230f12 (Koyu)
- **Glass Efekt**: Bulanık arka plan, yumuşak gölgeler
- **Mobile-First**: Mobil cihazlar için optimize edilmiş

## 🔐 Güvenlik

- Şifreler şu an basit implementasyon (production için hash kullanılmalı)
- HTTPS kullanımı önerilir (kamera erişimi için gerekli)
- XSS koruması için input sanitizasyonu yapılmalı

## 🚧 Gelecek Geliştirmeler

- [ ] Gerçek OCR API entegrasyonu (Google Vision, Tesseract)
- [ ] Backend ve veritabanı entegrasyonu
- [ ] Gelişmiş kullanıcı yönetimi
- [ ] Sosyal özellikler (paylaşım, yorum)
- [ ] Daha geniş sözlük veritabanı
- [ ] Çoklu dil desteği
- [ ] PWA (Progressive Web App) desteği
- [ ] Offline mod

## 📝 Lisans

Bu proje eğitim amaçlıdır.

## 👤 Geliştirici

Risale-i Nur Okuma ve Lügat Uygulaması

## 🙏 Teşekkürler

Risale-i Nur eserlerinin anlaşılmasına katkı sağlamak amacıyla geliştirilmiştir.