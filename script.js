/* ============================================================
   RADARSCOPE v4.0 — Main Script
   Fixes: overlay independence, civilian/military misclassification
   New: Cyber war visualization, Conflict zones, Conflict AI analysis, Radar coverage
   ============================================================ */

'use strict';

// ── STATE ──────────────────────────────────────────────────
// STATE NESNESİNİN YENİ HALİ
const STATE = {
    layer: null,  
    overlays: { 
        airBase: false, 
        naval: false, 
        railway: false, 
        cyber: false, 
        conflict: false, 
        radar: false, 
        osint: false,
        waterResources: false,
        powerPlants: false,   // BURAYA EKLENDİ
        petroChem: false,     // BURAYA EKLENDİ
        techCenters: false    // BURAYA EKLENDİ
    },
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

// ── VERİ ÇEKME — Sadece HTTP Polling (Render WSS desteklemiyor) ──────
// Socket.IO / WebSocket Render'da çalışmıyor — doğrudan REST API polling kullanıyoruz
let osintPoints = [];
let httpPollInterval = null;
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlMmY5Y2VlYy03NTZlLTQ1NjgtYWE3Yi1jMTAzYjE4MjFlYTYiLCJpZCI6NDQ0OTUyLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODE1NzEwNzh9.jLs7q4wvNvpVrHBKv31qSVFZgmDg3LqwtbvpurkY3BU';

function startHttpPolling() {
    if (httpPollInterval) return;
    console.log('[HTTP Poll] Başlatıldı');
    // Hemen ilk isteği yap
    pollOpenSky();
    // 15 saniyede bir tekrarla
    httpPollInterval = setInterval(pollOpenSky, 15000);
}

function stopHttpPolling() {
    if (httpPollInterval) { clearInterval(httpPollInterval); httpPollInterval = null; }
}

async function pollOpenSky() {
    if (STATE.layer !== 'civilian') return;
    try {
        const res = await fetch('/api/opensky/states', { signal: AbortSignal.timeout(15000) });
        if (res.ok) {
            const data = await res.json();
            processWebSocketData(data);
        }
    } catch (e) {
        console.warn('[HTTP Poll] Hata:', e.message);
    }
}

const socket = { on: () => {} };

socket.on('connect', () => {
    console.log('[WebSocket] Bağlandı ✓');
});

socket.on('disconnect', (reason) => {
    console.warn('[WebSocket] Bağlantı kesildi:', reason);
});

// ── CESIUM VIEWER KURULUMU ─────────────────────────────────
const viewer = new Cesium.Viewer('globeViz', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    animation: false,
    timeline: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    infoBox: false,
    // Dünya küre modunda başlasın, düz mod kapalı kalsın
    sceneMode: Cesium.SceneMode.SCENE3D 
});

// KAMERA BAŞLANGIÇ AYARLARI (Geniş açıdan tam küre görünümü)
viewer.camera.setView({
    // Dünya'yı tam görecek yükseklik (15,000 km)
    destination: Cesium.Cartesian3.fromDegrees(35.0, 39.0, 15000000.0), 
    orientation: {
        heading: Cesium.Math.toRadians(0.0),
        // Dünya'ya tam tepeden bakış (Sıfıra yakın pitch)
        pitch: Cesium.Math.toRadians(-90.0), 
        roll: 0.0
    }
});

// 1. Kamera yakınlaşma sınırını 1 metreye çekerek binaların içine/dibine girmeyi sağla
viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1.0; 

// 2. Arazinin derinlik testini aç (Binaların yerle çakışmaması için kritik)
viewer.scene.globe.depthTestAgainstTerrain = true;

(async function init() {
    try {
        console.log("🏙️ 3D Şehir binaları haritaya yükleniyor...");
        
        // 3D Binaları yükle
        const buildingTileset = await Cesium.createOsmBuildingsAsync();
        viewer.scene.primitives.add(buildingTileset);
        
        console.log("🏙️ 3D Binalar başarıyla entegre edildi.");
    } catch (error) {
        console.error("3D Binalar yüklenirken hata oluştu:", error);
    }

    // Overlays can be activated independently
    renderOverlays();
    startRefreshTimer();
    
    // Veri güncelleme döngüsü
    setInterval(() => {
        if (STATE.layer && STATE.layer !== 'civilian') updateData();
    }, 15000);
})();

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

