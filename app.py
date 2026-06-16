import os
import time
import base64
import requests
import google.generativeai as genai
from flask import Flask, send_from_directory, jsonify, request, Response
from flask_socketio import SocketIO
import csv
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = Flask(__name__, static_folder='.')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-radar-key')

socketio = SocketIO(app,
    cors_allowed_origins=[
        "http://localhost:5000",
        "https://ruhsuzadam2020.github.io",
        "https://radarscope.onrender.com"
    ],
    async_mode='threading',
    allow_upgrades=True,
    ping_timeout=60,
    ping_interval=25,
)

OPENSKY_USER    = os.getenv('OPENSKY_USER', '')
OPENSKY_PASS    = os.getenv('OPENSKY_PASS', '')
CF_API_KEY      = os.getenv('CF_API_KEY', '')
GEMINI_API_KEY  = os.getenv('GEMINI_API_KEY', '')
COLLECT_API_KEY = os.getenv('COLLECT_API_KEY', '')
SHODAN_API_KEY  = os.getenv('SHODAN_API_KEY', '')      # https://shodan.io
RIPE_ATLAS_KEY  = os.getenv('RIPE_ATLAS_KEY', '')      # https://atlas.ripe.net (optional)

opensky_rate_limit = {'remaining': 10, 'reset_time': 0}

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ─────────────────────────────────────────────────────────────
#  STATIC SERVING
# ─────────────────────────────────────────────────────────────

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/favicon.ico')
def favicon():
    return Response(status=204)

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


# ─────────────────────────────────────────────────────────────
#  OPENSKY PROXY
# ─────────────────────────────────────────────────────────────

@app.route('/api/opensky/states')
def opensky_proxy():
    global opensky_rate_limit
    now = time.time()
    if now < opensky_rate_limit['reset_time'] and opensky_rate_limit['remaining'] <= 0:
        return jsonify({'states': [], 'error': f'Rate limit - Wait: {int(opensky_rate_limit["reset_time"] - now)}s', 'source': 'error'}), 429
    try:
        lamin = request.args.get('lamin', '-90')
        lomin = request.args.get('lomin', '-180')
        lamax = request.args.get('lamax', '90')
        lomax = request.args.get('lomax', '180')
        url = f'https://opensky-network.org/api/states/all?lamin={lamin}&lomin={lomin}&lamax={lamax}&lomax={lomax}'
        headers = {'User-Agent': 'RADARSCOPE-C4ISR/4.0'}
        auth = (OPENSKY_USER, OPENSKY_PASS) if OPENSKY_USER and OPENSKY_PASS else None
        resp = requests.get(url, auth=auth, headers=headers, timeout=12)
        if resp.status_code == 200:
            opensky_rate_limit['remaining'] = 10
            data = resp.json()
            data['source'] = 'opensky-live'
            data['timestamp'] = datetime.utcnow().isoformat()
            return jsonify(data)
        elif resp.status_code == 429:
            opensky_rate_limit['remaining'] = 0
            opensky_rate_limit['reset_time'] = now + 60
            return jsonify({'states': [], 'error': 'OpenSky rate limit', 'source': 'error', 'retry_after': 60}), 429
        else:
            return jsonify({'states': [], 'error': f'OpenSky HTTP {resp.status_code}', 'source': 'error'}), resp.status_code
    except requests.exceptions.Timeout:
        return jsonify({'states': [], 'error': 'Timeout', 'source': 'error'}), 504
    except Exception as e:
        return jsonify({'states': [], 'error': str(e), 'source': 'error'}), 500


# ─────────────────────────────────────────────────────────────
#  OSINT — DEPREM & HABERLER
# ─────────────────────────────────────────────────────────────

@app.route('/api/osint/earthquakes')
def osint_earthquakes():
    try:
        url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"
        resp = requests.get(url, timeout=10)
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"features": [], "error": str(e)})

@app.route('/api/osint/news')
def osint_news():
    if not COLLECT_API_KEY:
        return jsonify({"result": [], "error": "API Key missing"})
    try:
        headers = {"content-type": "application/json", "authorization": f"apikey {COLLECT_API_KEY}"}
        resp = requests.get("https://api.collectapi.com/news/getNews?country=tr&tag=world", headers=headers, timeout=10)
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"result": [], "error": str(e)})


