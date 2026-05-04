import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import useDataModeStore from '../store/useDataModeStore';
import { runTest, fetchTestResult, fetchResultNarrative } from '../api/statisticsService';
import { fetchAcceptedNextStepRecommendation, fetchRejectedAlternativeHypothesis } from '../api/followupService';
import { buildAnalysisContext } from '../store/analysisContext';
import { buildFallbackResultEvidence } from '../utils/evidenceModel';
import ResultChart from './charts/ResultChart';
import './nodes.css';

const RESULT_EDGE = {
    stroke: '#10b981',
    strokeWidth: 1.5,
    strokeDasharray: '4,3',
};

const HYPOTHESIS_EDGE = {
    stroke: '#a855f7',
    strokeWidth: 1.5,
    strokeDasharray: '5,3',
};

const NEXT_STEP_EDGE = {
    stroke: '#f97316',
    strokeWidth: 1.5,
    strokeDasharray: '5,3',
};

function ResultNode({ id, data, selected }) {
    const datasetSpec = useDataModeStore((s) => s.datasetSpec);
    const datasetMetadata = useDataModeStore((s) => s.datasetMetadata);
    const datasetDescription = useDataModeStore((s) => s.datasetDescription);
    const updateHypothesisStatus = useDataModeStore((s) => s.updateHypothesisStatus);
    const addResultRecord = useDataModeStore((s) => s.addResultRecord);
    const addHypothesisRecord = useDataModeStore((s) => s.addHypothesisRecord);
    const resultRecord = useDataModeStore((s) => s.results.get(id));
    const nodes = useDataModeStore((s) => s.nodes);
    const edges = useDataModeStore((s) => s.edges);
    const parentHypothesisId = data.parentHypothesisNodeId ?? resultRecord?.parentHypothesisNodeId ?? null;
    const parentHypothesisRecord = useDataModeStore((s) => (
        parentHypothesisId ? s.hypotheses.get(parentHypothesisId) : null
    ));
    const parentInsightId = parentHypothesisRecord?.parentInsightNodeId ?? null;
    const parentInsightRecord = useDataModeStore((s) => (
        parentInsightId ? s.insights.get(parentInsightId) : null
    ));
    const parentStatus = parentHypothesisRecord?.status ?? 'pending';
    const [rerunStatus, setRerunStatus] = useState('idle');
    const [rerunError, setRerunError] = useState('');
    const [followupStatus, setFollowupStatus] = useState('idle');
    const [followupError, setFollowupError] = useState('');
    const [siblingStatus, setSiblingStatus] = useState('idle');
    const [siblingError, setSiblingError] = useState('');

    const hasNextStepRecommendation = nodes.some(
        (node) => node.type === 'nextstep' && node.data?.sourceResultNodeId === id
    );
    const hasRejectedSibling = nodes.some(
        (node) => node.type === 'customhypothesis'
            && node.data?.sourceResultNodeId === id
            && node.data?.flowOrigin === 'reject_sibling'
    );

    const buildCurrentResultForAi = () => ({
        nodeId: id,
        method: data.method ?? resultRecord?.method ?? '',
        testType: data.testType ?? resultRecord?.testType ?? '',
        columns: data.columns ?? resultRecord?.columns ?? [],
        stat: data.stat ?? resultRecord?.stat ?? null,
        pValue: data.pValue ?? resultRecord?.pValue ?? null,
        significant: data.significant ?? resultRecord?.significant ?? false,
        summary: data.summary ?? resultRecord?.summary ?? '',
        aiAssisted: data.aiAssisted ?? resultRecord?.aiAssisted ?? false,
        evidence: data.evidence ?? resultRecord?.evidence ?? null,
    });

    const spawnResult = (result) => {
        const { nodes, edges, addNode, addEdge, allocateResultIdentifier } = useDataModeStore.getState();
        const thisNode = nodes.find((node) => node.id === id);
        const pos = thisNode?.position ?? { x: 400, y: 400 };
        const siblingCount = edges
            .filter((edge) => edge.source === (parentHypothesisId ?? id))
            .map((edge) => edge.target)
            .filter((targetId) => nodes.find((node) => node.id === targetId)?.type === 'result')
            .length;
        const resultId = `result-${parentHypothesisId ?? id}-${Date.now()}`;
        const identifier = allocateResultIdentifier();
        const evidence = result.evidence ?? buildFallbackResultEvidence({
            hypothesisType: data.testType ?? parentHypothesisRecord?.type ?? '',
            chartType: data.chart_type ?? '',
            variables: data.columns ?? [],
            stat: result.stat ?? null,
            pValue: result.pValue ?? null,
            significant: result.significant ?? false,
            method: result.method ?? data.method ?? '',
        });
        addNode({
            id: resultId,
            type: 'result',
            position: { x: pos.x + siblingCount * 360, y: pos.y + 300 },
            data: {
                ...result,
                identifier,
                parentHypothesisNodeId: parentHypothesisId,
                columns: data.columns ?? [],
                testType: result.testType ?? data.testType ?? parentHypothesisRecord?.type ?? '',
                chart_type: data.chart_type ?? '',
                evidence,
            },
        });
        addEdge({
            id: `e-${parentHypothesisId ?? id}-${resultId}`,
            source: parentHypothesisId ?? id,
            target: resultId,
            style: RESULT_EDGE,
        });
        addResultRecord({
            nodeId: resultId,
            parentHypothesisNodeId: parentHypothesisId,
            method: result.method ?? '',
            testType: result.testType ?? data.testType ?? '',
            columns: data.columns ?? [],
            stat: result.stat ?? null,
            pValue: result.pValue ?? null,
            significant: result.significant ?? false,
            summary: result.summary ?? '',
            aiAssisted: result.aiAssisted ?? false,
            evidence,
        });
    };

    const spawnAcceptedFollowup = ({ nextStep, hypothesis }) => {
        const {
            addNode,
            addEdge,
            allocateHypothesisIdentifier,
            allocateNextStepIdentifier,
        } = useDataModeStore.getState();
        const resultNode = nodes.find((node) => node.id === id);
        const basePos = resultNode?.position ?? { x: 400, y: 400 };
        const nextStepId = `nextstep-${id}-${Date.now()}`;
        const customHypId = `custom-hyp-${id}-${Date.now()}`;
        const label = hypothesis.label || allocateHypothesisIdentifier();
        const nextStepIdentifier = allocateNextStepIdentifier();

        addNode({
            id: nextStepId,
            type: 'nextstep',
            position: { x: basePos.x, y: basePos.y + 320 },
            data: {
                identifier: nextStepIdentifier,
                action: nextStep.action,
                rationale: nextStep.rationale,
                sourceResultNodeId: id,
            },
        });
        addEdge({
            id: `e-${id}-${nextStepId}`,
            source: id,
            target: nextStepId,
            style: NEXT_STEP_EDGE,
        });

        addNode({
            id: customHypId,
            type: 'customhypothesis',
            position: { x: basePos.x + 320, y: basePos.y + 560 },
            data: {
                identifier: label,
                sourceResultNodeId: id,
                flowOrigin: 'accepted_next_step',
                parentInsightNodeId: parentInsightId,
                initialRawText: hypothesis.statement ?? '',
                initialStatement: hypothesis.statement ?? '',
                initialVariables: hypothesis.variables ?? [],
                initialLabel: label,
                initialTitle: hypothesis.title ?? '',
                initialType: hypothesis.type ?? '',
                initialDirectionality: hypothesis.directionality ?? '',
                initialSuggestedTest: hypothesis.suggested_test ?? '',
                initialAssumptionNotes: hypothesis.assumption_notes ?? '',
            },
        });
        addEdge({
            id: `e-${nextStepId}-${customHypId}`,
            source: nextStepId,
            target: customHypId,
            style: HYPOTHESIS_EDGE,
        });

        addHypothesisRecord({
            nodeId: customHypId,
            parentInsightNodeId: parentInsightId,
            label,
            title: hypothesis.title ?? '',
            statement: hypothesis.statement ?? '',
            type: hypothesis.type ?? '',
            variables: hypothesis.variables ?? [],
            directionality: hypothesis.directionality ?? '',
            suggestedTest: hypothesis.suggested_test ?? '',
            assumptionNotes: hypothesis.assumption_notes ?? '',
            status: 'pending',
            isCustom: true,
        });
    };

    const spawnRejectedSibling = ({ hypothesis, rationale }) => {
        const {
            addNode,
            addEdge,
            allocateHypothesisIdentifier,
        } = useDataModeStore.getState();
        const insightNode = nodes.find((node) => node.id === parentInsightId);
        const basePos = insightNode?.position ?? { x: 400, y: 400 };
        const siblingCount = edges
            .filter((edge) => edge.source === parentInsightId)
            .map((edge) => edge.target)
            .filter((targetId) => {
                const node = nodes.find((candidate) => candidate.id === targetId);
                return node?.type === 'hypothesis' || node?.type === 'customhypothesis';
            })
            .length;

        const customHypId = `custom-hyp-${parentInsightId}-${Date.now()}`;
        const label = hypothesis.label || allocateHypothesisIdentifier();

        addNode({
            id: customHypId,
            type: 'customhypothesis',
            position: { x: basePos.x + siblingCount * 360, y: basePos.y + 280 },
            data: {
                identifier: label,
                sourceResultNodeId: id,
                flowOrigin: 'reject_sibling',
                parentInsightNodeId: parentInsightId,
                suggestionRationale: rationale,
                initialRawText: hypothesis.statement ?? '',
                initialStatement: hypothesis.statement ?? '',
                initialVariables: hypothesis.variables ?? [],
                initialLabel: label,
                initialTitle: hypothesis.title ?? '',
                initialType: hypothesis.type ?? '',
                initialDirectionality: hypothesis.directionality ?? '',
                initialSuggestedTest: hypothesis.suggested_test ?? '',
                initialAssumptionNotes: hypothesis.assumption_notes ?? '',
            },
        });
        addEdge({
            id: `e-${parentInsightId}-${customHypId}`,
            source: parentInsightId,
            target: customHypId,
            style: HYPOTHESIS_EDGE,
        });

        addHypothesisRecord({
            nodeId: customHypId,
            parentInsightNodeId: parentInsightId,
            label,
            title: hypothesis.title ?? '',
            statement: hypothesis.statement ?? '',
            type: hypothesis.type ?? '',
            variables: hypothesis.variables ?? [],
            directionality: hypothesis.directionality ?? '',
            suggestedTest: hypothesis.suggested_test ?? '',
            assumptionNotes: hypothesis.assumption_notes ?? '',
            status: 'pending',
            isCustom: true,
        });
    };

    const handleAccept = async (e) => {
        e.stopPropagation();
        if (!parentHypothesisId) return;
        const nextStatus = parentStatus === 'accepted' ? 'pending' : 'accepted';
        updateHypothesisStatus(parentHypothesisId, nextStatus);
        if (nextStatus !== 'accepted' || followupStatus === 'running' || hasNextStepRecommendation) return;

        setFollowupError('');
        setFollowupStatus('running');
        try {
            const state = useDataModeStore.getState();
            const label = state.allocateHypothesisIdentifier();
            const analysisContext = buildAnalysisContext(state);
            const followup = await fetchAcceptedNextStepRecommendation({
                label,
                metadata: datasetMetadata,
                description: datasetDescription,
                analysisContext,
                insight: parentInsightRecord
                    ? {
                        title: parentInsightRecord.title ?? '',
                        type: parentInsightRecord.type ?? '',
                        description: parentInsightRecord.description ?? '',
                        reason: parentInsightRecord.reason ?? '',
                        columns_involved: parentInsightRecord.columnsInvolved ?? [],
                    }
                    : null,
                hypothesis: parentHypothesisRecord
                    ? {
                        label: parentHypothesisRecord.label ?? '',
                        title: parentHypothesisRecord.title ?? '',
                        statement: parentHypothesisRecord.statement ?? '',
                        type: parentHypothesisRecord.type ?? '',
                        variables: parentHypothesisRecord.variables ?? [],
                        directionality: parentHypothesisRecord.directionality ?? '',
                        suggested_test: parentHypothesisRecord.suggestedTest ?? '',
                        assumption_notes: parentHypothesisRecord.assumptionNotes ?? '',
                    }
                    : null,
                result: buildCurrentResultForAi(),
            });
            spawnAcceptedFollowup(followup);
            setFollowupStatus('idle');
        } catch (err) {
            setFollowupError(err.message ?? 'Failed to generate the next-step recommendation.');
            setFollowupStatus('error');
        }
    };

    const handleReject = (e) => {
        e.stopPropagation();
        if (!parentHypothesisId) return;
        updateHypothesisStatus(parentHypothesisId, parentStatus === 'rejected' ? 'pending' : 'rejected');
    };

    const handleCreateSiblingHypothesis = async (e) => {
        e.stopPropagation();
        if (!parentInsightId || siblingStatus === 'running' || hasRejectedSibling) return;

        setSiblingError('');
        setSiblingStatus('running');
        try {
            const state = useDataModeStore.getState();
            const label = state.allocateHypothesisIdentifier();
            const analysisContext = buildAnalysisContext(state);
            const alternative = await fetchRejectedAlternativeHypothesis({
                label,
                metadata: datasetMetadata,
                description: datasetDescription,
                analysisContext,
                insight: parentInsightRecord
                    ? {
                        title: parentInsightRecord.title ?? '',
                        type: parentInsightRecord.type ?? '',
                        description: parentInsightRecord.description ?? '',
                        reason: parentInsightRecord.reason ?? '',
                        columns_involved: parentInsightRecord.columnsInvolved ?? [],
                    }
                    : null,
                hypothesis: parentHypothesisRecord
                    ? {
                        label: parentHypothesisRecord.label ?? '',
                        title: parentHypothesisRecord.title ?? '',
                        statement: parentHypothesisRecord.statement ?? '',
                        type: parentHypothesisRecord.type ?? '',
                        variables: parentHypothesisRecord.variables ?? [],
                        directionality: parentHypothesisRecord.directionality ?? '',
                        suggested_test: parentHypothesisRecord.suggestedTest ?? '',
                        assumption_notes: parentHypothesisRecord.assumptionNotes ?? '',
                    }
                    : null,
                result: buildCurrentResultForAi(),
            });
            spawnRejectedSibling(alternative);
            setSiblingStatus('idle');
        } catch (err) {
            setSiblingError(err.message ?? 'Failed to generate an alternative sibling hypothesis.');
            setSiblingStatus('error');
        }
    };

    const handleRerun = async (e) => {
        e.stopPropagation();
        if (!datasetSpec) return;
        setRerunError('');
        setRerunStatus('running');

        const hypothesis = {
            type: data.testType ?? parentHypothesisRecord?.type ?? '',
            suggested_test: data.method ?? parentHypothesisRecord?.suggestedTest ?? '',
            variables: data.columns ?? parentHypothesisRecord?.variables ?? [],
            statement: parentHypothesisRecord?.statement ?? '',
            chart_type: data.chart_type ?? '',
        };

        try {
            let result = runTest(hypothesis, datasetSpec);
            if (!result.supported) {
                result = await fetchTestResult(hypothesis, datasetMetadata, datasetSpec, datasetDescription);
            }
            try {
                result.narrative = await fetchResultNarrative(result, hypothesis, datasetMetadata, datasetSpec, datasetDescription);
            } catch {
                // renderer fallback stays available
            }
            spawnResult(result);
            setRerunStatus('idle');
        } catch (err) {
            setRerunError(err.message ?? 'Failed to rerun test.');
            setRerunStatus('error');
        }
    };

    return (
        <div className={`dm-node dm-node--result ${selected ? 'dm-node--selected' : ''}`}>
            <div className="dm-node__header">
                Result
                {data.identifier && <span className="dm-node__header-id">{data.identifier}</span>}
                {data.aiAssisted && (
                    <span className="res__ai-badge">AI-assisted</span>
                )}
            </div>

            <div className="dm-node__body">
                {data.method && (
                    <div className="res__method">{data.method}</div>
                )}

                <ResultChart
                    chart_type={data.chart_type}
                    columns={data.columns}
                    spec={datasetSpec}
                    significant={data.significant}
                    aiAssisted={data.aiAssisted}
                    pValue={data.pValue}
                    stat={data.stat}
                    method={data.method}
                    testType={data.testType}
                    evidence={data.evidence}
                    narrative={data.narrative}
                />

                {rerunStatus === 'error' && (
                    <div className="dm-node__error">{rerunError}</div>
                )}
                {followupStatus === 'error' && (
                    <div className="dm-node__error">{followupError}</div>
                )}
                {siblingStatus === 'error' && (
                    <div className="dm-node__error">{siblingError}</div>
                )}
            </div>

            <div className="dm-node__actions">
                <button
                    className={`dm-node__action-btn ${parentStatus === 'accepted' ? 'dm-node__action-btn--active-green' : 'dm-node__action-btn--ghost'}`}
                    onClick={handleAccept}
                    disabled={!parentHypothesisId || followupStatus === 'running'}
                    title={parentStatus === 'accepted' ? 'Undo accept' : 'Accept this hypothesis'}
                >
                    {followupStatus === 'running' ? 'Building next step…' : 'Accept'}
                </button>
                <button
                    className={`dm-node__action-btn ${parentStatus === 'rejected' ? 'dm-node__action-btn--active-red' : 'dm-node__action-btn--ghost'}`}
                    onClick={handleReject}
                    disabled={!parentHypothesisId}
                    title={parentStatus === 'rejected' ? 'Undo reject' : 'Reject this hypothesis'}
                >
                    Reject
                </button>
                {parentStatus === 'rejected' && (
                    <button
                        className="dm-node__action-btn dm-node__action-btn--ghost"
                        onClick={handleCreateSiblingHypothesis}
                        disabled={!parentInsightId || siblingStatus === 'running' || hasRejectedSibling}
                        title="Create another hypothesis under the same insight"
                    >
                        {hasRejectedSibling
                            ? 'Sibling added'
                            : siblingStatus === 'running'
                                ? 'Creating sibling…'
                                : 'Create sibling hypothesis'}
                    </button>
                )}
                <button
                    className="dm-node__action-btn dm-node__action-btn--primary"
                    onClick={handleRerun}
                    disabled={rerunStatus === 'running'}
                    title="Run this test again"
                >
                    {rerunStatus === 'running' ? 'Re-running…' : 'Re-run test'}
                </button>
            </div>

            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}

export default ResultNode;
