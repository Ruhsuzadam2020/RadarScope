# RadarScope
3D Global Takip Sistemi: Sivil Havacılık, Askeri Hareketlilik ve Uydu Yörüngelerini Flask ve Globe.gl ile gerçek zamanlı görselleştiren taktiksel radar arayüzü.  English:   3D Global Tracking System: A tactical radar interface for real-time visualization of civilian flights, military movements, and satellite orbits using Flask and Globe.gl.

Project Command Rail
Command Rail, küresel hava sahası ve yörünge dinamiğini tek bir arayüzde toplayan full-stack bir veri görselleştirme projesidir.

Özellikler / Features
Real-time Tracking: OpenSky Network ve Celestrak API'ları ile anlık veri akışı.

Tactical UI: Orbitron fontu ve neon estetiği ile modernize edilmiş "War Room" arayüzü.

Multi-Layer Support: Sivil, Askeri ve Uzay (Uydu) katmanları arasında dinamik geçiş.

Orbital Mechanics: SGP4 algoritması kullanılarak hesaplanan hassas uydu yörüngeleri.

Interactive Unit Details: Birimlere odaklanma, telemetri verilerini (hız, irtifa, koordinat) görüntüleme.

Teknoloji Yığını / Tech Stack
Frontend: JavaScript (ES6+), Three.js tabanlı Globe.gl, HTML5, CSS3.

Backend: Python 3.x, Flask, Flask-CORS.

Algorithms & Libraries: SGP4 (Satellite Tracking), Requests.

Kurulum / Installation
Repository'yi klonlayın:

Bash
git clone https://github.com/kullaniciadin/command-rail.git
Gerekli Python kütüphanelerini yükleyin:

Bash
pip install flask flask-cors requests sgp4
Backend'i başlatın:

Bash
python app.py
Frontend'i çalıştırın:
index.html dosyasını bir Live Server (VS Code) ile açın.
