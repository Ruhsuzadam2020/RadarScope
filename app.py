import os
import time
import requests
from flask import Flask, send_from_directory
from flask_socketio import SocketIO
from dotenv import load_dotenv
import threading

# .env dosyasını yüklüyoruz
load_dotenv()

app = Flask(__name__, static_folder='.')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-radar-key')

# app.py içinde:
socketio = SocketIO(app, cors_allowed_origins=[
    "http://localhost:5000",
    "https://ruhsuzadam2020.github.io"
], async_mode='eventlet')


@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


def fetch_radar_data():
    """Arka planda sürekli çalışıp OpenSky verisini çeken ve Frontend'e iten fonksiyon (Kategori 1 & 2)"""
    while True:
        try:
            url = 'https://opensky-network.org/api/states/all?lamin=-90&lomin=-180&lamax=90&lomax=180'
            response = requests.get(url, timeout=10)
            data = response.json()

            # Veriyi WebSocket üzerinden tarayıcıya "live_flight_data" kanalıyla gönderiyoruz
            socketio.emit('live_flight_data', data)
            print("Veri başarıyla Frontend'e itildi (WebSocket).")

        except Exception as e:
            print(f"API Hatası: {e}")
            socketio.emit('live_flight_data', {"states": [], "error": str(e)})

        # Her 15 saniyede bir günceller
        time.sleep(15)


@socketio.on('connect')
def handle_connect():
    print("Yeni bir komuta merkezi (istemci) bağlandı!")


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"RADARSCOPE C4ISR Sunucusu Başlatılıyor... Port: {port}")

    # Arka plan veri çekme işlemini başlat
    thread = threading.Thread(target=fetch_radar_data)
    thread.daemon = True
    thread.start()

    socketio.run(app, debug=True, port=port, allow_unsafe_werkzeug=True)