/**
 * buildAnalysisContext(state) → AnalysisContext
 *
 * Pure function. Call fresh before any AI call — do not memoize.
 * Assembles the flat Zustand registries into a single clean object
 * suitable for injection into AI prompts.
 */

export function buildAnalysisContext(state) {
    const { dataset, insights, hypotheses, results } = state;

    // ── Insights ──────────────────────────────────────────────────────────
    const insightList = [...insights.values()].map((r) => ({
        nodeId:            r.nodeId,
        insightId:         r.insightId,
        title:             r.title,
        type:              r.type,
        description:       r.description,
        columnsInvolved:   r.columnsInvolved ?? [],
        reason:            r.reason ?? '',
        resolvedChartType: r.resolvedChartType ?? null,
    }));

    // ── Hypotheses ────────────────────────────────────────────────────────
    const hypothesisList = [...hypotheses.values()].map((r) => {
        const parentInsight = r.parentInsightNodeId
            ? insights.get(r.parentInsightNodeId)
            : null;
        return {
            nodeId:              r.nodeId,
            label:               r.label ?? '',
            title:               r.title ?? '',
            statement:           r.statement ?? '',
            type:                r.type ?? '',
            variables:           r.variables ?? [],
            directionality:      r.directionality ?? '',
            suggestedTest:       r.suggestedTest ?? '',
            assumptionNotes:     r.assumptionNotes ?? '',
            status:              r.status ?? 'pending',
            isCustom:            r.isCustom ?? false,
            parentInsightTitle:  parentInsight?.title ?? null,
        };
    });

    // ── Results ───────────────────────────────────────────────────────────
    const resultList = [...results.values()].map((r) => {
        const parentHypothesis = r.parentHypothesisNodeId
            ? hypotheses.get(r.parentHypothesisNodeId)
            : null;
        return {
            nodeId:              r.nodeId,
            method:              r.method ?? '',
            testType:            r.testType ?? '',
            columns:             r.columns ?? [],
            stat:                r.stat ?? null,
            pValue:              r.pValue ?? null,
            significant:         r.significant ?? false,
            summary:             r.summary ?? '',
            aiAssisted:          r.aiAssisted ?? false,
            hypothesisStatement: parentHypothesis?.statement ?? null,
        };
    });

    // ── Pre-computed aggregates ───────────────────────────────────────────
    const stats = {
        totalInsights:        insightList.length,
        totalHypotheses:      hypothesisList.length,
        acceptedHypotheses:   hypothesisList.filter((h) => h.status === 'accepted').length,
        rejectedHypotheses:   hypothesisList.filter((h) => h.status === 'rejected').length,
        totalResults:         resultList.length,
        significantResults:   resultList.filter((r) => r.significant).length,
        aiAssistedResults:    resultList.filter((r) => r.aiAssisted).length,
    };

    return {
        dataset:     dataset ?? null,
        insights:    insightList,
        hypotheses:  hypothesisList,
        results:     resultList,
        stats,
    };
}
