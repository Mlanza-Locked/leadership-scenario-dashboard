# Leadership Scenario Dashboard Design

## Goal

Build a polished, minimal, interactive single-page dashboard for internal leadership to compare product performance, edit the active dataset, and create scenarios while retaining the original baseline.

## Audience and use

The dashboard is for internal leadership making product, inventory, pricing, and merchandising decisions. It should be understandable without spreadsheet knowledge and work well on desktop and mobile.

## Headline

The baseline headline is:

> The drill/driver kit leads revenue and profit—but volume alone is not value.

When the active data is not the untouched baseline, replace this editorial headline with a neutral scenario heading that names the active dataset.

## Retained charts and baseline conclusions

Only these four charts are included. Do not include abandoned chart experiments or static chart images.

### Revenue by product

- Interactive horizontal ranking of all products by total revenue.
- Hover reveals product name, product price, volume sold, and total revenue.
- Baseline conclusion: The drill/driver kit generates roughly $50.4K, comfortably leading the portfolio. Protect its availability and attach related accessories.

### Gross profit by product

- Interactive column ranking of all products by total gross profit.
- Hover reveals product name, gross profit per unit, gross-margin percentage, and total gross profit.
- Baseline conclusion: Unit volume can be misleading—the hose clamp sells the most units but contributes the least total gross profit. Prioritize contribution, not volume alone.

### Price versus volume

- Interactive scatter plot with price on the horizontal axis and volume sold on the vertical axis.
- Hover identifies each product and its price, volume, revenue, and gross margin.
- Baseline conclusion: The portfolio divides into high-volume consumables and lower-volume equipment. These groups need different stocking and pricing strategies.

### Unit economics

- Interactive multi-series view of product cost, product price, and marginal revenue for all products.
- Hover displays all three values and gross profit per unit.
- Baseline conclusion: Floor fans, drill kits, and hand trucks generate the strongest profit per unit. Avoid unnecessary discounting on these products.

## Interaction model

### Dataset modes

- `Baseline`: immutable original 20-product dataset.
- `Working Copy`: editable copy that can replace the current working values without changing Baseline.
- `Scenario`: named duplicate of Baseline, Working Copy, or another scenario.

### Dataset controls

- Switch among Baseline, Working Copy, and named scenarios.
- Edit product name, product cost, product price, marginal revenue, and volume sold in a compact table or drawer.
- Create, rename, duplicate, and delete scenarios.
- Reset Working Copy or a scenario from Baseline.
- Import a CSV matching the five required fields.
- Export the active editable dataset as CSV.
- Persist Working Copy and named scenarios in browser storage.

### Comparison behavior

- A comparison toggle overlays or pairs the active editable dataset with Baseline.
- Rankings show active values and baseline deltas when comparison is enabled.
- Scatter and unit-economics charts visually distinguish Baseline from the active dataset.
- Selecting or hovering a product highlights the same product across every chart.

### Conclusion safety

- Show the four editorial conclusions only for the untouched Baseline.
- Hide editorial conclusions for Working Copy, scenarios, or imported data.
- Replace them with: `Custom data is active. Baseline conclusions are hidden to prevent stale interpretation.`
- Do not generate unsupported narrative conclusions from edited data.

## Page structure

1. Header with headline, concise context, and active-dataset status.
2. Compact control bar for dataset selection, edit, scenario creation, comparison, import, export, and reset.
3. Four high-level metrics: total revenue, total gross profit, weighted gross margin, and total units sold.
4. Four chart cards in a two-column desktop grid.
5. Editable product-data area in a drawer or sheet that does not interrupt the chart layout.
6. Methodology line at the bottom.

On mobile, all content becomes one vertical column. Controls wrap into touch-friendly rows, chart cards retain readable heights, and the data editor becomes a full-screen sheet.

## Visual direction

- Minimal executive dashboard with generous whitespace and restrained borders.
- Off-white background, charcoal text, deep navy primary accent, muted teal secondary accent, and amber only for warnings or changes.
- Use one modern sans-serif family with a compact type scale.
- Avoid gradients, decorative illustrations, excessive shadows, and oversized cards.
- Use real interactive charts with hover, focus, and touch tooltips.
- Preserve all 20 products without forcing unreadable labels; use truncation with full names in tooltips where needed.

## Data and calculations

The five editable fields are:

- product name
- product cost
- product price
- marginal revenue
- volume sold

Derived values are calculated in the dashboard:

- Total revenue = product price x volume sold
- Gross profit per unit = product price - product cost
- Total gross profit = gross profit per unit x volume sold
- Gross-margin percentage = gross profit per unit / product price
- Marginal-revenue total = marginal revenue x volume sold

## Validation and errors

- Require a non-empty product name and numeric cost, price, marginal revenue, and volume.
- Highlight invalid cells without discarding the user's edit.
- Permit prices below cost for scenario analysis, but show a visible loss warning.
- Omit incomplete rows from chart calculations and show how many rows were omitted.
- Reject CSV files missing required headers with a specific error message.
- Allow the user to cancel destructive scenario deletion; never modify Baseline.

## Methodology line

Display:

> Synthetic 20-product snapshot. Excludes taxes, returns, overhead, inventory limits, seasonality, and customer-level effects. No minimum sample-size threshold was applied.

## Technical shape

- Build a responsive client-side web application with no backend requirement.
- Keep data state, calculations, scenario persistence, CSV import/export, and chart presentation in separate modules.
- Use accessible semantic controls, keyboard navigation, focus states, and chart/table alternatives.
- Keep the application deployable as a static site.

## Verification

- Verify all four baseline conclusions against the source CSV.
- Test baseline, working-copy, and named-scenario flows.
- Confirm conclusions disappear for every non-baseline state and return only for untouched Baseline.
- Test edit, reset, duplicate, rename, delete, import, export, persistence, and baseline comparison.
- Test hover, keyboard focus, touch interaction, and cross-chart highlighting.
- Test mobile widths of 320, 375, and 430 pixels and a standard desktop width.
- Confirm invalid rows, loss-making scenarios, and malformed CSV files are handled visibly.