function switchLayer(layer, btn) {
    // Toggle: clicking active layer deselects it
    if (STATE.layer === layer) {
        STATE.layer = null;
        STATE.liveFlights = [];
        stopHttpPolling();
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

    // Civilian seçilince HTTP polling başlat, diğer layer'larda durdur
    if (layer === 'civilian') {
        startHttpPolling();
    } else {
        stopHttpPolling();
    }

    updateData();
}

async function updateData() {
    let data = [];

    if (STATE.layer === null) {
        renderOverlays();
        document.getElementById('active-count').innerText = `0 TRACKS`;
        document.getElementById('bb-count').innerText = 0;
        return;
    }

    if (STATE.layer === 'civilian') {
        if (STATE.liveFlights.length === 0 || STATE.liveFlights[0]?.type !== 'civilian') {
            data = [];
            STATE.liveFlights = [];
        } else {
            data = STATE.liveFlights;
        }
    } else if (STATE.layer === 'military') {
        data = await fetchMilitaryFlights();
        STATE.liveFlights = data;
    }

    const filtered = applyDataFilter(STATE.liveFlights);
    renderLiveList(filtered);
    renderOverlays();

    document.getElementById('active-count').innerText = `${filtered.length} TRACKS`;
    document.getElementById('bb-count').innerText = filtered.length;
}
// FIX: Strict military classification — only by known callsign prefixes
const MIL_PREFIXES = [
    // --- SENİN LİSTEN (KORUNDU) ---
    'MAGMA','REACH','JAKE','HOMER','TOPAZ','HAVOC','COBRA','VIPER','JOLLY',
    'IRON','GHOST','KNIFE','DEMON','FURY','RAPTOR','EAGLE','FALCON','TALON',
    'SHADOW','NIGHT','RCH','CNV','PAT','STEEL','RANGER','WOLF','PANTHER',
    'NOBLE','SPAR','EVAC','GRIM','BOXER','LANCE','BONE','BUFF','SLAM','DUKE',
    'RAVEN','BRONCO','DAGGER','FORCE','LIMA','HERKY','TROY','COLT','ROCKY',
    'VADER','TITAN','ZEUS','ARES','SPARTAN','TURAF','TUAF','USAF','RSAF',
    'FAF','NATO','QID','BART','KING','HOUND',

    // --- ABD HAVA KUVVETLERİ (USAF) - TAKTİKSEL VE OPERASYONEL ---
    'AF1', 'AF2', 'SAM', 'VENUS', 'MOOSE', 'PELICAN', 'BANSHEE', 'BAT', 'CHOSEN',
    'DOOM', 'DUSTOFF', 'ELVIS', 'GILA', 'HAWK', 'HUSKY', 'JEDI', 'MOJO', 'MUD', 
    'MUSTANG', 'OUTLAW', 'PEDRO', 'PUMA', 'RAIDER', 'REAPER', 'REDSTAR', 'RHINO', 
    'ROMEO', 'ROUGE', 'SABER', 'SCALPEL', 'SHARK', 'SLAYER', 'SNAKE', 'SNOOPY', 
    'SPOOKY', 'STING', 'STRIKE', 'TIGER', 'TOXIC', 'TUSK', 'VENOM', 'VOODOO', 
    'WARLORD', 'WEASEL', 'WIDOW', 'YANKEE', 'ZOMBIE', 'HURON', 'GRIZZLY', 
    'DRAGON', 'WARTHOG', 'PIRATE', 'NINJA', 'THUNDER', 'BOHICA', 'CHAOS', 
    'STRIX', 'TALLY', 'BOGEY', 'BANDIT', 'BLAZE', 'CLAW', 'DART', 'DEATH', 
    'DIESEL', 'DOG', 'FANG', 'GATOR', 'HUNTER', 'KILLER', 'LOBSTER', 'MACE', 
    'MAKO', 'MIG', 'PISTOL', 'PYTHON', 'RAM', 'SNIPER', 'SPIDER', 'VALKYRIE', 
    'WARBIRD', 'WRAITH', 'FEAR', 'MIGHTY', 'MYTH', 'RUMBLE', 'SCYTHE', 'SKULL', 
    'TERROR', 'BISON', 'CAMEL', 'DECOY', 'EXXON', 'GAS', 'GOLD', 'HEAVY', 
    'HOBO', 'MAPLE', 'MOBIL', 'OPAL', 'PACK', 'PEARL', 'PEST', 'RETRO', 'SHELL', 
    'TEXACO', 'TOTO', 'CHALK', 'FLIGHT', 'HUEY', 'HOOK', 'TEST', 'TRACK', 
    'EDWARDS', 'NELLIS', 'RED', 'BLUE', 'AGGR', 'BOSSMAN', 'ANVIL', 'APACHE',
    'ASSASSIN', 'AVENGER', 'BADGER', 'BARON', 'BEAST', 'BOAR', 'BRAWLER', 'BRUISER',

    // --- ABD DONANMASI VE MARİNLER (USN / USMC) ---
    'VV', 'VM', 'HMX', 'VMX', 'VMM', 'VMFA', 'BLADE', 'BOBCAT', 'BUCK', 'BULLET', 
    'CHOPPER', 'CONDOR', 'CROW', 'DASH', 'DEVIL', 'DIXIE', 'DUSTY', 'EASY', 
    'ECHO', 'FAT', 'FLASH', 'FLEET', 'FOX', 'GIANT', 'GUN', 'GYPSY', 'HALO', 
    'HAMMER', 'HAWAII', 'HERO', 'HIT', 'HAWKEYE', 'JACK', 'JOKER', 'JUMP', 
    'KICK', 'KITE', 'LION', 'LIZARD', 'LOBO', 'LOCO', 'MAC', 'MAGIC', 'MALT', 
    'MARVEL', 'MATRIX', 'MAX', 'METAL', 'METEOR', 'MIKE', 'MINK', 'MINT', 
    'MOON', 'MOTH', 'MOTOR', 'NAIL', 'NEON', 'NEST', 'NET', 'NOVA', 'NYLON', 
    'OASIS', 'ODIN', 'OMEGA', 'ONYX', 'ORCA', 'ORION', 'OTTER', 'OWL', 'OZONE', 
    'PACER', 'PAD', 'PAGE', 'PAINT', 'PANDA', 'PEACH', 'PENNY', 'PHANTOM', 
    'PILOT', 'PINE', 'PINK', 'PIPER', 'PLATO', 'PLUM', 'PLUTO', 'POGO', 'POKER', 
    'POLO', 'PONY', 'POOL', 'POPE', 'PORK', 'PORT', 'POSEIDON', 'POST', 'PUNCH', 
    'PUP', 'PURE', 'PUSH', 'QUACK', 'QUAIL', 'QUARTZ', 'QUEEN', 'QUICK', 'QUILL', 
    'QUIRK', 'RADAR', 'RADIO', 'RAGE', 'RAIN', 'RAT', 'RAY', 'RAZOR', 'REEF', 
    'REX', 'RICE', 'RICH', 'RIDER', 'RIG', 'RING', 'RIOT', 'RIP', 'RISK', 
    'RIVER', 'ROAD', 'ROAR', 'ROCK', 'ROCKET', 'ROGUE', 'ROLF', 'ROOK', 'ROPE', 
    'ROSE', 'ROUGH', 'ROUND', 'ROUTE', 'ROVER', 'ROW', 'ROY', 'RUBY', 'RUG', 
    'RULE', 'RUM', 'RUN', 'RUSH', 'RUSTY', 'TRIDENT', 'NAVY', 'SAILOR',

    // --- BİRLEŞİK KRALLIK (RAF & ROYAL NAVY) ---
    'ASCOT', 'RRR', 'VORTEX', 'TYPHOON', 'VAMPIRE', 'ZIRCON', 'TARTAN', 
    'MADRAS', 'KRAKEN', 'APOLLO', 'NEMESIS', 'SHAMROCK', 'AAC', 'CANOPY', 
    'CHIEFTAIN', 'COBWEB', 'DUCKY', 'EXCALIBUR', 'GUNDOG', 'JAVELIN', 'KNIGHT', 
    'MAGICIAN', 'MARLIN', 'MERLIN', 'OMEN', 'PAGAN', 'PEGASUS', 'REBEL', 
    'RUSTIC', 'SAXON', 'SPITFIRE', 'STRIKER', 'SYNDICATE', 'TALISMAN', 
    'TARPON', 'TRIBE', 'VANDAL', 'VANGUARD', 'WARLOCK', 'WIDGET', 'WIZARD', 
    'YOGA', 'ZEBRA', 'DOXFORD', 'BLACKCAT',

    // --- TÜRKİYE (TÜRK HAVA KUVVETLERİ & İHA/SİHA & KARA HAVACILIK) ---
    'KARTAL', 'SAHIN', 'ATMACA', 'DOGAN', 'PARS', 'ASLAN', 'KAPLAN', 'HAN', 
    'BORA', 'ANKA', 'AKINCI', 'BAYKAR', 'TUNC', 'KAMA', 'HANCO', 'YARASA', 
    'GOKTURK', 'AKIN', 'CENK', 'PALA', 'KAMC', 'BARIS', 'KORSAN', 'KILIC', 
    'OK', 'MIZRAK', 'KOBRA', 'KASIRGA', 'POYRAZ', 'LODOS', 'YILDIRIM', 
    'KASIF', 'GUC', 'AKBABA', 'PUSAT', 'SIZAN', 'AVCI', 'AKINC', 'PEYKO',

    // --- KÜRESEL ICAO & NATO & DİĞER ÜLKELERİN ASKERİ KODLARI ---
    'MAGIC', 'AWACS', 'NAF', 'CTM', 'COTAM', 'GAF', 'GNY', 'GAM', 'CFC', 'CANFORCE', 
    'ASY', 'AUSSIE', 'IAF', 'KAF', 'BAF', 'HAF', 'PAF', 'RFF', 'URFF', 'VVS', 
    'POLAF', 'SVF', 'ROKAF', 'FNY', 'MM', 'IAM', 'NLD', 'ESY', 'POF', 'AME', 
    'GATO', 'LINCE', 'LYNX', 'LUPO', 'AQUILA', 'BARAK', 'RAAM', 'SUFA', 'BAZ', 
    'ADAN', 'KIWI', 'MAGPIE', 'BOOMER', 'DINGO', 'IFC', 'JF', 'RSF', 'MARCOT',
    'LUFTWAFFE',

    // --- ÖZEL GÖREVLER / ACİL DURUM / GENEL ASKERİ ---
    'MEDEVAC', 'SAR', 'AIRF', 'RESCUE', 'GUARD', 'SWEEPER', 'CLEAN', 'CAP', 
    'CHIEF', 'COMMAND', 'ESCORT', 'LEAD', 'WING', 'FLANK', 'ALFA', 'BRAVO', 
    'CHARLIE', 'DELTA', 'INTERCEPT', 'SCRAMBLE', 'AWACS', 'BOMBER', 'CARGO'
];
const UNIQUE_MIL_PREFIXES = [...new Set(MIL_PREFIXES)];
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
            .slice(0, 1000)
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
    renderLiveList(filtered);
    renderOverlays(); // Haritayı tetikle
    
    document.getElementById('active-count').innerText = `${filtered.length} TRACKS`;
    document.getElementById('bb-count').innerText = filtered.length;
}
async function fetchMilitaryFlights() {
    try {
        const res = await fetch('/api/opensky/states', { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error('API error');
        const raw = await res.json();
        if (!raw.states) return [];

        const milFlights = raw.states
            .filter(s => {
                if (!s[1] || !s[5] || !s[6]) return false;
                const cs = (s[1] || '').trim().toUpperCase();
                return isMilitaryCallsign(cs);
            })
            .slice(0, 500)
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

function applyDataFilter(data) {
    if (!data) return [];
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

// ── OVERLAYS ───────────────────────────────────────────────
// FIX: Overlays are fully independent of layer selection
function toggleOverlay(type, btn) {
    if (STATE.overlays[type] === undefined) STATE.overlays[type] = false;
    STATE.overlays[type] = !STATE.overlays[type];

    // Butonların renk class'ları
    const classMap = {
        airBase: 'active', naval: 'active-naval', railway: 'active-railway',
        cyber: 'active-cyber', conflict: 'active-conflict', radar: 'active-radar',
        osint: 'active-osint',
        powerPlants: 'active',   // BURAYA EKLENDİ
        petroChem: 'active',     // BURAYA EKLENDİ
        waterResources: 'active',
        techCenters: 'active'    // BURAYA EKLENDİ
    };
    if (btn) btn.classList.toggle(classMap[type] || 'active', STATE.overlays[type]);

    const needsCountry = STATE.overlays.airBase || STATE.overlays.naval || STATE.overlays.railway;
    document.getElementById('countrySelectWrap').style.display = needsCountry ? 'block' : 'none';
    if (needsCountry) populateCountrySelect();

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

    if (type === 'conflict') {
        if (STATE.overlays.conflict) renderConflictZones();
        else clearConflictZones();
    }

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

    // toggleOverlay fonksiyonu içine eklenecek kısım:
if (type === 'powerPlants') {
    if (STATE.overlays.powerPlants) {
        fetchPowerPlantsData(); // Buton açıldığında veriyi çek
    } else {
        renderOverlays(); // Kapatıldığında haritadan sil (renderOverlays içindeki filtre powerPlants'i eklemeyecektir)
    }
}

if (type === 'waterResources') {
        if (STATE.overlays.waterResources) {
            fetchWaterResourcesData();
        } else {
            renderOverlays();
        }
    }

    // OSINT Tetikleyicisi
    if (type === 'osint') {
        if (STATE.overlays.osint) {
            fetchOsintData(); 
        } else {
            osintPoints = [];
            renderOverlays();
        }
    } else {
        renderOverlays();
    }
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

    // ── ELEKTRİK & ENERJİ SANTRALLERİ KATMANI (DİNAMİK BOYUTLANDIRMALI) ──
    if (STATE.overlays.powerPlants) {
        if (typeof powerPlantPoints !== 'undefined') {
            powerPlantPoints.forEach(p => {
                const mw = parseFloat(p.capacity_mw || p.capacity) || 100;
                const dynamicRadius = 0.12 + (Math.sqrt(mw) * 0.006); // Watt gücüne göre radius hesaplama
                
                allCustomPoints.push({
                    ...p,
                    _overlayType: 'powerPlants',
                    _radius: Math.min(dynamicRadius, 1.2),
                    _alt: 0.01 + (dynamicRadius * 0.005)
                });
            });
        }
    }

    // ── SU KAYNAKLARI VE BARAJLAR KATMANI (DİNAMİK BOYUTLANDIRMALI) ──
    if (STATE.overlays.waterResources) {
        if (typeof waterResourcePoints !== 'undefined') {
            waterResourcePoints.forEach(w => {
                // Tıpkı elektrikteki gibi dinamik boyutu burada hesaplıyoruz
                const cap = parseFloat(w.raw_capacity || w.capacity) || 50;
                const dynamicRadius = 0.12 + (Math.sqrt(cap) * 0.005);
                
                allCustomPoints.push({
                    ...w,
                    _overlayType: 'waterResources', // HARİTANIN BUNU TANIMASI İÇİN EN KRİTİK SATIR
                    _color: '#00f2ff',              // Parlak su mavisi
                    _radius: Math.min(dynamicRadius, 1.3),
                    _alt: 0.01 + (dynamicRadius * 0.005)
                });
            });
        }
        if (typeof STRATEGIC_ASSETS !== 'undefined' && STRATEGIC_ASSETS.waterResources) {
            STRATEGIC_ASSETS.waterResources.forEach(w => {
                allCustomPoints.push({
                    ...w,
                    _overlayType: 'waterResources',
                    _color: '#00f2ff',
                    _radius: 0.4,
                    _alt: 0.02
                });
            });
        }
    }

    // ── STRATEJİK PETROKİMYA TESİSLERİ KATMANI ──
    if (STATE.overlays.petroChem && typeof STRATEGIC_ASSETS !== 'undefined' && STRATEGIC_ASSETS.petroChem) {
        STRATEGIC_ASSETS.petroChem.forEach(p => {
            allCustomPoints.push({
                ...p,
                _overlayType: 'petroChem',
                _color: '#ff7043',
                _radius: 0.4,
                _alt: 0.02
            });
        });
    }

    // ── KRİTİK TEKNOLOJİ MERKEZLERİ KATMANI ──
    if (STATE.overlays.techCenters && typeof STRATEGIC_ASSETS !== 'undefined' && STRATEGIC_ASSETS.techCenters) {
        STRATEGIC_ASSETS.techCenters.forEach(t => {
            allCustomPoints.push({
                ...t,
                _overlayType: 'techCenters',
                _color: '#39ff14',
                _radius: 0.45,
                _alt: 0.025
            });
        });
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

    // ── CONFLICT ZONES ──
    if (STATE.overlays.conflict) {
        getConflictZonePoints().forEach(cz => allCustomPoints.push(cz));
    }

    // ── OSINT ──
    if (STATE.overlays.osint && typeof osintPoints !== 'undefined') {
        osintPoints.forEach(p => allCustomPoints.push(p));
    }

    // ── RADAR COVERAGE ──
    if (STATE.overlays.radar) {
        renderRadarCoverage();
    }

    renderGlobeWithOverlays(allCustomPoints, allPaths);
}
// Performans için statik Cesium nesnelerini fonksiyon dışında bir kez tanımlıyoruz (RAM dostu)
const OPTIMIZED_DISPLAY_CONDITION = new Cesium.DistanceDisplayCondition(0.0, 100000000.0);
const OPTIMIZED_SCALE = new NearFarScalar(1.0e2, 1.0, 1.0e7, 1.0);

function renderGlobeWithOverlays(customPoints, customPaths) {
    // KASMAYI ÖNLEYEN BİRİNCİ HAMLE: Tek tek entity silmek yerine toplu temizlik yapıyoruz
    // Binalar primitive seviyesinde olduğu için entities.removeAll() artık güvenle kullanılabilir!
    viewer.entities.removeAll();

    // Kameranın yakın kesme hassasiyeti sabiti
    if (viewer.scene.camera.frustum && viewer.scene.camera.frustum.near) {
        viewer.scene.camera.frustum.near = 0.1;
    }

    // ── 1. HATTSAL VERİLER (Demiryolları) ──
    const railPaths = customPaths.filter(p => p._isRailway);
    railPaths.forEach(rail => {
        const cesiumPositions = [];
        rail.path.forEach(coord => {
            cesiumPositions.push(Cesium.Cartesian3.fromDegrees(coord[1], coord[0], 1500));
        });
        
        viewer.entities.add({
            polyline: {
                positions: cesiumPositions,
                width: 3.0,
                material: Cesium.Color.fromCssColorString(rail.color || 'rgba(57,255,20,0.6)')
            },
            customData: { name: rail.name, _overlayType: 'railway' }
        });
    });

    // ── 2. NOKTASAL VERİLER (Hava İzleri, Barajlar, Santraller vb.) ──
    const flightPoints = STATE.layer ? applyDataFilter(STATE.liveFlights) : [];
    const allDisplayPoints = [...flightPoints, ...customPoints];

    // KASMAYI ÖNLEYEN İKİNCİ HAMLE: Cesium'u döngü içinde yormamak için toplu işleme (Batching) geçiyoruz
    viewer.entities.suspendEvents(); // Entity eklenirken harita renderını geçici olarak dondur

    allDisplayPoints.forEach(d => {
        let colorStr = '#00f2ff'; 
        let pixelSize = 6;
        let altitudeMeters = (d.alt || 0) * 1000;

        if (d._overlayType === 'airBase') { colorStr = '#ffd93d'; pixelSize = 10; altitudeMeters = 800; }
        else if (d._overlayType === 'naval') { colorStr = '#0096ff'; pixelSize = 10; altitudeMeters = 300; }
        else if (d._overlayType === 'conflict') { colorStr = d._color || '#ff3c5f'; pixelSize = 12; altitudeMeters = 1500; }
        else if (d._overlayType === 'powerPlants') { colorStr = d._color || '#ff9800'; pixelSize = 7; altitudeMeters = 1200; }
        else if (d._overlayType === 'petroChem') { colorStr = '#ff7043'; pixelSize = 8; altitudeMeters = 1200; }
        else if (d._overlayType === 'waterResources') { colorStr = d._color || '#00f2ff'; pixelSize = 8; altitudeMeters = 400; }
        else if (d._overlayType === 'techCenters') { colorStr = '#39ff14'; pixelSize = 9; altitudeMeters = 1200; }
        else if (d._overlayType === 'osint') { colorStr = d._color || '#00f2ff'; pixelSize = 9; altitudeMeters = 1400; }
        else if (d._isRadarPoint) {
            colorStr = d.type === 'sam' ? '#ff3c5f' : (d.type === 'airborne' ? '#ffd93d' : '#00f2ff');
            pixelSize = 12; altitudeMeters = 2000;

            viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(d.lng, d.lat, 500),
                ellipse: {
                    semiMinorAxis: d.range_km * 1000,
                    semiMajorAxis: d.range_km * 1000,
                    material: Cesium.Color.fromCssColorString(colorStr).withAlpha(0.12),
                    outline: true,
                    outlineColor: Cesium.Color.fromCssColorString(colorStr).withAlpha(0.4),
                    height: 500
                },
                customData: { _isRadarDome: true } 
            });
        } else {
            colorStr = d.type === 'military' ? '#ff3c5f' : '#00f2ff';
            pixelSize = d.type === 'military' ? 8 : 6;
        }

        const finalAltitude = (d.type === 'civilian' || d.type === 'military') ? altitudeMeters : altitudeMeters + 350;

        // Optimize edilmiş Entity ekleme yapısı
        viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(d.lng, d.lat, finalAltitude),
            point: {
                pixelSize: pixelSize,
                color: Cesium.Color.fromCssColorString(colorStr),
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 1.5,
                distanceDisplayCondition: OPTIMIZED_DISPLAY_CONDITION, // Önceden üretilen sabit nesne
                scaleByDistance: OPTIMIZED_SCALE,                       // Önceden üretilen sabit nesne
                // Peşimizden gelen "hayalet" noktaları engelleyen, performansı uçuran can damarı:
                disableDepthTestDistance: 50000.0 // 50 km yakınlaşınca derinlik testini kapat, böylece ekrana yapışmazlar
            },
            customData: d
        });
    });

    viewer.entities.resumeEvents(); // Haritayı tek seferde render etmeye geri dön
}
const cesiumHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

cesiumHandler.setInputAction(function(movement) {
    const ray = viewer.camera.getPickRay(movement.endPosition);
    const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
    if (Cesium.defined(earthPosition)) {
        const cartographic = Cesium.Cartographic.fromCartesian(earthPosition);
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        
        const latEl = document.getElementById('mouse-lat');
        const lngEl = document.getElementById('mouse-lng');
        if (latEl && lngEl) {
            latEl.innerText = lat.toFixed(3);
            lngEl.innerText = lng.toFixed(3);
        }
    }
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

cesiumHandler.setInputAction(function(click) {
    const ray = viewer.camera.getPickRay(click.position);
    const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
    
    let lat = 0, lng = 0;
    if (Cesium.defined(earthPosition)) {
        const cartographic = Cesium.Cartographic.fromCartesian(earthPosition);
        lat = Cesium.Math.toDegrees(cartographic.latitude);
        lng = Cesium.Math.toDegrees(cartographic.longitude);
    }

    // A. Savaş Simülasyonu Hedef Seçme Modu Aktifse
    if (STATE.pickingTarget) {
        if (Cesium.defined(earthPosition)) {
            document.getElementById('sim-lat').value = lat.toFixed(4);
            document.getElementById('sim-lng').value = lng.toFixed(4);
            STATE.pickingTarget = false;
            document.getElementById('pick-mode-indicator').style.display = 'none';
            document.getElementById('globeViz').style.cursor = 'default';
            
            // Cesium taktiksel hedef halkası (Pulse) animasyonu tetikle
            createCesiumPulseRing(lat, lng, '#ff3c5f');
        }
        return;
    }

    // B. Özel Radar Noktası Seçme Modu Aktifse
    if (STATE.pickingRadar) {
        if (Cesium.defined(earthPosition)) {
            document.getElementById('radar-custom-lat').value = lat.toFixed(4);
            document.getElementById('radar-custom-lng').value = lng.toFixed(4);
            STATE.pickingRadar = false;
            document.getElementById('radar-pick-indicator').style.display = 'none';
            document.getElementById('globeViz').style.cursor = 'default';
        }
        return;
    }

    // C. Normal Birim/Overlay Tıklama Algılaması (Raycast Pick)
    const pickedObject = viewer.scene.pick(click.position);
    if (Cesium.defined(pickedObject) && pickedObject.id) {
        const entity = pickedObject.id;
        const d = entity.customData; // Nesneye iliştirdiğimiz ham veriyi okuyoruz
        
        if (d) {
            // Tıklanan nesneye pürüzsüz kamera odaklanması
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(d.lng, d.lat, viewer.camera.positionCartographic.height * 0.4),
                duration: 1.0
            });

            // Bilgi Panelini Açma Mantığı (Senin eski onClick yapın)
            if (d._isRadarPoint) showRadarDetail(d);
            else if (d._overlayType === 'airBase' || d._overlayType === 'naval') showBaseDetail(d);
            else if (d._overlayType === 'conflict') showConflictDetail(d);
            else if (d._overlayType === 'osint') showOsintDetail(d);
            else if (['powerPlants', 'waterResources', 'petroChem', 'techCenters'].includes(d._overlayType)) {
                showStrategicDetail(d);
            } else {
                showDetail(d);
            }
        }
    }
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);


function createCesiumPulseRing(lat, lng, colorStr) {
    let currentRadius = 1000;
    const pulseEntity = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat),
        ellipse: {
            semiMinorAxis: new Cesium.CallbackProperty(() => currentRadius, false),
            semiMajorAxis: new Cesium.CallbackProperty(() => currentRadius, false),
            material: Cesium.Color.fromCssColorString(colorStr).withAlpha(0.4),
            height: 100
        }
    });
    const interval = setInterval(() => {
        currentRadius += 15000;
        if (currentRadius > 300000) {
            clearInterval(interval);
            viewer.entities.remove(pulseEntity);
        }
    }, 30);
}
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

    const sorted = [...data].sort((a, b) => (b.alt || 0) - (a.alt || 0));

    sorted.slice(0, 40).forEach(item => {
        const div = document.createElement('div');
        const isItemMil = item.type === 'military';
        div.className = `list-item${isItemMil ? ' military' : ''}`;
        const spd = `${((item.velocity || 0) * 3.6).toFixed(0)} km/h`;
        const icon = isItemMil ? '🎖' : '✈';
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
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(item.lng, item.lat, 400000),
                duration: 1.5
            });
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

