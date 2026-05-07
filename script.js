/* ============================================================
   RADARSCOPE v4.0 — Main Script
   Fixes: overlay independence, civilian/military misclassification
   New: Cyber war visualization, Conflict zones, Conflict AI analysis, Radar coverage
   ============================================================ */

'use strict';

// ── STATE ──────────────────────────────────────────────────
const STATE = {
    layer: null,  // No layer selected by default — overlays work independently
    overlays: { airBase: false, naval: false, railway: false, cyber: false, conflict: false, radar: false },
    selectedCountry: 'all',
    allData: [],
    liveFlights: [],
    flightHistory: {},
    pickingTarget: false,
    pickingRadar: false,
    filterAlt: 0,
    filterSpd: 0,
    cyberAttacks: [],
    cyberInterval: null,
    radarSystems: [],
    customRadars: [],
    conflictZones: [],
};

// ── WEBSOCKET ──────────────────────────────────────────────
const BACKEND_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://radarscope.onrender.com';

const socket = io(BACKEND_URL, {
    transports: ['polling', 'websocket'], // polling önce — Render'da daha güvenilir
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
    timeout: 20000,
});

let wsConnected = false;
let httpPollInterval = null;

socket.on('connect', () => {
    wsConnected = true;
    console.log('[Socket.IO] ✓ Bağlandı:', socket.io.engine.transport.name);
    if (httpPollInterval) { clearInterval(httpPollInterval); httpPollInterval = null; }
});

socket.on('live_flight_data', (raw) => {
    if (STATE.layer === 'civilian') processWebSocketData(raw);
});

socket.on('connect_error', (err) => {
    wsConnected = false;
    console.warn('[Socket.IO] Bağlanamadı:', err.message, '— HTTP polling devreye giriyor');
    startHttpPolling();
});

socket.on('disconnect', () => {
    wsConnected = false;
    startHttpPolling();
});

// HTTP Polling — Socket.IO çalışmazsa doğrudan /api/opensky/states çeker
function startHttpPolling() {
    if (httpPollInterval) return;
    httpPollInterval = setInterval(async () => {
        if (wsConnected || STATE.layer !== 'civilian') return;
        try {
            const res = await fetch('/api/opensky/states', { signal: AbortSignal.timeout(12000) });
            if (res.ok) processWebSocketData(await res.json());
        } catch (e) { console.warn('[HTTP Poll]', e.message); }
    }, 15000);
    // İlk isteği hemen gönder
    if (STATE.layer === 'civilian') {
        fetch('/api/opensky/states', { signal: AbortSignal.timeout(12000) })
            .then(r => r.json()).then(processWebSocketData).catch(() => {});
    }
}

socket.on('connect', () => {
    console.log('[WebSocket] Bağlandı ✓');
});

socket.on('disconnect', (reason) => {
    console.warn('[WebSocket] Bağlantı kesildi:', reason);
});

// ── GLOBE INIT ─────────────────────────────────────────────
const myGlobe = Globe()(document.getElementById('globeViz'))
    .globeImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg')
    .bumpImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png')
    .backgroundImageUrl('https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/night-sky.png')
    .showAtmosphere(true)
    .atmosphereColor('#1a0a5e')
    .atmosphereAltitude(0.22)
    .pointsData([])
    .pathsData([])
    .ringsData([])
    .onGlobeClick(onGlobeClick);

const renderer = myGlobe.renderer();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
myGlobe.pointOfView({ lat: 39, lng: 35, altitude: 2.5 });

myGlobe.onGlobeMouseMove && myGlobe.onGlobeMouseMove(({ lat, lng }) => {
    if (!lat || !lng) return;
    document.getElementById('mouse-lat').innerText = lat.toFixed(3);
    document.getElementById('mouse-lng').innerText = lng.toFixed(3);
});

// ── GLOBE CLICK ────────────────────────────────────────────
function onGlobeClick({ lat, lng }) {
    if (STATE.pickingTarget) {
        document.getElementById('sim-lat').value = lat.toFixed(4);
        document.getElementById('sim-lng').value = lng.toFixed(4);
        STATE.pickingTarget = false;
        document.getElementById('pick-mode-indicator').style.display = 'none';
        document.getElementById('globeViz').style.cursor = 'default';
        myGlobe.ringsData([{ lat, lng }])
            .ringColor(() => '#ff3c5f')
            .ringMaxRadius(5)
            .ringPropagationSpeed(3)
            .ringRepeatPeriod(1200);
        setTimeout(() => { if (!STATE.overlays.airBase) myGlobe.ringsData([]); }, 5000);
        return;
    }
    if (STATE.pickingRadar) {
        document.getElementById('radar-custom-lat').value = lat.toFixed(4);
        document.getElementById('radar-custom-lng').value = lng.toFixed(4);
        STATE.pickingRadar = false;
        document.getElementById('radar-pick-indicator').style.display = 'none';
        document.getElementById('globeViz').style.cursor = 'default';
        return;
    }
}

// ── LAYER SWITCH ───────────────────────────────────────────
function switchLayer(layer, btn) {
    // Toggle: clicking active layer deselects it
    if (STATE.layer === layer) {
        STATE.layer = null;
        STATE.liveFlights = [];
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('layer-indicator').innerText = '—';
        document.getElementById('bb-layer').innerText = 'NO LAYER';
        updateData();
        return;
    }
    STATE.layer = layer;
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('layer-indicator').innerText = layer.toUpperCase();
    document.getElementById('bb-layer').innerText = layer.toUpperCase() + ' LAYER';
    updateData();
}

// ── MAIN UPDATE FUNCTION ───────────────────────────────────
async function updateData() {
    let data = [];

    if (STATE.layer === null) {
        // No layer selected — just render overlays, no flight data
        renderOverlays();
        document.getElementById('active-count').innerText = `0 TRACKS`;
        document.getElementById('bb-count').innerText = 0;
        return;
    }

    if (STATE.layer === 'civilian') {
        if (STATE.liveFlights.length === 0 || STATE.liveFlights[0]?.type !== 'civilian') {
            // WebSocket verisi henüz gelmedi — boş göster, WebSocket bekle
            data = [];
            STATE.liveFlights = [];
        } else {
            data = STATE.liveFlights;
        }
    } else if (STATE.layer === 'military') {
        data = await fetchMilitaryFlights();
        STATE.liveFlights = data;
    } else if (STATE.layer === 'satellites') {
        data = await fetchSatelliteData();
        STATE.liveFlights = data;
    }

    const filtered = applyDataFilter(STATE.liveFlights);
    renderGlobePoints(filtered);
    renderLiveList(filtered);
    renderOverlays();

    document.getElementById('active-count').innerText = `${filtered.length} TRACKS`;
    document.getElementById('bb-count').innerText = filtered.length;
}

// ── PROCESS WEBSOCKET DATA ─────────────────────────────────
// FIX: Strict military classification — only by known callsign prefixes
const MIL_PREFIXES = ['MAGMA','REACH','JAKE','HOMER','TOPAZ','HAVOC',
    'COBRA','VIPER','JOLLY','IRON','GHOST','KNIFE','DEMON','FURY','RAPTOR',
    'EAGLE','FALCON','TALON','SHADOW','NIGHT','RCH','CNV','PAT','STEEL',
    'RANGER','WOLF','PANTHER','NOBLE','SPAR','EVAC','GRIM','BOXER','LANCE',
    'BONE','BUFF','SLAM','DUKE','RAVEN','BRONCO','DAGGER','FORCE','LIMA',
    'HERKY','TROY','COLT','ROCKY','VADER','TITAN','ZEUS','ARES','SPARTAN'];

function isMilitaryCallsign(cs) {
    if (!cs) return false;
    const upper = cs.trim().toUpperCase();
    // Must start with known military prefix — NOT just any airline code
    return MIL_PREFIXES.some(p => upper.startsWith(p));
}

function processWebSocketData(raw) {
    if (!raw.states || raw.states.length === 0) {
        // Gerçek veri yok — boş göster
        STATE.liveFlights = [];
        renderGlobePoints([]);
        renderLiveList([]);
        document.getElementById('active-count').innerText = `0 TRACKS`;
        document.getElementById('bb-count').innerText = 0;
        return;
    } else {
        const parsed = raw.states
            .filter(s => s[5] != null && s[6] != null && s[7] != null)
            .slice(0, 400)
            .map(s => {
                const cs = (s[1] || 'UNK').trim();
                // FIX: Never mark as military in civilian layer — use type:'civilian'
                return {
                    icao24: s[0],
                    callsign: cs,
                    lat: s[6], lng: s[5],
                    alt: (s[7] || 0) / 1000,
                    velocity: s[9] || 0,
                    heading: s[10] || 0,
                    country: s[2] || '?',
                    type: 'civilian',  // FIX: Always civilian in civilian layer
                    on_ground: s[8] || false,
                };
            })
            .filter(f => !f.on_ground); // remove ground-level clutter
        STATE.liveFlights = parsed;
    }

    if (STATE.liveFlights.length === 0) return;

    STATE.liveFlights.forEach(f => {
        if (!STATE.flightHistory[f.icao24]) STATE.flightHistory[f.icao24] = [];
        STATE.flightHistory[f.icao24].push([f.lat, f.lng, f.alt]);
        if (STATE.flightHistory[f.icao24].length > 10) STATE.flightHistory[f.icao24].shift();
        f.path = STATE.flightHistory[f.icao24];
    });

    if (STATE.layer !== 'civilian') return;

    const filtered = applyDataFilter(STATE.liveFlights);
    renderGlobePoints(filtered);
    renderLiveList(filtered);
    document.getElementById('active-count').innerText = `${filtered.length} TRACKS`;
    document.getElementById('bb-count').innerText = filtered.length;
}

