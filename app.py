import os
import time
import requests
from flask import Flask, send_from_directory, jsonify, request
from flask_socketio import SocketIO
from dotenv import load_dotenv
import threading

load_dotenv()

app = Flask(__name__, static_folder='.')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-radar-key')

socketio = SocketIO(app, cors_allowed_origins=[
    "http://localhost:5000",
    "https://ruhsuzadam2020.github.io"
], async_mode='threading')

OPENSKY_USER = os.getenv('OPENSKY_USER', 'numanyusuf14@gmail.com')
OPENSKY_PASS = os.getenv('OPENSKY_PASS', '@2vuaX8kUH5j-iG')
CF_API_KEY   = os.getenv('CF_API_KEY',   'cfut_LUtDawiIwx2Am9GtV773SeyrKGZ25g4VaEJ1p9kc5c38e8a5')


@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


# ── Cloudflare Radar Proxy ────────────────────────────────────
@app.route('/api/cloudflare/<path:cf_path>')
def cloudflare_proxy(cf_path):
    cf_url = f"https://api.cloudflare.com/client/v4/radar/{cf_path}"
    headers = {
        'Authorization': f'Bearer {CF_API_KEY}',
        'Content-Type': 'application/json',
    }
    try:
        resp = requests.get(cf_url, params=dict(request.args), headers=headers, timeout=10)
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── CelesTrak GP Proxy ────────────────────────────────────────
@app.route('/api/celestrak/gp')
def celestrak_gp():
    group = request.args.get('GROUP', 'stations')
    url = f"https://celestrak.org/SATCAT/satcat.json"
    try:
        resp = requests.get(url, timeout=15, headers={'User-Agent': 'RADARSCOPE-C4ISR/4.0'})
        data = resp.json()
        return jsonify(data[:300]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── CelesTrak TLE/GP JSON by group ───────────────────────────
@app.route('/api/celestrak/group')
def celestrak_group():
    group = request.args.get('GROUP', 'active')
    url = f"https://celestrak.org/SATCAT/satcat.json"
    try:
        resp = requests.get(url, timeout=15, headers={'User-Agent': 'RADARSCOPE-C4ISR/4.0'})
        data = resp.json()
        return jsonify(data[:300]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def fetch_radar_data():
    while True:
        try:
            url = 'https://opensky-network.org/api/states/all?lamin=-90&lomin=-180&lamax=90&lomax=180'
            response = requests.get(url, auth=(OPENSKY_USER, OPENSKY_PASS), timeout=10)
            data = response.json()
            socketio.emit('live_flight_data', data)
            print(f"[OpenSky] OK — {len(data.get('states', []))} states")
        except Exception as e:
            print(f"[OpenSky] ERR: {e}")
            socketio.emit('live_flight_data', {"states": [], "error": str(e)})
        time.sleep(15)


@socketio.on('connect')
def handle_connect():
    print("İstemci bağlandı!")


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"RADARSCOPE C4ISR — Port: {port} | OpenSky: {OPENSKY_USER}")
    thread = threading.Thread(target=fetch_radar_data)
    thread.daemon = True
    thread.start()
    socketio.run(app, debug=True, port=port, allow_unsafe_werkzeug=True)