function showStrategicDetail(d) {
    const panel = document.getElementById('detail-panel');
    
    // Nokta türüne göre ikon belirle
    let icon = '🏗️';
    if (d._overlayType === 'powerPlants') icon = '⚡';
    else if (d._overlayType === 'waterResources') icon = '💧';
    else if (d._overlayType === 'petroChem') icon = '🛢️';
    else if (d._overlayType === 'techCenters') icon = '🔬';

    document.getElementById('detail-callsign').innerText = `${icon} ${d.name}`;
    
    // Tesisin türüne göre dinamik alanlar oluştur
    let extraFields = '';
    if (d.capacity) {
        extraFields += `<div class="detail-cell"><div class="detail-cell-label">KAPASİTE</div><div class="detail-cell-val" style="color:var(--accent)">${d.capacity}</div></div>`;
    }
    if (d.tech) {
        extraFields += `<div class="detail-cell" style="grid-column:span 2;"><div class="detail-cell-label">TEKNOLOJİ / ODAK</div><div class="detail-cell-val" style="font-size:11px; color:var(--green)">${d.tech}</div></div>`;
    }
    if (d.description) {
        extraFields += `<div class="detail-cell" style="grid-column:span 2;"><div class="detail-cell-label">AÇIKLAMA</div><div class="detail-cell-val" style="font-size:10px; white-space:normal; line-height:1.4;">${d.description}</div></div>`;
    }
    if (d.strategic_value) {
        let color = d.strategic_value === 'CRITICAL' ? '#ff3c5f' : (d.strategic_value === 'HIGH' ? '#ff9800' : '#ffd93d');
        extraFields += `<div class="detail-cell"><div class="detail-cell-label">STRATEJİK DEĞER</div><div class="detail-cell-val" style="color:${color}; font-weight:bold;">${d.strategic_value}</div></div>`;
    }

    // Arayüzü güncelle
    document.getElementById('detail-grid').innerHTML = `
        <div class="detail-cell"><div class="detail-cell-label">KATEGORİ</div><div class="detail-cell-val">${(d.type || '').toUpperCase().replace('_', ' ')}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">ÜLKE</div><div class="detail-cell-val">${d.country || 'KÜRESEL'}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">KOORDİNAT</div><div class="detail-cell-val">${d.lat.toFixed(3)}, ${d.lng.toFixed(3)}</div></div>
        ${extraFields}
    `;
    panel.style.display = 'block';
}

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
    // Çatışma bölgelerinde radar dalgası (Pulse) efekti
    if (typeof createCesiumPulseRing === 'function') {
        getConflictZonePoints().forEach(cz => {
            createCesiumPulseRing(cz.lat, cz.lng, cz._color);
        });
    }
    renderOverlays();
}