# ─────────────────────────────────────────────────────────────
#  CLOUDFLARE RADAR PROXY
# ─────────────────────────────────────────────────────────────

@app.route('/api/cloudflare/<path:cf_path>')
def cloudflare_proxy(cf_path):
    if not CF_API_KEY:
        return jsonify({'error': 'CF_API_KEY eksik', 'result': {'top_0': []}}), 200
    cf_url = f"https://api.cloudflare.com/client/v4/radar/{cf_path}"
    headers = {'Authorization': f'Bearer {CF_API_KEY}', 'Content-Type': 'application/json'}
    try:
        resp = requests.get(cf_url, params=dict(request.args), headers=headers, timeout=10)
        if resp.status_code == 200:
            return jsonify(resp.json())
        else:
            return jsonify({'result': {'top_0': []}, 'error': f"API Hatası: {resp.status_code}"})
    except Exception as e:
        return jsonify({'result': {'top_0': []}, 'error': str(e)}), 200


# ─────────────────────────────────────────────────────────────
#  GEMINI AI — ÇATIŞMA ANALİZİ (TEXT)
# ─────────────────────────────────────────────────────────────

@app.route('/api/ai/conflict', methods=['POST'])
def ai_conflict():
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY eksik."}), 400
    data = request.json
    prompt = data.get("prompt", "")
    try:
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        response = model.generate_content(prompt)
        return jsonify({"text": response.text})
    except Exception as e:
        print(f"[Gemini SDK] Hatası: {e}")
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────
#  GEMINI VISION — GÖRSEL & MEDYA ANALİZİ (GEOINT)
#  POST /api/ai/geoint-image
#  Body: { "image_b64": "<base64>", "mime_type": "image/jpeg", "task": "osint|geoint|entity" }
# ─────────────────────────────────────────────────────────────

@app.route('/api/ai/geoint-image', methods=['POST'])
def ai_geoint_image():
    """
    Gemini Vision ile görsel analizi:
    - Uydu görüntüsü analizi (GEOINT)
    - Sosyal medya fotoğrafı OSINT
    - Entity / nesne tanıma
    - Coğrafi konum tahmini
    """
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY eksik."}), 400

    data = request.json
    image_b64  = data.get("image_b64", "")
    mime_type  = data.get("mime_type", "image/jpeg")
    task       = data.get("task", "geoint")
    extra_ctx  = data.get("context", "")

    if not image_b64:
        return jsonify({"error": "image_b64 boş"}), 400

    TASK_PROMPTS = {
        "geoint": (
            "Sen bir GEOINT (Jeoint İstihbarat) analistsin. Bu uydu veya hava fotoğrafını analiz et. "
            "Tespit edilen: askeri altyapı, araç/gemi/uçak, inşaat faaliyeti, koordinat tahmini, "
            "stratejik öneme sahip unsurlar. JSON formatında yanıt ver: "
            "{ location_estimate, detected_objects: [], military_assets: [], "
            "activity_level: 'LOW|MED|HIGH', confidence: 0-100, analysis_text }"
        ),
        "osint": (
            "Bu fotoğrafı OSINT perspektifinden analiz et. "
            "Tespit edilebilecek: konum ipuçları (tabelalar, coğrafya, mimari), "
            "kişi sayısı, ekipman, araçlar, zaman ipuçları. "
            "JSON formatında: { location_clues: [], entities: [], timestamp_clues: [], "
            "confidence: 0-100, summary }"
        ),
        "entity": (
            "Bu görseldeki tüm varlıkları (entity) tespit et ve etiketle: "
            "insanlar, araçlar, silahlar, binalar, logolar, yazılar, bayraklar. "
            "JSON formatında: { entities: [{type, label, confidence, position}], "
            "relationships: [{subject, relation, object}], summary }"
        ),
        "infrastructure": (
            "Bu görüntüdeki altyapı unsurlarını analiz et: "
            "fiber/iletişim kuleleri, enerji tesisleri, ulaşım ağları, boru hatları, "
            "veri merkezleri, askeri tesisler. "
            "JSON: { infrastructure_types: [], strategic_value: 'LOW|MED|HIGH|CRITICAL', "
            "vulnerabilities: [], coordinates_estimate, analysis }"
        ),
    }

    system_prompt = TASK_PROMPTS.get(task, TASK_PROMPTS["geoint"])
    if extra_ctx:
        system_prompt += f"\n\nEk bağlam: {extra_ctx}"

    try:
        model = genai.GenerativeModel("gemini-3-flash")
        image_part = {
            "inline_data": {
                "mime_type": mime_type,
                "data": image_b64
            }
        }
        response = model.generate_content([system_prompt, image_part])
        raw = response.text.strip()

        # JSON parse dene, başarısız olursa raw text döndür
        import json, re
        cleaned = re.sub(r'^```json\s*|```$', '', raw, flags=re.MULTILINE).strip()
        try:
            parsed = json.loads(cleaned)
            return jsonify({"success": True, "result": parsed, "raw": raw})
        except:
            return jsonify({"success": True, "result": None, "raw": raw})

    except Exception as e:
        print(f"[Gemini Vision] Hatası: {e}")
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────
#  RELATIONSHIP MAPPING — AI Tabanlı
#  POST /api/ai/relationship-map
#  Body: { "entities": ["A", "B", "C"], "context": "..." }
# ─────────────────────────────────────────────────────────────

