# app.py - DÜZELTİLMİŞ VERSİYON
import os
import time
import requests
from flask import Flask, send_from_directory, jsonify, request
from flask_socketio import SocketIO
from dotenv import load_dotenv
import threading
import json
from datetime import datetime

load_dotenv()

app = Flask(__name__, static_folder='.')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-radar-key')

socketio = SocketIO(app, cors_allowed_origins=[
    "http://localhost:5000",
    "https://ruhsuzadam2020.github.io",
    "https://radarscope.onrender.com"
], async_mode='threading')

OPENSKY_USER = os.getenv('OPENSKY_USER', '')
OPENSKY_PASS = os.getenv('OPENSKY_PASS', '')
CF_API_KEY = os.getenv('CF_API_KEY', '')

# OpenSky için rate limiting yönetimi
opensky_rate_limit = {'remaining': 10, 'reset_time': 0}


@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


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
        return jsonify({
            'states': [],
            'error': str(e),
            'source': 'error'
        }), 500


# ── CelesTrak SATCAT/GP (düzeltilmiş) ──────────────────────────
@app.route('/api/celestrak/satcat')
def celestrak_satcat():
    """CelesTrak GP (General Perturbations) JSON proxy"""
    try:
        # CelesTrak GP endpoint - aktif uydu kataloğu
        url = "https://celestrak.org/SOCRATES/query.php"
        # GP JSON endpoint — doğru URL
        gp_url = "https://celestrak.org/GP/GP.php?GROUP=active&FORMAT=json"
        resp = requests.get(gp_url, timeout=20, headers={
            'User-Agent': 'RADARSCOPE-C4ISR/4.0',
            'Accept': 'application/json'
        })

        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                return jsonify(data[:200])
            else:
                return jsonify([])
        else:
            print(f"[CelesTrak] HTTP {resp.status_code}")
            return jsonify([])

    except Exception as e:
        print(f"[CelesTrak] Hata: {e}")
        return jsonify([])


# ── Cloudflare Radar Proxy (düzeltilmiş) ────────────────────
@app.route('/api/cloudflare/<path:cf_path>')
def cloudflare_proxy(cf_path):
    if not CF_API_KEY:
        print("[Cloudflare] CF_API_KEY eksik — boş yanıt döndürülüyor")
        return jsonify({'result': {'top_0': []}, 'error': 'CF_API_KEY yapılandırılmamış'}), 200

    cf_url = f"https://api.cloudflare.com/client/v4/radar/{cf_path}"
    headers = {
        'Authorization': f'Bearer {CF_API_KEY}',
        'Content-Type': 'application/json',
    }
    try:
        resp = requests.get(cf_url, params=dict(request.args), headers=headers, timeout=10)

        if resp.status_code == 200:
            return jsonify(resp.json())
        elif resp.status_code == 403:
            print(f"[Cloudflare] 403 Yetkisiz — API key geçersiz olabilir")
            return jsonify({'result': {'top_0': []}, 'error': 'CF API key yetkisiz'}), 200
        elif resp.status_code == 429:
            print(f"[Cloudflare] 429 Rate limit")
            return jsonify({'result': {'top_0': []}, 'error': 'CF rate limit'}), 200
        else:
            print(f"[Cloudflare] HTTP {resp.status_code}")
            return jsonify({'result': {'top_0': []}, 'error': f'CF HTTP {resp.status_code}'}), 200

    except Exception as e:
        print(f"[Cloudflare] Proxy hatası: {e}")
        return jsonify({'result': {'top_0': []}, 'error': str(e)}), 200


# ── Sahte veri üretme (SADECE gerçek veri yoksa) ────────────
def generate_mock_data(amount=50):
    """Sadece acil durum mock verisi - normalde kullanılmaz"""
    import random
    routes = [
        (41.0, 29.0), (40.8, 29.5), (41.2, 28.8),
        (51.5, -0.1), (48.9, 2.3), (40.7, -74.0),
        (55.8, 37.6), (35.7, 139.7), (22.3, 114.2),
        (-33.9, 151.2), (28.6, 77.2), (1.4, 103.8),
    ]

    callsigns = ['THY1', 'DLH432', 'UAE205', 'AFR83', 'BAW7', 'SAS568', 'KLM67']

    return [{
        'icao24': f'abc123{i}',
        'callsign': f"{callsigns[i % len(callsigns)]}{random.randint(10, 999)}",
        'origin_country': ['Turkey', 'USA', 'UK', 'France', 'Germany'][i % 5],
        'time_position': int(time.time()),
        'last_contact': int(time.time()) - random.randint(0, 30),
        'longitude': routes[i % len(routes)][1] + (random.random() - 0.5) * 5,
        'latitude': routes[i % len(routes)][0] + (random.random() - 0.5) * 5,
        'baro_altitude': random.uniform(3000, 12000),
        'velocity': random.uniform(200, 900),
        'true_track': random.uniform(0, 360),
        'on_ground': False,
        '_mock': True
    } for i in range(amount)]


# ── Socket.IO canlı veri yayını ─────────────────────────────
def fetch_radar_data():
    last_opensky_status = "initial"

    while True:
        try:
            # Backend üzerinden OpenSky proxy
            resp = requests.get('http://localhost:5000/api/opensky/states', timeout=15)
            data = resp.json()

            if data.get('states') and len(data.get('states', [])) > 0:
                # Gerçek veri var
                data['_real_data'] = True
                data['_timestamp'] = datetime.utcnow().isoformat()
                socketio.emit('live_flight_data', data)
                print(f"[OpenSky] ✓ Gerçek veri — {len(data.get('states', []))} uçuş")
                last_opensky_status = "live"
            else:
                # Hiç veri yok veya hata durumu
                error_msg = data.get('error', 'No states')

                if last_opensky_status != "empty":
                    # Sadece bir kere "veri yok" mesajı gönder
                    socketio.emit('live_flight_data', {
                        'states': [],
                        'error': error_msg,
                        'real_data': False,
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    print(f"[OpenSky] ⚠ Veri yok: {error_msg}")
                    last_opensky_status = "empty"

        except Exception as e:
            print(f"[OpenSky] Bağlantı hatası: {e}")
            socketio.emit('live_flight_data', {
                'states': [],
                'error': str(e),
                'real_data': False,
                'timestamp': datetime.utcnow().isoformat()
            })

        time.sleep(12)


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
    ╚════════════════════════════════════════╝
    """)

    thread = threading.Thread(target=fetch_radar_data)
    thread.daemon = True
    thread.start()

    socketio.run(app, debug=False, port=port, allow_unsafe_werkzeug=True)