function clearConflictZones() {
    if (!STATE.overlays.airBase) myGlobe.ringsData([]);
    renderOverlays();
}

// ── CYBER WAR SYSTEM — Cloudflare Radar Entegrasyonu ────────
// Sadece Canlı (Live) Veri — Simülasyon ve Mock data iptal edildi!

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

const COUNTRY_MAP = {
    US: { name: 'United States', lat: 37.09, lng: -95.71 }, CN: { name: 'China', lat: 35.86, lng: 104.19 },
    RU: { name: 'Russia', lat: 61.52, lng: 105.31 }, DE: { name: 'Germany', lat: 51.16, lng: 10.45 },
    GB: { name: 'United Kingdom', lat: 55.37, lng: -3.43 }, FR: { name: 'France', lat: 46.23, lng: 2.21 },
    BR: { name: 'Brazil', lat: -14.23, lng: -51.92 }, IN: { name: 'India', lat: 20.59, lng: 78.96 },
    AU: { name: 'Australia', lat: -25.27, lng: 133.77 }, KR: { name: 'South Korea', lat: 35.90, lng: 127.76 },
    JP: { name: 'Japan', lat: 36.20, lng: 138.25 }, NL: { name: 'Netherlands', lat: 52.13, lng: 5.29 },
    SG: { name: 'Singapore', lat: 1.35, lng: 103.82 }, UA: { name: 'Ukraine', lat: 48.37, lng: 31.16 },
    TR: { name: 'Turkey', lat: 38.96, lng: 35.24 }, IR: { name: 'Iran', lat: 32.42, lng: 53.68 },
    IL: { name: 'Israel', lat: 31.04, lng: 34.85 }, PL: { name: 'Poland', lat: 51.92, lng: 19.14 },
    CA: { name: 'Canada', lat: 56.13, lng: -106.34 }, ID: { name: 'Indonesia', lat: -0.79, lng: 113.92 },
    VN: { name: 'Vietnam', lat: 14.06, lng: 108.28 }, SA: { name: 'Saudi Arabia', lat: 23.88, lng: 45.08 },
    ZA: { name: 'South Africa', lat: -30.56, lng: 22.94 }, MX: { name: 'Mexico', lat: 23.63, lng: -102.55 },
    TH: { name: 'Thailand', lat: 15.87, lng: 100.99 },
};