// ── FETCH MILITARY ─────────────────────────────────────────
async function fetchMilitaryFlights() {
    try {
        const res = await fetch('https://opensky-network.org/api/states/all', { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error('API error');
        const raw = await res.json();
        if (!raw.states) return [];

        const milFlights = raw.states
            .filter(s => {
                if (!s[1] || !s[5] || !s[6]) return false;
                const cs = (s[1] || '').trim().toUpperCase();
                return isMilitaryCallsign(cs);
            })
            .slice(0, 100)
            .map(s => ({
                callsign: (s[1] || 'MIL-???').trim(),
                lat: s[6], lng: s[5],
                alt: (s[7] || 0) / 1000,
                velocity: s[9] || 0,
                heading: s[10] || 0,
                country: s[2] || '?',
                icao24: s[0],
                type: 'military'
            }));

        return milFlights; // boş olsa bile döndür
    } catch (e) {
        console.warn('[Military] OpenSky hatası:', e.message);
        return [];
    }
}

// ── SIMULATED FLIGHTS ──────────────────────────────────────
function generateSimulatedFlights(type) {
    const count = type === 'military' ? 80 : 250;
    const callsigns_civ = ['THY','TK','DLH','LFT','AFR','BAW','UAE','QTR','ETD',
        'KLM','SAS','IBO','AHY','FLY','BMS','VYL','SXS','ERA','BER',
        'SWR','AZA','TAP','IBE','VIR','DAL','UAL','AAL','SWA','FDX'];
    const callsigns_mil = ['MAGMA11','REACH90','JAKE22','HOMER61','TOPAZ17',
        'COBRA01','VIPER22','GHOST13','IRON80','FURY33','RAVEN12','WOLF44',
        'DUKE99','BOXER22','LANCE55','BONE21','DAGGER08','TALON19','GRIM77',
        'HAVOC31','RAPTOR01','EAGLE22','NOBLE14','STEEL88','SPAR21'];

    const routes = [
        { lat: 41, lng: 29 }, { lat: 51, lng: 0 }, { lat: 48, lng: 2 },
        { lat: 40, lng: -74 }, { lat: 37, lng: -122 }, { lat: 55, lng: 37 },
        { lat: 35, lng: 139 }, { lat: 22, lng: 114 }, { lat: -34, lng: 151 },
        { lat: 28, lng: 77 }, { lat: 1, lng: 104 }, { lat: -23, lng: -46 }, { lat: 25, lng: 55 },
    ];

    return Array.from({ length: count }, (_, i) => {
        const r = routes[i % routes.length];
        const spread = type === 'military' ? 15 : 30;
        const cs = type === 'military'
            ? callsigns_mil[i % callsigns_mil.length]
            : `${callsigns_civ[i % callsigns_civ.length]}${(100 + i).toString().padStart(3,'0')}`;
        return {
            callsign: cs,
            lat: r.lat + (Math.random() - 0.5) * spread,
            lng: r.lng + (Math.random() - 0.5) * spread,
            alt: type === 'military' ? 1 + Math.random() * 25 : 5 + Math.random() * 13,
            velocity: type === 'military' ? 200 + Math.random() * 800 : 200 + Math.random() * 300,
            heading: Math.random() * 360,
            country: ['TR','US','RU','CN','UK','FR','DE','JP'][i % 8],
            type,
            simulated: true,
        };
    });
}

// ── SATELLITE DATA — CelesTrak Gerçek Verisi ─────────────────
async function fetchSatelliteData() {
    try {
        // app.py üzerinden CelesTrak SATCAT proxy
        const resp = await fetch('/api/celestrak/gp', { signal: AbortSignal.timeout(12000) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        if (!Array.isArray(data) || data.length === 0) throw new Error('Boş veri');

        // SATCAT JSON formatı: OBJECT_NAME, OBJECT_ID, EPOCH, MEAN_MOTION, ECCENTRICITY, INCLINATION, RA_OF_ASC_NODE, ARG_OF_PERICENTER, MEAN_ANOMALY, etc.
        const sats = data
            .filter(s => s.OBJECT_NAME && s.INTLDES)
            .slice(0, 150)
            .map((s, i) => {
                // Basit orbital pozisyon tahmini — tam SGP4 yerine yaklaşık
                const inc = parseFloat(s.INCLINATION) || 55;
                const raan = parseFloat(s.RA_OF_ASC_NODE) || (i * 47 % 360);
                const meanMotion = parseFloat(s.MEAN_MOTION) || 14.0; // rev/gün
                const period_min = 1440 / meanMotion;
                const alt_km = Math.pow((8681663.6 / meanMotion) ** (2/3) * 6378.137, 1/3) - 6371;
                const t = (Date.now() / 1000) % (period_min * 60);
                const phase = (t / (period_min * 60)) * 2 * Math.PI;
                const incRad = inc * Math.PI / 180;
                const lat = Math.asin(Math.sin(incRad) * Math.sin(phase)) * 180 / Math.PI;
                const lng = ((raan + phase * 180 / Math.PI) % 360 + 360) % 360 - 180;

                return {
                    callsign: s.OBJECT_NAME,
                    intldes: s.INTLDES,
                    lat, lng,
                    alt: Math.max(0.1, alt_km / 1000),
                    velocity: 7.9 - (alt_km / 1000) * 0.03,
                    heading: 0,
                    type: 'satellite',
                    orbitInc: inc,
                    period_min,
                };
            })
            .filter(s => !isNaN(s.lat) && !isNaN(s.lng));

        console.log(`[CelesTrak] ${sats.length} uydu yüklendi`);
        return sats;

    } catch (e) {
        console.warn('[CelesTrak] Veri alınamadı:', e.message);
        return [];
    }
}

// ── APPLY DATA FILTER ──────────────────────────────────────
function applyDataFilter(data) {
    return data.filter(d => {
        if ((d.alt || 0) < STATE.filterAlt) return false;
        const spd_kmh = (d.velocity || 0) * 3.6;
        if (spd_kmh < STATE.filterSpd && d.type !== 'satellite') return false;
        return true;
    });
}

function applyFilter() {
    STATE.filterAlt = parseFloat(document.getElementById('filter-alt').value);
    STATE.filterSpd = parseFloat(document.getElementById('filter-spd').value);
    document.getElementById('filter-alt-val').innerText = STATE.filterAlt.toFixed(0) + ' km';
    document.getElementById('filter-spd-val').innerText = STATE.filterSpd.toFixed(0) + ' km/h';
    const filtered = applyDataFilter(STATE.liveFlights);
    renderGlobePoints(filtered);
    renderLiveList(filtered);
}

// ── RENDER GLOBE POINTS ────────────────────────────────────
function renderGlobePoints(data) {
    if (!data || data.length === 0) return;

    if (STATE.layer === 'satellites') {
        const orbitPaths = data.map(sat => ({ ...sat, path: generateOrbitPath(sat) }));
        myGlobe
            .pathsData(orbitPaths)
            .pathPoints(d => d.path)
            .pathPointLat(d => d[0])
            .pathPointLng(d => d[1])
            .pathColor(() => 'rgba(0, 242, 255, 0.35)')
            .pathDashLength(0.08)
            .pathDashGap(0.005)
            .pathDashAnimateTime(15000)
            .pathStroke(0.4);

        myGlobe
            .pointsData(data)
            .pointLat(d => d.lat)
            .pointLng(d => d.lng)
            .pointAltitude(d => Math.min(d.alt / 40, 0.8))
            .pointColor(() => '#ffd93d')
            .pointRadius(0.3)
            .pointLabel(d => `🛰️ <b>${d.callsign}</b><br/>ALT: ${d.alt.toFixed(0)} km`);
    } else {
        const isMil = STATE.layer === 'military';
        myGlobe
            .pointsData(data)
            .pointLat(d => d.lat)
            .pointLng(d => d.lng)
            .pointAltitude(d => Math.min(d.alt * 0.008, 0.5))
            // FIX: Color based on data.type, NOT STATE.layer alone
            .pointColor(d => {
                if (d.type === 'military') return '#ff3c5f';
                return '#00f2ff';
            })
            .pointRadius(d => d.type === 'military' ? 0.22 : 0.16)
            .pointLabel(d => {
                const icon = d.type === 'military' ? '🎖️' : '✈️';
                return `${icon} <b>${d.callsign}</b><br/>
                    ALT: ${(d.alt||0).toFixed(1)} km | SPD: ${((d.velocity||0)*3.6).toFixed(0)} km/h<br/>
                    ${d.country ? 'CTY: ' + d.country : ''}`;
            });
    }

    myGlobe.onPointClick(d => {
        myGlobe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.8 }, 1000);
        showDetail(d);
    });
}

function generateOrbitPath(sat) {
    const points = [];
    for (let i = 0; i < 72; i++) {
        const theta = (i / 72) * 2 * Math.PI;
        const inc = (sat.orbitInc || 55) * Math.PI / 180;
        const lat = Math.asin(Math.sin(inc) * Math.sin(theta)) * 180 / Math.PI;
        const lng = sat.lng + (theta * 180 / Math.PI);
        points.push([lat, ((lng + 180) % 360) - 180]);
    }
    return points;
}

// ── OVERLAYS ───────────────────────────────────────────────
// FIX: Overlays are fully independent of layer selection
function toggleOverlay(type, btn) {
    STATE.overlays[type] = !STATE.overlays[type];

    // Update button visuals
    const classMap = {
        airBase: 'active',
        naval: 'active-naval',
        railway: 'active-railway',
        cyber: 'active-cyber',
        conflict: 'active-conflict',
        radar: 'active-radar',
    };
    if (btn) btn.classList.toggle(classMap[type] || 'active', STATE.overlays[type]);

    // Country select visibility for base/railway overlays
    const needsCountry = STATE.overlays.airBase || STATE.overlays.naval || STATE.overlays.railway;
    document.getElementById('countrySelectWrap').style.display = needsCountry ? 'block' : 'none';
    if (needsCountry) populateCountrySelect();

    // Cyber war panel
    if (type === 'cyber') {
        const cyberPanel = document.getElementById('cyber-panel');
        if (STATE.overlays.cyber) {
            cyberPanel.style.display = 'block';
            startCyberWar();
        } else {
            cyberPanel.style.display = 'none';
            stopCyberWar();
        }
        document.getElementById('cyber-status').style.display = STATE.overlays.cyber ? 'inline' : 'none';
    }

    // Conflict zones panel
    if (type === 'conflict') {
        if (STATE.overlays.conflict) renderConflictZones();
        else clearConflictZones();
    }

    // Radar panel
    if (type === 'radar') {
        const radarPanel = document.getElementById('radar-panel');
        if (STATE.overlays.radar) {
            radarPanel.style.display = 'block';
            populateRadarCountrySelect();
        } else {
            radarPanel.style.display = 'none';
            clearRadarCoverage();
        }
    }

    renderOverlays();
}

function populateCountrySelect() {
    const sel = document.getElementById('countrySelect');
    const countries = new Set();
    if (STATE.overlays.airBase || STATE.overlays.naval) {
        [...MILITARY_AIR_BASES, ...NAVAL_BASES].forEach(b => countries.add(b.country));
    }
    if (STATE.overlays.railway) {
        Object.keys(RAILWAY_LINES).forEach(c => countries.add(c));
    }
    const sorted = ['all', ...Array.from(countries).sort()];
    sel.innerHTML = sorted.map(c =>
        `<option value="${c}"${c === STATE.selectedCountry ? ' selected' : ''}>
            ${c === 'all' ? '— TÜM ÜLKELER —' : c}
        </option>`
    ).join('');
}

function onCountryChange(val) {
    STATE.selectedCountry = val;
    renderOverlays();
}

async function renderOverlays() {
    const allCustomPoints = [];
    const allPaths = [];

    // ── AIR BASES ──
    if (STATE.overlays.airBase) {
        const bases = MILITARY_AIR_BASES.filter(b =>
            STATE.selectedCountry === 'all' || b.country === STATE.selectedCountry
        );
        bases.forEach(b => allCustomPoints.push({ ...b, _overlayType: 'airBase', _color: '#ffd93d', _radius: 0.35, _alt: 0.015 }));
    }

    // ── NAVAL BASES ──
    if (STATE.overlays.naval) {
        const bases = NAVAL_BASES.filter(b =>
            STATE.selectedCountry === 'all' || b.country === STATE.selectedCountry
        );
        bases.forEach(b => allCustomPoints.push({ ...b, _overlayType: 'naval', _color: '#0096ff', _radius: 0.4, _alt: 0.012 }));
    }

    // ── RAILWAYS ──
    if (STATE.overlays.railway) {
        const lines = STATE.selectedCountry === 'all'
            ? Object.values(RAILWAY_LINES).flat()
            : (RAILWAY_LINES[STATE.selectedCountry] || []);
        lines.forEach(line => allPaths.push({ ...line, _isRailway: true }));
    }

    // ── CONFLICT ZONES ── (overlay points, not path-based)
    if (STATE.overlays.conflict) {
        getConflictZonePoints().forEach(cz => allCustomPoints.push(cz));
    }

    // ── RADAR COVERAGE ── handled separately via rings/arcs, not points
    if (STATE.overlays.radar) {
        renderRadarCoverage();
    }

    // Air base rings
    if (STATE.overlays.airBase) {
        const airBasePoints = allCustomPoints.filter(p => p._overlayType === 'airBase');
        myGlobe.ringsData(airBasePoints)
            .ringColor(() => 'rgba(255,217,61,0.4)')
            .ringMaxRadius(3).ringPropagationSpeed(1.5).ringRepeatPeriod(2000);
    } else if (!STATE.overlays.radar) {
        myGlobe.ringsData([]);
    }

    renderGlobeWithOverlays(allCustomPoints, allPaths);
}

function renderGlobeWithOverlays(customPoints, customPaths) {
    const railPaths = customPaths.filter(p => p._isRailway);

    if (railPaths.length > 0) {
        myGlobe
            .pathsData(railPaths)
            .pathPoints(d => d.path)
            .pathPointLat(d => d[0])
            .pathPointLng(d => d[1])
            .pathColor(d => d.color || 'rgba(57,255,20,0.6)')
            .pathDashLength(0.12).pathDashGap(0.01).pathDashAnimateTime(8000).pathStroke(0.8)
            .pathLabel(d => `🛤️ ${d.name}`);
    } else {
        if (STATE.layer === 'satellites' && STATE.liveFlights.length > 0) {
            const orbitPaths = STATE.liveFlights.map(sat => ({ ...sat, path: generateOrbitPath(sat) }));
            myGlobe.pathsData(orbitPaths)
                .pathPoints(d => d.path).pathPointLat(d => d[0]).pathPointLng(d => d[1])
                .pathColor(() => 'rgba(0, 242, 255, 0.35)')
                .pathDashLength(0.08).pathDashGap(0.005).pathDashAnimateTime(15000).pathStroke(0.4);
        } else {
            myGlobe.pathsData([]);
        }
    }

    const flightPoints = STATE.layer ? applyDataFilter(STATE.liveFlights) : [];
    const allDisplayPoints = [...flightPoints, ...customPoints];
    const isMil = STATE.layer === 'military';

    myGlobe
        .pointsData(allDisplayPoints)
        .pointLat(d => d.lat)
        .pointLng(d => d.lng)
        .pointAltitude(d => {
            if (d._overlayType) return d._alt || 0.015;
            if (STATE.layer === 'satellites') return Math.min((d.alt || 0) / 40, 0.8);
            return Math.min((d.alt || 0) * 0.008, 0.5);
        })
        .pointColor(d => {
            if (d._overlayType === 'airBase') return '#ffd93d';
            if (d._overlayType === 'naval') return '#0096ff';
            if (d._overlayType === 'conflict') return d._color || '#ff3c5f';
            if (STATE.layer === 'satellites') return '#ffd93d';
            // FIX: use data.type not layer
            return d.type === 'military' ? '#ff3c5f' : '#00f2ff';
        })
        .pointRadius(d => {
            if (d._overlayType) return d._radius || 0.3;
            if (d.type === 'military') return 0.22;
            return STATE.layer === 'satellites' ? 0.3 : 0.16;
        })
        .pointLabel(d => {
            if (d._overlayType === 'airBase') return `✈ <b>${d.name}</b><br/>🏴 ${d.country}<br/>🛩️ ${(d.aircraft||[]).join(', ')}`;
            if (d._overlayType === 'naval') return `⚓ <b>${d.name}</b><br/>🏴 ${d.country}<br/>🚢 ${(d.vessels||[]).join(', ')}`;
            if (d._overlayType === 'conflict') return `💥 <b>${d.name}</b><br/>📍 ${d.region || ''}<br/>⚔ ${d.parties || ''}<br/>📅 ${d.since || ''}`;
            if (STATE.layer === 'satellites') return `🛰️ <b>${d.callsign}</b><br/>ALT: ${(d.alt||0).toFixed(0)} km`;
            const icon = d.type === 'military' ? '🎖️' : '✈️';
            return `${icon} <b>${d.callsign}</b><br/>ALT: ${(d.alt||0).toFixed(1)} km | SPD: ${((d.velocity||0)*3.6).toFixed(0)} km/h<br/>${d.country ? 'CTY: ' + d.country : ''}`;
        })
        .onPointClick(d => {
            myGlobe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.8 }, 1000);
            if (d._overlayType === 'airBase' || d._overlayType === 'naval') showBaseDetail(d);
            else if (d._overlayType === 'conflict') showConflictDetail(d);
            else showDetail(d);
        });
}