@app.route('/api/ai/relationship-map', methods=['POST'])
def ai_relationship_map():
    """
    Gemini ile entity ilişki haritası oluşturur.
    Kişi-örgüt-konum-olay bağlantılarını çıkarır.
    """
    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY eksik."}), 400

    data = request.json
    entities = data.get("entities", [])
    context  = data.get("context", "")
    text     = data.get("text", "")

    prompt = f"""
Sen bir istihbarat analistsin. Aşağıdaki varlıklar ve bağlam verildi.
Aralarındaki ilişkileri, hiyerarşiyi ve organizasyonel yapıyı çıkar.

Varlıklar: {', '.join(entities)}
Bağlam: {context}
Metin: {text}

SADECE JSON döndür (başka açıklama ekleme):
{{
  "nodes": [
    {{"id": "unique_id", "label": "İsim", "type": "person|org|location|event|asset", "risk": "LOW|MED|HIGH", "description": "..."}}
  ],
  "edges": [
    {{"source": "id1", "target": "id2", "relation": "ilişki türü", "strength": 1-10, "evidence": "kanıt"}}
  ],
  "timeline": [
    {{"date": "YYYY-MM-DD", "event": "olay", "entities_involved": ["id1"]}}
  ],
  "summary": "genel değerlendirme",
  "threat_level": "LOW|MED|HIGH|CRITICAL"
}}
"""
    try:
        model = genai.GenerativeModel("gemini-3-flash-preview")
        response = model.generate_content(prompt)
        raw = response.text.strip()
        import json, re
        cleaned = re.sub(r'^```json\s*|```$', '', raw, flags=re.MULTILINE).strip()
        parsed = json.loads(cleaned)
        return jsonify({"success": True, "graph": parsed})
    except Exception as e:
        return jsonify({"error": str(e), "raw": response.text if 'response' in dir() else ""}), 500


# ─────────────────────────────────────────────────────────────
#  INTERNET ALTYAPI — Fiber Hat & BGP
# ─────────────────────────────────────────────────────────────

@app.route('/api/infra/submarine-cables')
def submarine_cables():
    """
    TeleGeography'nin açık submarine cable verisi.
    Fiber hat güzergahlarını döndürür.
    """
    try:
        resp = requests.get(
            "https://raw.githubusercontent.com/telegeography/www.submarinecablemap.com/master/web/public/api/v3/cable/cable-geo.json",
            timeout=15
        )
        if resp.status_code == 200:
            return jsonify(resp.json())
        return jsonify({"features": [], "error": f"HTTP {resp.status_code}"})
    except Exception as e:
        return jsonify({"features": [], "error": str(e)})

@app.route('/api/infra/internet-exchange')
def internet_exchange():
    """
    PeeringDB IX noktaları — internet altyapısı hub'ları.
    """
    try:
        resp = requests.get(
            "https://www.peeringdb.com/api/ix?depth=0&limit=200",
            headers={"Accept": "application/json"},
            timeout=10
        )
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"data": [], "error": str(e)})

