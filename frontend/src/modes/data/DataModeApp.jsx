import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './DataModeApp.css';
import DataCanvas from './components/DataCanvas';
import UploadPopup from './components/UploadPopup';
import ApiKeyModal from './components/ApiKeyModal';
import ChatPanel from './components/ChatPanel';
import useDataModeStore from './store/useDataModeStore';
import { parseCSV } from './utils/csvParser';
import { nodeTypes } from './nodes/index';
import { buildAnalysisContext } from './store/analysisContext';
import { fetchAnalysisQuickSummary } from './api/analysisSummaryService';
import { EXERCISE_SAMPLE } from '../../sampleDatasets';

function DataModeApp() {
    const [theme, setTheme]           = useState('light');
    const [uploadPos, setUploadPos]   = useState(null);
    const [dragOver, setDragOver]     = useState(false);
    const [sidebarOpen, setSidebar]   = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(220);
    const [summaryOpen, setSummaryOpen] = useState(false);
    const [summaryStatus, setSummaryStatus] = useState('idle');
    const [summaryData, setSummaryData] = useState(null);
    const [summaryError, setSummaryError] = useState('');
    const [summaryKey, setSummaryKey] = useState('');
    const resizing = useRef(false);
    const resizeStartX = useRef(0);
    const resizeStartW = useRef(0);

    const apiKey          = useDataModeStore((s) => s.apiKey);
    const datasetMetadata = useDataModeStore((s) => s.datasetMetadata);
    const addNode         = useDataModeStore((s) => s.addNode);
    const setDataset      = useDataModeStore((s) => s.setDataset);
    const resetGraph      = useDataModeStore((s) => s.resetGraph);
    const nodes           = useDataModeStore((s) => s.nodes);
    const insights        = useDataModeStore((s) => s.insights);
    const hypotheses      = useDataModeStore((s) => s.hypotheses);
    const results         = useDataModeStore((s) => s.results);

    const analysisSignature = useMemo(() => JSON.stringify({
        dataset: datasetMetadata?.name ?? '',
        nodeTypes: nodes.map((node) => `${node.id}:${node.type}`).sort(),
        insights: [...insights.values()].map((insight) => (
            `${insight.nodeId}:${insight.title}:${insight.type}`
        )).sort(),
        hypotheses: [...hypotheses.values()].map((hypothesis) => (
            `${hypothesis.nodeId}:${hypothesis.status}:${hypothesis.statement ?? hypothesis.title ?? ''}`
        )).sort(),
        results: [...results.values()].map((result) => (
            `${result.nodeId}:${result.method}:${result.significant}:${result.aiAssisted}:${result.pValue ?? ''}:${result.summary ?? ''}`
        )).sort(),
    }), [datasetMetadata?.name, nodes, insights, hypotheses, results]);

    const analysisStats = useMemo(
        () => buildAnalysisContext(useDataModeStore.getState()).stats,
        [analysisSignature]
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        return () => document.documentElement.removeAttribute('data-theme');
    }, [theme]);

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    const startResize = useCallback((e) => {
        e.preventDefault();
        resizing.current    = true;
        resizeStartX.current = e.clientX;
        resizeStartW.current = sidebarWidth;

        const onMove = (ev) => {
            if (!resizing.current) return;
            const delta = resizeStartX.current - ev.clientX;
            setSidebarWidth(Math.min(520, Math.max(160, resizeStartW.current + delta)));
        };
        const onUp = () => {
            resizing.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [sidebarWidth]);

    // Click-to-upload popup (kept as-is)
    const handlePaneClick = useCallback((event) => {
        if (!datasetMetadata) setUploadPos({ x: event.clientX, y: event.clientY });
    }, [datasetMetadata]);

    // Direct drag-and-drop onto the canvas
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        if (!datasetMetadata) setDragOver(true);
    }, [datasetMetadata]);

    const handleDragLeave = useCallback((e) => {
        // Only clear when leaving the shell entirely
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
    }, []);

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (!file) return;
        try {
            const { metadata, spec } = await parseCSV(file);
            resetGraph();
            setDataset({ metadata, spec });
            addNode({
                id:       `dataset-${Date.now()}`,
                type:     'dataset',
                position: { x: 400, y: 200 },
                data:     metadata,
            });
        } catch (err) {
            console.error('Drop parse error:', err);
        }
    }, [addNode, setDataset, resetGraph]);

    const handleUseSampleDataset = useCallback(async () => {
        if (!EXERCISE_SAMPLE?.appPath) return;
        try {
            const sampleUrl = `${import.meta.env.BASE_URL}${EXERCISE_SAMPLE.appPath}`.replace(/([^:]\/)\/+/g, '$1');
            const response = await fetch(sampleUrl);
            if (!response.ok) {
                throw new Error(`Sample fetch failed with ${response.status}`);
            }
            const csvText = await response.text();
            const sampleFile = new File([csvText], EXERCISE_SAMPLE.name, { type: 'text/csv' });
            const { metadata, spec } = await parseCSV(sampleFile);
            resetGraph();
            setDataset({
                metadata: {
                    ...metadata,
                    source: 'Built-in sample',
                },
                spec,
            });
            addNode({
                id:       `dataset-${Date.now()}`,
                type:     'dataset',
                position: { x: 400, y: 200 },
                data:     {
                    ...metadata,
                    source: 'Built-in sample',
                },
            });
            setUploadPos(null);
        } catch (err) {
            console.error('Sample dataset load error:', err);
        }
    }, [addNode, resetGraph, setDataset]);

    const handleToggleSummary = useCallback(async () => {
        if (summaryOpen) {
            setSummaryOpen(false);
            return;
        }

        setSummaryOpen(true);
        if (!datasetMetadata) return;

        if (summaryData && summaryKey === analysisSignature) return;

        setSummaryStatus('loading');
        setSummaryError('');
        try {
            const analysisContext = buildAnalysisContext(useDataModeStore.getState());
            const aiSummary = await fetchAnalysisQuickSummary(analysisContext);
            setSummaryData(aiSummary);
            setSummaryKey(analysisSignature);
            setSummaryStatus('idle');
        } catch (err) {
            console.error('[DataMode] fetchAnalysisQuickSummary failed:', err);
            setSummaryError(err?.message || 'Unable to generate summary right now.');
            setSummaryStatus('error');
        }
    }, [analysisSignature, datasetMetadata, summaryData, summaryKey, summaryOpen]);

    return (
        <div
            className={`dm-shell ${dragOver ? 'dm-shell--drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >

            {datasetMetadata && (
                <>
                    <button
                        className={`dm-analysis-summary-toggle ${summaryOpen ? 'dm-analysis-summary-toggle--open' : ''}`}
                        onClick={handleToggleSummary}
                        aria-label={summaryOpen ? 'Hide quick analysis summary' : 'Show quick analysis summary'}
                        title={summaryOpen ? 'Hide quick analysis summary' : 'Show quick analysis summary'}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="dm-analysis-summary-toggle__icon">
                            <path d="M4 18h16M6 14l3-3 3 2 5-6 1 1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="6" cy="14" r="1.4" fill="currentColor" />
                            <circle cx="9" cy="11" r="1.4" fill="currentColor" />
                            <circle cx="12" cy="13" r="1.4" fill="currentColor" />
                            <circle cx="17" cy="7" r="1.4" fill="currentColor" />
                        </svg>
                    </button>

                    {summaryOpen && (
                        <aside className="dm-analysis-summary-panel">
                            <div className="dm-analysis-summary-panel__header">
                                <div>
                                    <div className="dm-analysis-summary-panel__eyebrow">Quick Summary</div>
                                    <div className="dm-analysis-summary-panel__title">Analysis So Far</div>
                                </div>
                                <button
                                    className="dm-analysis-summary-panel__close"
                                    onClick={handleToggleSummary}
                                    aria-label="Close quick analysis summary"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="dm-analysis-summary-panel__stats">
                                <div className="dm-analysis-summary-panel__stat">
                                    <span className="dm-analysis-summary-panel__stat-value">{analysisStats.totalInsights}</span>
                                    <span className="dm-analysis-summary-panel__stat-label">Insights</span>
                                </div>
                                <div className="dm-analysis-summary-panel__stat">
                                    <span className="dm-analysis-summary-panel__stat-value">{analysisStats.totalHypotheses}</span>
                                    <span className="dm-analysis-summary-panel__stat-label">Hypotheses</span>
                                </div>
                                <div className="dm-analysis-summary-panel__stat">
                                    <span className="dm-analysis-summary-panel__stat-value">{analysisStats.totalResults}</span>
                                    <span className="dm-analysis-summary-panel__stat-label">Results</span>
                                </div>
                                <div className="dm-analysis-summary-panel__stat">
                                    <span className="dm-analysis-summary-panel__stat-value">{analysisStats.significantResults}</span>
                                    <span className="dm-analysis-summary-panel__stat-label">Reliable</span>
                                </div>
                            </div>

                            {summaryStatus === 'loading' && (
                                <div className="dm-analysis-summary-panel__state">
                                    Generating a quick analysis summary…
                                </div>
                            )}

                            {summaryStatus === 'error' && (
                                <div className="dm-analysis-summary-panel__state dm-analysis-summary-panel__state--error">
                                    {summaryError || 'Unable to generate summary right now.'}
                                </div>
                            )}

                            {summaryData && summaryStatus !== 'loading' && (
                                <div className="dm-analysis-summary-panel__body">
                                    <div className="dm-analysis-summary-panel__headline">{summaryData.headline}</div>
                                    <p className="dm-analysis-summary-panel__overview">{summaryData.overview}</p>
                                    {summaryData.bullets?.length > 0 && (
                                        <ul className="dm-analysis-summary-panel__bullets">
                                            {summaryData.bullets.map((bullet) => (
                                                <li key={bullet}>{bullet}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </aside>
                    )}
                </>
            )}

            {/* ── Right sidebar ───────────────────────────── */}
            <div
                className={`dm-sidebar ${sidebarOpen ? 'dm-sidebar--open' : ''}`}
                style={{ width: sidebarWidth }}
            >
                <button
                    className="dm-sidebar__tab"
                    onClick={() => setSidebar((o) => !o)}
                    aria-label={sidebarOpen ? 'Close panel' : 'Open panel'}
                >
                    <span className={`dm-sidebar__tab-chevron ${sidebarOpen ? 'dm-sidebar__tab-chevron--open' : ''}`}>‹</span>
                </button>

                {/* Drag handle — only useful while open */}
                {sidebarOpen && (
                    <div className="dm-sidebar__resize" onMouseDown={startResize} />
                )}

                <div className="dm-sidebar__body">

                    {/* ── Display ── */}
                    <div className="dm-theme-row" style={{ marginBottom: 16 }}>
                        <span className="dm-theme-label">Dark mode</span>
                        <button
                            className={`dm-theme-track ${theme === 'dark' ? 'dm-theme-track--on' : ''}`}
                            onClick={toggleTheme}
                            role="switch"
                            aria-checked={theme === 'dark'}
                            aria-label="Toggle dark mode"
                        >
                            <span className="dm-theme-knob" />
                        </button>
                    </div>

                    <div className="dm-sidebar__divider" style={{ marginTop: 0 }} />

                    {/* ── Chat ── */}
                    <div className="dm-chat">
                        <div className="dm-sidebar__section-label">Ask AI</div>
                        <ChatPanel />
                    </div>

                </div>
            </div>

            {/* ── Canvas ──────────────────────────────────── */}
            <main className="dm-canvas">
                <DataCanvas nodeTypes={nodeTypes} onPaneClick={handlePaneClick} />

                {/* Empty-state hint */}
                {!datasetMetadata && (
                    <div className="dm-canvas__empty-state">
                        <div className="dm-canvas__empty-title">
                            {dragOver ? 'Drop to upload' : 'Drag & drop a CSV, or click anywhere to upload'}
                        </div>
                        {!dragOver && (
                            <>
                                <div className="dm-canvas__empty-or" aria-hidden="true">OR</div>
                                <button
                                    type="button"
                                    className="dm-canvas__sample-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUseSampleDataset();
                                    }}
                                >
                                    Use Sample Dataset
                                </button>
                                <div className="dm-canvas__sample-copy">
                                    {EXERCISE_SAMPLE?.name} — {EXERCISE_SAMPLE?.desc}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Full-canvas drag overlay */}
                {dragOver && !datasetMetadata && (
                    <div className="dm-canvas__drag-overlay" />
                )}
            </main>

            {/* Upload popup (click path) */}
            {uploadPos && (
                <UploadPopup
                    position={uploadPos}
                    onClose={() => setUploadPos(null)}
                />
            )}

            {/* API key gate — shown until user enters their key */}
            {!apiKey && <ApiKeyModal />}

        </div>
    );
}

export default DataModeApp;
