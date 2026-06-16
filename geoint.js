/* ============================================================
   RADARSCOPE v5.0 — GEOINT Module
   Modules:
     1. Görsel & Medya Analizi (Gemini Vision)
     2. Relationship Mapping (D3.js entity graph)
     3. Timeline Builder
     4. Fiber Hat Haritası (Submarine Cables)
     5. İnternet Kesinti Haritası
     6. Tor Node Haritası
     7. Botnet Yoğunluk Haritası
     8. NASA FIRMS Yangın Haritası
   ============================================================ */

'use strict';

// ── GEOINT STATE ───────────────────────────────────────────
const GEOINT_STATE = {
    activeModule: null,
    fiberCables:  [],
    torNodes:     [],
    botnetData:   [],
    firmsFires:   [],
    outageData:   [],
    entityGraph:  null,
    timeline:     [],
    imageAnalysis: null,
};

// D3.js lazy-loader
let _d3Loaded = false;
function loadD3() {
    return new Promise(resolve => {
        if (window.d3) { resolve(window.d3); return; }
        if (_d3Loaded) { const t = setInterval(() => { if (window.d3) { clearInterval(t); resolve(window.d3); } }, 100); return; }
        _d3Loaded = true;
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
        s.onload = () => resolve(window.d3);
        document.head.appendChild(s);
    });
}