@app.route('/api/infra/bgp-outages')
def bgp_outages():
    """
    RIPE RIS — BGP routing değişiklikleri / internet kesintileri.
    Son 24 saatteki anomalileri döndürür.
    """
    try:
        # RIPE Stat BGP anomaly data
        resp = requests.get(
            "https://stat.ripe.net/data/network-info/data.json?resource=0.0.0.0/0",
            timeout=10
        )
        # BGP Updates stream (public)
        updates_resp = requests.get(
            "https://stat.ripe.net/data/bgp-updates/data.json?resource=0.0.0.0/0&rrcs=0,1,5&starttime=1h",
            timeout=10
        )
        return jsonify({
            "network_info": resp.json() if resp.status_code == 200 else {},
            "updates": updates_resp.json() if updates_resp.status_code == 200 else {}
        })
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/infra/outages')
def internet_outages():
    """
    ThousandEyes / Kentik benzeri — public internet outage tracker.
    Cloudflare Radar'dan internet kesinti verisini çeker.
    """
    if not CF_API_KEY:
        # Cloudflare API yoksa RIPE BGP fallback
        try:
            resp = requests.get(
                "https://stat.ripe.net/data/blackhole/data.json?resource=0.0.0.0/0",
                timeout=10
            )
            return jsonify({"source": "ripe", "data": resp.json()})
        except Exception as e:
            return jsonify({"error": str(e)})

    try:
        headers = {'Authorization': f'Bearer {CF_API_KEY}', 'Content-Type': 'application/json'}
        resp = requests.get(
            "https://api.cloudflare.com/client/v4/radar/quality/iqi/summary?dateRange=1d",
            headers=headers, timeout=10
        )
        return jsonify({"source": "cloudflare", "data": resp.json()})
    except Exception as e:
        return jsonify({"error": str(e)})


# ─────────────────────────────────────────────────────────────
#  TOR NODE HARİTASI
# ─────────────────────────────────────────────────────────────

@app.route('/api/infra/tor-nodes')
def tor_nodes():
    """
    Tor Project'in resmi relay listesi + coğrafi konum.
    Onion Network altyapısını haritalar.
    """
    try:
        # Tor Project resmi relay listesi
        resp = requests.get(
            "https://onionoo.torproject.org/summary?limit=500&running=true&type=relay",
            timeout=15,
            headers={"User-Agent": "RADARSCOPE-C4ISR/4.0"}
        )
        if resp.status_code != 200:
            raise Exception(f"Tor API HTTP {resp.status_code}")

        data = resp.json()
        relays = data.get("relays", [])

        # Sadece koordinatlı olanları döndür
        nodes = []
        for r in relays[:300]:  # İlk 300
            if r.get("latitude") and r.get("longitude"):
                nodes.append({
                    "fingerprint": r.get("fingerprint", ""),
                    "nickname": r.get("n", "unnamed"),
                    "lat": r.get("latitude"),
                    "lng": r.get("longitude"),
                    "country": r.get("cc", "??"),
                    "flags": r.get("f", []),  # Guard, Exit, Fast, etc.
                    "bandwidth": r.get("ob", 0),  # observed bandwidth
                    "is_exit": "Exit" in r.get("f", []),
                    "is_guard": "Guard" in r.get("f", []),
                    "as_name": r.get("as_name", ""),
                })

        return jsonify({"nodes": nodes, "total": len(relays), "source": "torproject"})

    except Exception as e:
        print(f"[Tor] Hata: {e}")
        # Dan.me.uk fallback (sadece IP listesi)
        try:
            resp2 = requests.get("https://check.torproject.org/torbulkexitlist", timeout=10)
            ips = [line.strip() for line in resp2.text.splitlines() if line.strip() and not line.startswith("#")]
            return jsonify({"nodes": [], "exit_ips": ips[:100], "error": str(e), "source": "torproject-fallback"})
        except:
            return jsonify({"nodes": [], "error": str(e)})


# ─────────────────────────────────────────────────────────────
#  SHODAN — İnternet Altyapısı & Açık Port Tarama
# ─────────────────────────────────────────────────────────────

