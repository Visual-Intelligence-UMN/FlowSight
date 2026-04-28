import {
    ScatterChart, Scatter,
    BarChart, Bar, ErrorBar,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    findCols, getScatterData, getHistogramData,
    getGroupBarData, getOutlierFence, getCorrelationMatrix,
} from './chartData';
import './charts.css';

const TICK  = { fontSize: 9, fill: '#94a3b8' };
const MARGIN = { top: 6, right: 6, bottom: 4, left: -20 };

// ── Scatter ───────────────────────────────────────────────────────────────────

function ScatterViz({ col1, col2, color }) {
    const data = getScatterData(col1, col2);
    if (!data.length) return null;
    return (
        <ResponsiveContainer width="100%" height={150}>
            <ScatterChart margin={MARGIN}>
                <XAxis dataKey="x" type="number" tick={TICK} tickCount={4} name={col1.name} />
                <YAxis dataKey="y" type="number" tick={TICK} tickCount={4} name={col2.name} />
                <Tooltip contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                    formatter={(v) => v.toFixed(3)} labelFormatter={() => ''}
                    cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={data} fill={color} opacity={0.55} r={2} />
            </ScatterChart>
        </ResponsiveContainer>
    );
}

// ── Grouped bar with error bars ───────────────────────────────────────────────

