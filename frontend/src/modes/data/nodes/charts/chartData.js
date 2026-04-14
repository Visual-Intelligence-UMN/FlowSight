/**
 * chartData.js — Pure data-preparation helpers for insight/result charts.
 * No React, no side effects — just transforms spec columns into chart-ready arrays.
 */

/** Find numeric and categorical columns by name from spec */
export function findCols(spec, colNames) {
    const cols = colNames
        .map((n) => spec.columns.find((c) => c.name === n))
        .filter(Boolean);
    const numeric     = cols.filter((c) => c.type === 'numeric');
    const categorical = cols.filter((c) => c.type !== 'numeric');
    return { cols, numeric, categorical };
}

/** Scatter plot data — subsample to maxPoints for perf */
export function getScatterData(col1, col2, maxPoints = 250) {
    const out = [];
    const n   = Math.min(col1.raw_values.length, col2.raw_values.length);
    for (let i = 0; i < n; i++) {
        const x = parseFloat(col1.raw_values[i]);
        const y = parseFloat(col2.raw_values[i]);
        if (!isNaN(x) && !isNaN(y)) out.push({ x, y });
    }
    if (out.length <= maxPoints) return out;
    const step = out.length / maxPoints;
    return Array.from({ length: maxPoints }, (_, i) => out[Math.floor(i * step)]);
}

/** Histogram data from pre-computed bins */
export function getHistogramData(col) {
    return (col.histogram ?? []).map((b) => ({
        name:  b.x0.toFixed(1),
        count: b.count,
        x0:    b.x0,
        x1:    b.x1,
    }));
}

/** Mean-per-group bar data with std deviation for error bars */
export function getGroupBarData(catCol, numCol, maxGroups = 7) {
    const groups = {};
    const n = Math.min(catCol.raw_values.length, numCol.raw_values.length);
    for (let i = 0; i < n; i++) {
        const g = catCol.raw_values[i];
        const v = parseFloat(numCol.raw_values[i]);
        if (!g || isNaN(v)) continue;
        if (!groups[g]) groups[g] = { vals: [] };
        groups[g].vals.push(v);
    }
    return Object.entries(groups)
        .map(([name, { vals }]) => {
            const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
            const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
            const std = Math.sqrt(variance);
            return { name, mean: +mean.toFixed(2), std: +std.toFixed(2), count: vals.length };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, maxGroups);
}

/** Returns true if a column is likely an identifier with no analytical meaning */
function isIdLike(col) {
    const name = col.name.toLowerCase();
    if (/^id$|_id$|^id_/.test(name) || name === 'index' || name === 'row') return true;
    // Nearly all values unique → likely a key column
    if (col.unique_count != null && col.stats?.mean != null) {
        const rowCount = col.raw_values?.length ?? col.unique_count;
        if (col.unique_count / rowCount > 0.95 && rowCount > 10) return true;
    }
    return false;
}

/** Pairwise Pearson r matrix for all numeric columns */
export function getCorrelationMatrix(spec) {
    const numCols = spec.columns.filter(
        (c) => c.type === 'numeric' && c.raw_values?.length && !isIdLike(c)
    );
    if (numCols.length < 2) return null;

    const pearson = (a, b) => {
        const n   = Math.min(a.length, b.length);
        const xs  = a.slice(0, n).map(Number).filter((v, i) => !isNaN(v) && !isNaN(Number(b[i])));
        const ys  = b.slice(0, n).map(Number).filter((v, i) => !isNaN(v) && !isNaN(Number(a[i])));
        const len = Math.min(xs.length, ys.length);
        if (len < 3) return 0;
        const mx = xs.reduce((s, v) => s + v, 0) / len;
        const my = ys.reduce((s, v) => s + v, 0) / len;
        let num = 0, dx2 = 0, dy2 = 0;
        for (let i = 0; i < len; i++) {
            const dx = xs[i] - mx, dy = ys[i] - my;
            num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
        }
        return dx2 && dy2 ? +(num / Math.sqrt(dx2 * dy2)).toFixed(3) : 0;
    };

    const matrix = numCols.map((row) =>
        numCols.map((col) => (row.name === col.name ? 1 : pearson(row.raw_values, col.raw_values)))
    );
    return { cols: numCols.map((c) => c.name), matrix };
}

/** Outlier fence: Q3 + 1.5 * IQR */
export function getOutlierFence(col) {
    const { q1, q3 } = col.stats ?? {};
    if (q1 == null || q3 == null) return null;
    return +(q3 + 1.5 * (q3 - q1)).toFixed(4);
}

/** Linear regression line — returns 30 evenly spaced {x, y} points */
export function getRegressionLine(scatterData) {
    const n = scatterData.length;
    if (n < 3) return null;
    const sumX  = scatterData.reduce((s, p) => s + p.x, 0);
    const sumY  = scatterData.reduce((s, p) => s + p.y, 0);
    const sumXY = scatterData.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = scatterData.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;
    const m    = (n * sumXY - sumX * sumY) / denom;
    const b    = (sumY - m * sumX) / n;
    const xMin = Math.min(...scatterData.map((p) => p.x));
    const xMax = Math.max(...scatterData.map((p) => p.x));
    return Array.from({ length: 30 }, (_, i) => {
        const x = xMin + (i / 29) * (xMax - xMin);
        return { x: +x.toFixed(4), y: +(m * x + b).toFixed(4) };
    });
}