// ── RENDER LIVE LIST ───────────────────────────────────────
function renderLiveList(data) {
    const listEl = document.getElementById('live-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    document.getElementById('list-count').innerText = data.length;

    if (data.length === 0) {
        listEl.innerHTML = `<div class="list-item loading" style="border-left-color:#ff9800">
            <div style="color:#ff9800; font-size:10px;">⏳ VERİ BEKLENİYOR — CANLI FEED YÜKLENİYOR...</div>
        </div>`;
        return;
    }

    const isMil = STATE.layer === 'military';
    const isSat = STATE.layer === 'satellites';
    const sorted = [...data].sort((a, b) => (b.alt || 0) - (a.alt || 0));

    sorted.slice(0, 40).forEach(item => {
        const div = document.createElement('div');
        const isItemMil = item.type === 'military';
        div.className = `list-item${isItemMil ? ' military' : ''}`;
        const spd = isSat
            ? `${(item.velocity || 0).toFixed(1)} km/s`
            : `${((item.velocity || 0) * 3.6).toFixed(0)} km/h`;
        const icon = isSat ? '🛰' : (isItemMil ? '🎖' : '✈');
        div.innerHTML = `
            <div class="item-row1">
                <span class="item-callsign">${icon} ${item.callsign || 'UNK'}</span>
                <span class="item-alt">${(item.alt || 0).toFixed(1)} km</span>
            </div>
            <div class="item-row2">
                SPD: ${spd}
                ${item.country ? ' | ' + item.country : ''}
                ${item.simulated ? ' | <span style="color:#ff9800">SIM</span>' : ' | <span style="color:#39ff14">LIVE</span>'}
            </div>
        `;
        div.onclick = () => {
            myGlobe.pointOfView({ lat: item.lat, lng: item.lng, altitude: 0.8 }, 1000);
            showDetail(item);
        };
        listEl.appendChild(div);
    });
}

// ── DETAIL PANELS ──────────────────────────────────────────
function showDetail(d) {
    const panel = document.getElementById('detail-panel');
    document.getElementById('detail-callsign').innerText = d.callsign || 'UNKNOWN';
    const isMil = d.type === 'military';
    const spd = ((d.velocity || 0) * 3.6).toFixed(0);
    const alt = (d.alt || 0).toFixed(2);

    document.getElementById('detail-grid').innerHTML = `
        <div class="detail-cell"><div class="detail-cell-label">LATITUDE</div><div class="detail-cell-val">${(d.lat||0).toFixed(4)}°</div></div>
        <div class="detail-cell"><div class="detail-cell-label">LONGITUDE</div><div class="detail-cell-val">${(d.lng||0).toFixed(4)}°</div></div>
        <div class="detail-cell"><div class="detail-cell-label">ALTITUDE</div><div class="detail-cell-val">${alt} km</div></div>
        <div class="detail-cell"><div class="detail-cell-label">SPEED</div><div class="detail-cell-val">${spd} km/h</div></div>
        <div class="detail-cell"><div class="detail-cell-label">HEADING</div><div class="detail-cell-val">${(d.heading||0).toFixed(0)}°</div></div>
        <div class="detail-cell"><div class="detail-cell-label">COUNTRY</div><div class="detail-cell-val">${d.country || '?'}</div></div>
        ${isMil ? `<div class="detail-cell" style="grid-column:span 2; border-left:2px solid var(--accent2);">
            <div class="detail-cell-label">⚠ MİLİTER TRACKING</div>
            <div class="detail-cell-val" style="color:var(--accent2)">ACTIVE SURVEILLANCE</div>
        </div>` : ''}
        ${d.simulated ? `<div class="detail-cell" style="grid-column:span 2; border-left:2px solid #ff9800;">
            <div class="detail-cell-label">KAYNAK</div>
            <div class="detail-cell-val" style="color:#ff9800">SİMÜLASYON</div>
        </div>` : `<div class="detail-cell" style="grid-column:span 2; border-left:2px solid var(--green);">
            <div class="detail-cell-label">KAYNAK</div>
            <div class="detail-cell-val" style="color:var(--green)">LIVE — OPENSKY</div>
        </div>`}
    `;
    panel.style.display = 'block';
}

function showBaseDetail(d) {
    const panel = document.getElementById('detail-panel');
    const isNaval = d._overlayType === 'naval';
    const icon = isNaval ? '⚓' : '✈';
    const assets = isNaval ? (d.vessels || []) : (d.aircraft || []);
    document.getElementById('detail-callsign').innerText = `${icon} ${d.name}`;
    document.getElementById('detail-grid').innerHTML = `
        <div class="detail-cell"><div class="detail-cell-label">TİP</div><div class="detail-cell-val">${isNaval ? 'DENİZ ÜSSÜ' : 'HAVA ÜSSÜ'}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">ÜLKE</div><div class="detail-cell-val">${d.country}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">BOYUT</div><div class="detail-cell-val">${(d.size||'major').toUpperCase()}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">KOORDİNAT</div><div class="detail-cell-val">${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}</div></div>
        <div class="detail-cell" style="grid-column:span 2;">
            <div class="detail-cell-label">${isNaval ? 'GEMİLER' : 'UÇAKLAR'}</div>
            <div class="detail-cell-val" style="font-size:11px;">${assets.join(' · ')}</div>
        </div>
    `;
    panel.style.display = 'block';
}

function showConflictDetail(d) {
    document.getElementById('detail-callsign').innerText = `💥 ${d.name}`;
    document.getElementById('detail-grid').innerHTML = `
        <div class="detail-cell"><div class="detail-cell-label">BÖLGE</div><div class="detail-cell-val">${d.region}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">YOĞUNLİK</div><div class="detail-cell-val" style="color:${d._color}">${d.intensity}</div></div>
        <div class="detail-cell" style="grid-column:span 2;"><div class="detail-cell-label">TARAFLAR</div><div class="detail-cell-val">${d.parties}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">BAŞLANGIÇ</div><div class="detail-cell-val">${d.since}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">DURUM</div><div class="detail-cell-val" style="color:#ff9800">${d.status}</div></div>
        <div class="detail-cell" style="grid-column:span 2;"><div class="detail-cell-label">KULLANILAN SİSTEMLER</div><div class="detail-cell-val" style="font-size:10px; line-height:1.6;">${(d.equipment||[]).join(' · ')}</div></div>
    `;
    document.getElementById('detail-panel').style.display = 'block';
}

function closeDetail() { document.getElementById('detail-panel').style.display = 'none'; }

// ── CONFLICT ZONES DATA ─────────────────────────────────────
const CONFLICT_ZONES = [
    { name: 'Ukraine-Russia War', region: 'Eastern Europe', lat: 48.5, lng: 35.5,
      parties: 'Russia vs Ukraine', since: '2022', status: 'ACTIVE',
      intensity: 'HIGH', equipment: ['Su-35S','Ka-52','Lancet','TB2','Storm Shadow','S-300','HIMARS'],
      _color: '#ff3c5f', _radius: 0.7, _alt: 0.03 },
    { name: 'Gaza Conflict', region: 'Middle East', lat: 31.5, lng: 34.5,
      parties: 'Israel vs Hamas', since: '2023', status: 'ACTIVE',
      intensity: 'HIGH', equipment: ['F-35I','F-15I','Iron Dome','Qassam','SPIKE'],
      _color: '#ff3c5f', _radius: 0.5, _alt: 0.03 },
    { name: 'Sudan Civil War', region: 'Northeast Africa', lat: 15.5, lng: 32.5,
      parties: 'SAF vs RSF', since: '2023', status: 'ACTIVE',
      intensity: 'MED', equipment: ['Mi-24','L-39','Technical','RPG-7'],
      _color: '#ff9800', _radius: 0.5, _alt: 0.025 },
    { name: 'Yemen Conflict', region: 'Arabian Peninsula', lat: 15.5, lng: 47.5,
      parties: 'Houthi vs Coalition', since: '2014', status: 'ACTIVE',
      intensity: 'MED', equipment: ['F-15SA','Patriot','Shahed-136','Quds-1'],
      _color: '#ff9800', _radius: 0.45, _alt: 0.025 },
    { name: 'Sahel Insurgency', region: 'West Africa', lat: 14.0, lng: 1.0,
      parties: 'Junta forces vs JNIM/ISGS', since: '2012', status: 'ACTIVE',
      intensity: 'LOW', equipment: ['Mi-35','Mi-8','technicals'],
      _color: '#ffd93d', _radius: 0.4, _alt: 0.02 },
    { name: 'Myanmar Civil War', region: 'Southeast Asia', lat: 21.0, lng: 96.0,
      parties: 'SAC vs Resistance', since: '2021', status: 'ACTIVE',
      intensity: 'MED', equipment: ['Yak-130','Mi-35','BMP-1'],
      _color: '#ff9800', _radius: 0.45, _alt: 0.025 },
    { name: 'South China Sea Tension', region: 'Pacific', lat: 14.0, lng: 114.0,
      parties: 'China vs Philippines/Vietnam', since: '2023', status: 'TENSIONS',
      intensity: 'TENSIONS', equipment: ['J-20','Type-055','H-6K','BrahMos'],
      _color: '#ffd93d', _radius: 0.55, _alt: 0.02 },
    { name: 'Taiwan Strait Tension', region: 'East Asia', lat: 24.0, lng: 121.0,
      parties: 'China vs Taiwan/USA', since: '2022', status: 'TENSIONS',
      intensity: 'TENSIONS', equipment: ['J-16','DF-21D','F-16V','Patriot PAC-3'],
      _color: '#ffd93d', _radius: 0.5, _alt: 0.02 },
];

function getConflictZonePoints() {
    return CONFLICT_ZONES.map(cz => ({ ...cz, _overlayType: 'conflict' }));
}

function renderConflictZones() {
    // pulse rings on conflict zones
    myGlobe.ringsData(CONFLICT_ZONES)
        .ringColor(d => d._color + '80')
        .ringMaxRadius(d => d.intensity === 'HIGH' ? 6 : 4)
        .ringPropagationSpeed(d => d.intensity === 'HIGH' ? 4 : 2)
        .ringRepeatPeriod(d => d.intensity === 'HIGH' ? 800 : 1500);
    renderOverlays();
}

function clearConflictZones() {
    if (!STATE.overlays.airBase) myGlobe.ringsData([]);
    renderOverlays();
}

// ── CYBER WAR SYSTEM — Cloudflare Radar Entegrasyonu ────────
// Cloudflare Radar API: https://api.cloudflare.com/client/v4/radar/attacks/
window.CLOUDFLARE_RADAR_API_KEY = 'cfut_LUtDawiIwx2Am9GtV773SeyrKGZ25g4VaEJ1p9kc5c38e8a5';

const CYBER_ATTACK_TYPES = [
    { type: 'DDoS L7', color: '#ff3c5f', severity: 'HIGH', layer: 7 },
    { type: 'DDoS L3/L4', color: '#ff3c5f', severity: 'HIGH', layer: 3 },
    { type: 'Ransomware', color: '#ff9800', severity: 'CRITICAL', layer: 7 },
    { type: 'APT Intrusion', color: '#ff3c5f', severity: 'CRITICAL', layer: 7 },
    { type: 'Phishing', color: '#ffd93d', severity: 'MED', layer: 7 },
    { type: 'SQL Injection', color: '#ffd93d', severity: 'MED', layer: 7 },
    { type: 'Zero-Day Exploit', color: '#ff3c5f', severity: 'CRITICAL', layer: 7 },
    { type: 'Botnet C2', color: '#ff9800', severity: 'HIGH', layer: 3 },
    { type: 'Credential Theft', color: '#ffd93d', severity: 'MED', layer: 7 },
    { type: 'UDP Flood', color: '#ff9800', severity: 'HIGH', layer: 3 },
    { type: 'DNS Amplification', color: '#ff9800', severity: 'HIGH', layer: 3 },
    { type: 'WAF Bypass', color: '#ff3c5f', severity: 'CRITICAL', layer: 7 },
];

// ISO kodu → koordinat + isim haritası (Cloudflare ISO2 kodları kullanır)
const COUNTRY_MAP = {
    US: { name: 'United States', lat: 37.09, lng: -95.71 },
    CN: { name: 'China', lat: 35.86, lng: 104.19 },
    RU: { name: 'Russia', lat: 61.52, lng: 105.31 },
    DE: { name: 'Germany', lat: 51.16, lng: 10.45 },
    GB: { name: 'United Kingdom', lat: 55.37, lng: -3.43 },
    FR: { name: 'France', lat: 46.23, lng: 2.21 },
    BR: { name: 'Brazil', lat: -14.23, lng: -51.92 },
    IN: { name: 'India', lat: 20.59, lng: 78.96 },
    AU: { name: 'Australia', lat: -25.27, lng: 133.77 },
    KR: { name: 'South Korea', lat: 35.90, lng: 127.76 },
    JP: { name: 'Japan', lat: 36.20, lng: 138.25 },
    NL: { name: 'Netherlands', lat: 52.13, lng: 5.29 },
    SG: { name: 'Singapore', lat: 1.35, lng: 103.82 },
    UA: { name: 'Ukraine', lat: 48.37, lng: 31.16 },
    TR: { name: 'Turkey', lat: 38.96, lng: 35.24 },
    IR: { name: 'Iran', lat: 32.42, lng: 53.68 },
    IL: { name: 'Israel', lat: 31.04, lng: 34.85 },
    PL: { name: 'Poland', lat: 51.92, lng: 19.14 },
    CA: { name: 'Canada', lat: 56.13, lng: -106.34 },
    ID: { name: 'Indonesia', lat: -0.79, lng: 113.92 },
    VN: { name: 'Vietnam', lat: 14.06, lng: 108.28 },
    SA: { name: 'Saudi Arabia', lat: 23.88, lng: 45.08 },
    ZA: { name: 'South Africa', lat: -30.56, lng: 22.94 },
    MX: { name: 'Mexico', lat: 23.63, lng: -102.55 },
    TH: { name: 'Thailand', lat: 15.87, lng: 100.99 },
};

// Cloudflare Radar gerçek verilerine göre ağırlıklandırılmış saldırı dağılımları
// Kaynak: Cloudflare Radar 2023-2024 rapor verileri (public)
const CF_WEIGHTED_ORIGINS = [
    { code: 'CN', weight: 18 }, { code: 'US', weight: 15 }, { code: 'RU', weight: 12 },
    { code: 'DE', weight: 6 }, { code: 'BR', weight: 5 }, { code: 'IN', weight: 5 },
    { code: 'NL', weight: 4 }, { code: 'KR', weight: 4 }, { code: 'UA', weight: 4 },
    { code: 'FR', weight: 3 }, { code: 'GB', weight: 3 }, { code: 'ID', weight: 3 },
    { code: 'VN', weight: 3 }, { code: 'TR', weight: 3 }, { code: 'JP', weight: 2 },
    { code: 'SG', weight: 2 }, { code: 'IR', weight: 2 }, { code: 'CA', weight: 2 },
    { code: 'PL', weight: 2 }, { code: 'TH', weight: 1 },
];

const CF_WEIGHTED_TARGETS = [
    { code: 'US', weight: 22 }, { code: 'CN', weight: 12 }, { code: 'DE', weight: 8 },
    { code: 'GB', weight: 7 }, { code: 'FR', weight: 6 }, { code: 'RU', weight: 5 },
    { code: 'UA', weight: 5 }, { code: 'KR', weight: 4 }, { code: 'BR', weight: 4 },
    { code: 'JP', weight: 4 }, { code: 'CA', weight: 3 }, { code: 'AU', weight: 3 },
    { code: 'NL', weight: 3 }, { code: 'IN', weight: 3 }, { code: 'SG', weight: 2 },
    { code: 'TR', weight: 2 }, { code: 'IL', weight: 2 }, { code: 'SA', weight: 2 },
    { code: 'PL', weight: 2 }, { code: 'ZA', weight: 1 },
];

// Cloudflare'dan alınan gerçek saldırı çiftleri (cache)
let cfRealAttackPairs = [];   // [{ origin: 'CN', target: 'US', pct: 3.79 }, ...]
let cfDataSource = 'weighted-sim';  // 'cloudflare-live' | 'weighted-sim'
let cfLastFetch = 0;
const CF_FETCH_INTERVAL = 5 * 60 * 1000; // 5 dakikada bir yenile

async function fetchCloudflareRadarData() {
    const now = Date.now();
    if (now - cfLastFetch < CF_FETCH_INTERVAL && cfRealAttackPairs.length > 0) return;

    try {
        // app.py proxy üzerinden — CORS ve API key sunucu tarafında
        const url = `/api/cloudflare/attacks/layer7/top/attacks?limit=25&dateRange=1d&format=json`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

        if (!res.ok) throw new Error(`Proxy ${res.status}`);
        const data = await res.json();

        if (data.result?.top_0?.length > 0) {
            cfRealAttackPairs = data.result.top_0.map(item => ({
                origin: item.originCountryAlpha2,
                target: item.targetCountryAlpha2,
                pct: parseFloat(item.value) || 1,
            })).filter(p => COUNTRY_MAP[p.origin] && COUNTRY_MAP[p.target]);

            cfDataSource = 'cloudflare-live';
            cfLastFetch = now;
            updateCyberDataSourceBadge('🛰 CLOUDFLARE RADAR — LIVE', '#39ff14');
            console.log(`[CYBER] Cloudflare Radar: ${cfRealAttackPairs.length} gerçek saldırı çifti`);
        } else {
            throw new Error('Boş yanıt');
        }
    } catch (err) {
        cfDataSource = 'weighted-sim';
        if (cfRealAttackPairs.length === 0) buildWeightedSimPairs();
        updateCyberDataSourceBadge('📊 CF RADAR İSTATİSTİK BAZLI SIM', '#ff9800');
        console.log(`[CYBER] Cloudflare live data alınamadı (${err.message})`);
    }
}

function buildWeightedSimPairs() {
    // Ağırlıklı listeden sahte ama gerçekçi saldırı çiftleri oluştur
    cfRealAttackPairs = [];
    CF_WEIGHTED_ORIGINS.forEach(orig => {
        CF_WEIGHTED_TARGETS.forEach(tgt => {
            if (orig.code === tgt.code) return;
            cfRealAttackPairs.push({
                origin: orig.code,
                target: tgt.code,
                pct: (orig.weight * tgt.weight) / 100,
            });
        });
    });
}

function pickWeightedPair() {
    if (cfRealAttackPairs.length === 0) buildWeightedSimPairs();
    // Ağırlıklı rastgele seçim
    const total = cfRealAttackPairs.reduce((s, p) => s + p.pct, 0);
    let r = Math.random() * total;
    for (const pair of cfRealAttackPairs) {
        r -= pair.pct;
        if (r <= 0) return pair;
    }
    return cfRealAttackPairs[0];
}

function updateCyberDataSourceBadge(text, color) {
    let badge = document.getElementById('cyber-source-badge');
    if (!badge) return;
    badge.innerText = text;
    badge.style.color = color;
}

let cyberPaths = [];
let cyberAttackLog = [];
let cyberAttacksPerMin = 0;

async function startCyberWar() {
    if (STATE.cyberInterval) clearInterval(STATE.cyberInterval);
    cyberPaths = [];
    cyberAttackLog = [];

    // Cloudflare verisi çek
    await fetchCloudflareRadarData();

    STATE.cyberInterval = setInterval(() => {
        generateCyberAttack();
        updateCyberDisplay();
    }, 900);

    // Her 5 dakikada Cloudflare verisini tazele
    STATE.cfRefreshInterval = setInterval(fetchCloudflareRadarData, CF_FETCH_INTERVAL);

    updateCyberDisplay();
}

function stopCyberWar() {
    if (STATE.cyberInterval) clearInterval(STATE.cyberInterval);
    if (STATE.cfRefreshInterval) clearInterval(STATE.cfRefreshInterval);
    STATE.cyberInterval = null;
    STATE.cfRefreshInterval = null;
    cyberPaths = [];
    cyberAttackLog = [];
    cfRealAttackPairs = [];
    cfLastFetch = 0;
    if (!STATE.overlays.airBase && !STATE.overlays.conflict) myGlobe.ringsData([]);
    myGlobe.arcsData([]);
    document.getElementById('cyber-status').style.display = 'none';
}

function generateCyberAttack() {
    const attackType = CYBER_ATTACK_TYPES[Math.floor(Math.random() * CYBER_ATTACK_TYPES.length)];

    // Cloudflare verisinden veya ağırlıklı simden çift seç
    const pair = pickWeightedPair();
    const origData = COUNTRY_MAP[pair.origin];
    const tgtData = COUNTRY_MAP[pair.target];
    if (!origData || !tgtData) return;

    const arc = {
        startLat: origData.lat + (Math.random() - 0.5) * 4,
        startLng: origData.lng + (Math.random() - 0.5) * 4,
        endLat: tgtData.lat + (Math.random() - 0.5) * 4,
        endLng: tgtData.lng + (Math.random() - 0.5) * 4,
        color: attackType.color,
        type: attackType.type,
        layer: attackType.layer,
        attacker: origData.name,
        attackerCode: pair.origin,
        target: tgtData.name,
        targetCode: pair.target,
        severity: attackType.severity,
        pct: pair.pct ? pair.pct.toFixed(2) : null,
        ts: Date.now(),
        isLive: cfDataSource === 'cloudflare-live',
    };
    cyberPaths.push(arc);
    if (cyberPaths.length > 35) cyberPaths.shift();

    cyberAttackLog.unshift({
        time: new Date().toISOString().substr(11,8),
        type: attackType.type,
        layer: attackType.layer,
        from: origData.name,
        fromCode: pair.origin,
        to: tgtData.name,
        toCode: pair.target,
        severity: attackType.severity,
        color: attackType.color,
        pct: pair.pct,
        isLive: cfDataSource === 'cloudflare-live',
    });
    if (cyberAttackLog.length > 60) cyberAttackLog.pop();
    cyberAttacksPerMin++;

    myGlobe
        .arcsData(cyberPaths)
        .arcStartLat(d => d.startLat)
        .arcStartLng(d => d.startLng)
        .arcEndLat(d => d.endLat)
        .arcEndLng(d => d.endLng)
        .arcColor(d => [d.color + '00', d.color, d.color + 'aa'])
        .arcAltitudeAutoScale(0.35)
        .arcStroke(d => d.severity === 'CRITICAL' ? 0.7 : 0.35)
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(1500)
        .arcLabel(d => `
            ${d.isLive ? '🛰 <b>CLOUDFLARE LIVE</b>' : '📊 SIM'}<br/>
            ⚡ <b>${d.type}</b> [L${d.layer}]<br/>
            ${d.attackerCode} → ${d.targetCode}<br/>
            ${d.attacker} → ${d.target}<br/>
            SEV: <b style="color:${d.color}">${d.severity}</b>
            ${d.pct ? `<br/>Trafik payı: %${d.pct}` : ''}
        `);

    if (STATE.overlays.cyber) {
        myGlobe.ringsData([{ lat: arc.endLat, lng: arc.endLng, color: attackType.color }])
            .ringColor(d => d.color || '#ff3c5f')
            .ringMaxRadius(2.5)
            .ringPropagationSpeed(3)
            .ringRepeatPeriod(600);
    }
}

function updateCyberDisplay() {
    document.getElementById('cyber-count').innerText = cyberAttacksPerMin;

    const bySeverity = { CRITICAL: 0, HIGH: 0, MED: 0 };
    const byLayer = { 3: 0, 7: 0 };
    cyberAttackLog.forEach(a => {
        if (bySeverity[a.severity] !== undefined) bySeverity[a.severity]++;
        if (byLayer[a.layer] !== undefined) byLayer[a.layer]++;
    });

    document.getElementById('cyber-stats-grid').innerHTML = `
        <div class="cyber-stat" style="border-color:#ff3c5f">
            <div class="cs-val" style="color:#ff3c5f">${bySeverity.CRITICAL}</div>
            <div class="cs-lbl">CRITICAL</div>
        </div>
        <div class="cyber-stat" style="border-color:#ff9800">
            <div class="cs-val" style="color:#ff9800">${bySeverity.HIGH}</div>
            <div class="cs-lbl">HIGH</div>
        </div>
        <div class="cyber-stat" style="border-color:#ffd93d">
            <div class="cs-val" style="color:#ffd93d">${bySeverity.MED}</div>
            <div class="cs-lbl">MED</div>
        </div>
        <div class="cyber-stat" style="border-color:#0096ff">
            <div class="cs-val" style="color:#0096ff">${byLayer[3]}</div>
            <div class="cs-lbl">L3/L4</div>
        </div>
        <div class="cyber-stat" style="border-color:#b44fff">
            <div class="cs-val" style="color:#b44fff">${byLayer[7]}</div>
            <div class="cs-lbl">L7 App</div>
        </div>
        <div class="cyber-stat" style="border-color:var(--panel-border)">
            <div class="cs-val" style="color:var(--text-dim)">${cyberAttackLog.length}</div>
            <div class="cs-lbl">TOTAL</div>
        </div>
    `;

    document.getElementById('cyber-attack-count').innerText = cyberAttackLog.length;

    const listEl = document.getElementById('cyber-attack-list');
    listEl.innerHTML = cyberAttackLog.slice(0, 25).map(a => `
        <div style="padding:5px 6px; margin-bottom:3px; background:rgba(255,255,255,0.02); border-left:2px solid ${a.color}; border-radius:0 2px 2px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-dim)">${a.time}</span>
                <span style="color:${a.isLive ? '#39ff14' : '#ff9800'}; font-size:8px;">${a.isLive ? '🛰 LIVE' : '📊 SIM'}</span>
            </div>
            <div>
                <span style="color:${a.color}; font-weight:bold;">[${a.severity}]</span>
                <span style="color:#fff; margin-left:4px;">${a.type}</span>
                <span style="color:var(--text-dim); font-size:9px;"> L${a.layer}</span>
            </div>
            <div style="color:var(--text-dim); margin-top:1px;">
                ${a.fromCode || a.from} → ${a.toCode || a.to}
                ${a.pct ? `<span style="color:rgba(255,255,255,0.3); margin-left:4px;">~%${parseFloat(a.pct).toFixed(1)}</span>` : ''}
            </div>
        </div>
    `).join('');

    setTimeout(() => { cyberAttacksPerMin = 0; }, 60000);
}

function applyCfApiKey() {
    const key = document.getElementById('cf-api-key-input').value.trim();
    if (key) {
        window.CLOUDFLARE_RADAR_API_KEY = key;
        cfLastFetch = 0; // force re-fetch
        cfRealAttackPairs = [];
        updateCyberDataSourceBadge('🔄 API KEY AYARLANDI — YENİLENİYOR...', '#ffd93d');
        fetchCloudflareRadarData();
    }
}


const RADAR_SYSTEMS = {
    'USA': [
        { name: 'BMEWS Thule', lat: 76.5, lng: -68.7, range_km: 5000, type: 'early_warning', freq: 'L-Band' },
        { name: 'PAVE PAWS Cape Cod', lat: 41.7, lng: -70.5, range_km: 5556, type: 'early_warning', freq: 'UHF' },
        { name: 'THAAD Guam', lat: 13.4, lng: 144.7, range_km: 1000, type: 'sam', freq: 'X-Band' },
        { name: 'E-3 Sentry AEW', lat: 37.0, lng: -95.7, range_km: 650, type: 'airborne', freq: 'S-Band' },
        { name: 'Patriot PAC-3 Korea', lat: 37.5, lng: 127.0, range_km: 160, type: 'sam', freq: 'X-Band' },
    ],
    'Russia': [
        { name: 'Voronezh-DM Armavir', lat: 44.8, lng: 41.1, range_km: 6000, type: 'early_warning', freq: 'L-Band' },
        { name: 'Voronezh-M Lekhtusi', lat: 60.1, lng: 30.6, range_km: 6000, type: 'early_warning', freq: 'VHF' },
        { name: 'S-400 Kaliningrad', lat: 54.7, lng: 20.5, range_km: 400, type: 'sam', freq: 'X-Band' },
        { name: 'S-400 Crimea', lat: 45.3, lng: 34.5, range_km: 400, type: 'sam', freq: 'X-Band' },
        { name: 'A-50 MAINSTAY AEW', lat: 55.8, lng: 37.6, range_km: 650, type: 'airborne', freq: 'L-Band' },
    ],
    'China': [
        { name: 'JY-26 Radar Xinjiang', lat: 41.0, lng: 80.0, range_km: 500, type: 'early_warning', freq: 'VHF' },
        { name: 'HQ-9 Beijing', lat: 39.9, lng: 116.4, range_km: 200, type: 'sam', freq: 'X-Band' },
        { name: 'KJ-2000 AEW', lat: 30.5, lng: 114.3, range_km: 470, type: 'airborne', freq: 'L-Band' },
        { name: 'Type 346 Radar Hainan', lat: 20.0, lng: 110.3, range_km: 450, type: 'early_warning', freq: 'S-Band' },
    ],
    'Turkey': [
        { name: 'AN/TPY-2 İncirlik', lat: 37.0, lng: 35.4, range_km: 1500, type: 'early_warning', freq: 'X-Band' },
        { name: 'Hawk SAM Ankara', lat: 39.9, lng: 32.8, range_km: 45, type: 'sam', freq: 'X-Band' },
        { name: 'HİSAR-O+ Konya', lat: 37.9, lng: 32.5, range_km: 25, type: 'sam', freq: 'Ku-Band' },
        { name: 'S-400 Mürted', lat: 40.0, lng: 32.5, range_km: 400, type: 'sam', freq: 'X-Band' },
        { name: 'MESA Radar Konya', lat: 37.9, lng: 32.6, range_km: 180, type: 'early_warning', freq: 'S-Band' },
    ],
    'Israel': [
        { name: 'Arrow-3 BMD', lat: 31.8, lng: 34.8, range_km: 2400, type: 'early_warning', freq: 'X-Band' },
        { name: 'Iron Dome', lat: 31.5, lng: 34.5, range_km: 70, type: 'sam', freq: 'C-Band' },
        { name: 'EL/M-2080 Green Pine', lat: 31.8, lng: 34.9, range_km: 500, type: 'early_warning', freq: 'L-Band' },
    ],
    'NATO': [
        { name: 'NATO AWACS Geilenkirchen', lat: 51.0, lng: 6.0, range_km: 650, type: 'airborne', freq: 'S-Band' },
        { name: 'Aegis Rota Spain', lat: 36.6, lng: -6.3, range_km: 1000, type: 'early_warning', freq: 'S-Band' },
    ],
};

let activeRadarPoints = [];

function populateRadarCountrySelect() {
    const sel = document.getElementById('radar-country-sel');
    const countries = Object.keys(RADAR_SYSTEMS);
    sel.innerHTML = `<option value="">— ÜLKE SEÇ —</option>` +
        countries.map(c => `<option value="${c}">${c}</option>`).join('');
}

function onRadarCountryChange(country) {
    if (!country) return;
    const typeSel = document.getElementById('radar-type-sel').value;
    const systems = RADAR_SYSTEMS[country] || [];
    const filtered = typeSel === 'all' ? systems : systems.filter(r => r.type === typeSel);

    // Add to active radars (avoid duplicates)
    filtered.forEach(r => {
        if (!activeRadarPoints.find(ar => ar.name === r.name)) {
            activeRadarPoints.push({ ...r, country });
        }
    });

    renderRadarCoverage();
}

function renderRadarCoverage() {
    const typeSel = document.getElementById('radar-type-sel')?.value || 'all';
    const country = document.getElementById('radar-country-sel')?.value;

    // Get combined radars: selected country + custom
    let radars = [...activeRadarPoints, ...STATE.customRadars];
    if (typeSel !== 'all') radars = radars.filter(r => r.type === typeSel || r.type === 'custom');

    if (radars.length === 0) {
        myGlobe.ringsData([]);
        document.getElementById('radar-stats').innerHTML = '';
        return;
    }

    // Generate coverage circles via rings with large radius
    const radarRings = radars.map(r => ({
        ...r,
        lat: r.lat, lng: r.lng,
        _radarRange: r.range_km,
    }));

    // Ring radius in degrees ≈ range_km / 111
    myGlobe.ringsData(radarRings)
        .ringColor(r => {
            if (r.type === 'sam') return 'rgba(255,60,95,0.25)';
            if (r.type === 'airborne') return 'rgba(255,217,61,0.2)';
            return 'rgba(0,242,255,0.2)';
        })
        .ringMaxRadius(r => Math.min(r.range_km / 111 * 1.5, 15))
        .ringPropagationSpeed(0.4)
        .ringRepeatPeriod(3000);

    // Show as points too
    myGlobe.pointsData([...applyDataFilter(STATE.liveFlights), ...getRadarCustomPoints(radars), ...getOverlayPoints()])
        .pointLat(d => d.lat)
        .pointLng(d => d.lng)
        .pointColor(d => {
            if (d._isRadarPoint) {
                if (d.type === 'sam') return '#ff3c5f';
                if (d.type === 'airborne') return '#ffd93d';
                return '#00f2ff';
            }
            if (d._overlayType === 'airBase') return '#ffd93d';
            if (d._overlayType === 'naval') return '#0096ff';
            return d.type === 'military' ? '#ff3c5f' : '#00f2ff';
        })
        .pointRadius(d => d._isRadarPoint ? 0.45 : (d._overlayType ? 0.35 : 0.16))
        .pointAltitude(d => d._isRadarPoint ? 0.02 : (d._overlayType ? 0.015 : Math.min((d.alt||0)*0.008, 0.5)))
        .pointLabel(d => {
            if (d._isRadarPoint) return `📡 <b>${d.name}</b><br/>Tür: ${d.type.toUpperCase()}<br/>Menzil: ${d.range_km} km<br/>Frekans: ${d.freq || 'N/A'}`;
            if (d._overlayType === 'airBase') return `✈ <b>${d.name}</b>`;
            if (d._overlayType === 'naval') return `⚓ <b>${d.name}</b>`;
            return `✈ ${d.callsign}`;
        })
        .onPointClick(d => {
            myGlobe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.8 }, 1000);
            if (d._isRadarPoint) showRadarDetail(d);
            else if (d._overlayType === 'airBase' || d._overlayType === 'naval') showBaseDetail(d);
            else showDetail(d);
        });

    // Update stats panel
    updateRadarStats(radars);
}

