function normalize(text) {
    return String(text ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

function insightSubtypeDisplay(subtype) {
    switch (subtype) {
        case 'relationship': return 'Relationship';
        case 'group_difference': return 'GroupDifference';
        case 'distribution_issue': return 'DistributionIssue';
        case 'outlier_candidate': return 'OutlierCandidate';
        default: return 'Insight';
    }
}

function typeDisplay(node) {
    const type = node?.type;
    switch (type) {
        case 'dataset': return 'Dataset';
        case 'datasetsummary': return 'DatasetSummary';
        case 'insight': return insightSubtypeDisplay(node?.data?.type);
        case 'hypothesis': return 'Hypothesis';
        case 'result': return 'Result';
        case 'customhypothesis': return 'CustomHypothesis';
        case 'column': return 'Column';
        case 'test': return 'Test';
        case 'interpretation': return 'Interpretation';
        case 'nextstep': return 'NextStep';
        default: return type ?? 'Node';
    }
}

export function getNodeSearchEntry(node) {
    const typeName = typeDisplay(node);
    const identifier = node.data?.identifier ?? node.data?.label ?? '';
    const title = node.data?.title ?? node.data?.name ?? node.data?.statement ?? node.data?.action ?? '';
    const tags = [
        typeName,
        `${typeName}${identifier}`,
        identifier,
        title,
        node.id,
    ].filter(Boolean);

    return {
        id: node.id,
        type: node.type,
        typeName,
        identifier,
        title,
        display: identifier ? `${typeName}${identifier}` : (title || typeName),
        searchBlob: normalize(tags.join(' ')),
    };
}

export function matchNodesByMentionQuery(nodes, rawQuery) {
    const query = normalize(rawQuery);
    if (!query) return [];

    return nodes
        .map(getNodeSearchEntry)
        .filter((entry) => entry.searchBlob.includes(query));
}

export function resolveExactMention(nodes, rawQuery) {
    const query = normalize(rawQuery);
    if (!query) return null;

    const exactMatches = nodes
        .map(getNodeSearchEntry)
        .filter((entry) => (
            normalize(entry.display) === query ||
            normalize(entry.identifier) === query ||
            normalize(entry.id) === query
        ));

    return exactMatches.length === 1 ? exactMatches[0] : null;
}

export function getActiveMentionQuery(text) {
    const value = String(text ?? '');
    const match = value.match(/(?:^|\s)@([A-Za-z0-9_-]*)$/);
    return match ? match[1] : null;
}

export function extractMentionQueries(text) {
    return [...String(text ?? '').matchAll(/(?:^|\s)@([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
}

export function extractCommittedExactMentions(text, nodes) {
    return [...String(text ?? '').matchAll(/(?:^|\s)@([A-Za-z0-9_-]+)(?=\s)/g)]
        .map((m) => ({
            query: m[1],
            entry: resolveExactMention(nodes, m[1]),
        }))
        .filter((item) => item.entry);
}

export function stripMentionsFromText(text, nodes = []) {
    return String(text ?? '')
        .replace(/(^|\s)@([A-Za-z0-9_-]+)/g, (match, leading, query) => (
            resolveExactMention(nodes, query) ? leading : match
        ))
        .replace(/\s+/g, ' ')
        .trim();
}

export function collectUpstreamNodeIds(targetIds, edges) {
    const reverse = new Map();
    for (const edge of edges ?? []) {
        if (!reverse.has(edge.target)) reverse.set(edge.target, []);
        reverse.get(edge.target).push(edge.source);
    }

    const visited = new Set();
    const queue = [...(targetIds ?? [])];
    while (queue.length) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        for (const parent of reverse.get(current) ?? []) {
            if (!visited.has(parent)) queue.push(parent);
        }
    }
    return [...visited];
}

function canIncludeAnalysisDescendant(parentType, childType) {
    if (parentType === 'insight') {
        return childType === 'hypothesis' || childType === 'customhypothesis' || childType === 'result';
    }
    if (parentType === 'hypothesis' || parentType === 'customhypothesis') {
        return childType === 'result';
    }
    return false;
}

export function collectAnalysisScopeNodeIds(targetIds, nodes, edges) {
    const nodeMap = new Map((nodes ?? []).map((node) => [node.id, node]));
    const upstreamIds = collectUpstreamNodeIds(targetIds, edges);
    const children = new Map();

    for (const edge of edges ?? []) {
        if (!children.has(edge.source)) children.set(edge.source, []);
        children.get(edge.source).push(edge.target);
    }

    const visited = new Set(upstreamIds);
    const queue = [...(targetIds ?? [])];

    while (queue.length) {
        const currentId = queue.shift();
        const currentNode = nodeMap.get(currentId);
        if (!currentNode) continue;

        for (const childId of children.get(currentId) ?? []) {
            const childNode = nodeMap.get(childId);
            if (!childNode) continue;
            if (!canIncludeAnalysisDescendant(currentNode.type, childNode.type)) continue;
            if (visited.has(childId)) continue;
            visited.add(childId);
            queue.push(childId);
        }
    }

    return [...visited];
}
