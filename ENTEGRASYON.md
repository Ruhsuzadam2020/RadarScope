# ══════════════════════════════════════════════════════════
#  RADARSCOPE v5.0 — ENTEGRASYON REHBERİ
# ══════════════════════════════════════════════════════════

## 1. index.html — Script Tag Ekle
# </body> tagından hemen önce, script.js'den SONRA:

    <script src="geoint.js"></script>
</body>

# Tam örnek:
#   <script src="data_military_bases.js"></script>
#   <script src="data_aircraft_specs.js"></script>
#   <script src="script.js"></script>
#   <script src="geoint.js"></script>   ← EKLENECEK
# </body>


## 2. .env Dosyası — Gerekli API Anahtarları
# app.py ile aynı dizinde .env oluştur:

SECRET_KEY=your-secret-key-here

# Mevcut (zaten vardı):
OPENSKY_USER=your_opensky_username
OPENSKY_PASS=your_opensky_password
CF_API_KEY=your_cloudflare_radar_key
GEMINI_API_KEY=your_gemini_api_key
COLLECT_API_KEY=your_collectapi_key

# YENİ — GEOINT modülü için:
SHODAN_API_KEY=your_shodan_api_key      # https://account.shodan.io → API Key
RIPE_ATLAS_KEY=                          # İsteğe bağlı — https://atlas.ripe.net/accounts/apikeys/


## 3. requirements.txt — Yeni paket yok
# Mevcut paketler yeterli:
#   flask, flask-socketio, requests, google-generativeai, python-dotenv


## 4. YENİ ENDPOINT'LER (app.py)
#
# POST /api/ai/geoint-image          → Gemini Vision görsel analizi
# POST /api/ai/relationship-map      → AI entity ilişki haritası
# GET  /api/infra/submarine-cables   → TeleGeography fiber kablo verisi
# GET  /api/infra/internet-exchange  → PeeringDB IX noktaları
# GET  /api/infra/bgp-outages        → RIPE BGP anomalileri
# GET  /api/infra/outages            → İnternet kesinti verisi
# GET  /api/infra/tor-nodes          → Tor Project relay listesi
# GET  /api/infra/ripe-probes        → RIPE Atlas ağ probları
# GET  /api/shodan/query             → Shodan host arama
# GET  /api/shodan/botnet-density    → Botnet yoğunluk analizi
# GET  /api/geoint/sentinel-hub      → NASA GIBS uydu tile URL
# GET  /api/geoint/firms-fires       → NASA FIRMS aktif yangın haritası


## 5. API KEY NEREDEN ALINIR
#
# Shodan    : https://account.shodan.io (ücretsiz plan: 1 sorgu/sn, aylık limit)
# RIPE Atlas: https://atlas.ripe.net/accounts/apikeys/ (ücretsiz)
# Gemini    : https://aistudio.google.com/app/apikey (mevcut)
# Cloudflare: https://dash.cloudflare.com → Radar API (mevcut)
#
# NOT: TeleGeography, NASA FIRMS, Tor Project, PeeringDB
#      → API key GEREKMİYOR (public endpoints)


## 6. GEOINT PANEL KULLANIMI
#
# Alt çubukta yeni "⬡ GEOINT" butonu görünür.
# Tıklayınca modül seçim paneli açılır:
#
# 👁 GÖRSEL ANALİZ  → Görsel/ekran görüntüsü yükle → AI analiz et
#   - GEOINT (uydu): Askeri altyapı, araç, koordinat tahmini
#   - OSINT (saha): Konum ipuçları, kişi, ekipman
#   - Entity: Tüm varlıkları etiketle + ilişki çıkar
#   - Altyapı: Fiber, enerji, tesisler
#
# 🕸 İLİŞKİ HARİTASI → Kişi/örgüt listesi + bağlam gir → D3.js force graph
#   - AI otomatik node/edge üretir
#   - Drag & drop interaktif graf
#   - Renk kodlu: 🔵Kişi 🟠Örgüt 🟢Konum 🔴Olay 🟡Varlık
#
# ⏱ ZAMAN ÇİZELGESİ → Metin yapıştır → AI tarihleri çıkarır → Kronik görsel
#
# 🌐 FİBER HATLAR → Küresel denizaltı fiber kablo haritası (glob üzerinde arc)
#
# ⚡ KESİNTİLER → BGP routing anomalileri + RIPE Atlas probları
#
# 🧅 TOR NODES → 300 aktif relay, exit/guard filtreleme, haritada renk kodlu
#
# 🤖 BOTNET → Shodan ile Mirai/EternalBlue/açık port yoğunluğu
#
# 🔥 YANGIN → NASA FIRMS son 24 saat MODIS termal anomalileri