@app.route('/api/shodan/query')
def shodan_query():
    """
    Shodan arama — ülkeye veya sorguya göre açık sistemler.
    ?q=country:TR+port:22&limit=50
    """
    if not SHODAN_API_KEY:
        return jsonify({"error": "SHODAN_API_KEY eksik", "matches": []}), 200

    q     = request.args.get('q', 'port:23')
    limit = min(int(request.args.get('limit', 50)), 100)

    try:
        resp = requests.get(
            f"https://api.shodan.io/shodan/host/search",
            params={"key": SHODAN_API_KEY, "query": q, "limit": limit},
            timeout=10
        )
        data = resp.json()
        # Sadece lat/lng olan kayıtları filtrele
        matches = [
            {
                "ip": m.get("ip_str"),
                "lat": m.get("location", {}).get("latitude"),
                "lng": m.get("location", {}).get("longitude"),
                "country": m.get("location", {}).get("country_name"),
                "org": m.get("org"),
                "port": m.get("port"),
                "product": m.get("product", ""),
                "vuln_count": len(m.get("vulns", {})),
                "vulns": list(m.get("vulns", {}).keys())[:5],
            }
            for m in data.get("matches", [])
            if m.get("location", {}).get("latitude")
        ]
        return jsonify({"matches": matches, "total": data.get("total", 0)})
    except Exception as e:
        return jsonify({"error": str(e), "matches": []})

@app.route('/api/shodan/botnet-density')
def shodan_botnet_density():
    """
    Mirai / botnet tarama — ülke bazlı yoğunluk.
    Bilinen botnet port/protokollerine göre Shodan arar.
    """
    if not SHODAN_API_KEY:
        return jsonify({"error": "SHODAN_API_KEY eksik", "density": []}), 200

    # Bilinen botnet göstergesi port/protokoller
    botnet_queries = [
        ("Mirai IoT", "product:Mirai"),
        ("Open Telnet", "port:23 product:BusyBox"),
        ("Exposed Redis", "port:6379 product:Redis"),
        ("Exposed MongoDB", "port:27017 product:MongoDB"),
    ]

    results = []
    try:
        for label, query in botnet_queries[:2]:  # Rate limit için sadece 2 sorgu
            resp = requests.get(
                "https://api.shodan.io/shodan/host/count",
                params={"key": SHODAN_API_KEY, "query": query, "facets": "country:20"},
                timeout=8
            )
            if resp.status_code == 200:
                data = resp.json()
                country_facets = data.get("facets", {}).get("country", [])
                results.append({"label": label, "countries": country_facets})

        return jsonify({"density": results})
    except Exception as e:
        return jsonify({"error": str(e), "density": []})


# ─────────────────────────────────────────────────────────────
#  RIPE ATLAS — Ağ Ölçüm Probları
# ─────────────────────────────────────────────────────────────

@app.route('/api/infra/ripe-probes')
def ripe_probes():
    """
    RIPE Atlas ağ ölçüm problarının konumları.
    İnternet kalitesini izler.
    """
    try:
        params = {"limit": 200, "status": 1, "fields": "id,geometry,country_code,asn_v4,status"}
        if RIPE_ATLAS_KEY:
            params["key"] = RIPE_ATLAS_KEY

        resp = requests.get(
            "https://atlas.ripe.net/api/v2/probes/",
            params=params,
            timeout=10
        )
        data = resp.json()
        probes = []
        for p in data.get("results", []):
            geo = p.get("geometry")
            if geo and geo.get("coordinates"):
                probes.append({
                    "id": p["id"],
                    "lat": geo["coordinates"][1],
                    "lng": geo["coordinates"][0],
                    "country": p.get("country_code", "??"),
                    "asn": p.get("asn_v4"),
                    "status": p.get("status", {}).get("name", "unknown"),
                })
        return jsonify({"probes": probes, "total": data.get("count", 0)})
    except Exception as e:
        return jsonify({"probes": [], "error": str(e)})


# ─────────────────────────────────────────────────────────────
#  GEOINT — Uydu Görüntü Kaynakları (Public)
# ─────────────────────────────────────────────────────────────

@app.route('/api/geoint/sentinel-hub')
def sentinel_hub():
    """
    NASA GIBS / Sentinel Hub tile endpoint proxy.
    ?lat=39&lng=35&zoom=10&layer=MODIS_Terra_CorrectedReflectance_TrueColor
    """
    lat   = request.args.get('lat', '39')
    lng   = request.args.get('lng', '35')
    zoom  = request.args.get('zoom', '8')
    layer = request.args.get('layer', 'MODIS_Terra_CorrectedReflectance_TrueColor')

    # NASA GIBS WMS endpoint (public, no key needed)
    tile_url = (
        f"https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?"
        f"SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0"
        f"&LAYERS={layer}"
        f"&CRS=EPSG:4326&BBOX={float(lat)-2},{float(lng)-2},{float(lat)+2},{float(lng)+2}"
        f"&WIDTH=512&HEIGHT=512&FORMAT=image/png"
    )
    return jsonify({"tile_url": tile_url, "layer": layer, "source": "NASA GIBS"})


