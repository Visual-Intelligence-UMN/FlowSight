/**
 * layoutGraph.js — Dagre-based automatic layout for Data Mode
 *
 * Prefers React Flow's measured node dimensions (node.measured) over
 * static estimates so that tall nodes like DatasetSummaryNode (expanded)
 * are spaced correctly without overlap.
 */

import dagre from '@dagrejs/dagre';

/**
 * Fallback dimension estimates used before React Flow measures a node.
 * These only apply on the very first layout pass for that node type.
 */
const ESTIMATE = {
    dataset:        { width: 280, height: 150 },
    // collapsed vs expanded handled via node.data.collapsed below
    datasetsummary: { width: 340, height: 120 },
    insight:        { width: 280, height: 220 },
    hypothesis:     { width: 280, height: 330 },
    column:         { width: 240, height: 130 },
    test:           { width: 280, height: 180 },
    result:         { width: 660, height: 420 },
    interpretation: { width: 280, height: 180 },
    nextstep:       { width: 280, height: 180 },
    datasetdetails: { width: 360, height: 300 },
};

const FALLBACK = { width: 280, height: 200 };

function getNodeDimensions(node) {
    // React Flow measures nodes after first render and stores the result in
    // node.measured.  Use those dimensions when available — they are exact.
    const mw = node.measured?.width  ?? node.width;
    const mh = node.measured?.height ?? node.height;
    if (mw && mh) return { width: mw, height: mh };

    // DatasetSummaryNode estimate depends on collapsed state
    if (node.type === 'datasetsummary') {
        return node.data?.collapsed
            ? { width: 280, height: 110 }
            : { width: 340, height: 520 };
    }

    return ESTIMATE[node.type] ?? FALLBACK;
}

/**
 * @param {import('@xyflow/react').Node[]} nodes
 * @param {import('@xyflow/react').Edge[]} edges
 * @returns {import('@xyflow/react').Node[]}  nodes with updated positions
 */
export function layoutGraph(nodes, edges) {
    if (nodes.length === 0) return nodes;

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
        rankdir:  'TB',
        ranksep:  100,   // vertical space between rows
        nodesep:  50,    // horizontal space between nodes in the same row
        marginx:  80,
        marginy:  80,
    });

    nodes.forEach((node) => {
        const { width, height } = getNodeDimensions(node);
        g.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
            g.setEdge(edge.source, edge.target);
        }
    });

    dagre.layout(g);

    // Dagre gives centre coords; React Flow expects top-left
    const laidOutNodes = nodes.map((node) => {
        const n = g.node(node.id);
        if (!n) return node;
        const { width, height } = getNodeDimensions(node);
        return {
            ...node,
            position: {
                x: n.x - width  / 2,
                y: n.y - height / 2,
            },
        };
    });

    const positioned = new Map(laidOutNodes.map((node) => [node.id, node]));

    // Some branches are intentionally lateral, not part of the top-to-bottom
    // reasoning flow. Anchor those after Dagre so they stay on the right.
    edges
        .filter((edge) => edge.sourceHandle === 'details-out')
        .forEach((edge) => {
            const sourceNode = positioned.get(edge.source);
            const targetNode = positioned.get(edge.target);
            if (!sourceNode || !targetNode) return;

            const sourceDims = getNodeDimensions(sourceNode);
            const targetDims = getNodeDimensions(targetNode);
            const anchoredY = sourceNode.position.y + 96;

            positioned.set(edge.target, {
                ...targetNode,
                position: {
                    x: sourceNode.position.x + sourceDims.width + 120,
                    y: anchoredY,
                },
            });
        });

    return laidOutNodes.map((node) => positioned.get(node.id) ?? node);
}
