import {
    ScatterChart, Scatter,
    BarChart, Bar, ErrorBar,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import {
    findCols, getScatterData, getGroupBarData,
    getHistogramData, getOutlierFence, getRegressionLine, getCorrelationMatrix,
} from './chartData';
import './charts.css';

const TICK        = { fontSize: 9, fill: '#94a3b8' };
const MARGIN      = { top: 6, right: 6, bottom: 4, left: -20 };
const SIG_COLOR   = '#10b981';
const NOT_COLOR   = '#f43f5e';

// ── Scatter + regression line ─────────────────────────────────────────────────

function ScatterResultViz({ col1, col2, significant }) {
    const scatterData = getScatterData(col1, col2);
    const linePoints  = getRegressionLine(scatterData);
    const lineColor   = significant ? SIG_COLOR : NOT_COLOR;
    if (!scatterData.length) return null;
    return (
        <ResponsiveContainer width="100%" height={150}>
            <ScatterChart margin={MARGIN}>
                <XAxis dataKey="x" type="number" tick={TICK} tickCount={4} />
                <YAxis dataKey="y" type="number" tick={TICK} tickCount={4} />
                <Tooltip contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                    formatter={(v) => v.toFixed(3)} labelFormatter={() => ''}
                    cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={scatterData} fill="#94a3b8" opacity={0.35} r={2} />
                {linePoints && (
                    <Scatter data={linePoints} fill="none"
                        line={{ stroke: lineColor, strokeWidth: 2 }}
                        shape={() => null} isAnimationActive={false} />
                )}
            </ScatterChart>
        </ResponsiveContainer>
    );
}

// ── Grouped bar + significance overlay ───────────────────────────────────────

function GroupedBarResultViz({ catCol, numCol, significant }) {
    const data     = getGroupBarData(catCol, numCol);
    const barColor = significant ? SIG_COLOR : NOT_COLOR;
    if (!data.length) return null;
    const maxMean = Math.max(...data.map((d) => d.mean));
    return (
        <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data} margin={{ ...MARGIN, bottom: 22 }}>
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#94a3b8' }}
                    angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={TICK} tickCount={4} domain={[0, maxMean * 1.3]} />
                <Tooltip contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                    formatter={(v, n) => [typeof v === 'number' ? v.toFixed(2) : v, n === 'mean' ? `Mean ${numCol.name}` : n]} />
                <Bar dataKey="mean" fill={barColor} opacity={0.8} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    <ErrorBar dataKey="std" width={4} strokeWidth={1.5} stroke={barColor} opacity={0.5} />
                </Bar>
                {significant && (
                    <ReferenceLine y={maxMean * 1.18} stroke={SIG_COLOR} strokeDasharray="4 2"
                        label={{ value: '* p < 0.05', position: 'insideRight', fontSize: 8, fill: SIG_COLOR }} />
                )}
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── Histogram + significance tint ────────────────────────────────────────────

function HistogramResultViz({ col, significant, markOutliers = false }) {
    const data  = getHistogramData(col);
    const fence = markOutliers ? getOutlierFence(col) : null;
    const color = significant ? SIG_COLOR : NOT_COLOR;
    if (!data.length) return null;
    return (
        <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data} margin={MARGIN} barCategoryGap="2%">
                <XAxis dataKey="name" tick={TICK} tickCount={5} />
                <YAxis tick={TICK} tickCount={4} />
                <Tooltip contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                    formatter={(v) => [v, 'Count']} labelFormatter={(l) => `≥ ${l}`} />
                <Bar dataKey="count" fill={fence != null ? NOT_COLOR : color}
                    opacity={0.75} radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
        </ResponsiveContainer>
    );
}

// ── Correlation heatmap (same as insight, with sig border) ───────────────────

function CorrelationHeatmapResult({ spec, significant }) {
    const result = getCorrelationMatrix(spec);
    if (!result) return null;
    const { cols, matrix } = result;
    const maxCols = 6;
    const names   = cols.slice(0, maxCols);
    const mat     = matrix.slice(0, maxCols).map((row) => row.slice(0, maxCols));
    const CELL = 34, PAD = 56;

    const cellColor = (r) => {
        if (r > 0) return `rgba(99,102,241,${(r * 0.85).toFixed(2)})`;
        if (r < 0) return `rgba(244,63,94,${(Math.abs(r) * 0.85).toFixed(2)})`;
        return 'rgba(148,163,184,0.12)';
    };

    return (
        <div className="ichart__heatmap-wrap"
            style={{ outline: significant ? `2px solid ${SIG_COLOR}` : `2px solid ${NOT_COLOR}`, borderRadius: 6, padding: 4 }}>
            <svg width={PAD + names.length * CELL} height={PAD + names.length * CELL} style={{ overflow: 'visible' }}>
                {names.map((name, i) => (
                    <text key={`cl-${i}`} x={PAD + i * CELL + CELL / 2} y={PAD - 4}
                        textAnchor="end" fontSize={8} fill="#94a3b8"
                        transform={`rotate(-35, ${PAD + i * CELL + CELL / 2}, ${PAD - 4})`}>
                        {name.length > 8 ? name.slice(0, 7) + '…' : name}
                    </text>
                ))}
                {names.map((name, i) => (
                    <text key={`rl-${i}`} x={PAD - 4} y={PAD + i * CELL + CELL / 2 + 3}
                        textAnchor="end" fontSize={8} fill="#94a3b8">
                        {name.length > 8 ? name.slice(0, 7) + '…' : name}
                    </text>
                ))}
                {mat.map((row, ri) => row.map((r, ci) => (
                    <g key={`${ri}-${ci}`}>
                        <rect x={PAD + ci * CELL} y={PAD + ri * CELL}
                            width={CELL - 1} height={CELL - 1} fill={cellColor(r)} rx={3} />
                        <text x={PAD + ci * CELL + CELL / 2} y={PAD + ri * CELL + CELL / 2 + 3}
                            textAnchor="middle" fontSize={7.5}
                            fill={Math.abs(r) > 0.4 ? '#fff' : '#64748b'}
                            fontWeight={ri === ci ? '700' : '400'}>
                            {r.toFixed(2)}
                        </text>
                    </g>
                )))}
            </svg>
        </div>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────

function ResultChart({ chart_type = '', columns = [], spec, significant, aiAssisted }) {
    if (!spec || !columns.length || !chart_type) return null;

    const { numeric, categorical } = findCols(spec, columns);

    const sigBadge = significant
        ? <span className="ichart__sig-badge ichart__sig-badge--yes">significant</span>
        : <span className="ichart__sig-badge ichart__sig-badge--no">not significant</span>;
    const aiBadge = aiAssisted
        ? <span className="ichart__sig-badge ichart__sig-badge--ai">AI estimate</span>
        : null;

    let chart = null;
    let label = null;

    switch (chart_type) {

        case 'scatter':
            if (numeric.length < 2) break;
            chart = <ScatterResultViz col1={numeric[0]} col2={numeric[1]} significant={significant} />;
            label = (
                <div className="ichart__axis-labels">
                    <span>{numeric[0].name}</span>
                    <span className="ichart__vs">vs</span>
                    <span>{numeric[1].name}</span>
                    {aiBadge}{sigBadge}
                </div>
            );
            break;

        case 'grouped_bar':
            if (!categorical[0] || !numeric[0]) break;
            chart = <GroupedBarResultViz catCol={categorical[0]} numCol={numeric[0]} significant={significant} />;
            label = (
                <div className="ichart__axis-labels">
                    <span>{categorical[0].name}</span>
                    <span className="ichart__vs">→</span>
                    <span>mean {numeric[0].name}</span>
                    {aiBadge}{sigBadge}
                </div>
            );
            break;

        case 'histogram':
            if (!numeric[0]) break;
            chart = <HistogramResultViz col={numeric[0]} significant={significant} />;
            label = (
                <div className="ichart__axis-labels">
                    <span>{numeric[0].name}</span>
                    {aiBadge}{sigBadge}
                </div>
            );
            break;

        case 'histogram_outlier':
            if (!numeric[0]) break;
            chart = <HistogramResultViz col={numeric[0]} significant={significant} markOutliers />;
            label = (
                <div className="ichart__axis-labels">
                    <span>{numeric[0].name}</span>
                    <span className="ichart__outlier-note">red = beyond Q3+1.5×IQR</span>
                    {aiBadge}{sigBadge}
                </div>
            );
            break;

        case 'correlation_heatmap':
            chart = <CorrelationHeatmapResult spec={spec} significant={significant} />;
            label = (
                <div className="ichart__axis-labels">
                    <span>pairwise Pearson r</span>
                    {aiBadge}{sigBadge}
                </div>
            );
            break;

        default:
            break;
    }

    if (!chart) return null;

    return (
        <div className="ichart ichart--result nodrag">
            {chart}
            {label}
        </div>
    );
}

export default ResultChart;
