import { getApiKey, OPENAI_API_URL } from '../../../constants/api';
import { OPENAI_MODEL } from '../../../constants/models';

const ANALYSIS_SUMMARY_SYSTEM_PROMPT = `You summarize progress in a node-based statistical analysis workflow.

Return a JSON object with exactly:
- headline: short title-like sentence
- overview: one short paragraph (1-2 sentences max)
- bullets: array of 2 to 4 short bullet lines

Rules:
- Keep it quick and scannable.
- Focus on what has been analyzed so far and what the current results suggest.
- Mention concrete insight/result themes when available.
- If there are accepted or statistically reliable results, say so plainly.
- If evidence is mixed or still preliminary, say so plainly.
- Do not mention code, tools, JSON, prompts, or implementation details.
- Do not exceed 4 bullets.
- Keep each bullet under 18 words.`;

function buildPrompt(analysisContext) {
    const resultLines = (analysisContext.results ?? []).map((result) => {
        const parts = [
            result.method || result.testType || 'Result',
            result.columns?.length ? `columns=${result.columns.join(', ')}` : null,
            result.significant ? 'statistically reliable' : 'not clearly reliable',
            result.aiAssisted ? 'AI-assisted' : null,
            result.summary ? `summary=${result.summary}` : null,
        ].filter(Boolean);
        return `- ${parts.join(' · ')}`;
    }).join('\n');

    const hypothesisLines = (analysisContext.hypotheses ?? []).map((hypothesis) => (
        `- ${hypothesis.label || hypothesis.title || 'Hypothesis'} · status=${hypothesis.status || 'pending'} · ${hypothesis.statement || hypothesis.title || ''}`
    )).join('\n');

    const insightLines = (analysisContext.insights ?? []).map((insight) => (
        `- ${insight.insightId || insight.title || 'Insight'} · ${insight.title || ''} · ${insight.description || ''}`
    )).join('\n');

    return `Analysis graph snapshot

Dataset:
- name: ${analysisContext.dataset?.name ?? 'Unknown dataset'}
- rows: ${analysisContext.dataset?.rowCount ?? 0}
- columns: ${analysisContext.dataset?.columnCount ?? 0}

Progress stats:
- insights: ${analysisContext.stats?.totalInsights ?? 0}
- hypotheses: ${analysisContext.stats?.totalHypotheses ?? 0}
- accepted hypotheses: ${analysisContext.stats?.acceptedHypotheses ?? 0}
- rejected hypotheses: ${analysisContext.stats?.rejectedHypotheses ?? 0}
- results: ${analysisContext.stats?.totalResults ?? 0}
- statistically reliable results: ${analysisContext.stats?.significantResults ?? 0}
- AI-assisted results: ${analysisContext.stats?.aiAssistedResults ?? 0}

Insights:
${insightLines || '- none yet'}

Hypotheses:
${hypothesisLines || '- none yet'}

Results:
${resultLines || '- none yet'}`;
}

export async function fetchAnalysisQuickSummary(analysisContext) {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: ANALYSIS_SUMMARY_SYSTEM_PROMPT },
                { role: 'user', content: buildPrompt(analysisContext) },
            ],
            temperature: 0.2,
            max_tokens: 320,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error?.message ?? `OpenAI error ${response.status}`);
    }

    const json = await response.json();
    const parsed = JSON.parse(json.choices[0].message.content);
    const bullets = Array.isArray(parsed.bullets)
        ? parsed.bullets.filter(Boolean).slice(0, 4)
        : [];

    return {
        headline: parsed.headline || 'Quick analysis summary',
        overview: parsed.overview || 'The analysis graph has started to build evidence across insights, hypotheses, and results.',
        bullets,
    };
}