# app.py dosyasına uygun bir yere ekle
@app.route('/api/geoint/firms-fires')
def firms_fires():
    MAP_KEY = os.getenv('FIRMS_MAP_KEY', 'SENIN_API_KEYIN')

    try:
        # DEĞİŞİKLİK 1: Kaynağı VIIRS yap (Daha fazla veri gelir)
        source = "VIIRS_SNPP_NRT"

        # Dünya geneli koordinatlar
        area = "-180,-90,180,90"

        # DEĞİŞİKLİK 2: Sondaki '1' değerini '3' yap (Son 3 günün verisi)
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{source}/{area}/3"

        resp = requests.get(url, timeout=10)

        # Terminale gelen veriyi tekrar bas (Kontrol için)
        print(f"NASA YANITI (İLK 200 KARAKTER): {resp.text[:200]}")

        if resp.status_code != 200:
            return jsonify({"fires": [], "error": f"HTTP {resp.status_code}"})

        lines = resp.text.strip().split('\n')

        # Eğer sadece başlık varsa (1 satır), veri yok demektir
        if len(lines) <= 1:
            return jsonify({"fires": [], "total": 0, "source": "NASA (Veri Yok)"})

        fires = []
        high_intensity_count = 0

        # Verileri işlemeye başla
        for line in lines[1:1000]:  # Sınırı biraz artırdık
            parts = line.split(',')
            if len(parts) >= 3:
                try:
                    brightness = float(parts[2])
                    # VIIRS için parlaklık değerleri MODIS'ten farklıdır (genelde Kelvin)
                    if brightness > 350:
                        high_intensity_count += 1

                    fires.append({
                        "lat": float(parts[0]),
                        "lng": float(parts[1]),
                        "brightness": brightness,
                        "_overlayType": "osint",
                        "_osintType": "fire",
                        "_color": "#ff3c00"
                    })
                except:
                    continue

        return jsonify({
            "fires": fires,
            "total": len(fires),
            "highIntensity": high_intensity_count,
            "source": f"NASA FIRMS ({source})"
        })
    except Exception as e:
        return jsonify({"fires": [], "error": str(e)})

@app.route('/api/economics/country-stats/<country_code>')
def get_country_macro_stats(country_code):
        """
        Dünya Bankası API'sinden Beşeri Sermaye Endeksi (HCI) ve GSYİH verilerini çeker.
        Örnek: country_code = TR, US, CN
        """
        try:
            # NY.GDP.MKTP.CD = GDP (Current USD)
            # HD.HCI.OVRL = Human Capital Index
            url = f"https://api.worldbank.org/v2/country/{country_code}/indicator/HD.HCI.OVRL?format=json&date=2024:2026"
            resp = requests.get(url, timeout=10)
            data = resp.json()

            # Basit bir parse işlemiyle veriyi temizleyip döndür
            actual_data = data[1] if len(data) > 1 else []
            return jsonify({"country": country_code, "human_capital_index": actual_data})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/infra/power-plants')