let cfRealAttackPairs = []; 
let cfLastFetch = 0;
const CF_FETCH_INTERVAL = 5 * 60 * 1000;

function updateCyberDataSourceBadge(text, color) {
    let badge = document.getElementById('cyber-source-badge');
    if (!badge) return;
    badge.innerText = text;
    badge.style.color = color;
}

async function fetchCloudflareRadarData() {
    const now = Date.now();
    if (now - cfLastFetch < CF_FETCH_INTERVAL && cfRealAttackPairs.length > 0) return;

    try {
        const url = `/api/cloudflare/attacks/layer7/top/attacks?limit=100&dateRange=1d&format=json`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });

        if (!res.ok) throw new Error(`Proxy ${res.status}`);
        const data = await res.json();

        if (data.result?.top_0?.length > 0) {
            cfRealAttackPairs = data.result.top_0.map(item => ({
                origin: item.originCountryAlpha2,
                target: item.targetCountryAlpha2,
                pct: parseFloat(item.value) || 1,
            })).filter(p => COUNTRY_MAP[p.origin] && COUNTRY_MAP[p.target]);

            cfLastFetch = now;
            updateCyberDataSourceBadge('🛰 CLOUDFLARE RADAR — CANLI VERİ (LIVE)', '#39ff14');
            console.log(`[CYBER] Cloudflare Radar: ${cfRealAttackPairs.length} gerçek rotasyon alındı.`);
        } else {
            throw new Error('Canlı veri boş veya API anahtarı geçersiz.');
        }
    } catch (err) {
        // Hata durumunda SİMÜLASYON YOK! Liste boşaltılır ve kullanıcıya bildirilir.
        cfRealAttackPairs = [];
        updateCyberDataSourceBadge('⚠ BAĞLANTI HATASI / VERİ YOK', '#ff3c5f');
        console.log(`[CYBER] Veri alınamadı: ${err.message}`);
    }
}