function getRadarCustomPoints(radars) {
    return radars.map(r => ({ ...r, _isRadarPoint: true }));
}

function getOverlayPoints() {
    const pts = [];
    if (STATE.overlays.airBase) {
        MILITARY_AIR_BASES.filter(b => STATE.selectedCountry === 'all' || b.country === STATE.selectedCountry)
            .forEach(b => pts.push({ ...b, _overlayType: 'airBase' }));
    }
    if (STATE.overlays.naval) {
        NAVAL_BASES.filter(b => STATE.selectedCountry === 'all' || b.country === STATE.selectedCountry)
            .forEach(b => pts.push({ ...b, _overlayType: 'naval' }));
    }
    return pts;
}

function updateRadarStats(radars) {
    const byType = { early_warning: 0, sam: 0, airborne: 0, custom: 0 };
    radars.forEach(r => { if (byType[r.type] !== undefined) byType[r.type]++; else byType.custom++; });
    document.getElementById('radar-stats').innerHTML = `
        <div class="radar-stat-row"><span style="color:var(--accent)">Erken Uyarı:</span> ${byType.early_warning}</div>
        <div class="radar-stat-row"><span style="color:#ff3c5f">SAM:</span> ${byType.sam}</div>
        <div class="radar-stat-row"><span style="color:#ffd93d">Airborne:</span> ${byType.airborne}</div>
        <div class="radar-stat-row"><span style="color:#39ff14">Özel:</span> ${byType.custom}</div>
        <div class="radar-stat-row" style="margin-top:6px; color:var(--text-dim); font-size:9px;">TOPLAM: ${radars.length} RADAR SİSTEMİ</div>
    `;
}

