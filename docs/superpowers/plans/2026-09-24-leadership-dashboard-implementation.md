# Leadership Scenario Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a polished, responsive, interactive product-performance dashboard with an immutable baseline, editable working data, named scenarios, comparisons, CSV exchange, and safe conclusions.

**Architecture:** Use a one-route React/Vite Site. Keep the product model and calculations in pure TypeScript, place browser persistence and CSV exchange behind a dataset store, and render the executive interface with Recharts and accessible UI primitives. Deploy as a static Site; no backend is required.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide icons, Vitest, browser localStorage, Sites hosting

## Global Constraints

- Preserve the original 20-product dataset as an immutable Baseline.
- Allow direct Working Copy edits and named scenarios without modifying Baseline.
- Show editorial conclusions only for untouched Baseline.
- Keep exactly four charts: revenue, gross profit, price versus volume, and unit economics.
- Use one responsive page with hover, keyboard, and touch interaction.
- Persist editable datasets locally and support CSV import/export.
- Publish a public Site URL after browser verification and a production build.

---

### Task 1: Initialize the Site and core product model

**Files:**
- Create: `dashboard/package.json`
- Create: `dashboard/src/lib/product-model.ts`
- Create: `dashboard/src/lib/product-model.test.ts`
- Create: `dashboard/src/data/baseline.ts`

**Interfaces:**
- Produces `ProductInput`, `ProductMetrics`, `deriveProductMetrics`, `summarizePortfolio`, and immutable `BASELINE_PRODUCTS`.

- [ ] Write focused tests proving revenue, gross profit, weighted margin, portfolio totals, and invalid-row omission.
- [ ] Run the focused tests and confirm the missing implementation fails.
- [ ] Implement the smallest pure calculation layer that passes those tests.
- [ ] Run the focused tests and typecheck.

### Task 2: Implement dataset state and scenario workflows

**Files:**
- Create: `dashboard/src/lib/dataset-store.ts`
- Create: `dashboard/src/lib/dataset-store.test.ts`
- Create: `dashboard/src/hooks/use-datasets.ts`

**Interfaces:**
- Produces baseline, working-copy, and named-scenario actions for select, edit, duplicate, rename, delete, reset, compare, import, export, and persistence.

- [ ] Write focused tests for baseline immutability, scenario duplication, reset, deletion, CSV validation, CSV serialization, and conclusion visibility.
- [ ] Run the tests and confirm the missing store fails.
- [ ] Implement the reducer/store and localStorage hook.
- [ ] Run the focused tests and typecheck.

### Task 3: Build the executive dashboard surface

**Files:**
- Create: `dashboard/src/App.tsx`
- Create: `dashboard/src/components/dashboard-controls.tsx`
- Create: `dashboard/src/components/metric-strip.tsx`
- Create: `dashboard/src/components/chart-card.tsx`
- Create: `dashboard/src/components/product-charts.tsx`
- Create: `dashboard/src/components/data-editor.tsx`
- Create: `dashboard/src/index.css`
- Create: `dashboard/public/favicon.svg`

**Interfaces:**
- Consumes the dataset hook and derived metrics.
- Produces the one-page responsive dashboard, four interactive charts, synchronized highlighting, baseline takeaways, custom-data notice, and editable data sheet.

- [ ] Apply the minimal executive visual system and first meaningful dashboard viewport.
- [ ] Add the four interactive charts with product-level tooltips and comparison styling.
- [ ] Add dataset controls and the editable product-data sheet.
- [ ] Add responsive layouts for 320, 375, 430, and desktop widths.
- [ ] Add visible validation, loss warnings, empty states, keyboard focus, reduced-motion handling, and methodology copy.

### Task 4: Add WebMCP and browser verification

**Files:**
- Create: `dashboard/src/hooks/use-webmcp.ts`
- Modify: `dashboard/src/App.tsx`

**Interfaces:**
- Produces structured tools to read the active portfolio, update product values, create a scenario, and reset the working copy through the same visible state actions.

- [ ] Register the minimal WebMCP tools with validation and cleanup.
- [ ] Run focused tests, typecheck, and production build.
- [ ] Open the local preview after the dashboard is coherent.
- [ ] Exercise scenario creation, product editing, comparison, conclusion hiding, reset, hover, and mobile layout in the browser.

### Task 5: Commit, publish, and verify the public URL

**Files:**
- Create: `dashboard/.openai/hosting.json`
- Modify: repository source and documentation as required by Sites registration.

**Interfaces:**
- Produces a committed GitHub source update and a public Sites deployment URL.

- [ ] Register the Site and save its project identity.
- [ ] Run the Sites workflow with the successful checks and production build.
- [ ] Save and deploy the resulting Site version publicly.
- [ ] Poll deployment status until it succeeds and returns a URL.
- [ ] Push the verified dashboard source and implementation plan to the `Mlanza-Locked` GitHub repository.
