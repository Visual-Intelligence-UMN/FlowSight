import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import threeNodes from '../assets/backgrounds/threenodes-Photoroom.png';
import './LandingPage.css';

const steps = [
    {
        n: '01',
        title: 'Upload your dataset',
        body: 'Drag and drop a CSV file anywhere onto the canvas, or click to browse. StatViz parses your file in the browser — no data leaves your machine during this step. A root Dataset node appears on the canvas.',
    },
    {
        n: '02',
        title: 'Review the AI summary',
        body: 'An AI-generated one-line description of your dataset appears below the filename. Edit it freely — this summary is injected into every subsequent AI call as context, so a precise description leads to sharper insights.',
    },
    {
        n: '03',
        title: 'Explore the visual summary',
        body: 'Click "View Summary" on the Dataset node. A Summary node opens with a data completeness chart and per-column visualisations — histograms + box plots for numeric columns, donut charts + frequency tables for categorical ones.',
    },
    {
        n: '04',
        title: 'Generate AI insights',
        body: 'Click "Generate Insights" at the bottom of the Summary node. The AI returns 3–5 focused analytical insights grouped by type: Relationships, Group Differences, Distribution Issues, and Outlier Candidates — each as a colour-coded node.',
    },
    {
        n: '05',
        title: 'Generate & edit hypotheses',
        body: 'Click "Generate Hypothesis" on any Insight node. The AI produces a testable statistical hypothesis with suggested test, directionality, and assumption notes. Click the statement text to edit it directly.',
    },
    {
        n: '06',
        title: 'Run the test & interpret',
        body: 'Click "Run [test name]" on a Hypothesis node. Supported tests (Pearson, t-test, chi-square) run instantly via jstat. For unsupported tests, StatViz asks your permission before using AI to estimate the result. Accept or Reject the hypothesis once you\'ve reviewed.',
    },
];

const datasets = [
    {
        name: 'Exercise.csv',
        desc: '90 rows · 6 columns — exercise type, diet, pulse rate, duration.',
        url: 'https://drive.google.com/file/d/1fWepSyHsCabHABAt-SnGM-wJjQl9fEZH/view?usp=sharing',
    },
    {
        name: 'Tips.csv',
        desc: '244 rows · 7 columns — restaurant tips, bill size, day, time, party size.',
        url: 'https://drive.google.com/file/d/1L62GGkGioftbCsYj3xBM_ktffIVI1szU/view?usp=sharing',
    },
];

function LandingPage() {
    const navigate = useNavigate();
    const [showTutorial, setShowTutorial] = useState(false);

    return (
        <div className="lp">
            {/* ── Nav ── */}
            <nav className="lp__nav">
                <span className="lp__logo">StatViz</span>
                <button className="lp__nav-cta" onClick={() => navigate('/statviz')}>
                    Open App
                </button>
            </nav>

            {/* ── Hero row ── */}
            <main className="lp__hero">
                {/* Left */}
                <div className="lp__hero-left">
                    <div className="lp__eyebrow">Project StatViz</div>
                    <h1 className="lp__headline">
                        From raw data to<br />
                        <span className="lp__headline-accent">statistical insight</span>
                    </h1>
                    <p className="lp__tagline">
                        A visual, AI-assisted data analysis workbench. Upload a CSV,
                        explore column distributions, let the AI surface insights,
                        form and test statistical hypotheses — all on an interactive canvas.
                    </p>
                    <div className="lp__hero-actions">
                        <button className="lp__cta" onClick={() => navigate('/statviz')}>
                            Explore StatViz
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                                <polyline points="12 5 19 12 12 19"/>
                            </svg>
                        </button>
                        <button className="lp__secondary" onClick={() => setShowTutorial((v) => !v)}>
                            {showTutorial ? 'Hide tutorial' : 'How it works'}
                        </button>
                    </div>
                </div>

                {/* Middle — features */}
                <div className="lp__hero-mid">
                    <div className="lp__feature">
                        <div className="lp__feature-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <div>
                            <div className="lp__feature-title">Upload &amp; Explore</div>
                            <div className="lp__feature-body">Drop any CSV onto the canvas. StatViz parses it in-browser and shows distributions, completeness, and summary stats across all columns instantly.</div>
                        </div>
                    </div>
                    <div className="lp__feature">
                        <div className="lp__feature-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </div>
                        <div>
                            <div className="lp__feature-title">AI-Driven Insights</div>
                            <div className="lp__feature-body">Automatically surface relationships, group differences, distribution anomalies, and outlier candidates — each colour-coded and grouped by type.</div>
                        </div>
                    </div>
                    <div className="lp__feature">
                        <div className="lp__feature-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                        </div>
                        <div>
                            <div className="lp__feature-title">Hypothesis Generation</div>
                            <div className="lp__feature-body">One click on any insight generates a testable statistical hypothesis with suggested test, directionality, and assumption notes — fully editable.</div>
                        </div>
                    </div>
                    <div className="lp__feature">
                        <div className="lp__feature-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        </div>
                        <div>
                            <div className="lp__feature-title">Statistical Testing</div>
                            <div className="lp__feature-body">Run Pearson, t-test, and chi-square tests instantly via jstat. For unsupported tests, StatViz asks permission before using AI to estimate the result.</div>
                        </div>
                    </div>
                </div>

                {/* Right — image or tutorial */}
                <div className="lp__hero-right">
                    {!showTutorial ? (
                        <img
                            className="lp__preview-img"
                            src={threeNodes}
                            alt="StatViz canvas preview"
                        />
                    ) : (
                        <div className="lp__tutorial">
                            <ol className="lp__steps">
                                {steps.map((s) => (
                                    <li key={s.n} className="lp__step">
                                        <div className="lp__step-num">{s.n}</div>
                                        <div className="lp__step-content">
                                            <h4 className="lp__step-title">{s.title}</h4>
                                            <p className="lp__step-body">{s.body}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            </main>

            {/* ── Sample datasets ── */}
            <section className="lp__datasets-section">
                <div className="lp__datasets-inner">
                    <span className="lp__datasets-label">Try with a sample dataset</span>
                    <div className="lp__datasets">
                        {datasets.map((d) => (
                            <a key={d.name} className="lp__dataset-card" href={d.url} target="_blank" rel="noopener noreferrer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                </svg>
                                <div>
                                    <div className="lp__dataset-name">{d.name}</div>
                                    <div className="lp__dataset-desc">{d.desc}</div>
                                </div>
                                <svg className="lp__dataset-dl" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                            </a>
                        ))}
                    </div>
                    <span className="lp__datasets-note">Small, clean toy datasets for testing and demonstration purposes.</span>
                </div>
            </section>

            <footer className="lp__footer">
                <span>Project StatViz — Dipan Bag's Capstone Project - Spring 2026</span>
            </footer>
        </div>
    );
}

export default LandingPage;
