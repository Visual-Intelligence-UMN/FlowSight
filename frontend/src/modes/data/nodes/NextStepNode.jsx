import { Handle, Position } from '@xyflow/react';
import './nodes.css';

function NextStepNode({ data, selected }) {
    return (
        <div className={`dm-node dm-node--nextstep ${selected ? 'dm-node--selected' : ''}`}>
            <div className="dm-node__header">
                Next Step
                {data.identifier && <span className="dm-node__header-id">{data.identifier}</span>}
            </div>
            <div className="dm-node__body">
                <div className="dm-node__label">{data.action || 'No next step defined'}</div>
                {data.rationale && (
                    <div className="dm-node__meta">{data.rationale}</div>
                )}
            </div>
            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
}

export default NextStepNode;
