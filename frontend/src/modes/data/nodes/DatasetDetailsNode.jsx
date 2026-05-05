import { Handle, Position } from '@xyflow/react';
import './nodes.css';

function StatItem({ label, value }) {
    return (
        <div className="ddd__stat">
            <div className="ddd__stat-value">{value}</div>
            <div className="ddd__stat-label">{label}</div>
        </div>
    );
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function FocusLine({ line, columnNames = [] }) {
    if (!line) return null;
    if (!columnNames.length) return <>{line}</>;

    const sorted = [...columnNames].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`(${sorted.map(escapeRegExp).join('|')})`, 'g');
    const parts = line.split(pattern);

    return parts.map((part, index) => {
        if (!part) return null;
        const isColumn = sorted.includes(part);
        return isColumn
            ? <strong key={`${part}-${index}`}>{part}</strong>
            : <span key={`${part}-${index}`}>{part}</span>;
    });
}

function DatasetDetailsNode({ data, selected }) {
    const stats = data.stats ?? {};
    const focusLines = Array.isArray(data.focusLines) ? data.focusLines : [];
    const columnNames = Array.isArray(data.columnNames) ? data.columnNames : [];

    return (
        <div className={`dm-node dm-node--datasetdetails ${selected ? 'dm-node--selected' : ''}`}>
            <div className="dm-node__header">
                More Details
                {data.identifier && <span className="dm-node__header-id">{data.identifier}</span>}
            </div>
            <div className="dm-node__body">
                <div className="dm-node__label">Dataset health overview</div>
                <div className="ddd__stats-grid">
                    <StatItem label="Missing cells" value={(stats.missingCells ?? 0).toLocaleString()} />
                    <StatItem label="Rows with missing" value={(stats.rowsWithMissing ?? 0).toLocaleString()} />
                    <StatItem label="Duplicate rows" value={(stats.duplicateRows ?? 0).toLocaleString()} />
                    <StatItem label="Constant columns" value={String(stats.constantColumns ?? 0)} />
                    <StatItem label="Likely ID columns" value={String(stats.identifierLikeColumns ?? 0)} />
                    <StatItem label="Complete columns" value={String(stats.completeColumns ?? 0)} />
                </div>

                <div className="ddd__focus">
                    <div className="dsn__group-label">AI Focus</div>
                    {focusLines.length > 0 ? (
                        <ol className="ddd__focus-lines">
                            {focusLines.map((line, index) => (
                                <li key={`${index}-${line}`}>
                                    <FocusLine line={line} columnNames={columnNames} />
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <div className="dm-node__meta">No AI focus note available yet.</div>
                    )}
                </div>
            </div>

            <Handle type="target" position={Position.Left} />
        </div>
    );
}

export default DatasetDetailsNode;
