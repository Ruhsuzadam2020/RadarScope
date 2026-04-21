from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
from sgp4.api import Satrec, jday
import math

app = Flask(__name__)
CORS(app)

OPENSKY_URL = "https://opensky-network.org/api/states/all"
CELESTRAK_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"

mil_prefixes = [
    'TUAF', 'TURAF', 'HVK', 'ASENA', 'AZAF', 'RFF', 'RSY', 'CHD', 'RA-',
    'IRAF', 'IRG', 'IRGC', 'FARS', 'EP-', 'IAF', 'ISR', 'LY-',
    'HRV', 'HAF', 'RSR', 'SVN', 'BUL', 'ROM', 'RCH', 'REACH', 'SAM',
    'FORGE', 'DUKE', 'VADER', 'JAKE', 'YANKY', 'AE', 'AF1', 'PAT',
    'RRR', 'ASCOT', 'SHED', 'UPLFT', 'HKY', 'NATO', 'NAF', 'NCHO'
]
@app.route('/get-data')
def get_data():
    data_type = request.args.get('type', 'civilian')
    headers = {'User-Agent': 'Mozilla/5.0'}

    try:
        if data_type in ['civilian', 'military']:
            response = requests.get(OPENSKY_URL, headers=headers, timeout=15)
            if response.status_code != 200:
                print(f"OpenSky Hatası: {response.status_code}")
                return jsonify([])

            data = response.json()
            states = data.get("states", [])
            results = []

            if states:
                for s in states:
                    if s[5] is None or s[6] is None:
                        continue

                    callsign = (s[1] or "").strip().upper()
                    is_mil = any(p in callsign for p in mil_prefixes)

                    if (data_type == 'military' and is_mil) or (data_type == 'civilian' and not is_mil):
                        results.append({
                            "lat": s[6],
                            "lng": s[5],
                            "alt": (s[7] or 0) / 1000,
                            "callsign": callsign or "UNK",
                            "velocity": (s[9] or 0)
                        })

                    if len(results) >= 400: break  # Performans için üst sınır

            print(f"SUCCESS: {data_type.upper()} katmanı için {len(results)} birim gönderildi.")
            return jsonify(results)

        elif data_type == 'satellites':
            response = requests.get(CELESTRAK_URL, timeout=15)
            if response.status_code != 200:
                print("Celestrak Bağlantı Hatası")
                return jsonify([])

            lines = response.text.splitlines()
            combined_data = []
            now = datetime.utcnow()

            for i in range(0, min(len(lines), 90), 3):
                try:
                    name = lines[i].strip()
                    s_line1 = lines[i + 1]
                    s_line2 = lines[i + 2]

                    satellite = Satrec.twoline2rv(s_line1, s_line2)
                    orbit_path = []

                    for m in range(0, 105, 5):
                        f_time = now + timedelta(minutes=m)
                        jd, fr = jday(f_time.year, f_time.month, f_time.day, f_time.hour, f_time.minute, f_time.second)
                        e, r, v = satellite.sgp4(jd, fr)

                        if e == 0:
                            x, y, z = r[0], r[1], r[2]
                            dist = math.sqrt(x ** 2 + y ** 2 + z ** 2)
                            lat = math.asin(z / dist) * (180 / math.pi)
                            lng = (math.atan2(y, x) * (180 / math.pi) - (f_time.hour + f_time.minute / 60) * 15) % 360
                            if lng > 180: lng -= 360
                            orbit_path.append([lat, lng, 0.12])

                    if orbit_path:
                        combined_data.append({
                            "callsign": name,
                            "path": [orbit_path],
                            "lat": orbit_path[0][0],
                            "lng": orbit_path[0][1],
                            "alt": 300
                        })
                except Exception as ex:
                    continue

            print(f"SUCCESS: SPACE katmanı için {len(combined_data)} uydu hazır.")
            return jsonify(combined_data)

        return jsonify([])

    except Exception as e:
        print(f"KRİTİK SUNUCU HATASI: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)