function showRadarDetail(d) {
    document.getElementById('detail-callsign').innerText = `📡 ${d.name}`;
    document.getElementById('detail-grid').innerHTML = `
        <div class="detail-cell"><div class="detail-cell-label">TİP</div><div class="detail-cell-val">${d.type.toUpperCase().replace('_',' ')}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">ÜLKE</div><div class="detail-cell-val">${d.country || 'ÖZEL'}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">MENZİL</div><div class="detail-cell-val" style="color:var(--accent)">${d.range_km} km</div></div>
        <div class="detail-cell"><div class="detail-cell-label">FREKANS</div><div class="detail-cell-val">${d.freq || 'N/A'}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">KONUM</div><div class="detail-cell-val">${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">KAPSAMA</div><div class="detail-cell-val" style="color:var(--green)">AKTİF</div></div>
    `;
    document.getElementById('detail-panel').style.display = 'block';
}

function addCustomRadar() {
    const lat = parseFloat(document.getElementById('radar-custom-lat').value);
    const lng = parseFloat(document.getElementById('radar-custom-lng').value);
    const range = parseFloat(document.getElementById('radar-custom-range').value) || 300;

    if (isNaN(lat) || isNaN(lng)) {
        alert('Koordinat giriniz veya haritadan seçiniz.');
        return;
    }

    STATE.customRadars.push({
        name: `CUSTOM-RADAR-${STATE.customRadars.length + 1}`,
        lat, lng, range_km: range,
        type: 'custom', freq: 'Variable', country: 'ÖZEL',
    });

    document.getElementById('radar-custom-lat').value = '';
    document.getElementById('radar-custom-lng').value = '';
    renderRadarCoverage();
}

