const DEFAULT_ALPHA = 0.05;

export const EVIDENCE_KINDS = {
    TREND: 'trend',
    GROUP_COMPARISON: 'group_comparison',
    CONTINGENCY_DEVIATION: 'contingency_deviation',
    DISTRIBUTION_SHAPE: 'distribution_shape',
    OUTLIER_SIGNAL: 'outlier_signal',
    MATRIX_RELATIONSHIP: 'matrix_relationship',
    UNKNOWN: 'unknown',
};

export function inferEvidenceKindFromChartType(chartType = '') {
    switch (chartType) {
        case 'scatter':
            return EVIDENCE_KINDS.TREND;
        case 'grouped_bar':
            return EVIDENCE_KINDS.GROUP_COMPARISON;
        case 'histogram':
            return EVIDENCE_KINDS.DISTRIBUTION_SHAPE;
        case 'histogram_outlier':
            return EVIDENCE_KINDS.OUTLIER_SIGNAL;
        case 'correlation_heatmap':
            return EVIDENCE_KINDS.MATRIX_RELATIONSHIP;
        default:
            return EVIDENCE_KINDS.UNKNOWN;
    }
}

export function inferEvidenceKindFromHypothesisType(type = '') {
    switch (type) {
        case 'association':
            return EVIDENCE_KINDS.TREND;
        case 'group_difference':
            return EVIDENCE_KINDS.GROUP_COMPARISON;
        case 'categorical_relationship':
            return EVIDENCE_KINDS.CONTINGENCY_DEVIATION;
        case 'distribution_difference':
            return EVIDENCE_KINDS.DISTRIBUTION_SHAPE;
        default:
            return EVIDENCE_KINDS.UNKNOWN;
    }
}

export function makeEvidence({
    kind = EVIDENCE_KINDS.UNKNOWN,
    renderHint = null,
    alpha = DEFAULT_ALPHA,
    effectLabel = '',
    effectValue = null,
    variables = [],
    notes = [],
    details = {},
} = {}) {
    return {
        version: 1,
        kind,
        renderHint,
        alpha,
        effectLabel,
        effectValue,
        variables,
        notes,
        details,
    };
}

export function buildFallbackResultEvidence({
    hypothesisType = '',
    chartType = '',
    variables = [],
    stat = null,
    pValue = null,
    significant = false,
    method = '',
} = {}) {
    const kind = inferEvidenceKindFromHypothesisType(hypothesisType) !== EVIDENCE_KINDS.UNKNOWN
        ? inferEvidenceKindFromHypothesisType(hypothesisType)
        : inferEvidenceKindFromChartType(chartType);

    let effectLabel = '';
    if (/pearson/i.test(method)) effectLabel = 'r';
    else if (/t-test/i.test(method)) effectLabel = 'mean diff';
    else if (/chi-square/i.test(method)) effectLabel = 'chi-square';
    else if (kind === EVIDENCE_KINDS.TREND) effectLabel = 'stat';
    else if (kind === EVIDENCE_KINDS.GROUP_COMPARISON) effectLabel = 'difference';
    else if (kind === EVIDENCE_KINDS.CONTINGENCY_DEVIATION) effectLabel = 'deviation';

    return makeEvidence({
        kind,
        renderHint: chartType || null,
        effectLabel,
        effectValue: stat,
        variables,
        details: {
            pValue,
            significant,
            method,
        },
    });
}
