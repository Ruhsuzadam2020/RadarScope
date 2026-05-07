
import os
import time
import requests
from flask import Flask, send_from_directory, jsonify, request, Response
from flask_socketio import SocketIO
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
    allow_upgrades=True,   # polling → websocket upgrade izni
    ping_timeout=60,       # Render'ın proxy timeout'u için uzun tut
    ping_interval=25,
)

OPENSKY_USER = os.getenv('OPENSKY_USER', '')
OPENSKY_PASS = os.getenv('OPENSKY_PASS', '')
CF_API_KEY = os.getenv('CF_API_KEY', '')
COLLECT_API_KEY = os.getenv('COLLECT_API_KEY', '') # CollectAPI anahtarın

# OpenSky için rate limiting yönetimi
opensky_rate_limit = {'remaining': 10, 'reset_time': 0}


@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


@app.route('/favicon.ico')
def favicon():
    return Response(status=204)


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


# ── OpenSky Proxy (CORS ve rate limit çözümü) ─────────────────
@app.route('/api/opensky/states')
def opensky_proxy():
    global opensky_rate_limit

    # Rate limit kontrolü
    now = time.time()
    if now < opensky_rate_limit['reset_time'] and opensky_rate_limit['remaining'] <= 0:
        return jsonify({
            'states': [],
            'error': f'Rate limit - Bekleyin: {int(opensky_rate_limit["reset_time"] - now)}s',
            'source': 'error'
        }), 429

    try:
        lamin = request.args.get('lamin', '-90')
        lomin = request.args.get('lomin', '-180')
        lamax = request.args.get('lamax', '90')
        lomax = request.args.get('lomax', '180')

        url = f'https://opensky-network.org/api/states/all?lamin={lamin}&lomin={lomin}&lamax={lamax}&lomax={lomax}'

        headers = {'User-Agent': 'RADARSCOPE-C4ISR/4.0'}
        auth = None

        # Kimlik doğrulama varsa kullan
        if OPENSKY_USER and OPENSKY_PASS:
            auth = (OPENSKY_USER, OPENSKY_PASS)

        resp = requests.get(url, auth=auth, headers=headers, timeout=12)

        if resp.status_code == 200:
            # Rate limit başarılı - reset
            opensky_rate_limit['remaining'] = 10
            data = resp.json()
            data['source'] = 'opensky-live'
            data['timestamp'] = datetime.utcnow().isoformat()
            return jsonify(data)
        elif resp.status_code == 429:
            # Rate limit aşıldı - 60 sn bekle
            opensky_rate_limit['remaining'] = 0
            opensky_rate_limit['reset_time'] = now + 60
            return jsonify({
                'states': [],
                'error': 'OpenSky rate limit (10 req per 60s)',
                'source': 'error',
                'retry_after': 60
            }), 429
        else:
            return jsonify({
                'states': [],
                'error': f'OpenSky HTTP {resp.status_code}',
                'source': 'error'
            }), resp.status_code

    except requests.exceptions.Timeout:
        return jsonify({
            'states': [],
            'error': 'Timeout - OpenSky sunucusu yanıt vermiyor',
            'source': 'error'
        }), 504
    except Exception as e:
        print(f"[OpenSky] Backend Hatası: {e}")  # <-- BU SATIRI EKLE
        return jsonify({
            'states': [],
            'error': str(e),
            'source': 'error'
        }), 500


# ── OSINT Proxy (Deprem ve Haberler) ────────────────────────
@app.route('/api/osint/earthquakes')
def osint_earthquakes():
    try:
        # USGS - Son 24 Saatteki 4.5 ve üzeri global depremler
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
        # CollectAPI Dünya ve Jeopolitik Haberleri
        headers = {
            "content-type": "application/json",
            "authorization": f"apikey {COLLECT_API_KEY}"
        }
        resp = requests.get("https://api.collectapi.com/news/getNews?country=tr&tag=world", headers=headers, timeout=10)
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"result": [], "error": str(e)})
# ── Cloudflare Radar Proxy (düzeltilmiş) ────────────────────
# ── Cloudflare Radar Proxy (Mocksuz - Sadece Canlı Veri) ──────
@app.route('/api/cloudflare/<path:cf_path>')
def cloudflare_proxy(cf_path):
    if not CF_API_KEY:
        return jsonify({'error': 'CF_API_KEY eksik', 'result': {'top_0': []}}), 200

    cf_url = f"https://api.cloudflare.com/client/v4/radar/{cf_path}"
    headers = {
        'Authorization': f'Bearer {CF_API_KEY}',
        'Content-Type': 'application/json',
    }
    try:
        resp = requests.get(cf_url, params=dict(request.args), headers=headers, timeout=10)

        if resp.status_code == 200:
            return jsonify(resp.json())
        else:
            print(f"[Cloudflare] API Hatası: HTTP {resp.status_code} - {resp.text}")
            # Sahte veri döndürmek yerine boş liste döndür
            return jsonify({'result': {'top_0': []}, 'error': f"API Hatası: {resp.status_code}"})

    except Exception as e:
        print(f"[Cloudflare] Proxy hatası: {e}")
        return jsonify({'result': {'top_0': []}, 'error': str(e)}), 200


# ── Socket.IO bağlantı logu (opsiyonel) ─────────────────────
@socketio.on('connect')
def handle_connect():
    print("🌟 İstemci bağlandı!")


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"""
    ╔════════════════════════════════════════╗
    ║     RADARSCOPE C4ISR v4.0             ║
    ╠════════════════════════════════════════╣
    ║  Port: {port}                           ║
    ║  OpenSky: {'KONUMLU' if OPENSKY_USER else 'ANONİM'}    ║
    ║  Cloudflare: {'HAZIR' if CF_API_KEY else 'BEKLİYOR'} ║
    ║  Mod: HTTP REST Polling               ║
    ╚════════════════════════════════════════╝
    """)

    socketio.run(app, debug=False, port=port, allow_unsafe_werkzeug=True)