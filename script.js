/* ============================================================
   RADARSCOPE — Main Script  (fixed + extended)
   ============================================================ */

'use strict';

// ── STATE ──────────────────────────────────────────────────
const STATE = {
    layer: 'civilian',
    overlays: { airBase: false, naval: false, railway: false, weather: false },
    selectedCountry: 'all',
    allData: [],
    liveFlights: [],
    flightHistory: {},
    pickingTarget: false,
    filterAlt: 0,
    filterSpd: 0,
};

// ── WEBSOCKET ──────────────────────────────────────────────
// Eski hali: const socket = io();
// Yeni hali:
const socket = io("https://radarscope.onrender.com");

socket.on('live_flight_data', (raw) => {
    if (STATE.layer === 'civilian') {
        processWebSocketData(raw);
    }
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
        setTimeout(() => myGlobe.ringsData([]), 5000);
    }
}

// ── LAYER SWITCH ───────────────────────────────────────────
function switchLayer(layer, btn) {
    STATE.layer = layer;
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.getElementById('layer-indicator').innerText = layer.toUpperCase();
    document.getElementById('bb-layer').innerText = layer.toUpperCase() + ' LAYER';
    updateData();
}

// ── MAIN UPDATE FUNCTION (was missing!) ───────────────────
async function updateData() {
    let data = [];

    if (STATE.layer === 'civilian') {
        // WebSocket'ten gelen veri zaten STATE.liveFlights'a yazılıyor
        // İlk yüklemede fallback simülasyon kullan
        if (STATE.liveFlights.length === 0) {
            data = generateSimulatedFlights('civilian');
            STATE.liveFlights = data;
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
    renderOverlays(); // overlayları da yenile

    document.getElementById('active-count').innerText = `${filtered.length} TRACKS`;
    document.getElementById('bb-count').innerText = filtered.length;
}

// ── PROCESS WEBSOCKET DATA ─────────────────────────────────
function processWebSocketData(raw) {
    if (!raw.states || raw.states.length === 0) {
        STATE.liveFlights = generateSimulatedFlights('civilian');
    } else {
        const parsed = raw.states
            .filter(s => s[5] && s[6] && s[7])
            .slice(0, 300)
            .map(s => ({
                icao24: s[0],
                callsign: (s[1] || 'UNK').trim(),
                lat: s[6], lng: s[5],
                alt: (s[7] || 0) / 1000,
                velocity: s[9] || 0,
                heading: s[10] || 0,
                country: s[2] || '?',
                type: 'civilian'
            }));
        STATE.liveFlights = parsed;
    }

    STATE.liveFlights.forEach(f => {
        if (!STATE.flightHistory[f.icao24]) STATE.flightHistory[f.icao24] = [];
        STATE.flightHistory[f.icao24].push([f.lat, f.lng, f.alt]);
        if (STATE.flightHistory[f.icao24].length > 10) STATE.flightHistory[f.icao24].shift();
        f.path = STATE.flightHistory[f.icao24];
    });

    if (STATE.layer !== 'civilian') return; // diğer katmanlarda civil veriyi işleme

    const filtered = applyDataFilter(STATE.liveFlights);
    renderGlobePoints(filtered);
    renderLiveList(filtered);

    document.getElementById('active-count').innerText = `${filtered.length} TRACKS`;
    document.getElementById('bb-count').innerText = filtered.length;
}

// ── FETCH MILITARY ─────────────────────────────────────────
async function fetchMilitaryFlights() {
    try {
        const res = await fetch(
            `https://opensky-network.org/api/states/all`,
            { signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) throw new Error('API error');
        const raw = await res.json();

        if (!raw.states) return generateSimulatedFlights('military');

        const milPrefixes = ['MAGMA','REACH','JAKE','HOMER','TOPAZ','HAVOC',
            'COBRA','VIPER','JOLLY','IRON','GHOST','KNIFE','DEMON',
            'FURY','RAPTOR','EAGLE','FALCON','TALON','SHADOW','NIGHT',
            'RCH','CNV','PAT','STEEL','RANGER','WOLF','PANTHER','NOBLE',
            'SPAR','EVAC','GRIM','BOXER','LANCE','BONE','BUFF',
            'SLAM','DUKE','RAVEN','BRONCO','DAGGER','FORCE','LIMA'];

        const milFlights = raw.states
            .filter(s => {
                if (!s[1] || !s[5] || !s[6]) return false;
                const cs = (s[1] || '').trim().toUpperCase();
                return milPrefixes.some(p => cs.startsWith(p)) ||
                       /^[A-Z]{2}\d{4}/.test(cs);
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

        if (milFlights.length < 5) return generateSimulatedFlights('military');
        return milFlights;
    } catch (e) {
        return generateSimulatedFlights('military');
    }
}

// ── SIMULATED FLIGHTS ──────────────────────────────────────
function generateSimulatedFlights(type) {
    const count = type === 'military' ? 80 : 250;
    const callsigns_civ = ['THY','TK','DLH','LFT','AFR','BAW','UAE','QTR','ETD',
        'KLM','SAS','IBO','AHY','IAW','FLY','BMS','VYL','SXS','ERA','BER',
        'SWR','AZA','TAP','IBE','VIR','DAL','UAL','AAL','SWA','FDX','UPS'];
    const callsigns_mil = ['MAGMA11','REACH90','JAKE22','HOMER61','TOPAZ17',
        'COBRA01','VIPER22','GHOST13','IRON80','FURY33','RAVEN12','WOLF44',
        'DUKE99','BOXER22','LANCE55','BONE21','DAGGER08','TALON19','GRIM77',
        'HAVOC31','RAPTOR01','EAGLE22','NOBLE14','STEEL88','SPAR21'];

    const routes = [
        { lat: 41, lng: 29 }, { lat: 51, lng: 0 },
        { lat: 48, lng: 2 }, { lat: 40, lng: -74 },
        { lat: 37, lng: -122 }, { lat: 55, lng: 37 },
        { lat: 35, lng: 139 }, { lat: 22, lng: 114 },
        { lat: -34, lng: 151 }, { lat: 28, lng: 77 },
        { lat: 1, lng: 104 }, { lat: -23, lng: -46 },
        { lat: 25, lng: 55 },
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
            type: type,
            simulated: true,
        };
    });
}

// ── SATELLITE DATA ─────────────────────────────────────────
async function fetchSatelliteData() {
    const sats = [];
    for (let i = 0; i < 60; i++) {
        const t = Date.now() / 1000 + i * 300;
        const orbitPeriod = 90 + Math.random() * 1000;
        const phase = (t / (orbitPeriod * 60)) * 2 * Math.PI;
        const inc = (20 + Math.random() * 120) * Math.PI / 180;
        const lon0 = (i * 47) % 360 - 180;
        const namedSats = ['ISS','GPS-IIR','STARLINK-1234','SENTINEL-1A','NOAA-19',
            'GOES-16','AQUA','TERRA','LANDSAT-9','SMOS','METOP-B','GRACE-FO-1'];

        sats.push({
            callsign: i < namedSats.length ? namedSats[i] : `SAT-${(1000 + i)}`,
            lat: Math.sin(inc) * Math.sin(phase) * 90,
            lng: lon0 + ((t / orbitPeriod) * 360 / 60) % 360,
            alt: 0.3 + Math.random() * 35,
            velocity: 7.2 + Math.random() * 1.5,
            heading: 0,
            type: 'satellite',
            orbitInc: inc * 180 / Math.PI,
        });
    }
    return sats;
}

// ── WEATHER DATA (new!) ────────────────────────────────────
async function fetchWeatherData() {
    // Simulated global weather systems with realistic coordinates
    const weatherSystems = [
        // Tropical storms / hurricanes
        { name: 'LOW-1', type: 'cyclone',   lat: 18.5,  lng: -65.2,  intensity: 'CAT-3', wind_kmh: 185, pressure_hpa: 960,  color: '#ff3c5f' },
        { name: 'LOW-2', type: 'typhoon',   lat: 22.1,  lng: 128.7,  intensity: 'T5',    wind_kmh: 210, pressure_hpa: 940,  color: '#ff3c5f' },
        { name: 'LOW-3', type: 'depression',lat: 10.2,  lng: 80.5,   intensity: 'DEP',   wind_kmh: 65,  pressure_hpa: 998,  color: '#ff9800' },
        // Mid-latitude lows
        { name: 'DEP-1', type: 'low',       lat: 55.3,  lng: -20.1,  intensity: 'LOW',   wind_kmh: 75,  pressure_hpa: 992,  color: '#00b4d8' },
        { name: 'DEP-2', type: 'low',       lat: 60.8,  lng: 5.3,    intensity: 'LOW',   wind_kmh: 90,  pressure_hpa: 988,  color: '#00b4d8' },
        { name: 'DEP-3', type: 'low',       lat: 48.2,  lng: -55.0,  intensity: 'LOW',   wind_kmh: 80,  pressure_hpa: 990,  color: '#00b4d8' },
        { name: 'DEP-4', type: 'low',       lat: 62.0,  lng: 35.0,   intensity: 'LOW',   wind_kmh: 70,  pressure_hpa: 995,  color: '#00b4d8' },
        // High pressure systems
        { name: 'HIGH-1',type: 'high',      lat: 33.0,  lng: -30.0,  intensity: 'HIGH',  wind_kmh: 20,  pressure_hpa: 1024, color: '#39ff14' },
        { name: 'HIGH-2',type: 'high',      lat: -30.0, lng: -15.0,  intensity: 'HIGH',  wind_kmh: 25,  pressure_hpa: 1028, color: '#39ff14' },
        { name: 'HIGH-3',type: 'high',      lat: 40.0,  lng: 130.0,  intensity: 'HIGH',  wind_kmh: 15,  pressure_hpa: 1022, color: '#39ff14' },
        { name: 'HIGH-4',type: 'high',      lat: -25.0, lng: 105.0,  intensity: 'HIGH',  wind_kmh: 20,  pressure_hpa: 1026, color: '#39ff14' },
        // Frontal systems
        { name: 'COLD-FRONT-1', type: 'front', lat: 45.0, lng: -80.0, intensity: 'FRONT', wind_kmh: 55, pressure_hpa: 1005, color: '#4361ee' },
        { name: 'WARM-FRONT-1', type: 'front', lat: 50.0, lng: 10.0,  intensity: 'FRONT', wind_kmh: 45, pressure_hpa: 1008, color: '#f72585' },
        { name: 'COLD-FRONT-2', type: 'front', lat: -50.0,lng: -60.0, intensity: 'FRONT', wind_kmh: 100,pressure_hpa: 975,  color: '#4361ee' },
        // Thunderstorm complexes
        { name: 'CB-1', type: 'thunderstorm', lat: 5.0,   lng: 25.0,  intensity: 'CBs',   wind_kmh: 35, pressure_hpa: 1010, color: '#ffd93d' },
        { name: 'CB-2', type: 'thunderstorm', lat: -5.0,  lng: -55.0, intensity: 'CBs',   wind_kmh: 40, pressure_hpa: 1008, color: '#ffd93d' },
        { name: 'CB-3', type: 'thunderstorm', lat: 15.0,  lng: 105.0, intensity: 'CBs',   wind_kmh: 45, pressure_hpa: 1005, color: '#ffd93d' },
        // Fog/Haze areas
        { name: 'FOG-1', type: 'fog',  lat: 52.0, lng: 4.0,   intensity: 'DENSE', wind_kmh: 5,  pressure_hpa: 1018, color: '#adb5bd' },
        { name: 'FOG-2', type: 'fog',  lat: 37.5, lng: 122.3, intensity: 'FOG',   wind_kmh: 8,  pressure_hpa: 1015, color: '#adb5bd' },
        // Polar vortex
        { name: 'ARCT-1', type: 'arctic', lat: 82.0, lng: 0.0,   intensity: 'ARCT',  wind_kmh: 120, pressure_hpa: 965, color: '#ade8f4' },
        { name: 'ARCT-2', type: 'arctic', lat: -80.0,lng: 45.0,  intensity: 'ARCT',  wind_kmh: 150, pressure_hpa: 950, color: '#ade8f4' },
    ];
    return weatherSystems;
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
    myGlobe.pointsData([]).pathsData([]);
    if (!data || data.length === 0) return;

    if (STATE.layer === 'satellites') {
        const orbitPaths = data.map(sat => ({
            ...sat,
            path: generateOrbitPath(sat),
        }));
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
            .pointColor(d => isMil ? '#ff3c5f' : '#00f2ff')
            .pointRadius(isMil ? 0.22 : 0.16)
            .pointLabel(d => {
                const icon = isMil ? '🎖️' : '✈️';
                return `${icon} <b>${d.callsign}</b><br/>
                    ALT: ${d.alt.toFixed(1)} km | SPD: ${((d.velocity||0)*3.6).toFixed(0)} km/h<br/>
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
    const steps = 72;
    for (let i = 0; i < steps; i++) {
        const theta = (i / steps) * 2 * Math.PI;
        const inc = (sat.orbitInc || 55) * Math.PI / 180;
        const lat = Math.asin(Math.sin(inc) * Math.sin(theta)) * 180 / Math.PI;
        const lng = sat.lng + (theta * 180 / Math.PI);
        points.push([lat, ((lng + 180) % 360) - 180]);
    }
    return points;
}

// ── OVERLAYS ───────────────────────────────────────────────
// FIX: overlayStates uses STATE.overlays directly
function toggleOverlay(type, btn) {
    STATE.overlays[type] = !STATE.overlays[type];

    // Update button styles
    if (type === 'airBase') {
        btn.classList.toggle('active', STATE.overlays.airBase);
    } else if (type === 'naval') {
        btn.classList.toggle('active-naval', STATE.overlays.naval);
    } else if (type === 'railway') {
        btn.classList.toggle('active-railway', STATE.overlays.railway);
    } else if (type === 'weather') {
        btn.classList.toggle('active-weather', STATE.overlays.weather);
    }

    // Country select visibility (weather has no country filter)
    const anyBaseOverlay = STATE.overlays.airBase || STATE.overlays.naval || STATE.overlays.railway;
    document.getElementById('countrySelectWrap').style.display = anyBaseOverlay ? 'block' : 'none';
    if (anyBaseOverlay) populateCountrySelect();

    renderOverlays();
}

function populateCountrySelect() {
    const sel = document.getElementById('countrySelect');
    const countries = new Set();

    if (STATE.overlays.airBase || STATE.overlays.naval) {
        const allBases = [...MILITARY_AIR_BASES, ...NAVAL_BASES];
        allBases.forEach(b => countries.add(b.country));
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
        bases.forEach(b => allCustomPoints.push({
            ...b, _overlayType: 'airBase',
            _color: '#ffd93d', _radius: 0.35, _alt: 0.015,
        }));
    }

    // ── NAVAL BASES ──
    if (STATE.overlays.naval) {
        const bases = NAVAL_BASES.filter(b =>
            STATE.selectedCountry === 'all' || b.country === STATE.selectedCountry
        );
        bases.forEach(b => allCustomPoints.push({
            ...b, _overlayType: 'naval',
            _color: '#0096ff', _radius: 0.4, _alt: 0.012,
        }));
    }

    // ── RAILWAYS ──
    if (STATE.overlays.railway) {
        const lines = STATE.selectedCountry === 'all'
            ? Object.values(RAILWAY_LINES).flat()
            : (RAILWAY_LINES[STATE.selectedCountry] || []);
        lines.forEach(line => allPaths.push({ ...line, _isRailway: true }));
    }

    // ── WEATHER ── (new!)
    if (STATE.overlays.weather) {
        const weatherData = await fetchWeatherData();
        weatherData.forEach(w => allCustomPoints.push({
            ...w,
            lat: w.lat, lng: w.lng,
            _overlayType: 'weather',
            _color: w.color,
            _radius: w.type === 'cyclone' || w.type === 'typhoon' ? 0.6 :
                     w.type === 'high' ? 0.4 : 0.45,
            _alt: 0.02,
        }));
    }

    // Rings for air bases
    if (STATE.overlays.airBase) {
        const airBasePoints = allCustomPoints.filter(p => p._overlayType === 'airBase');
        myGlobe.ringsData(airBasePoints)
            .ringColor(() => 'rgba(255,217,61,0.5)')
            .ringMaxRadius(3)
            .ringPropagationSpeed(1.5)
            .ringRepeatPeriod(2000);
    } else {
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
            .pathDashLength(0.12)
            .pathDashGap(0.01)
            .pathDashAnimateTime(8000)
            .pathStroke(0.8)
            .pathLabel(d => `🛤️ ${d.name}`);
    } else {
        if (STATE.layer === 'satellites' && STATE.liveFlights.length > 0) {
            const orbitPaths = STATE.liveFlights.map(sat => ({
                ...sat, path: generateOrbitPath(sat),
            }));
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
        } else {
            myGlobe.pathsData([]);
        }
    }

    const allDisplayPoints = [...applyDataFilter(STATE.liveFlights), ...customPoints];
    const isMil = STATE.layer === 'military';

    myGlobe
        .pointsData(allDisplayPoints)
        .pointLat(d => d.lat)
        .pointLng(d => d.lng)
        .pointAltitude(d => {
            if (d._overlayType) return d._alt;
            if (STATE.layer === 'satellites') return Math.min((d.alt||0) / 40, 0.8);
            return Math.min((d.alt||0) * 0.008, 0.5);
        })
        .pointColor(d => {
            if (d._overlayType === 'airBase') return '#ffd93d';
            if (d._overlayType === 'naval') return '#0096ff';
            if (d._overlayType === 'weather') return d._color || '#ade8f4';
            if (STATE.layer === 'satellites') return '#ffd93d';
            return isMil ? '#ff3c5f' : '#00f2ff';
        })
        .pointRadius(d => {
            if (d._overlayType) return d._radius;
            return isMil ? 0.22 : (STATE.layer === 'satellites' ? 0.3 : 0.16);
        })
        .pointLabel(d => {
            if (d._overlayType === 'airBase') {
                const ac = (d.aircraft||[]).join(', ');
                return `✈ <b>${d.name}</b><br/>🏴 ${d.country}<br/>🛩️ ${ac}`;
            }
            if (d._overlayType === 'naval') {
                const vs = (d.vessels||[]).join(', ');
                return `⚓ <b>${d.name}</b><br/>🏴 ${d.country}<br/>🚢 ${vs}`;
            }
            if (d._overlayType === 'weather') {
                const wIcon = d.type === 'cyclone' || d.type === 'typhoon' ? '🌀' :
                              d.type === 'thunderstorm' ? '⛈' :
                              d.type === 'high' ? '☀' :
                              d.type === 'low' ? '🌧' :
                              d.type === 'fog' ? '🌫' :
                              d.type === 'arctic' ? '❄' : '🌩';
                return `${wIcon} <b>${d.name}</b><br/>
                    Tip: ${d.type.toUpperCase()}<br/>
                    Şiddet: ${d.intensity}<br/>
                    Rüzgar: ${d.wind_kmh} km/h<br/>
                    Basınç: ${d.pressure_hpa} hPa`;
            }
            if (STATE.layer === 'satellites') {
                return `🛰️ <b>${d.callsign}</b><br/>ALT: ${(d.alt||0).toFixed(0)} km`;
            }
            const icon = isMil ? '🎖️' : '✈️';
            return `${icon} <b>${d.callsign}</b><br/>ALT: ${(d.alt||0).toFixed(1)} km | SPD: ${(((d.velocity||0)*3.6)).toFixed(0)} km/h<br/>${d.country ? 'CTY: ' + d.country : ''}`;
        })
        .onPointClick(d => {
            myGlobe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.8 }, 1000);
            if (d._overlayType === 'airBase' || d._overlayType === 'naval') showBaseDetail(d);
            else if (d._overlayType === 'weather') showWeatherDetail(d);
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
            <div style="color:#ff9800; font-size:10px;">⚠ VERİ ALINAMADI — SİMÜLASYON MODUNDA</div>
        </div>`;
        return;
    }

    const isMil = STATE.layer === 'military';
    const isSat = STATE.layer === 'satellites';
    const sorted = [...data].sort((a, b) => (b.alt||0) - (a.alt||0));

    sorted.slice(0, 40).forEach(item => {
        const div = document.createElement('div');
        div.className = `list-item${isMil ? ' military' : ''}`;
        const spd = isSat
            ? `${(item.velocity||0).toFixed(1)} km/s`
            : `${(((item.velocity||0)*3.6)).toFixed(0)} km/h`;
        const icon = isSat ? '🛰' : (isMil ? '🎖' : '✈');
        div.innerHTML = `
            <div class="item-row1">
                <span class="item-callsign">${icon} ${item.callsign || 'UNK'}</span>
                <span class="item-alt">${(item.alt||0).toFixed(1)} km</span>
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
        <div class="detail-cell">
            <div class="detail-cell-label">LATITUDE</div>
            <div class="detail-cell-val">${(d.lat||0).toFixed(4)}°</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">LONGITUDE</div>
            <div class="detail-cell-val">${(d.lng||0).toFixed(4)}°</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">ALTITUDE</div>
            <div class="detail-cell-val">${alt} km</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">SPEED</div>
            <div class="detail-cell-val">${spd} km/h</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">HEADING</div>
            <div class="detail-cell-val">${(d.heading||0).toFixed(0)}°</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">COUNTRY</div>
            <div class="detail-cell-val">${d.country || '?'}</div>
        </div>
        ${isMil ? `
        <div class="detail-cell" style="grid-column:span 2; border-left:2px solid var(--accent2);">
            <div class="detail-cell-label">⚠ MİLİTER TRACKING</div>
            <div class="detail-cell-val" style="color:var(--accent2)">ACTIVE SURVEILLANCE</div>
        </div>` : ''}
        ${d.simulated ? `
        <div class="detail-cell" style="grid-column:span 2; border-left:2px solid #ff9800;">
            <div class="detail-cell-label">KAYNAK</div>
            <div class="detail-cell-val" style="color:#ff9800">SİMÜLASYON</div>
        </div>` : `
        <div class="detail-cell" style="grid-column:span 2; border-left:2px solid var(--green);">
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
    const label = isNaval ? 'DENİZ ÜSSÜ' : 'HAVA ÜSSÜ';
    const assets = isNaval ? (d.vessels || []) : (d.aircraft || []);

    document.getElementById('detail-callsign').innerText = `${icon} ${d.name}`;
    document.getElementById('detail-grid').innerHTML = `
        <div class="detail-cell">
            <div class="detail-cell-label">TİP</div>
            <div class="detail-cell-val">${label}</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">ÜLKE</div>
            <div class="detail-cell-val">${d.country}</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">BOYUT</div>
            <div class="detail-cell-val">${(d.size||'major').toUpperCase()}</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">KOORDİNAT</div>
            <div class="detail-cell-val">${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}</div>
        </div>
        <div class="detail-cell" style="grid-column:span 2;">
            <div class="detail-cell-label">${isNaval ? 'GEMİLER' : 'UÇAKLAR'}</div>
            <div class="detail-cell-val" style="font-size:11px; line-height:1.8;">${assets.join(' · ')}</div>
        </div>
    `;
    panel.style.display = 'block';
}

// FIX: new weather detail panel
function showWeatherDetail(d) {
    const panel = document.getElementById('detail-panel');
    const wIcon = d.type === 'cyclone' || d.type === 'typhoon' ? '🌀' :
                  d.type === 'thunderstorm' ? '⛈' :
                  d.type === 'high' ? '☀' :
                  d.type === 'low' ? '🌧' :
                  d.type === 'fog' ? '🌫' :
                  d.type === 'arctic' ? '❄' : '🌩';

    document.getElementById('detail-callsign').innerText = `${wIcon} ${d.name}`;
    document.getElementById('detail-grid').innerHTML = `
        <div class="detail-cell">
            <div class="detail-cell-label">TİP</div>
            <div class="detail-cell-val">${d.type.toUpperCase()}</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">ŞİDDET</div>
            <div class="detail-cell-val" style="color:${d.color}">${d.intensity}</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">RÜZGAR</div>
            <div class="detail-cell-val">${d.wind_kmh} km/h</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">BASINÇ</div>
            <div class="detail-cell-val">${d.pressure_hpa} hPa</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">ENLEM</div>
            <div class="detail-cell-val">${d.lat.toFixed(2)}°</div>
        </div>
        <div class="detail-cell">
            <div class="detail-cell-label">BOYLAM</div>
            <div class="detail-cell-val">${d.lng.toFixed(2)}°</div>
        </div>
        <div class="detail-cell" style="grid-column:span 2; border-left:2px solid ${d.color};">
            <div class="detail-cell-label">KAYNAK</div>
            <div class="detail-cell-val" style="color:#ff9800">SİMÜLASYON — GERÇEK ZAMANLI DEĞİL</div>
        </div>
    `;
    panel.style.display = 'block';
}

function closeDetail() {
    document.getElementById('detail-panel').style.display = 'none';
}

// ── SIMULATION ─────────────────────────────────────────────
function openSim() {
    const panel = document.getElementById('sim-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') populateSimForm();
}

function closeSim() {
    document.getElementById('sim-panel').style.display = 'none';
    myGlobe.ringsData([]).pathsData([]);
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
    const originLat = parseFloat(oLat);
    const originLng = parseFloat(oLng);

    const dist = haversine(originLat, originLng, targetLat, targetLng);
    const flightTime = dist / spec.cruise_speed;
    const flightTimeMin = Math.round(flightTime * 60);
    const fuelPerAircraft = dist * spec.fuel_burn_L_per_km;
    const totalFuel = fuelPerAircraft * count;
    const canReach = fuelPerAircraft <= spec.fuel_capacity_L;
    const refuelStops = canReach ? 0 : Math.ceil(fuelPerAircraft / spec.fuel_capacity_L) - 1;
    const totalPayload = spec.payload_kg * count;
    const payloadTons = (totalPayload / 1000).toFixed(1);
    const stealth = spec.stealth ? 'YÜKSEK (STEALTH)' : 'NORMAL';

    const stealthBonus = spec.stealth ? -40 : 0;
    const speedBonus = spec.speed_kmh > 2000 ? -10 : 0;
    const enemyInterceptChance = Math.max(10, 60 + stealthBonus + speedBonus);
    const rngRoll = Math.random() * 100;
    const missionSuccess = rngRoll > enemyInterceptChance;
    const lostUnits = missionSuccess ? 0 : Math.ceil(Math.random() * (count / 2));

    const resultsEl = document.getElementById('sim-results');
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `
        <div class="result-title">⚡ SİMÜLASYON SONUÇLARI</div>
        <div class="result-row"><span class="result-label">UÇAK</span><span class="result-val">${count}x ${acName}</span></div>
        <div class="result-row"><span class="result-label">KALKIŞ</span><span class="result-val">${oName.trim()}</span></div>
        <div class="result-row"><span class="result-label">MESAFE</span><span class="result-val">${dist.toFixed(0)} km</span></div>
        <div class="result-row">
            <span class="result-label">UÇUŞ SÜRESİ</span>
            <span class="${canReach ? 'result-val' : 'result-warn'}">${Math.floor(flightTimeMin/60)}s ${flightTimeMin%60}dk</span>
        </div>
        <div class="result-row">
            <span class="result-label">UÇAK BAŞI YAKIT</span>
            <span class="${canReach ? 'result-val' : 'result-danger'}">
                ${fuelPerAircraft.toFixed(0)} L ${canReach ? '✓' : `⚠ AŞIYOR (${refuelStops} ikmal)`}
            </span>
        </div>
        <div class="result-row"><span class="result-label">TOPLAM YAKIT</span><span class="result-val">${(totalFuel/1000).toFixed(1)} ton</span></div>
        <div class="result-row"><span class="result-label">TOPLAM YÜKL</span><span class="result-val">${payloadTons} ton</span></div>
        <div class="result-row"><span class="result-label">SİLAHLAR</span><span class="result-val" style="font-size:9px; max-width:180px; text-align:right;">${spec.payload_desc}</span></div>
        <div class="result-row"><span class="result-label">HAYATTA KALMA</span><span class="result-val">${stealth}</span></div>
        <div class="result-row">
            <span class="result-label">MENZIL</span>
            <span class="${canReach ? 'result-val' : 'result-danger'}">${canReach ? '✓ YETERLİ' : '✕ İKMAL GEREKLİ'}</span>
        </div>
        ${!canReach ? `<div class="result-row"><span class="result-label">İKMAL</span><span class="result-warn">${refuelStops} DURAK</span></div>` : ''}
        <div class="result-row" style="margin-top:10px; border-top:1px solid rgba(255,255,255,0.1); padding-top:10px;">
            <span class="result-label">SAM TEHDİT</span>
            <span class="${enemyInterceptChance > 40 ? 'result-danger' : 'result-warn'}">%${enemyInterceptChance} ENGELLENME</span>
        </div>
        <div class="result-row">
            <span class="result-label">GÖREV SONUCU</span>
            <span class="${missionSuccess ? 'result-val' : 'result-danger'}" style="font-size:14px; text-shadow:0 0 8px currentColor;">
                ${missionSuccess ? '✯ HEDEF İMHA EDİLDİ' : '☠ GÖREV BAŞARISIZ'}
            </span>
        </div>
        ${!missionSuccess ? `<div class="result-row"><span class="result-label">KAYIPLAR</span><span class="result-danger">-${lostUnits} UÇAK DÜŞÜRÜLDÜ</span></div>` : ''}
    `;

    myGlobe
        .pathsData([{ name: `${acName} MISYON`, path: interpolateRoute(originLat, originLng, targetLat, targetLng, 50), color: '#ff3c5f' }])
        .pathPoints(d => d.path)
        .pathPointLat(d => d[0])
        .pathPointLng(d => d[1])
        .pathColor(() => '#ff3c5f')
        .pathDashLength(0.06)
        .pathDashGap(0.008)
        .pathDashAnimateTime(3000)
        .pathStroke(1.5)
        .pathLabel(d => `🎯 ${d.name}`);

    myGlobe.ringsData([{ lat: targetLat, lng: targetLng }])
        .ringColor(() => '#ff3c5f')
        .ringMaxRadius(6)
        .ringPropagationSpeed(4)
        .ringRepeatPeriod(1000);

    myGlobe.pointOfView({ lat: (originLat + targetLat) / 2, lng: (originLng + targetLng) / 2, altitude: 2.5 }, 2000);
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLon/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function interpolateRoute(lat1, lng1, lat2, lng2, steps) {
    return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        return [lat1 + (lat2 - lat1) * t, lng1 + (lng2 - lng1) * t];
    });
}

// ── GLOBE CONTROLS ─────────────────────────────────────────
function toggleLights(inp) {
    myGlobe.globeImageUrl(inp.checked
        ? 'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg'
        : 'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-blue-marble.jpg');
}

function toggleAtmosphere(inp) {
    myGlobe.showAtmosphere(inp.checked);
}

function toggleBump(inp) {
    myGlobe.bumpImageUrl(inp.checked
        ? 'https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png'
        : '');
}

function resetCamera() {
    myGlobe.pointOfView({ lat: 39, lng: 35, altitude: 2.5 }, 1500);
}

// ── REFRESH TIMER ──────────────────────────────────────────
let countdown = 15;
function startRefreshTimer() {
    setInterval(() => {
        countdown--;
        document.getElementById('bb-next').innerText = countdown + 's';
        if (countdown <= 0) {
            countdown = 15;
            if (STATE.layer !== 'civilian') updateData(); // civilian = websocket handles it
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
    await updateData();
    startRefreshTimer();
    setInterval(() => {
        if (STATE.layer !== 'civilian') updateData();
    }, 15000);
})();
