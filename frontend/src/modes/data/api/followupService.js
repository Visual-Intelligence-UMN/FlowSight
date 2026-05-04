import { getApiKey, OPENAI_API_URL } from '../../../constants/api';
import { OPENAI_MODEL } from '../../../constants/models';

const FOLLOWUP_SYSTEM_PROMPT = `You design the next analytical move after a hypothesis test in a node-based statistics workflow.

Return a JSON object.

For mode "accepted_next_step", return exactly:
- next_step: { action, rationale }
- hypothesis: {
    label,
    title,
    statement,
    type,
    variables,
    directionality,
    suggested_test,
    assumption_notes,
    visualization_suggestion,
    chart_type
  }

For mode "rejected_alternative", return exactly:
- rationale: short explanation of why this alternative is worth trying
- hypothesis: {
    label,
    title,
    statement,
    type,
    variables,
    directionality,
    suggested_test,
    assumption_notes,
    visualization_suggestion,
    chart_type
  }

Rules:
- Use only exact dataset column names that appear in the provided context.
- The new hypothesis must be distinct from the current tested hypothesis.
- For accepted_next_step, the new hypothesis should logically build on the accepted result.
- For rejected_alternative, the new hypothesis should be a sibling-worthy alternative rooted in the same parent insight, not just a restatement of the rejected one.
- Keep titles short.
- Keep the next-step action concise and practical.
- chart_type must be one of: "scatter", "grouped_bar", "histogram", "histogram_outlier", "correlation_heatmap", "category_frequency"
- Do not mention tools, code, JSON, or implementation details.`;

function buildFollowupPrompt({
    mode,
    label,
    metadata,
    description,
    analysisContext,
    insight,
    hypothesis,
    result,
}) {
    return JSON.stringify({
        mode,
        dataset: {
            name: metadata?.name ?? '',
            rows: metadata?.rows ?? null,
            description: description || '',
        },
        requestedHypothesisLabel: label,
        currentInsight: insight ?? null,
        currentHypothesis: hypothesis ?? null,
        currentResult: result ?? null,
        analysisContext,
    }, null, 2);
}

function normalizeHypothesis(raw, fallbackLabel) {
    if (!raw || typeof raw !== 'object') {
        throw new Error('No valid hypothesis returned from follow-up service.');
    }
    return {
        label: raw.label ?? fallbackLabel ?? '',
        title: raw.title ?? '',
        statement: raw.statement ?? '',
        type: raw.type ?? '',
        variables: Array.isArray(raw.variables) ? raw.variables : [],
        directionality: raw.directionality ?? '',
        suggested_test: raw.suggested_test ?? '',
        assumption_notes: raw.assumption_notes ?? '',
        visualization_suggestion: raw.visualization_suggestion ?? '',
        chart_type: raw.chart_type ?? '',
    };
}

async function postFollowupRequest(payload) {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: FOLLOWUP_SYSTEM_PROMPT },
                { role: 'user', content: payload },
            ],
            temperature: 0.3,
            max_tokens: 900,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error?.message ?? `OpenAI error ${response.status}`);
    }

    const json = await response.json();
    return JSON.parse(json.choices[0].message.content);
}

export async function fetchAcceptedNextStepRecommendation({
    label,
    metadata,
    description = '',
    analysisContext,
    insight,
    hypothesis,
    result,
}) {
    const parsed = await postFollowupRequest(buildFollowupPrompt({
        mode: 'accepted_next_step',
        label,
        metadata,
        description,
        analysisContext,
        insight,
        hypothesis,
        result,
    }));

    return {
        nextStep: {
            action: parsed?.next_step?.action ?? 'Investigate the next strongest follow-up question',
            rationale: parsed?.next_step?.rationale ?? '',
        },
        hypothesis: normalizeHypothesis(parsed?.hypothesis, label),
    };
}

export async function fetchRejectedAlternativeHypothesis({
    label,
    metadata,
    description = '',
    analysisContext,
    insight,
    hypothesis,
    result,
}) {
    const parsed = await postFollowupRequest(buildFollowupPrompt({
        mode: 'rejected_alternative',
        label,
        metadata,
        description,
        analysisContext,
        insight,
        hypothesis,
        result,
    }));

    return {
        rationale: parsed?.rationale ?? '',
        hypothesis: normalizeHypothesis(parsed?.hypothesis, label),
    };
}
