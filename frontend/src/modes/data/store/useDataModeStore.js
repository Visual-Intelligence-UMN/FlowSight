import { create } from 'zustand';

/**
 * useDataModeStore — Zustand store for Data Mode
 *
 * Single source of truth for all Data Mode state.
 * Completely isolated from Q&A Mode.
 *
 * Analysis records (dataset, insights, hypotheses, results) are a parallel
 * flat registry alongside the React Flow graph. They are written once at node
 * creation and never derived from node.data at query time. Use
 * buildAnalysisContext() from analysisContext.js to assemble them for AI calls.
 */
const useDataModeStore = create((set, get) => ({

    // ── Graph state ──────────────────────────────────────────
    nodes: [],
    edges: [],

    // ── Selection ────────────────────────────────────────────
    selectedNode: null,

    // ── Dataset (raw, used by stats engine + chart renderers) ─
    datasetMetadata: null,
    datasetSpec: null,

    // ── AI output ────────────────────────────────────────────
    insightSuggestions: [],

    // ── Dataset description (AI-generated, user-editable) ────
    datasetDescription: '',

    // ── Pipeline progress ────────────────────────────────────
    workflowStep: 'idle',

    // ── API key (user-supplied, stored in sessionStorage) ────
    apiKey: sessionStorage.getItem('sv_openai_key') || '',

    // ── Analysis records ──────────────────────────────────────
    // DatasetRecord: clean summary for AI context (no raw_values / histograms)
    // {
    //   name, source, rowCount, columnCount, numericCount, categoricalCount,
    //   description,
    //   columnSummaries: [{
    //     name, type, missing, unique,
    //     stats?: { mean, median, min, max, std },
    //     topValues?: [{ value, count }]
    //   }]
    // }
    dataset: null,

    // InsightRecord map: nodeId → record
    // {
    //   nodeId, insightId, title, type, description,
    //   columnsInvolved, reason,
    //   resolvedChartType: string|null, resolvedColumns: string[],
    //   createdAt
    // }
    insights: new Map(),

    // HypothesisRecord map: nodeId → record
    // {
    //   nodeId, parentInsightNodeId: string|null,
    //   label, title, statement, type, variables,
    //   directionality, suggestedTest, assumptionNotes,
    //   status: 'pending'|'accepted'|'rejected',
    //   isCustom, createdAt
    // }
    hypotheses: new Map(),

    // ResultRecord map: nodeId → record
    // {
    //   nodeId, parentHypothesisNodeId,
    //   method, testType, columns,
    //   stat, pValue, significant, summary,
    //   aiAssisted, createdAt
    // }
    results: new Map(),

    // ── Node identifiers ──────────────────────────────────────
    insightTypeCounts: {
        relationship: 0,
        group_difference: 0,
        distribution_issue: 0,
        outlier_candidate: 0,
    },
    hypothesisCount: 0,
    resultCount: 0,


    // ── Graph actions ─────────────────────────────────────────

    setNodes: (nodes) => set({
        nodes: typeof nodes === 'function' ? nodes(get().nodes) : nodes,
    }),

    setEdges: (edges) => set({
        edges: typeof edges === 'function' ? edges(get().edges) : edges,
    }),

    addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

    addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),

    setSelectedNode: (node) => set({ selectedNode: node }),

    updateNodeData: (nodeId, patch) => set((state) => ({
        nodes: state.nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
        ),
    })),

    removeNode: (nodeId) => set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    })),

    // ── Dataset actions ───────────────────────────────────────

    setDataset: ({ metadata, spec }) => {
        const columnSummaries = (spec.columns ?? []).map((c) => {
            const summary = {
                name:    c.name,
                type:    c.type,
                missing: c.missing_count,
                unique:  c.unique_count,
            };
            if (c.type === 'numeric' && c.stats) {
                const { mean, median, min, max, std } = c.stats;
                summary.stats = { mean, median, min, max, std };
            }
            if (c.top_values?.length) {
                summary.topValues = c.top_values;
            }
            return summary;
        });

        const datasetRecord = {
            name:             metadata.name,
            source:           metadata.source,
            rowCount:         spec.rowCount,
            columnCount:      spec.columnCount,
            numericCount:     spec.numericCount,
            categoricalCount: spec.categoricalCount,
            description:      get().datasetDescription || '',
            columnSummaries,
        };

        set({
            datasetMetadata: metadata,
            datasetSpec:     spec,
            dataset:         datasetRecord,
            workflowStep:    'dataset',
        });
    },

    setDatasetDescription: (text) => set((state) => ({
        datasetDescription: text,
        dataset: state.dataset ? { ...state.dataset, description: text } : state.dataset,
    })),

    setInsights: (suggestions) => set({
        insightSuggestions: suggestions,
        workflowStep: 'insight',
    }),

    setApiKey: (key) => {
        sessionStorage.setItem('sv_openai_key', key);
        set({ apiKey: key });
    },

    resetGraph: () => set({
        nodes:       [],
        edges:       [],
        datasetDescription: '',
        dataset:     null,
        insights:    new Map(),
        hypotheses:  new Map(),
        results:     new Map(),
        insightTypeCounts: {
            relationship: 0,
            group_difference: 0,
            distribution_issue: 0,
            outlier_candidate: 0,
        },
        hypothesisCount: 0,
        resultCount: 0,
    }),

    allocateInsightIdentifier: (insightType) => {
        const prefixMap = {
            relationship: 'R',
            group_difference: 'GD',
            distribution_issue: 'DI',
            outlier_candidate: 'OC',
        };
        const type = insightType ?? '';
        const prefix = prefixMap[type] ?? 'I';
        const current = get().insightTypeCounts[type] ?? 0;
        const next = current + 1;
        set((state) => ({
            insightTypeCounts: {
                ...state.insightTypeCounts,
                [type]: next,
            },
        }));
        return `${prefix}${next}`;
    },

    allocateHypothesisIdentifier: () => {
        const next = get().hypothesisCount + 1;
        set({ hypothesisCount: next });
        return `H${next}`;
    },

    allocateResultIdentifier: () => {
        const next = get().resultCount + 1;
        set({ resultCount: next });
        return `RES${next}`;
    },

    // ── Analysis record actions ───────────────────────────────

    addInsightRecord: (record) => set((state) => {
        const next = new Map(state.insights);
        next.set(record.nodeId, { ...record, createdAt: Date.now() });
        return { insights: next };
    }),

    /** Called by InsightNode after resolveChartType() resolves */
    resolveInsightChart: (nodeId, chartType, columns) => {
        set((state) => {
            const next = new Map(state.insights);
            const existing = next.get(nodeId);
            if (existing) {
                next.set(nodeId, {
                    ...existing,
                    resolvedChartType: chartType,
                    resolvedColumns:   columns ?? [],
                });
            }
            return { insights: next };
        });
        // Also patch node.data so InsightChart re-renders with the resolved values
        get().updateNodeData(nodeId, { chart_type: chartType, resolvedColumns: columns ?? [] });
    },

    addHypothesisRecord: (record) => set((state) => {
        const next = new Map(state.hypotheses);
        next.set(record.nodeId, { ...record, createdAt: Date.now() });
        return { hypotheses: next };
    }),

    /** Called when user edits hypothesis statement inline */
    updateHypothesisStatement: (nodeId, statement) => {
        set((state) => {
            const next = new Map(state.hypotheses);
            const existing = next.get(nodeId);
            if (existing) next.set(nodeId, { ...existing, statement });
            return { hypotheses: next };
        });
        get().updateNodeData(nodeId, { statement });
    },

    /** Called when hypothesis status changes (accept/reject) */
    updateHypothesisStatus: (nodeId, status) => {
        set((state) => {
            const next = new Map(state.hypotheses);
            const existing = next.get(nodeId);
            if (existing) next.set(nodeId, { ...existing, status });
            return { hypotheses: next };
        });
        get().updateNodeData(nodeId, { status });
    },

    addResultRecord: (record) => set((state) => {
        const next = new Map(state.results);
        next.set(record.nodeId, { ...record, createdAt: Date.now() });
        return { results: next };
    }),

}));

export default useDataModeStore;
