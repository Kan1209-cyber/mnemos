let graphData = { nodes: [], connections: [] };

async function loadGraph() {
    const res = await fetch('/api/graph');
    graphData = await res.json();
    renderGraph(graphData);
}

function renderGraph(data) {
    const container = document.getElementById('graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    d3.select('#graph-svg').selectAll('*').remove();

    const svg = d3.select('#graph-svg')
        .attr('width', width)
        .attr('height', height);

    // ── GLOW FILTER ──
    const defs = svg.append('defs');

    const domainColors = {};
    const colorPalette = ['#00f5d4', '#0066ff', '#ff6b35', '#c9a84c', '#a855f7', '#ff4444', '#00ff88'];
    const domains = [...new Set(data.nodes.map(n => n.domain))];
    domains.forEach((d, i) => {
        domainColors[d] = colorPalette[i % colorPalette.length];
    });

    domains.forEach((domain, i) => {
        const color = colorPalette[i % colorPalette.length];
        const filter = defs.append('filter')
            .attr('id', `glow-${i}`)
            .attr('x', '-50%').attr('y', '-50%')
            .attr('width', '200%').attr('height', '200%');

        filter.append('feGaussianBlur')
            .attr('stdDeviation', '4')
            .attr('result', 'coloredBlur');

        const merge = filter.append('feMerge');
        merge.append('feMergeNode').attr('in', 'coloredBlur');
        merge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // ── SIMULATION ──
    const nodes = data.nodes.map(n => ({ ...n }));
    const links = data.connections.map(c => ({
        ...c,
        source: c.from_node_id,
        target: c.to_node_id,
    }));

    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40));

    // ── LINKS ──
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#1a3a3a')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6);

    // ── LINK LABELS ──
    const linkLabel = svg.append('g')
        .selectAll('text')
        .data(links)
        .enter()
        .append('text')
        .attr('fill', '#2a5a5a')
        .attr('font-size', '9px')
        .attr('font-family', 'Share Tech Mono, monospace')
        .attr('text-anchor', 'middle')
        .text(d => d.label);

    // ── NODES ──
    const nodeGroup = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g')
        .style('cursor', 'pointer')
        .call(d3.drag()
            .on('start', dragStart)
            .on('drag', dragged)
            .on('end', dragEnd)
        )
        .on('click', (event, d) => {
            openModal(d, data.nodes, data.connections);
        })
        .on('mouseover', function(event, d) {
            // Dim all
            nodeGroup.selectAll('circle').attr('opacity', 0.15);
            linkGroup_ref.attr('opacity', 0.05);

            // Highlight this node
            d3.select(this).select('circle').attr('opacity', 1);

            // Highlight connected
            const connectedIds = new Set();
            links.forEach(l => {
                const srcId = typeof l.source === 'object' ? l.source.id : l.source;
                const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
                if (srcId === d.id || tgtId === d.id) {
                    connectedIds.add(srcId);
                    connectedIds.add(tgtId);
                }
            });

            nodeGroup.filter(n => connectedIds.has(n.id))
                .select('circle').attr('opacity', 1);

            linkGroup_ref.filter(l => {
                const srcId = typeof l.source === 'object' ? l.source.id : l.source;
                const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
                return srcId === d.id || tgtId === d.id;
            }).attr('opacity', 1).attr('stroke', '#00f5d4');
        })
        .on('mouseout', function() {
            nodeGroup.selectAll('circle').attr('opacity', d => d.decayed ? 0.3 : 1);
            linkGroup_ref.attr('opacity', 0.6).attr('stroke', '#1a3a3a');
        });

    const linkGroup_ref = link;

    // Node circles
    nodeGroup.append('circle')
        .attr('r', d => {
            const base = 6;
            const bonus = Math.min(d.strength * 3, 20);
            return base + bonus;
        })
        .attr('fill', d => domainColors[d.domain] || '#00f5d4')
        .attr('opacity', d => d.decayed ? 0.3 : 1)
        .attr('filter', (d, i) => {
            const domainIndex = domains.indexOf(d.domain);
            return `url(#glow-${domainIndex})`;
        });

    // Pulse animation
    nodeGroup.append('circle')
        .attr('r', d => {
            const base = 6;
            const bonus = Math.min(d.strength * 3, 20);
            return base + bonus;
        })
        .attr('fill', 'none')
        .attr('stroke', d => domainColors[d.domain] || '#00f5d4')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6)
        .each(function(d) {
            const circle = d3.select(this);
            const baseR = 6 + Math.min(d.strength * 3, 20);
            function pulse() {
                circle.transition()
                    .duration(2000)
                    .attr('r', baseR + 10)
                    .attr('opacity', 0)
                    .transition()
                    .duration(0)
                    .attr('r', baseR)
                    .attr('opacity', 0.6)
                    .on('end', pulse);
            }
            pulse();
        });

    // Node labels
    nodeGroup.append('text')
        .attr('dy', d => -(8 + Math.min(d.strength * 3, 20)))
        .attr('text-anchor', 'middle')
        .attr('fill', d => domainColors[d.domain] || '#00f5d4')
        .attr('font-size', '11px')
        .attr('font-family', 'Share Tech Mono, monospace')
        .attr('opacity', 0.9)
        .text(d => d.title);

    // ── TICK ──
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        linkLabel
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);

        nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // ── DRAG ──
    function dragStart(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnd(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    // ── ZOOM ──
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            svg.selectAll('g').attr('transform', event.transform);
        });

    svg.call(zoom);
}