function clearRadarCoverage() {
    activeRadarPoints = [];
    STATE.customRadars = [];
    if (!STATE.overlays.airBase && !STATE.overlays.conflict) myGlobe.ringsData([]);
    document.getElementById('radar-stats').innerHTML = '';
    renderOverlays();
}

function closeRadarPanel() {
    document.getElementById('radar-panel').style.display = 'none';
    STATE.overlays.radar = false;
    document.getElementById('ovRadar')?.classList.remove('active-radar');
    clearRadarCoverage();
}

function pickRadarMode() {
    STATE.pickingRadar = true;
    document.getElementById('radar-pick-indicator').style.display = 'block';
    document.getElementById('globeViz').style.cursor = 'crosshair';
}

// ── CONFLICT ANALYSIS (AI-powered) ─────────────────────────
function openConflictPanel() {
    const panel = document.getElementById('conflict-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') populateConflictSelects();
}

function populateConflictSelects() {
    const countries = ['USA','Russia','China','Turkey','Iran','Israel','India','Pakistan',
        'North Korea','South Korea','Japan','France','UK','Germany','Taiwan',
        'Saudi Arabia','Ukraine','Brazil','Australia','NATO'];
    const html = countries.map(c => `<option value="${c}">${c}</option>`).join('');
    document.getElementById('cp-country-a').innerHTML = html;
    document.getElementById('cp-country-b').innerHTML = html;
    document.getElementById('cp-country-b').value = 'China';
}

