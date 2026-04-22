# StatViz — Current System Structure & Details

> **Last Updated:** April 2026
> **Author:** Dipan Bag (bag00003@umn.edu)
> **Project:** UMN Capstone Project, Spring 2026
> **Hosted At:** GitHub Pages via `actions/deploy-pages`, route `/mindmapper/statviz`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [File & Directory Structure](#3-file--directory-structure)
4. [Tech Stack & Dependencies](#4-tech-stack--dependencies)
5. [Routing & Entry Points](#5-routing--entry-points)
6. [Zustand Store](#6-zustand-store)
7. [Component Architecture](#7-component-architecture)
8. [Node Types Reference](#8-node-types-reference)
9. [Charts System](#9-charts-system)
10. [API Services Layer](#10-api-services-layer)
11. [Statistics Engine](#11-statistics-engine)
12. [CSV Parser](#12-csv-parser)
13. [Layout Engine](#13-layout-engine)
14. [Theming System](#14-theming-system)
15. [Key Workflows](#15-key-workflows)
16. [Edge & Handle Conventions](#16-edge--handle-conventions)
17. [API Key Handling](#17-api-key-handling)
18. [Deployment](#18-deployment)

---

## 1. Project Overview

StatViz is a canvas-based, node-driven visual workspace for exploratory data analysis and hypothesis testing. Users upload a CSV file and receive an interactive graph where AI-generated insights, statistical hypotheses, and test results are represented as connected nodes on an infinite canvas.

The application is fully client-side — all CSV parsing, statistics, and AI calls happen in the browser. There is no backend.

**Core capabilities:**
- CSV upload with automatic type inference and column statistics
- AI-generated exploratory insights backed by inline charts
- One-click hypothesis generation from any insight
- In-browser statistical testing (Pearson, Welch t-test, Chi-square) with AI fallback
- Custom hypothesis workflow: free-text → AI refinement → test suggestions → run
- Dark/light theme, persistent OpenAI key via sessionStorage

---

## 2. High-Level Architecture

```
Browser
│
├── React Router (BrowserRouter, basename = /mindmapper/)
│   ├── /              → LandingPage
│   └── /statviz       → AppShell → DataModeApp
│
├── DataModeApp
│   ├── Manages: theme, CSV drag-drop, upload popup visibility
│   ├── Mounts: ApiKeyModal (gates the app until key is provided)
│   └── Mounts: DataCanvas (React Flow canvas)
│
├── Zustand Store (useDataModeStore)
│   └── Single source of truth: nodes, edges, dataset, insights, apiKey
│
├── DataCanvas (React Flow)
│   ├── Syncs nodes/edges bidirectionally with Zustand
│   ├── Runs Dagre auto-layout on graph changes
│   └── Renders 10 custom node types
│
└── API Services (OpenAI gpt-4o-mini, direct fetch)
    ├── insightService     — dataset → insights
    ├── hypothesisService  — insight → hypothesis
    ├── statisticsService  — hypothesis → test result (jstat or AI)
    ├── chartTypeService   — insight → chart type + exact columns
    ├── customHypothesisService — free text → refined hypothesis + test suggestions
    └── descriptionService — dataset → plain-language description
```

---

## 3. File & Directory Structure

```
mindmapper/
├── README.md
├── Current_System_Structure_And_Details.md   ← THIS FILE
├── docs/
├── .github/workflows/deploy.yml              ← CI/CD: build + deploy to GitHub Pages
└── frontend/
    ├── index.html                            ← HTML shell; SPA decode script for GH Pages routing
    ├── vite.config.js                        ← base: '/mindmapper/', react plugin
    ├── .env                                  ← Not used in prod (key comes from user at runtime)
    ├── public/
    │   └── 404.html                          ← Encodes path to ?p= for SPA routing on GH Pages
    └── src/
        ├── main.jsx                          ← Router setup; BrowserRouter with basename
        ├── App.jsx                           ← Thin wrapper
        ├── index.css                         ← Global: Inter font, box-sizing, root sizing
        │
        ├── app/
        │   ├── AppShell.jsx/.css             ← Full-viewport container for Data Mode
        │   └── DataModeApp.jsx/.css          ← Data Mode root: drag-drop, theme, canvas mount
        │
        ├── pages/
        │   └── LandingPage.jsx/.css          ← Marketing page: 3-column hero, feature list
        │
        ├── constants/
        │   ├── api.js                        ← OPENAI_API_URL, getApiKey()
        │   └── models.js                     ← OPENAI_MODEL = 'gpt-4o-mini'
        │
        ├── modes/
        │   └── data/
        │       ├── store/
        │       │   └── useDataModeStore.js   ← Zustand store (all Data Mode state)
        │       │
        │       ├── components/
        │       │   ├── DataCanvas.jsx        ← React Flow wrapper + Dagre layout engine
        │       │   ├── UploadPopup.jsx/.css  ← Click-triggered CSV upload dialog
        │       │   └── ApiKeyModal.jsx/.css  ← Blocking modal: user enters OpenAI key
        │       │
        │       ├── nodes/
        │       │   ├── DatasetNode.jsx
        │       │   ├── DatasetSummaryNode.jsx
        │       │   ├── ColumnNode.jsx
        │       │   ├── InsightNode.jsx
        │       │   ├── HypothesisNode.jsx
        │       │   ├── TestNode.jsx
        │       │   ├── ResultNode.jsx
        │       │   ├── InterpretationNode.jsx
        │       │   ├── NextStepNode.jsx
        │       │   ├── CustomHypothesisNode.jsx
        │       │   ├── ColumnChart.jsx       ← Inline charts per column (histogram, box, bar)
        │       │   ├── nodes.css             ← All node styles + CSS variables
        │       │   └── index.js              ← nodeTypes map passed to React Flow
        │       │
        │       ├── nodes/charts/
        │       │   ├── InsightChart.jsx      ← Chart renderer for insight nodes
        │       │   ├── ResultChart.jsx       ← Chart renderer for result nodes
        │       │   ├── chartData.js          ← Pure data-transform helpers
        │       │   └── charts.css
        │       │
        │       ├── api/
        │       │   ├── insightService.js
        │       │   ├── hypothesisService.js
        │       │   ├── statisticsService.js
        │       │   ├── chartTypeService.js
        │       │   ├── customHypothesisService.js
        │       │   └── descriptionService.js
        │       │
        │       └── utils/
        │           ├── csvParser.js          ← CSV → metadata + spec
        │           └── layoutGraph.js        ← Dagre layout helper
        │
        └── services/                         ← Legacy Q&A mode (Perplexity-based, unused)
```

---

## 4. Tech Stack & Dependencies

| Package | Role |
|---------|------|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| @xyflow/react | Infinite canvas, node graph, edge routing |
| Zustand | Global state management |
| Recharts | Chart components (scatter, bar, etc.) |
| jstat | In-browser statistical tests |
| @dagrejs/dagre | Hierarchical graph auto-layout |
| Vite | Build tool, dev server |

**External APIs (raw fetch, no SDK):**

| Service | Endpoint | Purpose |
|---------|----------|---------|
| OpenAI | `api.openai.com/v1/chat/completions` | All AI features |

Model used everywhere: `gpt-4o-mini` (defined in `constants/models.js`).

---

## 5. Routing & Entry Points

Routing is configured in `main.jsx` using `BrowserRouter` with `basename={import.meta.env.BASE_URL}`. The `BASE_URL` resolves to `/mindmapper/` in production (set via `vite.config.js`) and `/` in development.

**Routes:**
- `/` → `<LandingPage />` — marketing page with hero, feature descriptions, tutorial
- `/statviz` → `<AppShell />` → `<DataModeApp />` — the full application
- `*` → redirect to `/`

**GitHub Pages SPA routing:** GitHub Pages returns a 404 for deep routes. `public/404.html` encodes the path into a query string and redirects to `index.html`, which decodes and pushes the correct history entry before React Router mounts. This is a standard workaround for SPAs on GitHub Pages.

---

## 6. Zustand Store

**File:** `src/modes/data/store/useDataModeStore.js`

All Data Mode state lives here. Components access slices via selector functions, avoiding unnecessary re-renders.

**State shape:**

| Key | Type | Description |
|-----|------|-------------|
| `nodes` | `Node[]` | React Flow node array |
| `edges` | `Edge[]` | React Flow edge array |
| `selectedNode` | `Node \| null` | Currently selected node |
| `datasetMetadata` | `object \| null` | `{ name, rows, columns, source }` |
| `datasetSpec` | `object \| null` | Full parsed schema (see CSV Parser section) |
| `insightSuggestions` | `object[]` | Raw AI insight objects |
| `datasetDescription` | `string` | AI-generated or user-edited dataset description |
| `workflowStep` | `string` | Pipeline progress indicator |
| `apiKey` | `string` | OpenAI key; initialised from `sessionStorage` |

**Actions:**

| Action | Description |
|--------|-------------|
| `setNodes(fn\|arr)` / `setEdges(fn\|arr)` | Replace arrays or use updater function |
| `addNode(node)` / `addEdge(edge)` | Append to arrays |
| `removeNode(id)` | Deletes node and all connected edges |
| `updateNodeData(id, patch)` | Merges patch into `node.data` for a specific node |
| `setSelectedNode(node\|null)` | Track selection |
| `setDataset({ metadata, spec })` | Load parsed CSV result |
| `resetGraph()` | Clear nodes, edges, description |
| `setInsights(arr)` | Store AI insight array |
| `setDatasetDescription(text)` | Update description |
| `setApiKey(key)` | Save key to state and `sessionStorage('sv_openai_key')` |

---

## 7. Component Architecture

### DataModeApp

Entry point for the `/statviz` route. Owns the theme state (`light | dark`) which it applies as a `data-theme` attribute on `<html>`, triggering CSS variable re-resolution. Handles CSV ingestion: both drag-and-drop onto the canvas and click-to-upload via `UploadPopup`. On file drop, it calls `parseCSV()` and stores the result in Zustand via `setDataset()`, then creates the initial Dataset node.

Renders `ApiKeyModal` unconditionally — the modal gates itself based on whether `apiKey` is set in the store.

### DataCanvas

React Flow wrapper. Syncs nodes and edges bidirectionally with Zustand. Contains a `LayoutEngine` sub-component that watches node/edge count and a "summary collapsed" flag; when either changes it runs Dagre layout and pushes the updated positions back into Zustand.

The canvas accepts `nodeTypes` (the registered map from `nodes/index.js`) and `onPaneClick` callback from `DataModeApp`. It passes `fitView` after layout, giving a clean initial view on each graph change.

### ApiKeyModal

A blocking overlay (`position: fixed; inset: 0`) that appears when `apiKey` is empty. Has a password input and a "Start using StatViz" button (disabled until non-empty). Calls `setApiKey()` on submit. No dismiss — the user must enter a key. The rationale: the app makes no AI calls without a key, so blocking is correct.

### UploadPopup

A small positioned dialog triggered by clicking the empty canvas. Presents a file input for CSV selection as an alternative to drag-and-drop.

---

## 8. Node Types Reference

All 10 node types are registered in `nodes/index.js` and passed to React Flow as the `nodeTypes` prop. Every node imports `nodes.css` and uses the shared `.dm-node` structure: header strip + body + actions footer.

### DatasetNode
Created immediately after CSV upload. Displays filename, row count, column count. Has a "View Summary" button that calls `addNode` to create a `DatasetSummaryNode` and links them with an edge.

### DatasetSummaryNode
The main control hub. Renders differently depending on dataset size: "dashboard" mode (< 10 columns) shows inline per-column charts; "expanded" mode shows a scrollable list. Contains three action buttons:
- **Generate Insights** — calls `fetchInsights()` → spawns Insight nodes. Has a dedicated named source handle (`insights-out`) so edges originate from that button's position.
- **Custom Hypothesis** — spawns a `CustomHypothesisNode`. Has its own named source handle (`custom-hyp-out`).
- **Explore Columns** — currently no-op (placeholder).

The node also renders an AI-generated or user-editable dataset description.

### InsightNode
Represents one AI-generated insight. Header colour changes by insight type (teal = relationship, amber = group_difference, rose = distribution_issue, orange = outlier_candidate). Displays title, description, reason, and column tags.

On mount, fires a `useEffect` that calls `resolveChartType()` (AI) to determine both the chart type and the exact spec column names to use. This resolves even when `chart_type` was set at generation time, because column names in the insight might differ from the spec. Stores `resolvedChart` and `resolvedColumns` in local state and passes them to `InsightChart`.

Has a "Generate Hypothesis" button that calls `fetchHypothesis()` and spawns a `HypothesisNode`.

### HypothesisNode
Displays a testable hypothesis with label (H1, H2…), statement (click-to-edit inline), type badge, variable tags, suggested test, assumption notes. Status toggles between `pending | accepted | rejected`.

"Run Test" calls `runTest()` (jstat). If the test is unsupported, shows a consent banner offering AI fallback. Either path spawns a `ResultNode` via `spawnResult()`.

### CustomHypothesisNode
Three-phase UI, all rendered progressively (nothing disappears while AI is working):
1. **Free text input** + "Refine →" button → calls `refineHypothesis()` → refined statement appears below
2. **Refined statement** (click-to-edit) + "Suggest Tests →" button → calls `fetchTestSuggestions()` → test cards appear below
3. **Test selection cards** → "Run Test" → `runTest()` or AI fallback → `ResultNode` spawned

"New Hypothesis" resets all local state. "Dismiss" removes the node.

### ResultNode
Displays the outcome of a statistical test: method name, significance verdict, test statistic, p-value, plain-English summary. Renders a `ResultChart` with significance overlay (green = significant, red = not). Shows "AI-assisted" badge when result came from AI fallback.

### ColumnNode, TestNode, InterpretationNode, NextStepNode
Minimal nodes not yet heavily used in the current workflows. They exist in the type registry for potential future use.

---

## 9. Charts System

Charts are used in two contexts: inside `InsightNode` (exploratory, accent-coloured) and inside `ResultNode` (significance-overlaid, green/red).

### Chart Types

| `chart_type` value | Component | Requirements | Notes |
|--------------------|-----------|--------------|-------|
| `scatter` | `ScatterViz` / `ScatterResultViz` | 2 numeric columns | ResultViz adds regression line coloured by significance |
| `grouped_bar` | `GroupedBarViz` / `GroupedBarResultViz` | 1 categorical + 1 numeric | Shows mean ± std per group; Result adds `* p < 0.05` reference line |
| `histogram` | `HistogramViz` / `HistogramResultViz` | 1 numeric column | Result version tints bars by significance |
| `histogram_outlier` | `HistogramViz` with `markOutliers` | 1 numeric column | Bars beyond Q3+1.5×IQR coloured red |
| `category_frequency` | `CategoryFrequencyViz` | 1 categorical column | Counts per value; up to 8 bars |
| `correlation_heatmap` | `CorrelationHeatmap` / `CorrelationHeatmapResult` | 3+ numeric columns | Pure SVG; Result version adds a significance-coloured border |

### chartData.js

Pure data-transform helpers (no React, no side effects). Key functions:

- `findCols(spec, colNames)` — looks up column objects from spec by name array; splits into `numeric` and `categorical`
- `getScatterData(col1, col2, maxPoints=250)` — subsampled scatter points
- `getHistogramData(col)` — maps pre-computed histogram bins to chart format
- `getGroupBarData(catCol, numCol, maxGroups=7)` — computes mean + std per group
- `getOutlierFence(col)` — Q3 + 1.5 × IQR from stored `stats.q1/q3`
- `getRegressionLine(scatterData)` — 30 evenly-spaced points along OLS line
- `getCorrelationMatrix(spec)` — Pearson r matrix for all non-ID numeric columns

ID-like columns are automatically excluded from the correlation matrix using a heuristic: column name matches `/^id$|_id$|^id_/`, or > 95% of values are unique (indicating a key column).

### InsightChart

Receives `chart_type` and `columns` (both resolved by AI via `chartTypeService`). Since AI returns exact spec column names, `InsightChart` uses `findCols` with exact matching — no fuzzy logic needed. If `chart_type` is falsy (node still loading), renders nothing.

### ResultChart

Same structure as `InsightChart` but each chart variant also accepts `significant` (boolean) and `aiAssisted` (boolean) to apply significance overlays and badges.

---

## 10. API Services Layer

All services use raw `fetch` against the OpenAI chat completions endpoint. All requests use `response_format: { type: 'json_object' }` except `chartTypeService` which uses plain text.

The API key is read at call time via `getApiKey()` (not at module load), so key changes during a session take effect immediately.

ID-like columns (name matches `id`/`_id`/`index`/`row`, or high uniqueness ratio) are filtered from prompts in `insightService` and `chartTypeService` to avoid polluting AI suggestions with meaningless columns.

### insightService — `fetchInsights(metadata, spec, description?)`
Sends dataset schema (column names, types, stats) to OpenAI. Prompt instructs the model to return 3–5 exploratory insights, each with a `chart_type` field chosen from the supported list. Temperature 0.4, max 1200 tokens.

Returns `Insight[]`, each stamped with a unique `id`.

### hypothesisService — `fetchHypothesis(insight, metadata, spec, label, description?)`
Converts one insight into a testable hypothesis. Only sends stats for columns relevant to that insight (prompt size optimisation). Temperature 0.3, max 700 tokens.

Returns one `Hypothesis` object with all fields needed to run a test and display the node.

### chartTypeService — `resolveChartType(insight, spec)`
Called by `InsightNode` on mount. Sends insight metadata + full (filtered) column list to AI. AI returns `{ chart_type, columns }` where `columns` are exact names from the spec — this solves the mismatch between AI-generated column names in insight objects and the actual spec column names.

Temperature 0, max 60 tokens, JSON object format.

### customHypothesisService

**`refineHypothesis(text, metadata, spec, description?)`** — Turns informal user text into a formal hypothesis statement. Returns `{ statement, variables[] }`. Temperature 0.3, max 200 tokens.

**`fetchTestSuggestions(statement, variables, metadata, spec, description?)`** — Given a refined hypothesis, returns 2–3 test suggestions. Each has `test_name, type, description, variables[], chart_type`. Temperature 0.3, max 700 tokens.

### statisticsService

Described in the Statistics Engine section below.

### descriptionService
Generates a plain-language description of the dataset from its metadata and column stats. Used in `DatasetSummaryNode` as an AI-written summary that the user can also manually edit.

---

## 11. Statistics Engine

**File:** `src/modes/data/api/statisticsService.js`

### In-Browser Tests (jstat)

Three tests are implemented natively:

| Test | When dispatched | Notes |
|------|-----------------|-------|
| Pearson correlation | `type === 'association'` or test name matches `/pearson/i` | Requires ≥ 2 numeric columns; computes t-statistic and two-tailed p-value |
| Welch's two-sample t-test | `type === 'group_difference'` or test name matches `/t.?test/i` | Requires 1 categorical + 1 numeric; uses Welch–Satterthwaite df |
| Chi-square test of independence | `type === 'categorical_relationship'` or test name matches `/chi.?square/i` | Requires ≥ 2 categorical; builds full contingency table |

Significance threshold: α = 0.05.

### AI Fallback

When the test name matches patterns like `/spearman|mann.?whitney|wilcoxon|kruskal|anova/i`, or when column types don't satisfy the native test requirements, `runTest()` returns `{ supported: false }`. The calling node (HypothesisNode or CustomHypothesisNode) shows a consent banner; if the user approves, `fetchTestResult()` is called.

`fetchTestResult()` sends the hypothesis statement, suggested test, and relevant column stats to OpenAI, which estimates the result. The result is flagged `aiAssisted: true` and displayed with an amber "AI estimate" badge in the ResultNode.

### Result Shape

Both the native and AI paths return the same shape:
```
{
  supported:   boolean,
  method:      string,
  stat:        number | null,
  pValue:      number | null,
  significant: boolean,
  summary:     string,
  aiAssisted:  boolean
}
```

---

## 12. CSV Parser

**File:** `src/modes/data/utils/csvParser.js`

`parseCSV(file) → Promise<{ metadata, spec }>`

Reads the file as text, splits on newlines (handles `\r\n` and `\n`), uses the first row as headers. Detects delimiter by counting commas vs. semicolons in the header line.

**Type inference order (per column):**
1. Date — matches ISO (`2024-01-15`), US (`01/15/2024`), or longform (`January 15 2024`) patterns
2. Numeric — strips currency symbols, commas, percent signs and checks if result is a valid number
3. Categorical — default fallback

**Computed stats per column:**

For numeric columns: `mean, median, min, max, q1, q3, std`, plus a 10-bin histogram (`[{ x0, x1, count, portion }]`).

For categorical/datetime columns: `top_values` (up to 5 most frequent values with counts).

All columns also store: `missing_count` (empty/null/"NA" values), `unique_count`, `total_count`, and `raw_values` (the full string array, used by the statistics engine to run in-browser tests).

**Output metadata:** `{ name (filename), rows, columns (count), source: 'upload' }`

**Output spec:** `{ rowCount, columnCount, numericCount, categoricalCount, columns: Column[] }`

---

## 13. Layout Engine

**File:** `src/modes/data/utils/layoutGraph.js`

`layoutGraph(nodes, edges) → Node[]` — returns nodes with updated `position` fields.

Uses Dagre with direction `TB` (top-to-bottom). Node sizes are estimated at 300×200 (a conservative bounding box for all node types). Rank separation: 80px, node separation: 40px.

The layout is invoked by the `LayoutEngine` sub-component inside `DataCanvas`, which watches `nodes.length`, `edges.length`, and a "summary collapsed" boolean. Layout runs on any of these changing and the result is pushed back to Zustand via `setNodes`.

---

## 14. Theming System

Themes are implemented via CSS custom properties defined in `nodes.css` and `DataModeApp.css`. The active theme is set by `DataModeApp` writing a `data-theme` attribute to the `<html>` element. Two themes are defined: `light` (default) and `dark`.

Key variable categories: `--dm-bg-*` (backgrounds), `--dm-text-*` (text hierarchy), `--dm-accent*` (indigo accent colour system), `--dm-border-*`, `--dm-node-*` (node internals), `--dm-controls-*` (React Flow control overrides).

Node headers have per-type fixed background colours that are the same in both themes. The body, text, and background variables respond to theme.

---

## 15. Key Workflows

### Workflow A: Upload & Explore

1. User drags a CSV onto the canvas (or clicks to upload via `UploadPopup`)
2. `DataModeApp` calls `parseCSV()` → produces `metadata` and `spec`
3. Zustand: `setDataset()`, then `addNode` creates a Dataset node at the drop position
4. User clicks "View Summary" on the Dataset node
5. A `DatasetSummaryNode` is spawned and connected; Dagre re-layouts
6. Summary shows overall stats (row count, column distribution) and per-column charts (histograms for numeric, bar charts for categorical)

### Workflow B: Insight → Hypothesis → Test

1. User clicks "Generate Insights" on the Summary node
2. `DatasetSummaryNode` calls `fetchInsights(metadata, spec, description)` (OpenAI)
3. 3–5 Insight nodes are spawned, connected to the Summary node via the `insights-out` handle
4. Each InsightNode on mount calls `resolveChartType()` (AI) to determine chart type + exact columns, then renders the appropriate inline chart
5. User clicks "Generate Hypothesis" on any Insight node
6. `InsightNode` calls `fetchHypothesis()` (OpenAI) → a Hypothesis node is spawned
7. User reviews the hypothesis (optionally editing the statement inline), then clicks "Run [test]"
8. `HypothesisNode` calls `runTest()` (jstat). If unsupported, shows consent banner → user approves → `fetchTestResult()` (AI)
9. A Result node is spawned with p-value, significance verdict, plain-English summary, and result chart

### Workflow C: Custom Hypothesis

1. User clicks "Custom Hypothesis" on the Summary node
2. A `CustomHypothesisNode` is spawned and connected via the `custom-hyp-out` handle
3. User writes a hypothesis in plain language → clicks "Refine →"
4. `refineHypothesis()` (AI) → formal statement appears below the textarea (nothing hides)
5. User edits the statement if needed → clicks "Suggest Tests →"
6. `fetchTestSuggestions()` (AI) → 2–3 test option cards appear below
7. User selects a test card → clicks "Run Test"
8. Same run/fallback flow as Workflow B → Result node spawned

---

## 16. Edge & Handle Conventions

Named source handles on `DatasetSummaryNode`:
- `insights-out` — positioned under the "Generate Insights" button; edges to Insight nodes originate here
- `custom-hyp-out` — positioned under the "Custom Hypothesis" button; edges to CustomHypothesisNode originate here

Edge style conventions:

| Connection | Stroke colour | Style |
|------------|---------------|-------|
| Dataset → Summary | `#374151` (gray) | dashed `4,3` |
| Summary → Insight | `#6366f1` (indigo) | dashed `5,3` |
| Summary → CustomHypothesis | `#7c3aed` (violet) | dashed `5,3` |
| Insight → Hypothesis | `#a855f7` (purple) | dashed `5,3` |
| Hypothesis → Result | `#10b981` (green) | dashed `4,3` |
| CustomHypothesis → Result | `#10b981` (green) | dashed `4,3` |

All edges are `smoothstep` type (React Flow default).

---

## 17. API Key Handling

The OpenAI API key is entered by the user at session start via `ApiKeyModal`. It is stored in `sessionStorage` under the key `sv_openai_key` and mirrored in Zustand. It persists through page refreshes within the same tab session but is cleared when the tab closes.

`getApiKey()` in `constants/api.js` reads directly from `sessionStorage` — it does not read from `import.meta.env`. The `.env` file's `VITE_OPENAI_API_KEY` variable is not used in the production build. This ensures the key is never bundled.

All API service calls invoke `getApiKey()` at call time, so a key change mid-session takes effect immediately.

---

## 18. Deployment

The app is hosted on GitHub Pages at `https://dipanbag.github.io/mindmapper/statviz`.

**CI/CD pipeline** (`.github/workflows/deploy.yml`):
- Triggers on push to `main` and via manual `workflow_dispatch`
- Steps: checkout → Node 20 setup → `npm ci` → `npm run build` (Vite produces `frontend/dist/`) → `actions/configure-pages` → `actions/upload-pages-artifact` (path: `frontend/dist`) → `actions/deploy-pages@v4`

**Vite config:** `base: '/mindmapper/'` ensures all asset paths are relative to the subdirectory.

**SPA routing on GitHub Pages:** Direct navigation to `/mindmapper/statviz` returns a 404 from GitHub's static file server. `public/404.html` encodes the full path into a `?p=` query parameter and redirects to the root. `index.html` contains a script in `<head>` that decodes this query parameter and replaces the browser history entry before React Router mounts, restoring the intended route.

**BrowserRouter basename:** Set to `import.meta.env.BASE_URL` (which Vite resolves to `/mindmapper/` in production and `/` in development), so all React Router `<Link>` and `navigate()` calls are automatically prefixed correctly in both environments.
