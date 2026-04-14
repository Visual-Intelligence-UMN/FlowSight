/**
 * customHypothesisService.js
 *
 * Two exports:
 *   refineHypothesis(text, metadata, spec)  → { statement, variables }
 *   fetchTestSuggestions(statement, variables, metadata, spec) → suggestion[]
 */

import { getApiKey, OPENAI_API_URL } from '../../../constants/api';
import { OPENAI_MODEL } from '../../../constants/models';

// ── Schema helper ─────────────────────────────────────────────────────────────

function colLines(spec) {
    return spec.columns
        .filter((c) => {
            const name = c.name.toLowerCase();
            return !(/^id$|_id$|^id_/.test(name) || name === 'index' || name === 'row');
        })
        .map((c) => {
            const base = `  - ${c.name} (${c.type})`;
            if (c.type === 'numeric' && c.stats) {
                const { mean, min, max } = c.stats;
                return `${base} | mean=${mean}, min=${min}, max=${max}`;
            }
            if (c.top_values?.length) {
                return `${base} | values: ${c.top_values.slice(0, 4).map((tv) => tv.value).join(', ')}`;
            }
            return base;
        })
        .join('\n');
}

// ── Step 1: Refine free text into a proper hypothesis statement ───────────────

const REFINE_SYSTEM = `You are a statistical hypothesis designer. Turn the user's informal text into a single, precise, testable statistical hypothesis statement.

Return a JSON object with:
- statement: the refined hypothesis as a single sentence (e.g. "There is a significant positive association between X and Y")
- variables: array of exact column names from the schema that are most relevant`;

export async function refineHypothesis(text, metadata, spec, description = '') {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getApiKey()}` },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: REFINE_SYSTEM },
                { role: 'user', content: `User wrote: "${text}"\n\nDataset: "${metadata.name}"${description ? `\nContext: ${description}` : ''}\n\nSchema:\n${colLines(spec)}` },
            ],
            temperature: 0.3,
            max_tokens: 200,
            response_format: { type: 'json_object' },
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `OpenAI error ${response.status}`);
    }
    const json   = await response.json();
    const parsed = JSON.parse(json.choices[0].message.content);
    if (!parsed.statement) throw new Error('Could not refine hypothesis.');
    return { statement: parsed.statement, variables: parsed.variables ?? [] };
}

// ── Step 2: Suggest tests for the refined hypothesis ─────────────────────────

const SUGGEST_SYSTEM = `You are a statistical analysis assistant. Given a hypothesis statement and dataset schema, suggest 2-3 statistical tests.

Return a JSON object with key "suggestions" containing an array. Each item must have:
- test_name: exact test name (e.g. "Pearson correlation", "Welch's two-sample t-test", "Chi-square test of independence")
- type: one of "association", "group_difference", "categorical_relationship", "distribution_difference"
- description: one sentence explaining what this test will reveal
- variables: array of exact column names from the schema this test uses
- chart_type: one of "scatter", "grouped_bar", "histogram", "histogram_outlier", "correlation_heatmap", "category_frequency"

Rules: use only columns that exist in the schema. Prefer runnable tests: Pearson correlation, Welch t-test, Chi-square.`;

export async function fetchTestSuggestions(statement, variables, metadata, spec, description = '') {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getApiKey()}` },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: SUGGEST_SYSTEM },
                { role: 'user', content: `Hypothesis: "${statement}"\nKey variables: ${variables.join(', ')}\n\nDataset: "${metadata.name}"${description ? `\nContext: ${description}` : ''}\n\nSchema:\n${colLines(spec)}` },
            ],
            temperature: 0.3,
            max_tokens: 700,
            response_format: { type: 'json_object' },
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? `OpenAI error ${response.status}`);
    }
    const json    = await response.json();
    const parsed  = JSON.parse(json.choices[0].message.content);
    const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : Object.values(parsed).find((v) => Array.isArray(v)) ?? [];
    if (!suggestions.length) throw new Error('No test suggestions returned.');
    return suggestions;
}
