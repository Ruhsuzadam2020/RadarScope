let currentLayer = 'civilian';
const statusEl = document.getElementById('layer-indicator'); // Başlıkta katmanı gösterir

const myGlobe = Globe()(document.getElementById('globeViz'))
    .globeImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg')
    .bumpImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png')
    .backgroundImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/night-sky.png')
    .showAtmosphere(true)
    .atmosphereColor("#3a228a")
    .atmosphereAltitude(0.2)
    .onPointClick(d => showDetails(d)); 


const renderer = myGlobe.renderer();
renderer.setPixelRatio(window.devicePixelRatio);
myGlobe.pointOfView({ lat: 39, lng: 35, altitude: 2.5 });


function toggleLayer(layer, btn) {
    currentLayer = layer;
    document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    if(statusEl) statusEl.innerText = layer.toUpperCase();
    updateData(); 
}

async function updateData() {
    try {
        const res = await fetch(`http://127.0.0.1:5000/get-data?type=${currentLayer}`);
        const data = await res.json();

        console.log(`[${currentLayer.toUpperCase()}] Veri Alındı:`, data.length, "kayıt"); 
        
        // Önemli: Eğer veri boşsa haritayı temizle ve kullanıcıyı uyar
        if (!data || data.length === 0) {
            myGlobe.pointsData([]).pathsData([]);
            updateLiveList([]); 
            return;
        }

        // Katmanları temizle
        myGlobe.pointsData([]).pathsData([]);

        if (currentLayer === 'satellites') {
            // UYDULAR İÇİN: Yörünge Çizgileri
            myGlobe
                .pathsData(data)
                .pathPoints(d => d.path[0]) // Backend'deki [[...]] yapısını tek katmana indirir
                .pathColor(() => 'rgba(0, 242, 255, 0.6)')
                .pathDashLength(0.1)
                .pathDashGap(0.01)
                .pathDashAnimateTime(10000)
                .pathStroke(0.5);

            myGlobe
                .pointsData(data)
                .pointColor(() => '#ffff00')
                .pointRadius(0.25)
                .pointAltitude(0.15)
                .pointLabel(d => `🛰️ ${d.callsign}`);
        } else {
            // UÇAKLAR İÇİN
            myGlobe
                .pointsData(data)
                .pointColor(d => currentLayer === 'military' ? '#ff0000' : '#00f2ff')
                .pointAltitude(d => Math.min(d.alt * 0.01, 0.5)) // İrtifa çok yüksekse dünyadan kopmasın
                .pointRadius(0.18)
                .pointLabel(d => `${currentLayer === 'military' ? '🎖️' : '✈️'} ${d.callsign}`);
        }

        // Tıklama olayını güncelle
        myGlobe.onPointClick(d => {
            myGlobe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1 }, 1000);
            showDetails(d);
        });

        updateLiveList(data);
    } catch (e) {
        console.error("Veri çekme sırasında hata:", e);
    }
}

// --- Canlı Liste Güncelleme (Hata Kontrollü) ---
function updateLiveList(data) {
    const listEl = document.getElementById('live-list');
    if (!listEl) return;
    listEl.innerHTML = ''; 

    if (data.length === 0) {
        listEl.innerHTML = '<div class="list-item" style="color: #ff9800; border-left-color: #ff9800;">⚠️ Veri Alınamadı...</div>';
        return;
    }

    data.slice(0, 20).forEach(item => { // 15 yerine 20 gösterelim, liste dolsun
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items: center;">
                <b style="font-size: 13px;">${item.callsign || 'UNK-404'}</b>
                <span style="color:#00f2ff; font-family: monospace;">${(item.alt || 0).toFixed(1)} km</span>
            </div>
            <div style="font-size:9px; opacity:0.6; margin-top:5px; letter-spacing: 1px;">
                SPD: ${item.velocity ? (item.velocity * 3.6).toFixed(0) : '0'} KM/H
            </div>
        `;
        div.onclick = () => {
            myGlobe.pointOfView({ lat: item.lat, lng: item.lng, altitude: 0.8 }, 1000);
            showDetails(item);
        };
        listEl.appendChild(div);
    });
}


function showDetails(d) {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;

    document.getElementById('detail-callsign').innerText = `CALLSIGN: ${d.callsign || 'N/A'}`;
    document.getElementById('detail-coords').innerText = `LOC: ${d.lat.toFixed(2)}, ${d.lng.toFixed(2)}`;
    document.getElementById('detail-alt').innerText = `ALT: ${d.alt.toFixed(2)} km`;
    document.getElementById('detail-speed').innerText = `SPD: ${d.velocity ? (d.velocity * 3.6).toFixed(0) : '0'} km/h`;
    
    panel.style.display = 'block';
}

setInterval(() => {
    const clockEl = document.getElementById('utc-clock');
    if(clockEl) clockEl.innerText = new Date().toISOString().substr(11, 8);
}, 1000);

function toggleLights(btn) {
    myGlobe.globeImageUrl(btn.checked ? 
        'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg' : 
        'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-blue-marble.jpg');
}

function toggleAtmosphere(btn) {
    myGlobe.showAtmosphere(btn.checked);
}

function resetCamera() {
    myGlobe.pointOfView({ lat: 39, lng: 35, altitude: 2.5 }, 1000);
}

// Başlat
updateData();
setInterval(updateData, 15000);