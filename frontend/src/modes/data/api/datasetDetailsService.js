import { getApiKey, OPENAI_API_URL } from '../../../constants/api';
import { OPENAI_MODEL } from '../../../constants/models';

const DATASET_DETAILS_SYSTEM_PROMPT = `You are a data analysis assistant helping a user decide where to focus first in a dataset.

Return a JSON object with exactly:
- focus_lines: array of 2 or 3 short plain-English lines

Rules:
- Use exact column names when mentioning columns.
- Keep the total output very short.
- Focus on analysis priority, not data cleaning instructions only.
- Prefer columns that are likely informative for statistical analysis.
- Do not mention code, JSON, tools, or implementation details.`;

function buildPrompt(metadata, spec, summaryStats, description = '') {
    const columnLines = spec.columns.map((col) => {
        const pieces = [`${col.name} (${col.type})`];
        if (col.missing_count) pieces.push(`${col.missing_count} missing`);
        if (col.unique_count != null) pieces.push(`${col.unique_count} unique`);
        if (col.type === 'numeric' && col.stats) {
            pieces.push(`mean=${col.stats.mean}`);
            pieces.push(`range=${col.stats.min}-${col.stats.max}`);
        }
        if (col.top_values?.length) {
            pieces.push(`top=${col.top_values.slice(0, 3).map((tv) => tv.value).join(', ')}`);
        }
        return `- ${pieces.join(' · ')}`;
    }).join('\n');

    return `Dataset: "${metadata?.name ?? ''}" (${metadata?.rows ?? spec.rowCount ?? 0} rows)${description ? `\nContext: ${description}` : ''}

Dataset-level summary:
- ${summaryStats.rowCount.toLocaleString()} rows
- ${summaryStats.columnCount} columns
- ${summaryStats.numericCount} numeric, ${summaryStats.categoricalCount} categorical, ${summaryStats.datetimeCount} datetime
- ${summaryStats.missingCells.toLocaleString()} missing cells across ${summaryStats.columnsWithMissing} columns
- ${summaryStats.rowsWithMissing.toLocaleString()} rows contain at least one missing value
- ${summaryStats.duplicateRows.toLocaleString()} duplicate rows
- ${summaryStats.constantColumns} constant columns
- ${summaryStats.identifierLikeColumns} likely identifier columns

Column summaries:
${columnLines}`;
}

export async function fetchDatasetFocusLines(metadata, spec, summaryStats, description = '') {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: DATASET_DETAILS_SYSTEM_PROMPT },
                { role: 'user', content: buildPrompt(metadata, spec, summaryStats, description) },
            ],
            temperature: 0.2,
            max_tokens: 180,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error?.message ?? `OpenAI error ${response.status}`);
    }

    const json = await response.json();
    const parsed = JSON.parse(json.choices[0].message.content);
    const lines = Array.isArray(parsed.focus_lines) ? parsed.focus_lines.filter(Boolean).slice(0, 3) : [];
    if (!lines.length) throw new Error('No focus lines returned.');
    return lines;
}