def api_power_plants():
            """
            CSV formatındaki elektrik santralleri veritabanını okur ve hafifletilmiş JSON döndürür.
            Globe.gl'i yormamak için sadece koordinatları olanları ve temel bilgileri alır.
            """
            file_path = os.path.join(os.path.dirname(__file__), 'global_power_plants.csv')

            if not os.path.exists(file_path):
                return jsonify({"error": "Veritabanı dosyası bulunamadı."}), 404

            plants = []
            try:
                # encoding utf-8 hatası alırsan 'ISO-8859-1' yapabilirsin
                with open(file_path, mode='r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        try:
                            # Koordinatları ve kapasiteyi güvenli bir şekilde sayıya (float) çevir
                            lat = float(row.get('latitude', ''))
                            lng = float(row.get('longitude', ''))
                            capacity = float(row.get('capacity_mw', 0) or 0)
                        except ValueError:
                            # Eğer veri boşsa veya metin içeriyorsa bu satırı atla (HAYAT KURTARAN KISIM)
                            continue

                        # Performans ve stratejik önem için 50 MW altındaki küçük tesisleri filtrele
                        if capacity < 50:
                            continue

                        plants.append({
                            "name": row.get('name', 'Bilinmeyen Santral'),
                            "country": row.get('country_long', 'Bilinmeyen Ülke'),
                            "lat": lat,
                            "lng": lng,
                            "type": row.get('primary_fuel', 'Other').lower(),
                            "capacity": f"{capacity} MW"
                        })

                return jsonify({"success": True, "total": len(plants), "data": plants})
            except Exception as e:
                return jsonify({"success": False, "error": str(e)}), 500



@app.route('/api/infra/water-resources')
def api_water_resources():
    file_path = os.path.join(os.path.dirname(__file__), 'global_dams.csv')

    if not os.path.exists(file_path):
        return jsonify({"success": False, "error": "global_dams.csv dosyası bulunamadı."}), 404

    dams = []
    try:
        with open(file_path, mode='r', encoding='utf-8') as f:
            # 1. Fazladan olan ilk satırı (Source.Name;Dams of Africa...) atla
            next(f)

            # 2. Ayırıcı olarak virgül yerine noktalı virgül (delimiter=';') kullan
            reader = csv.DictReader(f, delimiter=';')

            for row in reader:
                try:
                    # 3. Sayılardaki virgülleri (,) noktaya (.) çevir ki Python anlayabilsin
                    lat_str = row.get('Decimal degree latitude', '').replace(',', '.').strip()
                    lng_str = row.get('Decimal degree longitude', '').replace(',', '.').strip()
                    cap_str = row.get('Reservoir capacity (million m3)', '0').replace(',', '.').strip()

                    if not lat_str or not lng_str:
                        continue

                    lat = float(lat_str)
                    lng = float(lng_str)
                    capacity_mcm = float(cap_str) if cap_str else 0
                except (ValueError, TypeError):
                    continue  # Hatalı/boş olanları atla

                if capacity_mcm < 10:  # Çok küçükleri haritada gösterme (Performans)
                    continue

                capacity_km3 = capacity_mcm / 1000 if capacity_mcm >= 1000 else capacity_mcm

                dams.append({
                    "name": row.get('Name of dam', 'Bilinmeyen Baraj'),
                    "country": row.get('Country', 'Bilinmeyen Ülke'),
                    "lat": lat,
                    "lng": lng,
                    "type": "dam",
                    "capacity": f"{capacity_km3:.2f} km³" if capacity_mcm >= 1000 else f"{capacity_mcm} MCM",
                    "raw_capacity": capacity_mcm
                })

        return jsonify({"success": True, "total": len(dams), "data": dams})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
# ─────────────────────────────────────────────────────────────
#  SOCKET.IO
# ─────────────────────────────────────────────────────────────

@socketio.on('connect')
def handle_connect():
    print("🌟 İstemci bağlandı!")


# ─────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"""
    ╔══════════════════════════════════════════════════╗
    ║        RADARSCOPE C4ISR v5.0 — GEOINT+          ║
    ╠══════════════════════════════════════════════════╣
    ║  Port       : {port}                              ║
    ║  OpenSky    : {'KONUMLU' if OPENSKY_USER else 'ANONİM'}                        ║
    ║  Cloudflare : {'HAZIR' if CF_API_KEY else 'BEKLİYOR'}                        ║
    ║  Gemini AI  : {'HAZIR' if GEMINI_API_KEY else 'BEKLİYOR'}                        ║
    ║  Shodan     : {'HAZIR' if SHODAN_API_KEY else 'BEKLİYOR'}                        ║
    ║  GEOINT     : NASA FIRMS + GIBS                  ║
    ║  Infra      : Fiber + Tor + BGP + RIPE           ║
    ╚══════════════════════════════════════════════════╝
    """)
    socketio.run(app, debug=False, port=port, allow_unsafe_werkzeug=True)


# Çalıştırmak için:
# .\.venv\Scripts\activate
# python app.py
# pip install python-multipart
# pip install requests google-generativeai flask flask-socketio python-dotenv
