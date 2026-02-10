import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import './AnswerNode.css';

/**
 * AnswerNode - Represents an LLM response on the canvas
 * Color-coded blue as per the proposal
 * Each bullet point can be hovered to reveal expand/sources/custom options
 */
function AnswerNode({ data, id }) {
  const [hoveredBullet, setHoveredBullet] = useState(null);
  
  // Parse content into bullet points if it's a string with newlines
  const bullets = Array.isArray(data.bullets) 
    ? data.bullets 
    : (data.label || '').split('\n').filter(line => line.trim());

  const handleExpand = (bulletIndex) => {
    if (data.onExpand) {
      data.onExpand(id, bulletIndex, bullets[bulletIndex]);
    }
  };

  const handleSources = (bulletIndex) => {
    if (data.onSources) {
      data.onSources(id, bulletIndex, bullets[bulletIndex]);
    }
  };

  const handleCustomQuery = (bulletIndex) => {
    if (data.onCustomQuery) {
      data.onCustomQuery(id, bulletIndex, bullets[bulletIndex]);
    }
  };

  return (
    <div className="answer-node">
      <div className="answer-node-header">
        <span className="answer-node-icon">💡</span>
        <span className="answer-node-label">Answer</span>
      </div>
      
      <div className="answer-node-content">
        {bullets.map((bullet, index) => (
          <div 
            key={index}
            className="answer-bullet-wrapper"
            onMouseEnter={() => setHoveredBullet(index)}
            onMouseLeave={() => setHoveredBullet(null)}
          >
            <div className="answer-bullet">
              <span className="bullet-marker">•</span>
              <span className="bullet-text">{bullet}</span>
            </div>
            
            {/* Hover menu - appears when bullet is hovered */}
            {hoveredBullet === index && (
              <div className="bullet-actions">
                <button 
                  className="bullet-action expand"
                  onClick={() => handleExpand(index)}
                  title="Expand this point"
                >
                  ↳ Expand
                </button>
                <button 
                  className="bullet-action sources"
                  onClick={() => handleSources(index)}
                  title="Find sources"
                >
                  🔍 Sources
                </button>
                <button 
                  className="bullet-action custom"
                  onClick={() => handleCustomQuery(index)}
                  title="Custom query"
                >
                  ✏️ Custom
                </button>
              </div>
            )}
            
            {/* Individual handle for each bullet point */}
            <Handle 
              type="source" 
              position={Position.Right}
              id={`bullet-${index}`}
              className="bullet-handle"
              style={{ 
                top: 'auto',
                right: '-8px',
                background: '#2196f3',
                width: '8px',
                height: '8px',
                opacity: hoveredBullet === index ? 1 : 0,
                transition: 'opacity 0.2s ease'
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Input handle - connects from query nodes */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="answer-handle"
      />
      
      {/* Output handle - for branching to new queries */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="answer-handle"
      />
    </div>
  );
}

export default AnswerNode;
