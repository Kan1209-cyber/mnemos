// ── PAGE NAVIGATION ──
function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + name).classList.add('active');
    event.target.classList.add('active');

    if (name === 'tracker') loadTracker();
    if (name === 'search') document.getElementById('search-input').focus();
}

// ── MODAL ──
function openModal(node, allNodes, allConnections) {
    const connections = allConnections.filter(
        c => c.from_node_id === node.id || c.to_node_id === node.id
    );

    const connectedNodes = connections.map(c => {
        const otherId = c.from_node_id === node.id ? c.to_node_id : c.from_node_id;
        const other = allNodes.find(n => n.id === otherId);
        return { node: other, label: c.label };
    }).filter(x => x.node);

    const tags = node.tags.map(t => `<span class="tag">${t}</span>`).join('');
    const sources = node.sources.map(s =>
        `<a class="source-link" href="${s}" target="_blank">${s}</a>`
    ).join('') || '<span style="color:#6b6560">None</span>';

    const connected = connectedNodes.map(({ node: n, label }) =>
        `<span class="connected-node" onclick="fetchAndOpenNode('${n.id}')">${label} → ${n.title}</span>`
    ).join('') || '<span style="color:#6b6560">No connections yet.</span>';

    document.getElementById('modal-body').innerHTML = `
        <div class="modal-title">${node.title}</div>
        <div class="modal-domain">${node.domain}</div>
        <div class="strength-badge">STRENGTH ${node.strength || 0}</div>
        <div class="modal-content-text">${node.content || 'No notes yet.'}</div>
        <div class="modal-section">
            <div class="modal-section-title">TAGS</div>
            ${tags || '<span style="color:#6b6560">None</span>'}
        </div>
        <div class="modal-section">
            <div class="modal-section-title">SOURCES</div>
            ${sources}
        </div>
        <div class="modal-section">
            <div class="modal-section-title">CONNECTIONS</div>
            ${connected}
        </div>
        <div class="modal-actions">
            <button class="btn-edit" onclick="editNode('${node.id}')">EDIT</button>
            <button class="btn-delete" onclick="deleteNode('${node.id}')">DELETE</button>
        </div>
    `;

    document.getElementById('modal').classList.remove('hidden');
    fetch(`/api/nodes/${node.id}`);
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

async function fetchAndOpenNode(nodeId) {
    const res = await fetch('/api/graph');
    const data = await res.json();
    const node = data.nodes.find(n => n.id === nodeId);
    if (node) openModal(node, data.nodes, data.connections);
}

// ── ADD NODE FORM ──
function openAddNodeForm() {
    document.getElementById('modal-body').innerHTML = `
        <div class="modal-title">New Node</div>
        <div style="display:flex;flex-direction:column;gap:16px;margin-top:24px">
            <input id="fn-title" placeholder="Title *" style="${inputStyle()}" />
            <input id="fn-domain" placeholder="Domain *" style="${inputStyle()}" />
            <textarea id="fn-content" placeholder="Notes..." style="${inputStyle()}height:100px;resize:none;"></textarea>
            <input id="fn-tags" placeholder="Tags (comma separated)" style="${inputStyle()}" />
            <input id="fn-sources" placeholder="Sources / URLs (comma separated)" style="${inputStyle()}" />
            <div style="display:flex;gap:12px;margin-top:8px">
                <button class="btn-edit" onclick="submitNewNode()">CREATE</button>
                <button class="btn-delete" onclick="closeModal()">CANCEL</button>
            </div>
        </div>
    `;
    document.getElementById('modal').classList.remove('hidden');
}

function inputStyle() {
    return `width:100%;background:#0d0d0d;border:1px solid #2a2a2a;color:#e8e0d0;font-family:'Share Tech Mono',monospace;font-size:13px;padding:10px 14px;outline:none;`;
}

async function submitNewNode() {
    const title = document.getElementById('fn-title').value.trim();
    const domain = document.getElementById('fn-domain').value.trim();
    if (!title || !domain) {
        alert('Title and Domain are required.');
        return;
    }
    const content = document.getElementById('fn-content').value.trim();
    const tags = document.getElementById('fn-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const sources = document.getElementById('fn-sources').value.split(',').map(s => s.trim()).filter(Boolean);

    await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, domain, content, tags, sources })
    });

    closeModal();
    loadGraph();
    loadHeatmap();
}

// ── EDIT NODE ──
function editNode(nodeId) {
    closeModal();
    fetchAndEditNode(nodeId);
}

