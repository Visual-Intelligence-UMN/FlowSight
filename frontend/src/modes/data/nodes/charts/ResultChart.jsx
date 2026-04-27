import {
    ScatterChart, Scatter,
    BarChart, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import {
    findCols,
    getScatterData,
    getHistogramData,
    getOutlierFence,
    getRegressionLine,
    getGroupPointData,
    getGroupDistributionSummary,
    getIqrOverlapSummary,
    getContingencyEvidence,
} from './chartData';
import { buildFallbackResultEvidence, EVIDENCE_KINDS } from '../../utils/evidenceModel';
import './charts.css';

const TICK = { fontSize: 9, fill: '#94a3b8' };
const MARGIN = { top: 6, right: 6, bottom: 4, left: -20 };
const SIG_COLOR = '#10b981';
const NOT_COLOR = '#f43f5e';
const ALPHA = 0.05;

function formatNumber(value, digits = 3) {
    if (value == null || Number.isNaN(Number(value))) return '–';
    return Number(value).toFixed(digits).replace(/\.?0+$/, '');
}

function PValueMeter({ pValue, significant }) {
    const numericP = Number(pValue);
    if (!Number.isFinite(numericP)) return null;

    const capped = Math.max(0, Math.min(0.1, numericP));
    const markerLeft = `${(capped / 0.1) * 100}%`;
    const alphaLeft = `${(ALPHA / 0.1) * 100}%`;

    return (
        <div className="rchart__evidence-strip">
            <div className="rchart__metric">
                <span className="rchart__metric-label">p-value</span>
                <span className={`rchart__metric-value ${significant ? 'rchart__metric-value--sig' : 'rchart__metric-value--ns'}`}>
                    {formatNumber(numericP, 4)}
                </span>
            </div>

            <div className="rchart__meter">
                <div className="rchart__meter-track" />
                <div className="rchart__meter-alpha" style={{ left: alphaLeft }}>
                    <span className="rchart__meter-alpha-line" />
                    <span className="rchart__meter-alpha-label">α=0.05</span>
                </div>
                <div className="rchart__meter-marker" style={{ left: markerLeft }}>
                    <span className={`rchart__meter-dot ${significant ? 'rchart__meter-dot--sig' : 'rchart__meter-dot--ns'}`} />
                </div>
                <div className="rchart__meter-labels">
                    <span>0</span>
                    <span>0.05</span>
                    <span>0.10+</span>
                </div>
            </div>
        </div>
    );
}

function ResultEvidenceHeader({ evidence }) {
    if (!evidence) return null;
    const detail = evidence.effectLabel && evidence.effectValue != null
        ? `${evidence.effectLabel} = ${formatNumber(evidence.effectValue, 3)}`
        : null;
    const note = evidence.notes?.[0] ?? null;

    if (!detail && !note) return null;

    return (
        <div className="rchart__evidence-copy">
            {detail && <span className="rchart__evidence-detail">{detail}</span>}
            {note && <span className="rchart__evidence-note">{note}</span>}
        </div>
    );
}

function ScatterResultViz({ col1, col2, significant, stat }) {
    const scatterData = getScatterData(col1, col2);
    const linePoints = getRegressionLine(scatterData);
    const lineColor = significant ? SIG_COLOR : NOT_COLOR;
    if (!scatterData.length) return null;

    return (
        <div className="rchart__panel">
            <div className="rchart__panel-copy">
                <span className="rchart__panel-title">Trend Evidence</span>
                <span className="rchart__panel-subtitle">
                    The fitted line shows the direction of the relationship. A tighter point cloud around it usually corresponds to a smaller p-value.
                </span>
            </div>
            <ResponsiveContainer width="100%" height={156}>
                <ScatterChart margin={MARGIN}>
                    <XAxis dataKey="x" type="number" tick={TICK} tickCount={4} name={col1.name} />
                    <YAxis dataKey="y" type="number" tick={TICK} tickCount={4} name={col2.name} />
                    <Tooltip
                        contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                        formatter={(v) => formatNumber(v, 3)}
                        labelFormatter={() => ''}
                        cursor={{ strokeDasharray: '3 3' }}
                    />
                    <Scatter data={scatterData} fill="#94a3b8" opacity={0.38} r={2.2} />
                    {linePoints && (
                        <Scatter
                            data={linePoints}
                            fill="none"
                            line={{ stroke: lineColor, strokeWidth: 2.2 }}
                            shape={() => null}
                            isAnimationActive={false}
                        />
                    )}
                </ScatterChart>
            </ResponsiveContainer>
            <div className="rchart__chart-note">
                <span>{col1.name}</span>
                <span className="ichart__vs">vs</span>
                <span>{col2.name}</span>
                <span className={`rchart__effect-pill ${significant ? 'rchart__effect-pill--sig' : 'rchart__effect-pill--ns'}`}>
                    r = {formatNumber(stat, 3)}
                </span>
            </div>
        </div>
    );
}

function GroupDifferenceViz({ catCol, numCol, significant, pValue }) {
    const points = getGroupPointData(catCol, numCol);
    const summary = getGroupDistributionSummary(catCol, numCol);
    if (!points.length || summary.length < 2) return null;

    const color = significant ? SIG_COLOR : NOT_COLOR;
    const yMax = Math.max(...points.map((p) => p.value), ...summary.map((s) => s.max));
    const yMin = Math.min(...points.map((p) => p.value), ...summary.map((s) => s.min));
    const meanDiff = summary.length >= 2 ? summary[0].mean - summary[1].mean : null;
    const overlap = getIqrOverlapSummary(summary);
    const width = 280;
    const height = 196;
    const leftPad = 30;
    const rightPad = 14;
    const topPad = 18;
    const bottomPad = 30;
    const plotWidth = width - leftPad - rightPad;
    const plotHeight = height - topPad - bottomPad;
    const bandWidth = 40;
    const capWidth = 10;
    const xForGroup = (index) => leftPad + plotWidth * (summary.length === 1 ? 0.5 : index / (summary.length - 1));
    const yForValue = (value) => {
        const span = Math.max(1, yMax - yMin);
        return topPad + plotHeight - ((value - yMin) / span) * plotHeight;
    };
    const ticks = Array.from({ length: 4 }, (_, i) => {
        const value = yMin + ((yMax - yMin) * i) / 3;
        return { value, y: yForValue(value) };
    });

    return (
        <div className="rchart__panel">
            <div className="rchart__panel-copy">
                <span className="rchart__panel-title">Overlap And Mean Shift</span>
                <span className="rchart__panel-subtitle">
                    Grey dots are individuals. The translucent box is the middle 50% of each group, the short center line is the median, and the colored whisker marks the mean 95% interval.
                </span>
            </div>
            <div className="rchart__groupviz-wrap">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="rchart__groupviz"
                >
                    {ticks.map((tick, i) => (
                        <g key={`tick-${i}`}>
                            <line
                                x1={leftPad}
                                x2={width - rightPad}
                                y1={tick.y}
                                y2={tick.y}
                                className="rchart__gridline"
                            />
                            <text x={leftPad - 4} y={tick.y + 3} textAnchor="end" className="rchart__axis-text">
                                {formatNumber(tick.value, 0)}
                            </text>
                        </g>
                    ))}

                    {summary.length >= 2 && (
                        <>
                            <line
                                x1={xForGroup(0)}
                                x2={xForGroup(1)}
                                y1={topPad - 2}
                                y2={topPad - 2}
                                stroke={color}
                                strokeDasharray="4 2"
                                strokeWidth="1.5"
                            />
                            <text
                                x={(xForGroup(0) + xForGroup(1)) / 2}
                                y={topPad - 5}
                                textAnchor="middle"
                                className="rchart__annotation-text"
                            >
                                p={formatNumber(pValue, 4)}
                            </text>
                        </>
                    )}

                    {summary.map((group, index) => {
                        const x = xForGroup(index);
                        const q1Y = yForValue(group.q1);
                        const q3Y = yForValue(group.q3);
                        const medianY = yForValue(group.median);
                        const minY = yForValue(group.min);
                        const maxY = yForValue(group.max);
                        const meanY = yForValue(group.mean);
                        const ciLowY = yForValue(group.ciLow);
                        const ciHighY = yForValue(group.ciHigh);

                        return (
                            <g key={group.name}>
                                <line x1={x} x2={x} y1={minY} y2={maxY} className="rchart__whisker" />
                                <line x1={x - capWidth / 2} x2={x + capWidth / 2} y1={minY} y2={minY} className="rchart__whisker" />
                                <line x1={x - capWidth / 2} x2={x + capWidth / 2} y1={maxY} y2={maxY} className="rchart__whisker" />

                                <rect
                                    x={x - bandWidth / 2}
                                    y={q3Y}
                                    width={bandWidth}
                                    height={Math.max(8, q1Y - q3Y)}
                                    rx={8}
                                    className="rchart__iqr-box"
                                />
                                <line
                                    x1={x - bandWidth / 2}
                                    x2={x + bandWidth / 2}
                                    y1={medianY}
                                    y2={medianY}
                                    className="rchart__median-line"
                                />

                                <line x1={x} x2={x} y1={ciLowY} y2={ciHighY} className="rchart__ci-line" />
                                <line x1={x - 6} x2={x + 6} y1={ciLowY} y2={ciLowY} className="rchart__ci-line" />
                                <line x1={x - 6} x2={x + 6} y1={ciHighY} y2={ciHighY} className="rchart__ci-line" />
                                <circle cx={x} cy={meanY} r="4.5" fill={color} />

                                {points
                                    .filter((point) => point.group === group.name)
                                    .map((point, pointIndex) => (
                                        <circle
                                            key={`${group.name}-${pointIndex}`}
                                            cx={leftPad + plotWidth * point.jitterX}
                                            cy={yForValue(point.value)}
                                            r="3"
                                            className="rchart__point"
                                        />
                                    ))}

                                <text x={x} y={height - 8} textAnchor="middle" className="rchart__axis-text">
                                    {group.name}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="rchart__chart-note">
                <span>{summary[0].name}</span>
                <span className="ichart__vs">vs</span>
                <span>{summary[1].name}</span>
                {overlap && <span className="rchart__overlap-note">{overlap.label}</span>}
                <span className={`rchart__effect-pill ${significant ? 'rchart__effect-pill--sig' : 'rchart__effect-pill--ns'}`}>
                    mean diff = {formatNumber(meanDiff, 2)}
                </span>
            </div>
        </div>
    );
}

function HistogramResultViz({ col, significant, markOutliers = false }) {
    const data = getHistogramData(col);
    const fence = markOutliers ? getOutlierFence(col) : null;
    const color = significant ? SIG_COLOR : NOT_COLOR;
    if (!data.length) return null;

    return (
        <div className="rchart__panel">
            <div className="rchart__panel-copy">
                <span className="rchart__panel-title">Distribution Evidence</span>
                <span className="rchart__panel-subtitle">
                    This view shows how values cluster. For outlier-focused results, bins beyond the fence are emphasized.
                </span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
                <BarChart data={data} margin={MARGIN} barCategoryGap="2%">
                    <XAxis dataKey="name" tick={TICK} tickCount={5} />
                    <YAxis tick={TICK} tickCount={4} />
                    <Tooltip
                        contentStyle={{ fontSize: 10, padding: '4px 8px' }}
                        formatter={(v) => [v, 'Count']}
                        labelFormatter={(l) => `≥ ${l}`}
                    />
                    <Bar
                        dataKey="count"
                        isAnimationActive={false}
                        radius={[2, 2, 0, 0]}
                        shape={(props) => {
                            const { x, y, width, height, index } = props;
                            const isOutlier = fence != null && data[index]?.x0 >= fence;
                            return (
                                <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    fill={isOutlier ? '#ef4444' : color}
                                    opacity={isOutlier ? 0.9 : 0.78}
                                    rx={2}
                                />
                            );
                        }}
                    />
                </BarChart>
            </ResponsiveContainer>
            <div className="rchart__chart-note">
                <span>{col.name}</span>
                {markOutliers && <span className="ichart__outlier-note">red = beyond Q3+1.5×IQR</span>}
            </div>
        </div>
    );
}

function ChiSquareEvidenceViz({ col1, col2, significant }) {
    const evidence = getContingencyEvidence(col1, col2);
    if (!evidence) return null;

    const { rows, cols, cells } = evidence;
    const CELL = 36;
    const PAD_LEFT = 64;
    const PAD_TOP = 30;
    const width = PAD_LEFT + cols.length * CELL;
    const height = PAD_TOP + rows.length * CELL + 8;
    const maxResidual = Math.max(...cells.map((cell) => Math.abs(cell.residual)), 0.01);
    const scale = (value) => Math.min(0.92, Math.abs(value) / maxResidual);

    const cellColor = (residual) => (
        residual >= 0
            ? `rgba(16,185,129,${scale(residual).toFixed(2)})`
            : `rgba(244,63,94,${scale(residual).toFixed(2)})`
    );

    return (
        <div className="rchart__panel">
            <div className="rchart__panel-copy">
                <span className="rchart__panel-title">Observed vs Expected</span>
                <span className="rchart__panel-subtitle">
                    Cells that deviate most from expectation contribute most strongly to the chi-square statistic.
                </span>
            </div>
            <div className="rchart__heatmap-wrap">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="rchart__heatmap-svg"
                >
                    {cols.map((name, index) => (
                        <text
                            key={`col-${name}`}
                            x={PAD_LEFT + index * CELL + CELL / 2}
                            y={PAD_TOP - 8}
                            textAnchor="middle"
                            fontSize={8}
                            fill="#94a3b8"
                        >
                            {name.length > 8 ? `${name.slice(0, 7)}…` : name}
                        </text>
                    ))}
                    {rows.map((name, index) => (
                        <text
                            key={`row-${name}`}
                            x={PAD_LEFT - 6}
                            y={PAD_TOP + index * CELL + CELL / 2 + 3}
                            textAnchor="end"
                            fontSize={8}
                            fill="#94a3b8"
                        >
                            {name.length > 11 ? `${name.slice(0, 10)}…` : name}
                        </text>
                    ))}
                    {cells.map((cell) => {
                        const x = PAD_LEFT + cols.indexOf(cell.col) * CELL;
                        const y = PAD_TOP + rows.indexOf(cell.row) * CELL;
                        return (
                            <g key={`${cell.row}-${cell.col}`}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={CELL - 2}
                                    height={CELL - 2}
                                    rx={4}
                                    fill={cellColor(cell.residual)}
                                    stroke={significant ? SIG_COLOR : NOT_COLOR}
                                    strokeOpacity={0.12}
                                />
                                <text
                                    x={x + CELL / 2 - 1}
                                    y={y + CELL / 2 - 2}
                                    textAnchor="middle"
                                    fontSize={8}
                                    fontWeight="700"
                                    fill={Math.abs(cell.residual) > maxResidual * 0.45 ? '#fff' : '#334155'}
                                >
                                    {cell.observed}
                                </text>
                                <text
                                    x={x + CELL / 2 - 1}
                                    y={y + CELL / 2 + 9}
                                    textAnchor="middle"
                                    fontSize={6.5}
                                    fill={Math.abs(cell.residual) > maxResidual * 0.45 ? 'rgba(255,255,255,0.85)' : '#64748b'}
                                >
                                    exp {formatNumber(cell.expected, 1)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
            <div className="rchart__chart-note">
                <span>{col1.name}</span>
                <span className="ichart__vs">×</span>
                <span>{col2.name}</span>
                <span className={`rchart__effect-pill ${significant ? 'rchart__effect-pill--sig' : 'rchart__effect-pill--ns'}`}>
                    larger residuals = stronger evidence
                </span>
            </div>
        </div>
    );
}

function ResultChart({
    chart_type = '',
    columns = [],
    spec,
    significant,
    aiAssisted,
    pValue,
    stat,
    method = '',
    testType = '',
    evidence = null,
}) {
    if (!spec || !columns.length) return null;

    const { numeric, categorical } = findCols(spec, columns);
    const resolvedEvidence = evidence ?? buildFallbackResultEvidence({
        hypothesisType: testType,
        chartType: chart_type,
        variables: columns,
        stat,
        pValue,
        significant,
        method,
    });
    const sigBadge = significant
        ? <span className="ichart__sig-badge ichart__sig-badge--yes">significant</span>
        : <span className="ichart__sig-badge ichart__sig-badge--no">not significant</span>;
    const aiBadge = aiAssisted
        ? <span className="ichart__sig-badge ichart__sig-badge--ai">AI estimate</span>
        : null;

    let chart = null;
    let label = null;

    if (resolvedEvidence.kind === EVIDENCE_KINDS.TREND && numeric.length >= 2) {
        chart = <ScatterResultViz col1={numeric[0]} col2={numeric[1]} significant={significant} stat={stat} />;
        label = (
            <div className="ichart__axis-labels">
                <span>{numeric[0].name}</span>
                <span className="ichart__vs">vs</span>
                <span>{numeric[1].name}</span>
                {aiBadge}
                {sigBadge}
            </div>
        );
    } else if (resolvedEvidence.kind === EVIDENCE_KINDS.GROUP_COMPARISON && categorical[0] && numeric[0]) {
        chart = <GroupDifferenceViz catCol={categorical[0]} numCol={numeric[0]} significant={significant} pValue={pValue} />;
        label = (
            <div className="ichart__axis-labels">
                <span>{categorical[0].name}</span>
                <span className="ichart__vs">→</span>
                <span>{numeric[0].name}</span>
                {aiBadge}
                {sigBadge}
            </div>
        );
    } else if (resolvedEvidence.kind === EVIDENCE_KINDS.CONTINGENCY_DEVIATION && categorical.length >= 2) {
        chart = <ChiSquareEvidenceViz col1={categorical[0]} col2={categorical[1]} significant={significant} />;
        label = (
            <div className="ichart__axis-labels">
                <span>{categorical[0].name}</span>
                <span className="ichart__vs">×</span>
                <span>{categorical[1].name}</span>
                {aiBadge}
                {sigBadge}
            </div>
        );
    } else if (resolvedEvidence.kind === EVIDENCE_KINDS.DISTRIBUTION_SHAPE && numeric[0]) {
        chart = <HistogramResultViz col={numeric[0]} significant={significant} />;
        label = (
            <div className="ichart__axis-labels">
                <span>{numeric[0].name}</span>
                {aiBadge}
                {sigBadge}
            </div>
        );
    } else if (resolvedEvidence.kind === EVIDENCE_KINDS.OUTLIER_SIGNAL && numeric[0]) {
        chart = <HistogramResultViz col={numeric[0]} significant={significant} markOutliers />;
        label = (
            <div className="ichart__axis-labels">
                <span>{numeric[0].name}</span>
                {aiBadge}
                {sigBadge}
            </div>
        );
    }

    if (!chart) return null;

    return (
        <div className="ichart ichart--result nodrag">
            <PValueMeter pValue={pValue} significant={significant} />
            <ResultEvidenceHeader evidence={resolvedEvidence} />
            {chart}
            {label}
        </div>
    );
}

export default ResultChart;