// ── GEOINT PANEL HTML ──────────────────────────────────────
function injectGeointPanel() {
    if (document.getElementById('geoint-master-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'geoint-master-panel';
    panel.style.cssText = `
        position:fixed; top:80px; right:320px; width:380px; max-height:85vh;
        background:rgba(5,10,20,0.96); border:1px solid rgba(0,242,255,0.25);
        border-radius:4px; font-family:'Share Tech Mono',monospace; color:#e0e8ff;
        display:none; z-index:1000; overflow:hidden; flex-direction:column;
        box-shadow: 0 0 30px rgba(0,242,255,0.1);
    `;
    panel.innerHTML = `
        <div style="padding:10px 14px; border-bottom:1px solid rgba(0,242,255,0.15);
            display:flex; justify-content:space-between; align-items:center;
            background:rgba(0,242,255,0.05);">
            <span style="font-size:12px; letter-spacing:2px; color:#00f2ff;">⬡ GEOINT MODÜLÜ</span>
            <button onclick="closeGeointPanel()" style="background:none;border:none;color:#ff3c5f;cursor:pointer;font-size:14px;">✕</button>
        </div>

        <!-- MODULE SELECTOR -->
        <div style="display:flex; flex-wrap:wrap; gap:4px; padding:8px; border-bottom:1px solid rgba(0,242,255,0.1);">
            <button class="geoint-mod-btn" onclick="activateGeointModule('image')"    data-mod="image">    👁 GÖRSEL ANALİZ</button>
            <button class="geoint-mod-btn" onclick="activateGeointModule('relation')" data-mod="relation"> 🕸 İLİŞKİ HARİTASI</button>
            <button class="geoint-mod-btn" onclick="activateGeointModule('timeline')" data-mod="timeline"> ⏱ ZAMAN ÇİZELGESİ</button>
            <button class="geoint-mod-btn" onclick="activateGeointModule('fiber')"    data-mod="fiber">    🌐 FİBER HATLAR</button>
            <button class="geoint-mod-btn" onclick="activateGeointModule('outage')"   data-mod="outage">   ⚡ KESİNTİLER</button>
            <button class="geoint-mod-btn" onclick="activateGeointModule('tor')"      data-mod="tor">      🧅 TOR NODES</button>
            <button class="geoint-mod-btn" onclick="activateGeointModule('botnet')"   data-mod="botnet">   🤖 BOTNET</button>
            <button class="geoint-mod-btn" onclick="activateGeointModule('fires')"    data-mod="fires">    🔥 YANGIN</button>
        </div>

        <!-- DYNAMIC MODULE CONTENT -->
        <div id="geoint-module-body" style="overflow-y:auto; flex:1; padding:10px;">
            <div style="color:rgba(255,255,255,0.3); font-size:11px; text-align:center; margin-top:30px;">
                ↑ Modül seç
            </div>
        </div>
    `;

    // Inject styles
    const style = document.createElement('style');
    style.textContent = `
        .geoint-mod-btn {
            flex:1; min-width:calc(50% - 4px); padding:5px 6px;
            background:rgba(0,242,255,0.05); border:1px solid rgba(0,242,255,0.2);
            color:rgba(0,242,255,0.7); cursor:pointer; font-family:inherit;
            font-size:9px; letter-spacing:1px; border-radius:2px; transition:all .2s;
        }
        .geoint-mod-btn:hover, .geoint-mod-btn.active {
            background:rgba(0,242,255,0.15); color:#00f2ff;
            border-color:rgba(0,242,255,0.5);
        }
        .geoint-input {
            width:100%; box-sizing:border-box;
            background:rgba(0,242,255,0.04); border:1px solid rgba(0,242,255,0.2);
            color:#e0e8ff; padding:7px 8px; font-family:inherit; font-size:10px;
            border-radius:2px; margin-bottom:6px;
        }
        .geoint-btn {
            width:100%; padding:7px; margin-bottom:6px;
            background:rgba(0,242,255,0.08); border:1px solid rgba(0,242,255,0.35);
            color:#00f2ff; cursor:pointer; font-family:inherit; font-size:10px;
            letter-spacing:1px; border-radius:2px; transition:all .2s;
        }
        .geoint-btn:hover { background:rgba(0,242,255,0.18); }
        .geoint-btn.danger { border-color:rgba(255,60,95,0.5); color:#ff3c5f; background:rgba(255,60,95,0.06); }
        .geoint-result-box {
            background:rgba(0,0,0,0.3); border:1px solid rgba(0,242,255,0.12);
            border-radius:2px; padding:8px; font-size:10px; line-height:1.6;
            max-height:200px; overflow-y:auto; white-space:pre-wrap; color:#b0c8e0;
        }
        .geoint-section-title {
            font-size:9px; letter-spacing:2px; color:#00f2ff;
            border-bottom:1px solid rgba(0,242,255,0.15);
            padding-bottom:4px; margin-bottom:8px;
        }
        #geoint-graph-canvas {
            width:100%; height:300px; background:rgba(0,0,0,0.4);
            border:1px solid rgba(0,242,255,0.15); border-radius:2px;
        }
        .entity-node-person   { fill:#00f2ff; }
        .entity-node-org      { fill:#ff9800; }
        .entity-node-location { fill:#39ff14; }
        .entity-node-event    { fill:#ff3c5f; }
        .entity-node-asset    { fill:#ffd93d; }
        .graph-link { stroke:rgba(0,242,255,0.3); stroke-width:1.5px; }
        .graph-label { fill:#e0e8ff; font-size:9px; font-family:'Share Tech Mono',monospace; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);
}

function openGeointPanel() {
    injectGeointPanel();
    document.getElementById('geoint-master-panel').style.display = 'flex';
}

function closeGeointPanel() {
    const p = document.getElementById('geoint-master-panel');
    if (p) p.style.display = 'none';
}

function activateGeointModule(mod) {
    GEOINT_STATE.activeModule = mod;
    document.querySelectorAll('.geoint-mod-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mod === mod);
    });
    const body = document.getElementById('geoint-module-body');
    const modules = {
        image:    renderImageAnalysisModule,
        relation: renderRelationshipModule,
        timeline: renderTimelineModule,
        fiber:    renderFiberModule,
        outage:   renderOutageModule,
        tor:      renderTorModule,
        botnet:   renderBotnetModule,
        fires:    renderFiresModule,
    };
    if (modules[mod]) modules[mod](body);
}

// ═══════════════════════════════════════════════════════════
//  1. GÖRSEL & MEDYA ANALİZİ (Gemini Vision)
// ═══════════════════════════════════════════════════════════

function renderImageAnalysisModule(container) {
    container.innerHTML = `
        <div class="geoint-section-title">👁 GÖRSEL / MEDYA ANALİZİ</div>
        <select class="geoint-input" id="img-task-sel">
            <option value="geoint">🛰 GEOINT — Uydu Görüntüsü</option>
            <option value="osint">🔍 OSINT — Konum Tespiti</option>
            <option value="entity">🏷 Entity Tanıma</option>
            <option value="infrastructure">🏭 Altyapı Analizi</option>
        </select>
        <textarea class="geoint-input" id="img-context" rows="2"
            placeholder="Ek bağlam (isteğe bağlı): koordinat, tarih, kaynak..."></textarea>
        <div id="img-drop-zone" style="
            border:2px dashed rgba(0,242,255,0.3); border-radius:4px;
            padding:20px; text-align:center; cursor:pointer; margin-bottom:8px;
            background:rgba(0,242,255,0.03); color:rgba(0,242,255,0.5); font-size:11px;
            transition:all .2s;" 
            onclick="document.getElementById('img-file-input').click()"
            ondrop="handleImageDrop(event)" ondragover="event.preventDefault()">
            📁 Görsel sürükle/bırak veya tıkla<br/>
            <span style="font-size:9px; opacity:0.6;">JPG, PNG, WEBP — Max 10MB</span>
        </div>
        <input type="file" id="img-file-input" accept="image/*" style="display:none"
            onchange="handleImageSelect(event)">
        <div id="img-preview" style="display:none; margin-bottom:8px;">
            <img id="img-preview-el" style="width:100%; border-radius:2px; border:1px solid rgba(0,242,255,0.2);">
        </div>
        <button class="geoint-btn" onclick="runImageAnalysis()" id="img-analyze-btn" disabled>
            🤖 AI ANALİZİ BAŞLAT
        </button>
        <div id="img-result" style="display:none;">
            <div class="geoint-section-title" style="margin-top:8px;">ANALİZ SONUCU</div>
            <div class="geoint-result-box" id="img-result-text"></div>
        </div>
    `;
}

let _currentImageB64 = null;
let _currentMime = null;

function handleImageDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processImageFile(file);
}

function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) processImageFile(file);
}

function processImageFile(file) {
    _currentMime = file.type || 'image/jpeg';
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        _currentImageB64 = dataUrl.split(',')[1];
        const preview = document.getElementById('img-preview');
        const img = document.getElementById('img-preview-el');
        if (preview && img) { img.src = dataUrl; preview.style.display = 'block'; }
        const dropZone = document.getElementById('img-drop-zone');
        if (dropZone) { dropZone.style.borderColor = 'rgba(0,242,255,0.6)'; dropZone.innerHTML = `✅ ${file.name}`; }
        const btn = document.getElementById('img-analyze-btn');
        if (btn) btn.disabled = false;
    };
    reader.readAsDataURL(file);
}

async function runImageAnalysis() {
    if (!_currentImageB64) return;
    const task    = document.getElementById('img-task-sel')?.value || 'geoint';
    const context = document.getElementById('img-context')?.value || '';
    const btn     = document.getElementById('img-analyze-btn');
    const result  = document.getElementById('img-result');
    const text    = document.getElementById('img-result-text');

    if (btn) { btn.disabled = true; btn.innerText = '⏳ Analiz ediliyor...'; }

    try {
        const resp = await fetch('/api/ai/geoint-image', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({image_b64: _currentImageB64, mime_type: _currentMime, task, context})
        });
        const data = await resp.json();
        if (result) result.style.display = 'block';
        if (text) {
            if (data.result) {
                text.innerText = JSON.stringify(data.result, null, 2);
            } else {
                text.innerText = data.raw || data.error || 'Sonuç alınamadı';
            }
        }
        GEOINT_STATE.imageAnalysis = data;
    } catch (e) {
        if (text) text.innerText = `Hata: ${e.message}`;
        if (result) result.style.display = 'block';
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = '🤖 AI ANALİZİ BAŞLAT'; }
    }
}


// ═══════════════════════════════════════════════════════════
//  2. RELATIONSHIP MAPPING (D3.js Force Graph)
// ═══════════════════════════════════════════════════════════

function renderRelationshipModule(container) {
    container.innerHTML = `
        <div class="geoint-section-title">🕸 İLİŞKİ HARİTASI — Entity Graph</div>
        <textarea class="geoint-input" id="rel-entities" rows="2"
            placeholder="Varlıklar (virgülle): Putin, Wagner Group, Prigozhin, Rostov..."></textarea>
        <textarea class="geoint-input" id="rel-context" rows="2"
            placeholder="Bağlam / olay açıklaması..."></textarea>
        <textarea class="geoint-input" id="rel-text" rows="3"
            placeholder="Analiz edilecek metin (isteğe bağlı)..."></textarea>
        <button class="geoint-btn" onclick="runRelationshipAnalysis()">🤖 İLİŞKİ ANALİZİ BAŞLAT</button>
        <div id="rel-status" style="font-size:10px; color:#ff9800; margin-bottom:6px;"></div>
        <svg id="geoint-graph-canvas"></svg>
        <div id="rel-legend" style="display:none; margin-top:6px; font-size:9px;">
            <span style="color:#00f2ff">● Kişi</span> &nbsp;
            <span style="color:#ff9800">● Örgüt</span> &nbsp;
            <span style="color:#39ff14">● Konum</span> &nbsp;
            <span style="color:#ff3c5f">● Olay</span> &nbsp;
            <span style="color:#ffd93d">● Varlık</span>
        </div>
        <div id="rel-summary" class="geoint-result-box" style="display:none; margin-top:8px;"></div>
    `;
}

async function runRelationshipAnalysis() {
    const entitiesStr = document.getElementById('rel-entities')?.value || '';
    const context     = document.getElementById('rel-context')?.value || '';
    const text        = document.getElementById('rel-text')?.value || '';
    const status      = document.getElementById('rel-status');

    const entities = entitiesStr.split(',').map(e => e.trim()).filter(Boolean);
    if (entities.length === 0 && !text) {
        if (status) status.innerText = '⚠ En az bir varlık veya metin girin.';
        return;
    }

    if (status) status.innerText = '⏳ AI analizi yapıyor...';

    try {
        const resp = await fetch('/api/ai/relationship-map', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({entities, context, text})
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error);

        GEOINT_STATE.entityGraph = data.graph;
        if (status) status.innerText = `✅ ${data.graph.nodes?.length || 0} node, ${data.graph.edges?.length || 0} bağlantı`;

        await renderD3Graph(data.graph);

        // Timeline
        if (data.graph.timeline?.length > 0) {
            GEOINT_STATE.timeline = data.graph.timeline;
        }

        // Summary
        const sum = document.getElementById('rel-summary');
        if (sum && data.graph.summary) {
            sum.style.display = 'block';
            sum.innerText = `${data.graph.threat_level ? '⚠ TEHDIT: ' + data.graph.threat_level + '\n\n' : ''}${data.graph.summary}`;
        }
        const legend = document.getElementById('rel-legend');
        if (legend) legend.style.display = 'block';

    } catch (e) {
        if (status) status.innerText = `Hata: ${e.message}`;
    }
}

async function renderD3Graph(graph) {
    const d3 = await loadD3();
    const svgEl = document.getElementById('geoint-graph-canvas');
    if (!svgEl) return;

    const W = svgEl.clientWidth || 360;
    const H = 300;
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);

    d3.select(svgEl).selectAll('*').remove();
    const svg = d3.select(svgEl);

    const nodes = (graph.nodes || []).map(n => ({...n}));
    const links = (graph.edges || []).map(e => ({
        source: e.source, target: e.target,
        relation: e.relation, strength: e.strength || 5
    }));

    const nodeColor = {person:'#00f2ff', org:'#ff9800', location:'#39ff14', event:'#ff3c5f', asset:'#ffd93d'};

    const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('center', d3.forceCenter(W/2, H/2))
        .force('collision', d3.forceCollide(20));

    // Links
    const link = svg.append('g').selectAll('line').data(links).join('line')
        .attr('class', 'graph-link')
        .attr('stroke-width', d => Math.max(1, d.strength / 3));

    // Link labels
    const linkLabel = svg.append('g').selectAll('text').data(links).join('text')
        .attr('class', 'graph-label')
        .attr('text-anchor', 'middle')
        .style('fill', 'rgba(255,255,255,0.35)')
        .style('font-size', '8px')
        .text(d => d.relation);

    // Node groups
    const nodeG = svg.append('g').selectAll('g').data(nodes).join('g')
        .call(d3.drag()
            .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end',   (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
        );

    nodeG.append('circle')
        .attr('r', 10)
        .attr('fill', d => nodeColor[d.type] || '#888')
        .attr('fill-opacity', 0.8)
        .attr('stroke', d => nodeColor[d.type] || '#888')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.5);

    nodeG.append('text')
        .attr('class', 'graph-label')
        .attr('dx', 13).attr('dy', 4)
        .text(d => d.label?.slice(0, 18) || d.id);

    nodeG.append('title').text(d => `${d.label} (${d.type})\n${d.description || ''}`);

    sim.on('tick', () => {
        link
            .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        linkLabel
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);
        nodeG.attr('transform', d => `translate(${Math.max(12, Math.min(W-12, d.x))},${Math.max(12, Math.min(H-12, d.y))})`);
    });
}


// ═══════════════════════════════════════════════════════════
//  3. TIMELINE (AI Tabanlı Zaman Çizelgesi)
// ═══════════════════════════════════════════════════════════

function renderTimelineModule(container) {
    container.innerHTML = `
        <div class="geoint-section-title">⏱ ZAMAN ÇİZELGESİ</div>
        <textarea class="geoint-input" id="tl-text" rows="4"
            placeholder="Olayları içeren metin veya madde listesi gir. AI tarih ve olay bağlantılarını çıkarır..."></textarea>
        <button class="geoint-btn" onclick="buildTimeline()">🤖 ZAMAN ÇİZELGESİ OLUŞTUR</button>
        <div id="tl-status" style="font-size:10px; color:#ff9800; margin-bottom:6px;"></div>
        <div id="tl-output"></div>
    `;

    // Mevcut timeline varsa göster
    if (GEOINT_STATE.timeline.length > 0) renderTimelineItems(GEOINT_STATE.timeline);
}

async function buildTimeline() {
    const text   = document.getElementById('tl-text')?.value || '';
    const status = document.getElementById('tl-status');
    if (!text) { if (status) status.innerText = '⚠ Metin girin.'; return; }

    if (status) status.innerText = '⏳ Analiz ediliyor...';

    const prompt = `
Aşağıdaki metinden kronolojik bir zaman çizelgesi çıkar.
Her olayı şu formatta döndür (SADECE JSON array):
[
  { "date": "YYYY-MM-DD veya yaklaşık tarih", "event": "Olay özeti", "entities": ["ilgili kişi/yer"], "significance": "LOW|MED|HIGH|CRITICAL", "category": "military|political|cyber|economic|disaster" }
]
Metin:
${text}
`;
    try {
        const resp = await fetch('/api/ai/conflict', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({prompt})
        });
        const data = await resp.json();
        const raw  = (data.text || '').replace(/```json|```/g, '').trim();
        const items = JSON.parse(raw);
        GEOINT_STATE.timeline = items;
        if (status) status.innerText = `✅ ${items.length} olay bulundu`;
        renderTimelineItems(items);
    } catch (e) {
        if (status) status.innerText = `Hata: ${e.message}`;
    }
}

function renderTimelineItems(items) {
    const out = document.getElementById('tl-output');
    if (!out) return;
    const catColors = {military:'#ff3c5f', political:'#ff9800', cyber:'#00f2ff', economic:'#ffd93d', disaster:'#ff6b00'};
    const sigColors = {CRITICAL:'#ff3c5f', HIGH:'#ff9800', MED:'#ffd93d', LOW:'rgba(255,255,255,0.4)'};

    out.innerHTML = items.sort((a,b) => a.date > b.date ? 1 : -1).map((item, i) => `
        <div style="display:flex; gap:8px; margin-bottom:8px; align-items:flex-start;">
            <div style="width:2px; background:${catColors[item.category]||'#444'};
                flex-shrink:0; min-height:100%; margin-top:4px; border-radius:1px;"></div>
            <div style="flex:1;">
                <div style="font-size:9px; color:${sigColors[item.significance]||'#888'}; letter-spacing:1px;">
                    ${item.date} — ${(item.category||'').toUpperCase()} — ${item.significance||''}
                </div>
                <div style="font-size:11px; color:#e0e8ff; margin:2px 0;">${item.event}</div>
                ${item.entities?.length ? `<div style="font-size:9px; color:rgba(0,242,255,0.5);">${item.entities.join(' · ')}</div>` : ''}
            </div>
        </div>
    `).join('');
}


// ═══════════════════════════════════════════════════════════
//  4. FİBER HAT HARİTASI (Submarine Cables)
// ═══════════════════════════════════════════════════════════

function renderFiberModule(container) {
    container.innerHTML = `
        <div class="geoint-section-title">🌐 KÜRESEL FİBER HAT HARİTASI</div>
        <p style="font-size:10px; color:rgba(255,255,255,0.5); margin:0 0 8px;">
            TeleGeography denizaltı fiber kablo verisi. Glob üzerinde görüntülenir.
        </p>
        <button class="geoint-btn" onclick="loadFiberCables()" id="fiber-load-btn">📡 FİBER HATLARINIYÜKLE</button>
        <div id="fiber-status" style="font-size:10px; color:#ff9800;"></div>
        <div id="fiber-list" style="max-height:200px; overflow-y:auto; font-size:9px; margin-top:6px;"></div>
        <button class="geoint-btn danger" onclick="clearFiberCables()" style="margin-top:6px;">🗑 KABLOLARI TEMİZLE</button>
    `;
}

async function loadFiberCables() {
    const btn    = document.getElementById('fiber-load-btn');
    const status = document.getElementById('fiber-status');
    if (btn) { btn.disabled = true; btn.innerText = '⏳ Yükleniyor...'; }
    if (status) status.innerText = 'TeleGeography API\'ye bağlanıyor...';

    try {
        const resp = await fetch('/api/infra/submarine-cables');
        const data = await resp.json();
        const features = data.features || [];
        GEOINT_STATE.fiberCables = features;

        // Globe'a arc olarak ekle
        const arcs = [];
        features.slice(0, 80).forEach(f => {
            const coords = f.geometry?.coordinates;
            if (!coords || coords.length < 2) return;
            const name = f.properties?.name || 'Unknown Cable';
            const color = '#' + Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');

            // Multi-segment cables
            for (let i = 0; i < coords.length - 1; i++) {
                const [lng1, lat1] = coords[i];
                const [lng2, lat2] = coords[i+1];
                if (lat1 && lat2 && lng1 && lng2) {
                    arcs.push({
                        startLat: lat1, startLng: lng1,
                        endLat: lat2, endLng: lng2,
                        color: 'rgba(0,242,255,0.4)',
                        _cableName: name,
                    });
                }
            }
        });

        if (typeof myGlobe !== 'undefined') {
            myGlobe.arcsData(arcs)
                .arcColor(d => d.color)
                .arcAltitude(0.01)
                .arcStroke(0.4)
                .arcDashLength(0.4)
                .arcDashGap(0.2)
                .arcDashAnimateTime(4000)
                .arcLabel(d => `🌐 ${d._cableName}`);
        }

        if (status) status.innerText = `✅ ${features.length} kablo yüklendi, ${arcs.length} segment`;

        // List
        const list = document.getElementById('fiber-list');
        if (list) {
            list.innerHTML = features.slice(0, 30).map(f =>
                `<div style="padding:3px 0; border-bottom:1px solid rgba(0,242,255,0.08); color:rgba(0,242,255,0.7);">
                    🌐 ${f.properties?.name || 'Unnamed'} 
                    <span style="color:rgba(255,255,255,0.3);">(${f.properties?.length || '?'} km)</span>
                </div>`
            ).join('');
        }

    } catch (e) {
        if (status) status.innerText = `Hata: ${e.message}`;
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = '📡 FİBER HATLARI YÜKLE'; }
    }
}

function clearFiberCables() {
    GEOINT_STATE.fiberCables = [];
    if (typeof myGlobe !== 'undefined') myGlobe.arcsData([]);
    const status = document.getElementById('fiber-status');
    if (status) status.innerText = '🗑 Temizlendi';
}


// ═══════════════════════════════════════════════════════════
//  5. İNTERNET KESİNTİ HARİTASI
// ═══════════════════════════════════════════════════════════

function renderOutageModule(container) {
    container.innerHTML = `
        <div class="geoint-section-title">⚡ İNTERNET KESİNTİ & BGP ALTYAPISI</div>
        <button class="geoint-btn" onclick="loadOutages()">📡 KESİNTİLERİ YÜKLE</button>
        <button class="geoint-btn" onclick="loadRipeProbes()">🔬 RIPE ATLAS PROB'LARI</button>
        <div id="outage-status" style="font-size:10px; color:#ff9800; margin-top:4px;"></div>
        <div id="outage-list" class="geoint-result-box" style="display:none; margin-top:6px;"></div>
    `;
}

async function loadOutages() {
    const status = document.getElementById('outage-status');
    const list   = document.getElementById('outage-list');
    if (status) status.innerText = '⏳ BGP/Kesinti verisi çekiliyor...';

    try {
        const resp = await fetch('/api/infra/outages');
        const data = await resp.json();
        GEOINT_STATE.outageData = data;
        if (status) status.innerText = `✅ Kaynak: ${data.source || 'unknown'}`;
        if (list) {
            list.style.display = 'block';
            list.innerText = JSON.stringify(data.data || data, null, 2).slice(0, 800) + '\n...';
        }
    } catch (e) {
        if (status) status.innerText = `Hata: ${e.message}`;
    }
}

async function loadRipeProbes() {
    const status = document.getElementById('outage-status');
    if (status) status.innerText = '⏳ RIPE Atlas probları yükleniyor...';

    try {
        const resp = await fetch('/api/infra/ripe-probes');
        const data = await resp.json();
        const probes = data.probes || [];

        // Globe'a nokta olarak ekle
        if (typeof myGlobe !== 'undefined') {
            const existingPoints = myGlobe.pointsData() || [];
            const probePoints = probes.map(p => ({
                ...p,
                _overlayType: 'ripe_probe',
                _color: p.status === 'Connected' ? '#39ff14' : '#ff9800',
                _radius: 0.1,
                _alt: 0.008,
            }));
            // Mevcut pointlara ekle
            myGlobe.pointsData([...existingPoints.filter(p => p._overlayType !== 'ripe_probe'), ...probePoints])
                .pointColor(d => d._overlayType === 'ripe_probe' ? d._color : (d._overlayType === 'airBase' ? '#ffd93d' : '#00f2ff'));
        }

        if (status) status.innerText = `✅ ${probes.length} RIPE probe haritada`;

    } catch (e) {
        if (status) status.innerText = `Hata: ${e.message}`;
    }
}


// ═══════════════════════════════════════════════════════════
//  6. TOR NODE HARİTASI
// ═══════════════════════════════════════════════════════════

function renderTorModule(container) {
    container.innerHTML = `
        <div class="geoint-section-title">🧅 TOR NETWORK NODE HARİTASI</div>
        <p style="font-size:10px; color:rgba(255,255,255,0.4); margin:0 0 8px;">
            Tor Project resmi relay listesi. Exit/Guard node'ları haritalar.
        </p>
        <div style="display:flex; gap:4px; margin-bottom:6px;">
            <button class="geoint-btn" onclick="loadTorNodes('all')" style="flex:1;">🌐 TÜM NODES</button>
            <button class="geoint-btn" onclick="loadTorNodes('exit')" style="flex:1;">🚪 EXIT ONLY</button>
            <button class="geoint-btn" onclick="loadTorNodes('guard')" style="flex:1;">🛡 GUARD ONLY</button>
        </div>
        <div id="tor-status" style="font-size:10px; color:#ff9800;"></div>
        <div id="tor-stats" style="font-size:10px; margin-top:6px;"></div>
        <button class="geoint-btn danger" onclick="clearTorNodes()" style="margin-top:6px;">🗑 TOR NODES TEMİZLE</button>
    `;
}

async function loadTorNodes(filter = 'all') {
    const status = document.getElementById('tor-status');
    const stats  = document.getElementById('tor-stats');
    if (status) status.innerText = '⏳ Tor Project API sorgulanıyor...';

    try {
        const resp = await fetch('/api/infra/tor-nodes');
        const data = await resp.json();
        let nodes = data.nodes || [];

        // Filter
        if (filter === 'exit')  nodes = nodes.filter(n => n.is_exit);
        if (filter === 'guard') nodes = nodes.filter(n => n.is_guard);

        GEOINT_STATE.torNodes = nodes;

        // Globe'a ekle
        if (typeof myGlobe !== 'undefined') {
            const torPoints = nodes.map(n => ({
                lat: n.lat, lng: n.lng,
                callsign: n.nickname,
                country: n.country,
                _overlayType: 'tor_node',
                _color: n.is_exit ? '#ff3c5f' : (n.is_guard ? '#ffd93d' : 'rgba(148,0,211,0.8)'),
                _radius: n.is_exit ? 0.18 : 0.12,
                _alt: 0.01,
                _flags: n.flags,
                _bw: n.bandwidth,
            }));

            const existingPoints = (myGlobe.pointsData() || []).filter(p => p._overlayType !== 'tor_node');
            myGlobe.pointsData([...existingPoints, ...torPoints])
                .pointColor(d => d._overlayType ? (d._color || '#00f2ff') : (d.type === 'military' ? '#ff3c5f' : '#00f2ff'))
                .pointLabel(d => {
                    if (d._overlayType === 'tor_node') {
                        return `🧅 <b>${d.callsign}</b><br/>🏴 ${d.country}<br/>${d._flags?.join(', ')||''}`;
                    }
                    return d.callsign || '';
                });
        }

        // Stats
        const exitCount  = nodes.filter(n => n.is_exit).length;
        const guardCount = nodes.filter(n => n.is_guard).length;
        const countries  = [...new Set(nodes.map(n => n.country))].length;

        if (status) status.innerText = `✅ ${nodes.length} node (toplam: ${data.total})`;
        if (stats) stats.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; text-align:center;">
                <div style="background:rgba(255,60,95,0.1); padding:6px; border-radius:2px;">
                    <div style="color:#ff3c5f; font-size:13px;">${exitCount}</div>
                    <div style="font-size:9px; opacity:0.6;">EXIT</div>
                </div>
                <div style="background:rgba(255,217,61,0.1); padding:6px; border-radius:2px;">
                    <div style="color:#ffd93d; font-size:13px;">${guardCount}</div>
                    <div style="font-size:9px; opacity:0.6;">GUARD</div>
                </div>
                <div style="background:rgba(148,0,211,0.1); padding:6px; border-radius:2px;">
                    <div style="color:#9400d3; font-size:13px;">${countries}</div>
                    <div style="font-size:9px; opacity:0.6;">ÜLKE</div>
                </div>
            </div>
        `;

    } catch (e) {
        if (status) status.innerText = `Hata: ${e.message}`;
    }
}

function clearTorNodes() {
    GEOINT_STATE.torNodes = [];
    if (typeof myGlobe !== 'undefined') {
        const pts = (myGlobe.pointsData() || []).filter(p => p._overlayType !== 'tor_node');
        myGlobe.pointsData(pts);
    }
    const status = document.getElementById('tor-status');
    if (status) status.innerText = '🗑 Temizlendi';
}


// ═══════════════════════════════════════════════════════════
//  7. BOTNET YOĞUNLUK HARİTASI (Shodan tabanlı)
// ═══════════════════════════════════════════════════════════

function renderBotnetModule(container) {
    container.innerHTML = `
        <div class="geoint-section-title">🤖 BOTNET YOĞUNLUK HARİTASI</div>
        <p style="font-size:10px; color:rgba(255,255,255,0.4); margin:0 0 8px;">
            Shodan API ile bilinen botnet göstergesi portlar/protokoller.
            <br><span style="color:#ff9800;">⚠ SHODAN_API_KEY gerekli</span>
        </p>
        <select class="geoint-input" id="botnet-query-sel">
            <option value="product:Mirai">🦠 Mirai IoT Botnet</option>
            <option value="port:23 product:BusyBox">📡 Açık Telnet (IoT)</option>
            <option value="port:6379 product:Redis">🗄 Açık Redis</option>
            <option value="port:27017 product:MongoDB">🗃 Açık MongoDB</option>
            <option value="port:11211 product:Memcached">⚡ DRDoS Memcached</option>
            <option value="port:445 os:Windows os:xp">💀 EternalBlue (WannaCry)</option>
        </select>
        <button class="geoint-btn" onclick="loadBotnetData()">🔍 BOTNET HARITASI YÜKLEsli</button>
        <div id="botnet-status" style="font-size:10px; color:#ff9800; margin-top:4px;"></div>
        <div id="botnet-country-list" style="max-height:200px; overflow-y:auto; margin-top:6px;"></div>
        <button class="geoint-btn danger" onclick="clearBotnetData()" style="margin-top:6px;">🗑 TEMİZLE</button>
    `;
}

async function loadBotnetData() {
    const query  = document.getElementById('botnet-query-sel')?.value || 'product:Mirai';
    const status = document.getElementById('botnet-status');
    const list   = document.getElementById('botnet-country-list');
    if (status) status.innerText = '⏳ Shodan sorgusu...';

    try {
        const resp = await fetch(`/api/shodan/query?q=${encodeURIComponent(query)}&limit=100`);
        const data = await resp.json();

        if (data.error) throw new Error(data.error);

        const matches = data.matches || [];
        GEOINT_STATE.botnetData = matches;

        // Globe'a ekle
        if (typeof myGlobe !== 'undefined' && matches.length > 0) {
            const botPoints = matches
                .filter(m => m.lat && m.lng)
                .map(m => ({
                    lat: m.lat, lng: m.lng,
                    callsign: m.ip,
                    country: m.country,
                    _overlayType: 'botnet',
                    _color: m.vuln_count > 0 ? '#ff3c5f' : '#ff9800',
                    _radius: m.vuln_count > 0 ? 0.2 : 0.14,
                    _alt: 0.012,
                    _org: m.org,
                    _vulns: m.vulns,
                    _port: m.port,
                }));

            const existing = (myGlobe.pointsData() || []).filter(p => p._overlayType !== 'botnet');
            myGlobe.pointsData([...existing, ...botPoints])
                .pointColor(d => d._overlayType === 'botnet' ? d._color : (d._overlayType ? '#00f2ff' : '#00f2ff'))
                .pointLabel(d => {
                    if (d._overlayType === 'botnet') {
                        return `🤖 <b>${d.callsign}</b><br/>🏴 ${d.country}<br/>🏢 ${d._org||'?'}<br/>PORT: ${d._port||'?'}<br/>${d._vulns?.length ? '⚠ CVE: ' + d._vulns.join(', ') : ''}`;
                    }
                    return d.callsign || '';
                });
        }

        // Ülkeye göre yoğunluk
        const byCountry = {};
        matches.forEach(m => { byCountry[m.country] = (byCountry[m.country] || 0) + 1; });
        const sorted = Object.entries(byCountry).sort((a,b) => b[1]-a[1]);

        if (status) status.innerText = `✅ ${matches.length} açık sistem bulundu`;
        if (list) {
            list.innerHTML = sorted.map(([country, count]) => `
                <div style="display:flex; justify-content:space-between; padding:3px 0;
                    border-bottom:1px solid rgba(255,60,95,0.1); font-size:10px;">
                    <span style="color:rgba(255,255,255,0.7);">🏴 ${country}</span>
                    <span style="color:#ff3c5f;">${count} sistem</span>
                </div>
            `).join('');
        }

    } catch (e) {
        if (status) status.innerText = `Hata: ${e.message}`;
    }
}

function clearBotnetData() {
    GEOINT_STATE.botnetData = [];
    if (typeof myGlobe !== 'undefined') {
        const pts = (myGlobe.pointsData() || []).filter(p => p._overlayType !== 'botnet');
        myGlobe.pointsData(pts);
    }
    const status = document.getElementById('botnet-status');
    if (status) status.innerText = '🗑 Temizlendi';
}


// ═══════════════════════════════════════════════════════════
//  8. NASA FIRMS YANGIN HARİTASI
// ═══════════════════════════════════════════════════════════

function renderFiresModule(container) {
    container.innerHTML = `
        <div class="geoint-section-title">🔥 NASA FIRMS — AKTİF YANGIN HARİTASI</div>
        <p style="font-size:10px; color:rgba(255,255,255,0.4); margin:0 0 8px;">
            MODIS uydusu ile tespit edilen son 24 saatteki termal anomaliler.
            Savaş yangınları, ormanlık, endüstriyel tesisler.
        </p>
        <button class="geoint-btn" onclick="loadFirmsFires()">🔥 YANGIN VERİSİ YÜKLE</button>
        <div id="fires-status" style="font-size:10px; color:#ff9800; margin-top:4px;"></div>
        <div id="fires-stats" style="margin-top:6px; font-size:10px;"></div>
        <button class="geoint-btn danger" onclick="clearFirms()" style="margin-top:6px;">🗑 YANGINLARI TEMİZLE</button>
    `;
}

async function loadFirmsFires() {
    const status = document.getElementById('fires-status');
    const stats  = document.getElementById('fires-stats');
    if (status) status.innerText = '⏳ NASA FIRMS sorgulanıyor...';

    try {
        const resp = await fetch('/api/geoint/firms-fires');
        const data = await resp.json();
        const fires = data.fires || [];
        GEOINT_STATE.firmsFires = fires;

        if (typeof myGlobe !== 'undefined' && fires.length > 0) {
            const firePoints = fires.map(f => ({
                lat: f.lat, lng: f.lng,
                callsign: `FIRE ${f.brightness?.toFixed(0)||'?'}K`,
                _overlayType: 'firms_fire',
                _color: f.brightness > 400 ? '#ff3c5f' : '#ff9800',
                _radius: f.brightness > 400 ? 0.18 : 0.12,
                _alt: 0.005,
                _brightness: f.brightness,
                _confidence: f.confidence,
                _date: f.date,
            }));

            const existing = (myGlobe.pointsData() || []).filter(p => p._overlayType !== 'firms_fire');
            myGlobe.pointsData([...existing, ...firePoints])
                .pointColor(d => d._overlayType === 'firms_fire' ? d._color : (d._overlayType ? '#ffd93d' : '#00f2ff'))
                .pointLabel(d => {
                    if (d._overlayType === 'firms_fire') {
                        return `🔥 <b>YANGIN</b><br/>Parlaklık: ${d._brightness?.toFixed(0)||'?'} K<br/>Güven: ${d._confidence||'?'}<br/>Tarih: ${d._date||'?'}`;
                    }
                    return d.callsign || '';
                });
        }

        if (status) status.innerText = `✅ ${fires.length} termal anomali (Kaynak: ${data.source})`;

        const highConf = fires.filter(f => f.confidence === 'high' || f.brightness > 400).length;
        if (stats) stats.innerHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <div style="background:rgba(255,60,95,0.1); padding:6px; border-radius:2px; text-align:center;">
                    <div style="color:#ff3c5f; font-size:14px;">${fires.length}</div>
                    <div style="font-size:9px; opacity:0.6;">TOPLAM</div>
                </div>
                <div style="background:rgba(255,152,0,0.1); padding:6px; border-radius:2px; text-align:center;">
                    <div style="color:#ff9800; font-size:14px;">${highConf}</div>
                    <div style="font-size:9px; opacity:0.6;">YÜKSEK ŞİDDET</div>
                </div>
            </div>
        `;

    } catch (e) {
        if (status) status.innerText = `Hata: ${e.message}`;
    }
}

function clearFirms() {
    GEOINT_STATE.firmsFires = [];
    if (typeof myGlobe !== 'undefined') {
        const pts = (myGlobe.pointsData() || []).filter(p => p._overlayType !== 'firms_fire');
        myGlobe.pointsData(pts);
    }
    const status = document.getElementById('fires-status');
    if (status) status.innerText = '🗑 Temizlendi';
}


// ═══════════════════════════════════════════════════════════
//  SOL MENÜ GEO BUTONU İÇİN ANA TETİKLEYİCİ
// ═══════════════════════════════════════════════════════════
function toggleGeointPanel() {
    // Panelin var olduğundan emin ol (yoksa üretir)
    injectGeointPanel(); 
    
    const p = document.getElementById('geoint-master-panel');
    if (p) {
        // Flex yapısını bozmadan aç/kapa
        if (p.style.display === 'none' || p.style.display === '') {
            p.style.display = 'flex';
        } else {
            p.style.display = 'none';
        }
    }
}

// ═══════════════════════════════════════════════════════════
//  INIT — DOM hazır olduğunda çalıştır (Eski Alt Bar Butonu İptal)
// ═══════════════════════════════════════════════════════════
(function initGeoint() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { injectGeointPanel(); });
    } else {
        injectGeointPanel();
    }
})();
