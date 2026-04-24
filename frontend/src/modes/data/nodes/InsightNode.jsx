import { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import useDataModeStore from '../store/useDataModeStore';
import { fetchHypothesis } from '../api/hypothesisService';
import { resolveChartType } from '../api/chartTypeService';
import InsightChart from './charts/InsightChart';
import './nodes.css';

const TYPE_META = {
    relationship:        { label: 'Relationship',       cls: 'dm-node--insight-relationship'      },
    group_difference:    { label: 'Group Difference',   cls: 'dm-node--insight-group_difference'  },
    distribution_issue:  { label: 'Distribution Issue', cls: 'dm-node--insight-distribution_issue'},
    outlier_candidate:   { label: 'Outlier Candidate',  cls: 'dm-node--insight-outlier_candidate' },
};

const EDGE_HYPOTHESIS = {
    stroke:          '#a855f7',
    strokeWidth:     1.5,
    strokeDasharray: '5,3',
};

function InsightNode({ id, data, selected }) {
    const [hypStatus,       setHypStatus]      = useState('idle'); // 'idle' | 'loading' | 'error'
    const [resolvedChart,   setResolvedChart]  = useState(null);
    const [resolvedColumns, setResolvedColumns] = useState([]);
    const didResolve = useRef(false);

    const removeNode          = useDataModeStore((s) => s.removeNode);
    const datasetSpec         = useDataModeStore((s) => s.datasetSpec);
    const resolveInsightChart = useDataModeStore((s) => s.resolveInsightChart);
    const addHypothesisRecord = useDataModeStore((s) => s.addHypothesisRecord);

    const meta = TYPE_META[data.type] ?? { label: 'Insight' };

    // Always ask AI for chart type + exact spec column names on first mount.
    // Never rely on column name matching — AI has the full spec and returns exact names.
    useEffect(() => {
        if (didResolve.current || !datasetSpec) return;
        didResolve.current = true;
        resolveChartType(data, datasetSpec)
            .then(({ chart_type, columns }) => {
                const cols = columns?.length ? columns : (data.columns_involved ?? []);
                setResolvedChart(chart_type);
                setResolvedColumns(cols);
                resolveInsightChart(id, chart_type, cols);
            })
            .catch(() => {
                setResolvedChart(data.chart_type ?? null);
                setResolvedColumns(data.columns_involved ?? []);
            });
    }, [datasetSpec]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Dismiss ──────────────────────────────────────────────────────────

    const handleDismiss = (e) => {
        e.stopPropagation();
        removeNode(id);
    };

    // ── Generate Hypothesis ──────────────────────────────────────────────

    const handleGenerateHypothesis = async (e) => {
        e.stopPropagation();
        if (hypStatus === 'loading') return;

        const { datasetMetadata, datasetSpec, nodes, edges, addNode, addEdge } =
            useDataModeStore.getState();

        if (!datasetMetadata || !datasetSpec) return;

        setHypStatus('loading');

        try {
            const hypCount = nodes.filter((n) => n.type === 'hypothesis').length;
            const label    = `H${hypCount + 1}`;

            const { datasetDescription } = useDataModeStore.getState();
            const hypothesis = await fetchHypothesis(data, datasetMetadata, datasetSpec, label, datasetDescription);

            const hypId = `hyp-${id}-${Date.now()}`;

            const thisNode     = nodes.find((n) => n.id === id);
            const pos          = thisNode?.position ?? { x: 400, y: 600 };
            const siblingCount = edges
                .filter((e) => e.source === id)
                .map((e) => e.target)
                .filter((tid) => nodes.find((n) => n.id === tid)?.type === 'hypothesis')
                .length;

            addNode({
                id:       hypId,
                type:     'hypothesis',
                position: { x: pos.x + siblingCount * 380, y: pos.y + 280 },
                data:     { ...hypothesis, status: 'pending' },
            });

            addEdge({
                id:     `e-${id}-${hypId}`,
                source: id,
                target: hypId,
                style:  EDGE_HYPOTHESIS,
            });

            addHypothesisRecord({
                nodeId:               hypId,
                parentInsightNodeId:  id,
                label:                hypothesis.label ?? '',
                title:                hypothesis.title ?? '',
                statement:            hypothesis.statement ?? '',
                type:                 hypothesis.type ?? '',
                variables:            hypothesis.variables ?? [],
                directionality:       hypothesis.directionality ?? '',
                suggestedTest:        hypothesis.suggested_test ?? '',
                assumptionNotes:      hypothesis.assumption_notes ?? '',
                status:               'pending',
                isCustom:             false,
            });

            setHypStatus('idle');
        } catch (err) {
            console.error('[DataMode] fetchHypothesis failed:', err);
            setHypStatus('error');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className={`dm-node dm-node--insight ${meta.cls ?? ''} ${selected ? 'dm-node--selected' : ''}`}>
            <div className="dm-node__header">
                {meta.label}
            </div>

            <div className="dm-node__body">
                <div className="dm-node__label">{data.title}</div>
                <div className="dm-node__meta">{data.description}</div>

                {data.reason && (
                    <div className="dm-node__evidence">{data.reason}</div>
                )}

                {data.columns_involved?.length > 0 && (
                    <div className="dm-node__tags">
                        {data.columns_involved.map((col) => (
                            <span key={col} className="dm-node__tag">{col}</span>
                        ))}
                    </div>
                )}

                <InsightChart
                    type={data.type}
                    chart_type={resolvedChart}
                    columns={resolvedColumns}
                    spec={datasetSpec}
                />
            </div>

            <div className="dm-node__actions">
                <button
                    className="dm-node__action-btn dm-node__action-btn--primary"
                    onClick={handleGenerateHypothesis}
                    disabled={hypStatus === 'loading'}
                >
                    {hypStatus === 'loading' ? 'Generating...' :
                     hypStatus === 'error'   ? 'Retry'         :
                                              'Generate Hypothesis'}
                </button>
                <button
                    className="dm-node__action-btn dm-node__action-btn--ghost"
                    onClick={handleDismiss}
                    title="Remove this insight"
                >
                    Dismiss
                </button>
            </div>

            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}

export default InsightNode;