function GroupedBarViz({ catCol, numCol, color }) {
    const data = getGroupBarData(catCol, numCol);
    if (!data.length) return null;
    return (
        <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data} margin={{ ...MARGIN, bottom: 22 }}>
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8' }}
                    angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={TICK} tickCount={4} />
                <Tooltip contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                    formatter={(v, n) => [
                        typeof v === 'number' ? v.toFixed(2) : v,
                        n === 'mean' ? `Mean ${numCol.name}` : n
                    ]} />
                <Bar dataKey="mean" fill={color} opacity={0.8} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    <ErrorBar dataKey="std" width={4} strokeWidth={1.5} stroke={color} opacity={0.6} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── Histogram ─────────────────────────────────────────────────────────────────

function HistogramViz({ col, color, markOutliers = false }) {
    const data  = getHistogramData(col);
    const fence = markOutliers ? getOutlierFence(col) : null;
    if (!data.length) return null;
    return (
        <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data} margin={MARGIN} barCategoryGap="2%">
                <XAxis dataKey="name" tick={TICK} tickCount={5} />
                <YAxis tick={TICK} tickCount={4} />
                <Tooltip contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                    formatter={(v) => [v, 'Count']} labelFormatter={(l) => `≥ ${l}`} />
                <Bar
                    dataKey="count"
                    isAnimationActive={false}
                    radius={[2, 2, 0, 0]}
                    shape={(props) => {
                        const { x, y, width, height, index } = props;
                        const isOutlier = fence != null && data[index]?.x0 >= fence;
                        return (
                            <rect x={x} y={y} width={width} height={height}
                                fill={isOutlier ? '#ef4444' : color}
                                opacity={isOutlier ? 0.9 : 0.75}
                                rx={2} />
                        );
                    }}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── Category frequency bar ────────────────────────────────────────────────────

function CategoryFrequencyViz({ col, color }) {
    const groups = {};
    for (const v of (col.raw_values ?? [])) {
        if (v == null || v === '') continue;
        groups[v] = (groups[v] ?? 0) + 1;
    }
    const data = Object.entries(groups)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    if (!data.length) return null;
    return (
        <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data} margin={{ ...MARGIN, bottom: 22 }}>
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8' }}
                    angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={TICK} tickCount={4} />
                <Tooltip contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                    formatter={(v) => [v, 'Count']} />
                <Bar dataKey="count" fill={color} opacity={0.8} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── Correlation heatmap (pure SVG) ────────────────────────────────────────────

function CorrelationHeatmap({ spec }) {
    const result = getCorrelationMatrix(spec);
    if (!result) return null;
    const { cols, matrix } = result;
    const maxCols = 6;
    const names   = cols.slice(0, maxCols);
    const mat     = matrix.slice(0, maxCols).map((row) => row.slice(0, maxCols));

    const CELL = 34;
    const PAD  = 56; // left/top label padding
    const W    = PAD + names.length * CELL;
    const H    = PAD + names.length * CELL;

    const cellColor = (r) => {
        // indigo for positive, rose for negative, white near zero
        if (r > 0) return `rgba(99,102,241,${(r * 0.85).toFixed(2)})`;
        if (r < 0) return `rgba(244,63,94,${(Math.abs(r) * 0.85).toFixed(2)})`;
        return 'rgba(148,163,184,0.12)';
    };

    return (
        <div className="ichart__heatmap-wrap">
            <svg width={W} height={H} style={{ overflow: 'visible' }}>
                {/* Column labels */}
                {names.map((name, i) => (
                    <text
                        key={`cl-${i}`}
                        x={PAD + i * CELL + CELL / 2}
                        y={PAD - 4}
                        textAnchor="end"
                        fontSize={8}
                        fill="#94a3b8"
                        transform={`rotate(-35, ${PAD + i * CELL + CELL / 2}, ${PAD - 4})`}
                    >
                        {name.length > 8 ? name.slice(0, 7) + '…' : name}
                    </text>
                ))}
                {/* Row labels */}
                {names.map((name, i) => (
                    <text
                        key={`rl-${i}`}
                        x={PAD - 4}
                        y={PAD + i * CELL + CELL / 2 + 3}
                        textAnchor="end"
                        fontSize={8}
                        fill="#94a3b8"
                    >
                        {name.length > 8 ? name.slice(0, 7) + '…' : name}
                    </text>
                ))}
                {/* Cells */}
                {mat.map((row, ri) =>
                    row.map((r, ci) => (
                        <g key={`${ri}-${ci}`}>
                            <rect
                                x={PAD + ci * CELL}
                                y={PAD + ri * CELL}
                                width={CELL - 1}
                                height={CELL - 1}
                                fill={cellColor(r)}
                                rx={3}
                            />
                            <text
                                x={PAD + ci * CELL + CELL / 2}
                                y={PAD + ri * CELL + CELL / 2 + 3}
                                textAnchor="middle"
                                fontSize={7.5}
                                fill={Math.abs(r) > 0.4 ? '#fff' : '#64748b'}
                                fontWeight={ri === ci ? '700' : '400'}
                            >
                                {r.toFixed(2)}
                            </text>
                        </g>
                    ))
                )}
            </svg>
        </div>
    );
}

// ── Accent colours per insight type ──────────────────────────────────────────

const ACCENT = {
    relationship:       '#14b8a6',
    group_difference:   '#f59e0b',
    distribution_issue: '#f43f5e',
    outlier_candidate:  '#f97316',
};

// ── Main export ───────────────────────────────────────────────────────────────

function InsightChart({ type, chart_type, columns, spec }) {
    if (!spec || !columns?.length || !chart_type) return null;

    const { cols, numeric, categorical } = findCols(spec, columns);
    const color = ACCENT[type] ?? '#6366f1';

    switch (chart_type) {

        case 'scatter':
            if (numeric.length < 2) return null;
            return (
                <div className="ichart nodrag">
                    <ScatterViz col1={numeric[0]} col2={numeric[1]} color={color} />
                    <div className="ichart__axis-labels">
                        <span>{numeric[0].name}</span>
                        <span className="ichart__vs">vs</span>
                        <span>{numeric[1].name}</span>
                    </div>
                </div>
            );

        case 'grouped_bar': {
            const catCol = categorical[0];
            const numCol = numeric[0];
            if (!catCol || !numCol) return null;
            return (
                <div className="ichart nodrag">
                    <GroupedBarViz catCol={catCol} numCol={numCol} color={color} />
                    <div className="ichart__axis-labels">
                        <span>{catCol.name}</span>
                        <span className="ichart__vs">→</span>
                        <span>mean {numCol.name} ± std</span>
                    </div>
                </div>
            );
        }

        case 'histogram': {
            const col = numeric[0];
            if (!col) return null;
            return (
                <div className="ichart nodrag">
                    <HistogramViz col={col} color={color} />
                    <div className="ichart__axis-labels"><span>{col.name}</span></div>
                </div>
            );
        }

        case 'histogram_outlier': {
            const col = numeric[0];
            if (!col) return null;
            return (
                <div className="ichart nodrag">
                    <HistogramViz col={col} color={color} markOutliers />
                    <div className="ichart__axis-labels">
                        <span>{col.name}</span>
                        <span className="ichart__outlier-note">red = beyond Q3+1.5×IQR</span>
                    </div>
                </div>
            );
        }

        case 'category_frequency': {
            const col = categorical[0] ?? cols[0];
            if (!col) return null;
            return (
                <div className="ichart nodrag">
                    <CategoryFrequencyViz col={col} color={color} />
                    <div className="ichart__axis-labels"><span>{col.name} — frequency</span></div>
                </div>
            );
        }

        case 'correlation_heatmap':
            return (
                <div className="ichart nodrag">
                    <CorrelationHeatmap spec={spec} />
                    <div className="ichart__axis-labels">
                        <span>pairwise Pearson r</span>
                    </div>
                </div>
            );

        default:
            return null;
    }
}

export default InsightChart;