async function fetchAndEditNode(nodeId) {
    const res = await fetch(`/api/nodes/${nodeId}`);
    const node = await res.json();

    document.getElementById('modal-body').innerHTML = `
        <div class="modal-title">Edit Node</div>
        <div style="display:flex;flex-direction:column;gap:16px;margin-top:24px">
            <input id="en-title" value="${node.title}" style="${inputStyle()}" />
            <input id="en-domain" value="${node.domain}" style="${inputStyle()}" />
            <textarea id="en-content" style="${inputStyle()}height:100px;resize:none;">${node.content}</textarea>
            <input id="en-tags" value="${node.tags.join(', ')}" style="${inputStyle()}" />
            <input id="en-sources" value="${node.sources.join(', ')}" style="${inputStyle()}" />
            <div style="display:flex;gap:12px;margin-top:8px">
                <button class="btn-edit" onclick="submitEditNode('${node.id}')">SAVE</button>
                <button class="btn-delete" onclick="closeModal()">CANCEL</button>
            </div>
        </div>
    `;
    document.getElementById('modal').classList.remove('hidden');
}

async function submitEditNode(nodeId) {
    const title = document.getElementById('en-title').value.trim();
    const domain = document.getElementById('en-domain').value.trim();
    const content = document.getElementById('en-content').value.trim();
    const tags = document.getElementById('en-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const sources = document.getElementById('en-sources').value.split(',').map(s => s.trim()).filter(Boolean);

    await fetch(`/api/nodes/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, domain, content, tags, sources })
    });

    closeModal();
    loadGraph();
    loadHeatmap();
}

// ── DELETE NODE ──
async function deleteNode(nodeId) {
    if (!confirm('Delete this node?')) return;
    await fetch(`/api/nodes/${nodeId}`, { method: 'DELETE' });
    closeModal();
    loadGraph();
    loadHeatmap();
}

// ── RANDOM NODE ──
async function randomNode() {
    const res = await fetch('/api/graph/random');
    if (!res.ok) return;
    const node = await res.json();
    const graphRes = await fetch('/api/graph');
    const data = await graphRes.json();
    openModal(node, data.nodes, data.connections);
}

// ── THOUGHT CAPTURE ──
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('thought-input');
    input.addEventListener('keydown', async (e) => {
        if (e.key !== 'Enter') return;
        const val = input.value.trim();
        if (!val) return;

        const domain = prompt('Domain for this thought:', 'General');
        if (!domain) return;

        await fetch('/api/nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: val, domain })
        });

        input.value = '';
        loadGraph();
        loadHeatmap();
    });

    loadGraph();
    loadHeatmap();
});

// ── HEATMAP ──
async function loadHeatmap() {
    const res = await fetch('/api/graph/heatmap');
    const data = await res.json();

    const max = Math.max(...Object.values(data), 1);
    const container = document.getElementById('heatmap');
    container.innerHTML = '';

    Object.entries(data).forEach(([domain, count]) => {
        const pct = Math.round((count / max) * 100);
        container.innerHTML += `
            <div class="heatmap-row">
                <span class="heatmap-domain">${domain}</span>
                <div class="heatmap-bar-wrap">
                    <div class="heatmap-bar" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    });
}

// ── SEARCH ──
async function doSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) {
        document.getElementById('search-results').innerHTML = '';
        return;
    }

    const res = await fetch(`/api/graph/search?q=${encodeURIComponent(q)}`);
    const nodes = await res.json();
    const container = document.getElementById('search-results');

    if (!nodes.length) {
        container.innerHTML = '<p style="color:#6b6560">No results found.</p>';
        return;
    }

    container.innerHTML = nodes.map(n => `
        <div class="search-result-card" onclick="fetchAndOpenNode('${n.id}')">
            <div class="result-title">${n.title}</div>
            <div class="result-domain">${n.domain}</div>
        </div>
    `).join('');
}

// ── TRACKER ──
let habits = [];
let streaks = {};

async function loadTracker() {
    const [hRes, sRes, todayRes] = await Promise.all([
        fetch('/api/habits'),
        fetch('/api/habits/streaks'),
        fetch('/api/habits/today'),
    ]);

    habits = await hRes.json();
    streaks = await sRes.json();
    const today = await todayRes.json();
    const completedToday = today.completed_habits || [];

    const container = document.getElementById('habits-list');
    container.innerHTML = habits.map(h => `
        <div class="habit-row">
            <input type="checkbox" id="h-${h.id}" ${completedToday.includes(h.id) ? 'checked' : ''} />
            <span class="habit-name">${h.name}</span>
            <span class="habit-streak">🔥 ${streaks[h.id] || 0}</span>
            <button class="delete-habit-btn" onclick="deleteHabit('${h.id}')">✕</button>
        </div>
    `).join('');

    if (today.summary) {
        document.getElementById('summary-input').value = today.summary;
    }
}

async function addHabit() {
    const input = document.getElementById('new-habit-input');
    const name = input.value.trim();
    if (!name) return;

    await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });

    input.value = '';
    loadTracker();
}

async function deleteHabit(habitId) {
    await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
    loadTracker();
}

async function logToday() {
    const completed = habits
        .filter(h => document.getElementById('h-' + h.id)?.checked)
        .map(h => h.id);

    const summary = document.getElementById('summary-input').value;

    await fetch('/api/habits/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed_habit_ids: completed, summary })
    });

    loadTracker();
}