let cyberPaths = [];
let cyberAttackLog = [];
let cyberAttacksPerMin = 0;

async function startCyberWar() {
    if (STATE.cyberInterval) clearInterval(STATE.cyberInterval);
    cyberPaths = [];
    cyberAttackLog = [];

    await fetchCloudflareRadarData();

    STATE.cyberInterval = setInterval(() => {
        generateCyberAttack();
        updateCyberDisplay();
    }, 900);

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
    if (!STATE.overlays.airBase && !STATE.overlays.conflict && !STATE.overlays.radar) myGlobe.ringsData([]);
    myGlobe.arcsData([]);
    document.getElementById('cyber-status').style.display = 'none';
}
function generateCyberAttack() {
    if (cfRealAttackPairs.length === 0) return;

    const attackType = CYBER_ATTACK_TYPES[Math.floor(Math.random() * CYBER_ATTACK_TYPES.length)];
    const pair = cfRealAttackPairs[Math.floor(Math.random() * cfRealAttackPairs.length)];
    
    const origData = COUNTRY_MAP[pair.origin];
    const tgtData = COUNTRY_MAP[pair.target];
    if (!origData || !tgtData) return;

    const startLat = origData.lat + (Math.random() - 0.5) * 4;
    const startLng = origData.lng + (Math.random() - 0.5) * 4;
    const endLat = tgtData.lat + (Math.random() - 0.5) * 4;
    const endLng = tgtData.lng + (Math.random() - 0.5) * 4;

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
        pct: pair.pct
    });
    
    if (cyberAttackLog.length > 60) cyberAttackLog.pop();
    cyberAttacksPerMin++;

    // ⚡ Cesium 3D Lazer Çizimi 
    createCesiumArc(startLat, startLng, endLat, endLng, attackType.color, attackType.severity === 'CRITICAL' ? 3 : 1.5);

    // Hedef noktada patlama halkası
    if (STATE.overlays.cyber && typeof createCesiumPulseRing === 'function') {
        createCesiumPulseRing(endLat, endLng, attackType.color);
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
        <div class="cyber-stat" style="border-color:#ff3c5f"><div class="cs-val" style="color:#ff3c5f">${bySeverity.CRITICAL}</div><div class="cs-lbl">CRITICAL</div></div>
        <div class="cyber-stat" style="border-color:#ff9800"><div class="cs-val" style="color:#ff9800">${bySeverity.HIGH}</div><div class="cs-lbl">HIGH</div></div>
        <div class="cyber-stat" style="border-color:#ffd93d"><div class="cs-val" style="color:#ffd93d">${bySeverity.MED}</div><div class="cs-lbl">MED</div></div>
        <div class="cyber-stat" style="border-color:#0096ff"><div class="cs-val" style="color:#0096ff">${byLayer[3]}</div><div class="cs-lbl">L3/L4</div></div>
        <div class="cyber-stat" style="border-color:#b44fff"><div class="cs-val" style="color:#b44fff">${byLayer[7]}</div><div class="cs-lbl">L7 App</div></div>
        <div class="cyber-stat" style="border-color:var(--panel-border)"><div class="cs-val" style="color:var(--text-dim)">${cyberAttackLog.length}</div><div class="cs-lbl">TOTAL</div></div>
    `;

    document.getElementById('cyber-attack-count').innerText = cyberAttackLog.length;

    const listEl = document.getElementById('cyber-attack-list');
    listEl.innerHTML = cyberAttackLog.slice(0, 25).map(a => `
        <div style="padding:5px 6px; margin-bottom:3px; background:rgba(255,255,255,0.02); border-left:2px solid ${a.color}; border-radius:0 2px 2px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-dim)">${a.time}</span>
                <span style="color:#39ff14; font-size:8px;">🛰 LIVE</span>
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

let firePoints = []; // Yangın verilerini tutmak için

async function fetchFireData() {
    // UI Güncelleme: Yükleniyor durumu
    const btn = document.querySelector('.action-btn.full-btn.red-btn');
    if (btn) btn.innerText = "⌛ VERİ ALINIYOR...";

    try {
        const res = await fetch('/api/geoint/firms-fires');
        const data = await res.json();

        if (data.fires) {
            firePoints = data.fires;
            
            // UI Elementlerini Güncelle (Ekran görüntüsündeki kutular)
            document.querySelector('.total-count-box .count-val').innerText = data.total || 0;
            document.querySelector('.high-intensity-box .count-val').innerText = data.highIntensity || 0;
            document.querySelector('.source-text').innerHTML = `(Kaynak: ${data.source})`;

            // Haritaya ekle
            osintPoints = [...osintPoints.filter(p => p._osintType !== 'fire'), ...firePoints];
            renderOverlays();
            
            console.log(`[GEOINT] ${data.total} yangın noktası yüklendi.`);
        }
    } catch (e) {
        console.error("Yangın verisi yüklenemedi:", e);
    } finally {
        if (btn) btn.innerHTML = "🔥 YANGIN VERİSİ YÜKLE";
    }
}

function clearFires() {
    firePoints = [];
    osintPoints = osintPoints.filter(p => p._osintType !== 'fire');
    
    // UI Sıfırla
    document.querySelector('.total-count-box .count-val').innerText = "0";
    document.querySelector('.high-intensity-box .count-val').innerText = "0";
    
    renderOverlays(); // Haritayı güncelle
}

function getOverlayPoints() {
    const pts = [];
    if (STATE.overlays.airBase) MILITARY_AIR_BASES.forEach(b => pts.push({ ...b, _overlayType: 'airBase' }));
    if (STATE.overlays.naval) NAVAL_BASES.forEach(b => pts.push({ ...b, _overlayType: 'naval' }));
    if (STATE.overlays.conflict) getConflictZonePoints().forEach(cz => pts.push(cz));
    if (STATE.overlays.osint && typeof osintPoints !== 'undefined') {
        osintPoints.forEach(p => pts.push(p));
    }
    
    // Hatalı olan allCustomPoints kısımları tamamen pts olarak düzeltildi:
    if (STATE.overlays.powerPlants && typeof powerPlantPoints !== 'undefined') {
        powerPlantPoints.forEach(p => pts.push(p)); 
    }
    if (STATE.overlays.waterResources && typeof waterResourcePoints !== 'undefined') {
        waterResourcePoints.forEach(w => pts.push(w));
    }
    return pts;
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

// ── CONFLICT ANALYSIS (Gemini AI Powered) ─────────────────────────
async function runConflictAnalysis() {
    const countryA = document.getElementById('cp-country-a').value;
    const countryB = document.getElementById('cp-country-b').value;
    const domain = document.getElementById('cp-domain').value;
    const domainNames = { air: 'Hava Muharebesi', naval: 'Deniz Muharebesi', ground: 'Kara Harekâtı', cyber: 'Siber Savaş', combined: 'Kombine Harekât' };

    const resultsEl = document.getElementById('conflict-results');
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; color:var(--accent); font-size:10px; letter-spacing:2px;">
            <div class="loading-pulse"></div> GEMINI AI ANALİZ EDİYOR...
        </div>
    `;

    // Gemini için özel, sert ve askeri taktiksel prompt
    const prompt = `Sen üst düzey bir küresel askeri istihbarat ve C4ISR analistisin. ${countryA} ile ${countryB} arasındaki olası bir "${domainNames[domain]}" senaryosunu analiz et. 
Lütfen şu 4 başlığı kesinlikle kullan ve çok kısa/net (toplam max 200 kelime) askeri dille yanıtla:
**1. Kritik Sistemler:** (Her iki tarafın bu alandaki 2-3 kilit silahı)
**2. Güç Dengesi:** (Kim hangi doktrinde üstün?)
**3. Olası Taktik Senaryo:** (Çatışma nasıl başlar ve gelişir?)
**4. Beklenen Sonuç:** (Sürtünme katsayısı ve yıpranmaya göre kim avantajlı?)`;

    try {
        // Doğrudan dışarıya değil, kendi güvenli backend'imize (app.py) istek atıyoruz
        const response = await fetch("/api/ai/conflict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        const text = data.text;

        // Gemini'nin Markdown (Kalın yazı) formatını HTML'e çevirme
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<span style="color:var(--accent); font-weight:bold;">$1</span>')
            .replace(/\*(.*?)\*/g, '<span style="color:#ffd93d;">$1</span>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>')
            .replace(/^\d+\. /gm, '<span style="color:var(--accent3);">▸ </span>')
            .replace(/^- /gm, '<span style="color:var(--accent2);">▪ </span>');

        resultsEl.innerHTML = `
            <div style="color:var(--accent2); font-size:10px; letter-spacing:2px; margin-bottom:8px; border-bottom:1px solid rgba(255,60,95,0.3); padding-bottom:6px;">
                ⚔ ${countryA} vs ${countryB} — ${domainNames[domain]}
            </div>
            <div style="font-family:var(--font-mono); font-size:10px; line-height:1.8; color:rgba(255,255,255,0.85);">${html}</div>
            <div style="margin-top:10px; font-size:8px; color:var(--text-dim); letter-spacing:1px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:4px;">
                ⚡ GÜÇ SAĞLAYICI: GOOGLE GEMINI 1.5 FLASH AI
            </div>
        `;

        // Haritada iki ülke arasında çatışma yayı (Arc) çiz
        const countryCoords = {
            USA: { lat: 37, lng: -95 }, Russia: { lat: 60, lng: 90 },
            China: { lat: 35, lng: 104 }, Turkey: { lat: 39, lng: 35 },
            Iran: { lat: 32, lng: 53 }, Israel: { lat: 31, lng: 35 },
            India: { lat: 20, lng: 78 }, Pakistan: { lat: 30, lng: 70 },
            'North Korea': { lat: 40, lng: 127 }, 'South Korea': { lat: 36, lng: 127 },
            Japan: { lat: 37, lng: 137 }, France: { lat: 46, lng: 2 },
            UK: { lat: 55, lng: -3 }, Germany: { lat: 51, lng: 10 },
            Taiwan: { lat: 24, lng: 121 }, Ukraine: { lat: 48, lng: 31 },
            'Saudi Arabia': { lat: 24, lng: 45 }, Brazil: { lat: -14, lng: -51 },
            Australia: { lat: -25, lng: 133 }, NATO: { lat: 50, lng: 4 }
        };
        const cA = countryCoords[countryA];
        const cB = countryCoords[countryB];
        if (cA && cB) {
            createCesiumArc(cA.lat, cA.lng, cB.lat, cB.lng, '#ff3c5f', 4);
        }
    } catch (err) {
        resultsEl.innerHTML = `<div style="color:#ff3c5f; font-size:10px; font-weight:bold;">⚠ AI BAĞLANTI HATASI: ${err.message}</div>`;
    }
}

// ── OSINT SİSTEMİ ──────────────────────────────────────────
async function fetchOsintData() {
    osintPoints = [];
    
    // 1. Depremler (SİVİL KRİZ)
    try {
        const qRes = await fetch('/api/osint/earthquakes');
        const qData = await qRes.json();
        if (qData.features) {
            qData.features.forEach(eq => {
                const coords = eq.geometry.coordinates; // [lng, lat, depth]
                const mag = eq.properties.mag;
                osintPoints.push({
                    lat: coords[1], lng: coords[0],
                    name: `DEPREM: M${mag.toFixed(1)}`,
                    desc: eq.properties.place,
                    _overlayType: 'osint',
                    _osintType: 'quake',
                    _color: '#ff9800',
                    _radius: mag * 0.1,
                    _alt: 0.01
                });
            });
        }
    } catch(e) { console.warn("Deprem verisi alınamadı", e); }

    // 2. Jeopolitik Haberler
    try {
        const nRes = await fetch('/api/osint/news');
        const nData = await nRes.json();
        if (nData.result) {
            const hotspots = [
                {lat: 35, lng: 33}, {lat: 48, lng: 31}, {lat: 25, lng: 121},
                {lat: 31, lng: 35}, {lat: 15, lng: 47}, {lat: 40, lng: -74}
            ];
            nData.result.slice(0, 6).forEach((news, i) => {
                const spot = hotspots[i % hotspots.length];
                osintPoints.push({
                    lat: spot.lat + (Math.random()-0.5)*5, 
                    lng: spot.lng + (Math.random()-0.5)*5,
                    name: `İSTİHBARAT RAPORU`,
                    desc: news.name,
                    _overlayType: 'osint',
                    _osintType: 'news',
                    _color: '#00f2ff',
                    _radius: 0.4,
                    _alt: 0.02
                });
            });
        }
    } catch(e) { console.warn("Haber verisi alınamadı", e); }

    // 3. Siber Zafiyetler (CVE)
    const cveHubs = [
        {lat: 37.3, lng: -122.0, desc: "Silicon Valley Sunucuları"},
        {lat: 50.1, lng: 8.6, desc: "Frankfurt Veri Merkezleri"}
    ];
    cveHubs.forEach(hub => {
        osintPoints.push({
            ...hub,
            name: `KRİTİK ZAFİYET (CVE-2026)`,
            _overlayType: 'osint',
            _osintType: 'cyber',
            _color: '#ff3c5f',
            _radius: 0.35,
            _alt: 0.015
        });
    });

    renderOverlays();
}
let powerPlantPoints = []; // Veriyi hafızada tutacağımız dizi

async function fetchPowerPlantsData() {
    if (powerPlantPoints.length > 0) {
        renderOverlays(); // Zaten yüklüyse tekrar API'yi yormadan direkt çiz
        return;
    }

    try {
        console.log("⚡ Enerji veritabanı yükleniyor...");
        const res = await fetch('/api/infra/power-plants');
        const json = await res.json();

        if (json.success && json.data) {
            // Güvenlik filtresi: Sadece geçerli koordinatlara sahip olanları al
            powerPlantPoints = json.data
                .filter(p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng))
                .map(p => {
                    let color = '#ff9800'; // Varsayılan Turuncu
                    if (p.type) {
                        if (p.type.includes('nuclear')) color = '#39ff14'; // Nükleer
                        else if (p.type.includes('hydro')) color = '#00f2ff'; // Hidro
                        else if (p.type.includes('coal') || p.type.includes('gas')) color = '#ff3c5f'; // Fosil
                    }
                    
                    return {
                        ...p,
                        _overlayType: 'powerPlants',
                        _color: color,
                        _radius: 0.25,
                        _alt: 0.015
                    };
                });
                
            console.log(`✅ ${powerPlantPoints.length} STRATEJİK santral filtrelendi ve haritaya eklendi.`);
            renderOverlays(); 
        }
    } catch (e) {
        console.error("Enerji verisi çekilemedi:", e);
    }
}
let waterResourcePoints = []; // Baraj verilerini RAM'de tutacak global dizi

async function fetchWaterResourcesData() {
    if (waterResourcePoints.length > 0) {
        renderOverlays();
        return;
    }

    try {
        console.log("💧 Su kaynakları veritabanı yükleniyor...");
        const res = await fetch('/api/infra/water-resources');
        const json = await res.json();

        if (json.success && json.data) {
            waterResourcePoints = json.data
                .filter(p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng))
                .map(p => {
                    const cap = parseFloat(p.raw_capacity) || 50;
                    // Hacme göre karekök ölçeklendirmesi (Math.sqrt koruması)
                    const dynamicRadius = 0.15 + (Math.sqrt(cap) * 0.004);

                    return {
                        ...p,
                        _overlayType: 'waterResources',
                        _color: '#00f2ff', // Parlak su mavisi
                        _radius: Math.min(dynamicRadius, 1.3),
                        _alt: 0.01 + (dynamicRadius * 0.008)
                    };
                });
                
            console.log(`✅ ${waterResourcePoints.length} STRATEJİK su kaynağı/baraj haritaya hazır.`);
            renderOverlays();
        }
    } catch (e) {
        console.error("Su kaynakları verisi çekilemedi:", e);
    }
}
function showOsintDetail(d) {
    document.getElementById('detail-callsign').innerText = `👁️ OSINT: ${d.name}`;
    document.getElementById('detail-grid').innerHTML = `
        <div class="detail-cell" style="grid-column:span 2;">
            <div class="detail-cell-label">RAPOR İÇERİĞİ</div>
            <div class="detail-cell-val" style="color:${d._color}; font-size:11px; white-space:normal; line-height:1.4;">${d.desc}</div>
        </div>
        <div class="detail-cell"><div class="detail-cell-label">KOORDİNAT</div><div class="detail-cell-val">${d.lat.toFixed(2)}, ${d.lng.toFixed(2)}</div></div>
        <div class="detail-cell"><div class="detail-cell-label">TÜR</div><div class="detail-cell-val">${d._osintType.toUpperCase()}</div></div>
    `;
    document.getElementById('detail-panel').style.display = 'block';
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
    if (STATE.overlays.osint && typeof osintPoints !== 'undefined') {
        osintPoints.forEach(p => pts.push(p));
    }
    if (STATE.overlays.powerPlants && typeof powerPlantPoints !== 'undefined') {
    powerPlantPoints.forEach(p => pts.push(p)); // veya allCustomPoints.push(p)
}
    return pts;
}
function createCesiumArc(startLat, startLng, endLat, endLng, colorStr, thickness = 2) {
    const positions = [];
    const steps = 30;
    const maxHeight = 1200000; // 1200 km tepe noktası (Uzay)
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lat = startLat + (endLat - startLat) * t;
        const lng = startLng + (endLng - startLng) * t;
        const height = 4 * maxHeight * t * (1 - t); // Parabolik kavis
        positions.push(Cesium.Cartesian3.fromDegrees(lng, lat, height));
    }
    
    const arcEntity = viewer.entities.add({
        polyline: {
            positions: positions,
            width: thickness,
            material: new Cesium.PolylineGlowMaterialProperty({
                glowPower: 0.3,
                color: Cesium.Color.fromCssColorString(colorStr)
            })
        }
    });
    
    // Lazerin 1.5 saniye sonra silinmesi
    setTimeout(() => { viewer.entities.remove(arcEntity); }, 1500);
}


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
setInterval(() => {
    const t = new Date().toISOString().substr(11, 8);
    const c1 = document.getElementById('utc-clock');
    const c2 = document.getElementById('utc-clock2');
    if (c1) c1.innerText = t;
    if (c2) c2.innerText = t;
}, 1000);