async function runConflictAnalysis() {
    const countryA = document.getElementById('cp-country-a').value;
    const countryB = document.getElementById('cp-country-b').value;
    const domain = document.getElementById('cp-domain').value;
    const domainNames = { air: 'Hava Muharebesi', naval: 'Deniz Muharebesi', ground: 'Kara Harekâtı', cyber: 'Siber Savaş', combined: 'Kombine Harekât' };

    const resultsEl = document.getElementById('conflict-results');
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; color:var(--accent); font-size:10px; letter-spacing:2px;">
            <div class="loading-pulse"></div> AI ÇATIŞMA ANALİZİ YÜKLENİYOR...
        </div>
    `;

    const prompt = `Sen bir askeri analiz uzmanısın. ${countryA} ile ${countryB} arasındaki olası ${domainNames[domain]} senaryosunu analiz et.

Şunları kısaca belirt:
1. Her ülkenin bu alandaki güçlü silah sistemleri (3-4 sistem)
2. Güç dengesi kısa değerlendirmesi (2-3 cümle)
3. Olası çatışma senaryosu (2-3 cümle)
4. Sonuç tahmini (hangi taraf avantajlı, neden)

Yanıtını Türkçe ver. Kısa ve öz tut (max 300 kelime). Sadece teknik/taktik analiz yap, siyasi yorum yapma. Format: başlıkları **kalın** yaz.`;

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();
        const text = data.content?.[0]?.text || 'Analiz alınamadı.';

        // Simple markdown bold renderer
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<span style="color:var(--accent); font-weight:bold;">$1</span>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/^\d+\. /gm, '<span style="color:var(--accent3);">▸ </span>');

        resultsEl.innerHTML = `
            <div style="color:var(--accent2); font-size:10px; letter-spacing:2px; margin-bottom:8px; border-bottom:1px solid rgba(255,60,95,0.3); padding-bottom:6px;">
                ⚔ ${countryA} vs ${countryB} — ${domainNames[domain]}
            </div>
            <div style="font-family:var(--font-mono); font-size:9px; line-height:1.8; color:rgba(255,255,255,0.85);">${html}</div>
            <div style="margin-top:8px; font-size:8px; color:var(--text-dim); letter-spacing:1px;">⚠ UYARI: Bu analiz spekülatif amaçlıdır. Gerçek askeri kapasite değerlendirmesi değildir.</div>
        `;

        // Show conflict on globe
        const countryCoords = {
            USA: { lat: 37, lng: -95 }, Russia: { lat: 60, lng: 90 },
            China: { lat: 35, lng: 104 }, Turkey: { lat: 39, lng: 35 },
            Iran: { lat: 32, lng: 53 }, Israel: { lat: 31, lng: 35 },
            India: { lat: 20, lng: 78 }, Pakistan: { lat: 30, lng: 70 },
            'North Korea': { lat: 40, lng: 127 }, 'South Korea': { lat: 36, lng: 127 },
            Japan: { lat: 37, lng: 137 }, France: { lat: 46, lng: 2 },
            UK: { lat: 55, lng: -3 }, Germany: { lat: 51, lng: 10 },
            Taiwan: { lat: 24, lng: 121 }, Ukraine: { lat: 48, lng: 31 },
        };
        const cA = countryCoords[countryA];
        const cB = countryCoords[countryB];
        if (cA && cB) {
            myGlobe.arcsData([{
                startLat: cA.lat, startLng: cA.lng,
                endLat: cB.lat, endLng: cB.lng,
                color: '#ff3c5f',
            }])
            .arcStartLat(d => d.startLat).arcStartLng(d => d.startLng)
            .arcEndLat(d => d.endLat).arcEndLng(d => d.endLng)
            .arcColor(() => ['#ff3c5f00', '#ff3c5f', '#ff3c5faa'])
            .arcAltitudeAutoScale(0.5)
            .arcStroke(1.0)
            .arcDashLength(0.5).arcDashGap(0.2).arcDashAnimateTime(2000);
        }
    } catch (err) {
        resultsEl.innerHTML = `<div style="color:#ff9800; font-size:10px;">API bağlantı hatası: ${err.message}</div>`;
    }
}

// ── SIMULATION ─────────────────────────────────────────────
function openSim() {
    const panel = document.getElementById('sim-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') populateSimForm();
}

function closeSim() {
    document.getElementById('sim-panel').style.display = 'none';
    if (!STATE.overlays.cyber) myGlobe.arcsData([]);
    myGlobe.ringsData([]);
    renderOverlays();
}

function populateSimForm() {
    const acSel = document.getElementById('sim-aircraft');
    acSel.innerHTML = Object.entries(AIRCRAFT_SPECS).map(([k, v]) =>
        `<option value="${k}">${v.icon} ${k} [${v.category.toUpperCase()}]</option>`
    ).join('');
    acSel.onchange = () => updateAircraftInfo(acSel.value);
    updateAircraftInfo(acSel.value);

    const origSel = document.getElementById('sim-origin');
    origSel.innerHTML = MILITARY_AIR_BASES.map(b =>
        `<option value="${b.lat},${b.lng},${b.name}">${b.name} [${b.country}]</option>`
    ).join('');
}

function updateAircraftInfo(name) {
    const spec = AIRCRAFT_SPECS[name];
    if (!spec) return;
    document.getElementById('sim-aircraft-info').innerHTML = `
        <div><span style="color:var(--text-dim)">Kategori:</span> ${spec.category.toUpperCase()}</div>
        <div><span style="color:var(--text-dim)">Max Menzil:</span> <span style="color:var(--accent)">${spec.range_km.toLocaleString()} km</span></div>
        <div><span style="color:var(--text-dim)">Cruise Hız:</span> <span style="color:var(--accent)">${spec.cruise_speed} km/h</span></div>
        <div><span style="color:var(--text-dim)">Faydalı Yük:</span> <span style="color:var(--accent3)">${spec.payload_kg.toLocaleString()} kg</span></div>
        <div><span style="color:var(--text-dim)">Silahlar:</span> <span style="color:#ff9800; font-size:9px;">${spec.payload_desc}</span></div>
        ${spec.stealth ? '<div style="color:var(--green)">✓ STEALTH</div>' : ''}
    `;
}

function pickTargetMode() {
    STATE.pickingTarget = true;
    document.getElementById('pick-mode-indicator').style.display = 'block';
    document.getElementById('globeViz').style.cursor = 'crosshair';
}

function runSimulation() {
    const acName = document.getElementById('sim-aircraft').value;
    const spec = AIRCRAFT_SPECS[acName];
    const count = parseInt(document.getElementById('sim-count').value) || 10;
    const originVal = document.getElementById('sim-origin').value;
    const targetLat = parseFloat(document.getElementById('sim-lat').value);
    const targetLng = parseFloat(document.getElementById('sim-lng').value);

    if (!originVal || isNaN(targetLat) || isNaN(targetLng)) {
        alert('KALKIŞ ÜSSÜ VE HEDEF KOORDİNATI SEÇİNİZ');
        return;
    }

    const [oLat, oLng, ...oNameParts] = originVal.split(',');
    const oName = oNameParts.join(',');
    const originLat = parseFloat(oLat), originLng = parseFloat(oLng);

    const dist = haversine(originLat, originLng, targetLat, targetLng);
    const flightTime = dist / spec.cruise_speed;
    const flightTimeMin = Math.round(flightTime * 60);
    const fuelPerAircraft = dist * spec.fuel_burn_L_per_km;
    const totalFuel = fuelPerAircraft * count;
    const canReach = fuelPerAircraft <= spec.fuel_capacity_L;
    const refuelStops = canReach ? 0 : Math.ceil(fuelPerAircraft / spec.fuel_capacity_L) - 1;
    const stealth = spec.stealth ? 'YÜKSEK (STEALTH)' : 'NORMAL';
    const stealthBonus = spec.stealth ? -40 : 0;
    const speedBonus = spec.speed_kmh > 2000 ? -10 : 0;
    const enemyInterceptChance = Math.max(10, 60 + stealthBonus + speedBonus);
    const missionSuccess = Math.random() * 100 > enemyInterceptChance;
    const lostUnits = missionSuccess ? 0 : Math.ceil(Math.random() * (count / 2));

    const resultsEl = document.getElementById('sim-results');
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `
        <div class="result-title">⚡ SİMÜLASYON SONUÇLARI</div>
        <div class="result-row"><span class="result-label">UÇAK</span><span class="result-val">${count}x ${acName}</span></div>
        <div class="result-row"><span class="result-label">KALKIŞ</span><span class="result-val">${oName.trim()}</span></div>
        <div class="result-row"><span class="result-label">MESAFE</span><span class="result-val">${dist.toFixed(0)} km</span></div>
        <div class="result-row"><span class="result-label">UÇUŞ SÜRESİ</span><span class="${canReach ? 'result-val' : 'result-warn'}">${Math.floor(flightTimeMin/60)}s ${flightTimeMin%60}dk</span></div>
        <div class="result-row"><span class="result-label">YAKIT/UÇAK</span><span class="${canReach ? 'result-val' : 'result-danger'}">${fuelPerAircraft.toFixed(0)} L ${canReach ? '✓' : `⚠ ${refuelStops} ikmal`}</span></div>
        <div class="result-row"><span class="result-label">TOPLAM YÜKL</span><span class="result-val">${(spec.payload_kg * count / 1000).toFixed(1)} ton</span></div>
        <div class="result-row"><span class="result-label">SAM TEHDİT</span><span class="${enemyInterceptChance > 40 ? 'result-danger' : 'result-warn'}">%${enemyInterceptChance} ENGELLENME</span></div>
        <div class="result-row" style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
            <span class="result-label">GÖREV SONUCU</span>
            <span class="${missionSuccess ? 'result-val' : 'result-danger'}" style="font-size:14px;">${missionSuccess ? '✯ HEDEF İMHA' : '☠ BAŞARISIZ'}</span>
        </div>
        ${!missionSuccess ? `<div class="result-row"><span class="result-label">KAYIPLAR</span><span class="result-danger">-${lostUnits} UÇAK</span></div>` : ''}
    `;

    myGlobe
        .pathsData([{ name: `${acName} MISYON`, path: interpolateRoute(originLat, originLng, targetLat, targetLng, 50), color: '#ff3c5f' }])
        .pathPoints(d => d.path).pathPointLat(d => d[0]).pathPointLng(d => d[1])
        .pathColor(() => '#ff3c5f').pathDashLength(0.06).pathDashGap(0.008)
        .pathDashAnimateTime(3000).pathStroke(1.5).pathLabel(d => `🎯 ${d.name}`);

    myGlobe.ringsData([{ lat: targetLat, lng: targetLng }])
        .ringColor(() => '#ff3c5f').ringMaxRadius(6).ringPropagationSpeed(4).ringRepeatPeriod(1000);

    myGlobe.pointOfView({ lat: (originLat + targetLat) / 2, lng: (originLng + targetLng) / 2, altitude: 2.5 }, 2000);
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function interpolateRoute(lat1, lng1, lat2, lng2, steps) {
    return Array.from({ length: steps+1 }, (_, i) => {
        const t = i / steps;
        return [lat1 + (lat2-lat1)*t, lng1 + (lng2-lng1)*t];
    });
}

// ── GLOBE CONTROLS ─────────────────────────────────────────
function toggleLights(inp) {
    myGlobe.globeImageUrl(inp.checked
        ? 'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg'
        : 'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-blue-marble.jpg');
}
function toggleAtmosphere(inp) { myGlobe.showAtmosphere(inp.checked); }
function toggleBump(inp) {
    myGlobe.bumpImageUrl(inp.checked
        ? 'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png' : '');
}
function resetCamera() { myGlobe.pointOfView({ lat: 39, lng: 35, altitude: 2.5 }, 1500); }

// ── REFRESH TIMER ──────────────────────────────────────────
let countdown = 15;
function startRefreshTimer() {
    setInterval(() => {
        if (!STATE.layer) return;
        countdown--;
        document.getElementById('bb-next').innerText = countdown + 's';
        if (countdown <= 0) {
            countdown = 15;
            if (STATE.layer !== 'civilian') updateData();
        }
    }, 1000);
}

// ── CLOCK ──────────────────────────────────────────────────
setInterval(() => {
    const t = new Date().toISOString().substr(11, 8);
    const c1 = document.getElementById('utc-clock');
    const c2 = document.getElementById('utc-clock2');
    if (c1) c1.innerText = t;
    if (c2) c2.innerText = t;
}, 1000);

// ── WINDOW RESIZE ──────────────────────────────────────────
window.addEventListener('resize', () => {
    myGlobe.width(window.innerWidth).height(window.innerHeight);
});

// ── INIT ───────────────────────────────────────────────────
(async function init() {
    // Start with no layer selected — just show the globe
    // Overlays can be activated independently
    renderOverlays();
    startRefreshTimer();
    setInterval(() => {
        if (STATE.layer && STATE.layer !== 'civilian') updateData();
    }, 15000);
})();
