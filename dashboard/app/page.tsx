"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { BarChart3, Check, ChevronDown, Download, FileUp, PencilLine, Plus, RotateCcw, Save, SlidersHorizontal, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BASELINE_PRODUCTS, calculatePortfolio, compareProduct, parseProductsCsv, profitFor, revenueFor, serializeProductsCsv, unitProfitFor, type Product } from "@/lib/dashboard";

type Scenario = { id: string; name: string; products: Product[]; updatedAt: string };
type View = { kind: "baseline" } | { kind: "working" } | { kind: "scenario"; id: string };
type ModelTool = { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute(input: unknown): unknown | Promise<unknown> };
declare global { interface Document { modelContext?: { registerTool(tool: ModelTool, options?: { signal?: AbortSignal }): void | Promise<void> } } }

const STORAGE_KEY = "leadership-dashboard-state-v1";
const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const preciseMoney = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 });
const integer = new Intl.NumberFormat("en-CA");
const percent = new Intl.NumberFormat("en-CA", { style: "percent", maximumFractionDigits: 1 });
const cloneProducts = (products: Product[]) => products.map((product) => ({ ...product }));
const shortName = (name: string) => (name.length > 23 ? `${name.slice(0, 22)}…` : name);

function Delta({ value, format = money }: { value: number; format?: Intl.NumberFormat }) {
  const positive = value > 0;
  return <span className={value === 0 ? "delta neutral" : positive ? "delta positive" : "delta negative"}>{value === 0 ? "No change" : `${positive ? "+" : ""}${format.format(value)}`}</span>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="metric-card"><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>;
}

function ChartCard({ eyebrow, title, takeaway, children }: { eyebrow: string; title: string; takeaway: string; children: React.ReactNode }) {
  return <article className="chart-card"><div className="chart-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div><div className="chart-area">{children}</div><p className="takeaway"><Sparkles aria-hidden="true" />{takeaway}</p></article>;
}

function FinancialTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Record<string, unknown>; name?: string; value?: number; color?: string }> }) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return <div className="chart-tooltip"><strong>{String(datum.name ?? "Product")}</strong>{payload.filter((item) => typeof item.value === "number").map((item) => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><b>{item.name?.toLowerCase().includes("volume") ? integer.format(item.value ?? 0) : preciseMoney.format(item.value ?? 0)}</b></div>)}</div>;
}

export default function Home() {
  const [working, setWorking] = useState<Product[]>(() => cloneProducts(BASELINE_PRODUCTS));
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [view, setView] = useState<View>({ kind: "baseline" });
  const [selectedId, setSelectedId] = useState(BASELINE_PRODUCTS[9].id);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as { working?: Product[]; scenarios?: Scenario[] };
          if (parsed.working?.length) setWorking(parsed.working);
          if (Array.isArray(parsed.scenarios)) setScenarios(parsed.scenarios);
        }
      } catch { /* A corrupt local draft should not replace the verified baseline. */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ working, scenarios })); }, [hydrated, working, scenarios]);

  const activeScenario = view.kind === "scenario" ? scenarios.find((scenario) => scenario.id === view.id) : undefined;
  const products = view.kind === "baseline" ? BASELINE_PRODUCTS : view.kind === "working" ? working : activeScenario?.products ?? working;
  const viewName = view.kind === "baseline" ? "Baseline" : view.kind === "working" ? "Working copy" : activeScenario?.name ?? "Scenario";
  const isBaseline = view.kind === "baseline";
  const portfolio = useMemo(() => calculatePortfolio(products), [products]);
  const baselinePortfolio = useMemo(() => calculatePortfolio(BASELINE_PRODUCTS), []);
  const selected = products.find((product) => product.id === selectedId) ?? products[0];
  const baselineSelected = BASELINE_PRODUCTS.find((product) => product.id === selected.id) ?? BASELINE_PRODUCTS[0];
  const selectedDelta = compareProduct(selected, baselineSelected);

  const updateProducts = useCallback((next: Product[]) => {
    if (view.kind === "scenario") setScenarios((current) => current.map((scenario) => scenario.id === view.id ? { ...scenario, products: next, updatedAt: new Date().toISOString() } : scenario));
    else { setWorking(next); if (view.kind === "baseline") setView({ kind: "working" }); }
  }, [view]);

  const updateProduct = (id: string, field: keyof Pick<Product, "name" | "cost" | "price" | "marginalRevenue" | "volume">, value: string) => {
    const base = view.kind === "baseline" ? cloneProducts(BASELINE_PRODUCTS) : cloneProducts(products);
    const next = base.map((product) => {
      if (product.id !== id) return product;
      if (field === "name") return { ...product, name: value };
      const numberValue = Number(value);
      return { ...product, [field]: Number.isFinite(numberValue) ? Math.max(0, numberValue) : 0 };
    });
    updateProducts(next);
  };

  const saveScenario = useCallback((name: string, source = products) => {
    const cleanName = name.trim();
    if (!cleanName) throw new Error("Scenario name is required.");
    const scenario: Scenario = { id: `scenario-${Date.now()}`, name: cleanName, products: cloneProducts(source), updatedAt: new Date().toISOString() };
    setScenarios((current) => [...current, scenario]);
    setView({ kind: "scenario", id: scenario.id });
    setScenarioName(""); setSaveOpen(false); setNotice(`Saved “${cleanName}”.`);
    return scenario;
  }, [products]);

  const importCsvText = useCallback((csv: string) => {
    const imported = parseProductsCsv(csv);
    setWorking(imported); setView({ kind: "working" }); setSelectedId(imported[0].id); setNotice(`Imported ${imported.length} products into the working copy.`);
    return imported;
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: ModelTool) => Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    void register({ name: "read_dashboard_summary", title: "Read dashboard summary", description: "Read the active dataset name and portfolio totals without changing the dashboard.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ dataset: viewName, productCount: products.length, revenue: portfolio.revenue, grossProfit: portfolio.profit, margin: portfolio.margin, units: portfolio.units }) });
    void register({ name: "stage_product_changes", title: "Stage product changes", description: "Update one product in the working copy and show its comparison with the immutable baseline.", inputSchema: { type: "object", properties: { productId: { type: "string" }, cost: { type: "number", minimum: 0 }, price: { type: "number", minimum: 0 }, marginalRevenue: { type: "number", minimum: 0 }, volume: { type: "number", minimum: 0 } }, required: ["productId"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: (input) => {
      const values = input as Partial<Product> & { productId?: string };
      const existing = working.find((product) => product.id === values.productId);
      if (!existing) throw new Error("Unknown productId.");
      const changed = { ...existing, ...Object.fromEntries(Object.entries(values).filter(([key, value]) => key !== "productId" && value !== undefined)) } as Product;
      if (changed.price < changed.cost) throw new Error("Price must be at least cost.");
      setWorking(working.map((product) => product.id === existing.id ? changed : product)); setView({ kind: "working" }); setSelectedId(existing.id);
      const baseline = BASELINE_PRODUCTS.find((product) => product.id === existing.id)!;
      return { dataset: "Working copy", product: changed.name, comparison: compareProduct(changed, baseline) };
    } });
    void register({ name: "save_dashboard_scenario", title: "Save dashboard scenario", description: "Save the active dataset as a named scenario and switch the visible dashboard to it.", inputSchema: { type: "object", properties: { name: { type: "string", minLength: 1, maxLength: 80 } }, required: ["name"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: (input) => { const name = (input as { name?: string }).name; if (!name?.trim()) throw new Error("Scenario name is required."); const scenario = saveScenario(name); return { id: scenario.id, name: scenario.name, productCount: scenario.products.length }; } });
    return () => lifecycle.abort();
  }, [portfolio, products, saveScenario, viewName, working]);

  const revenueData = useMemo(() => products.map((product) => ({ id: product.id, name: product.name, Revenue: revenueFor(product), Baseline: revenueFor(BASELINE_PRODUCTS.find((item) => item.id === product.id) ?? product) })).sort((a, b) => b.Revenue - a.Revenue), [products]);
  const profitData = useMemo(() => products.map((product) => ({ id: product.id, name: product.name, "Gross profit": profitFor(product), Baseline: profitFor(BASELINE_PRODUCTS.find((item) => item.id === product.id) ?? product) })).sort((a, b) => b["Gross profit"] - a["Gross profit"]), [products]);
  const unitData = useMemo(() => products.map((product) => ({ id: product.id, name: product.name, Cost: product.cost, Price: product.price, "Marginal revenue": product.marginalRevenue })), [products]);
  const scatterData = useMemo(() => products.map((product) => ({ id: product.id, name: product.name, price: product.price, volume: product.volume, profit: profitFor(product) })), [products]);
  const baselineScatter = useMemo(() => BASELINE_PRODUCTS.map((product) => ({ id: product.id, name: product.name, price: product.price, volume: product.volume, profit: profitFor(product) })), []);
  const takeaways = isBaseline ? { revenue: "The drill/driver kit leads revenue at $50.4K—protect its availability and conversion.", profit: "The drill/driver kit also leads gross profit at $21.4K, making it the strongest priority SKU.", scatter: "High-volume consumables drive traffic, while lower-volume equipment carries more value per sale.", economics: "Floor fans, drill kits, and hand trucks create the most gross profit per unit." } : { revenue: "Scenario view — compare each teal bar with the pale baseline reference.", profit: "Scenario view — use profit movement, not volume alone, to judge the change.", scatter: "Scenario view — hover a product to inspect its updated price and demand position.", economics: "Scenario view — check whether price changes still preserve healthy unit economics." };

  const exportCsv = () => { const blob = new Blob([serializeProductsCsv(products)], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${viewName.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.csv`; link.click(); URL.revokeObjectURL(link.href); };

  return <main className="dashboard-shell">
    <header className="topbar"><div className="brand-mark"><BarChart3 aria-hidden="true" /></div><div className="brand-copy"><strong>Northstar Supply Co.</strong><span>Leadership intelligence</span></div><div className="top-actions">
      <input ref={fileRef} hidden type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { importCsvText(await file.text()); } catch (error) { setNotice(error instanceof Error ? error.message : "Import failed."); } event.target.value = ""; }} />
      <Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp />Import CSV</Button><Button variant="outline" onClick={exportCsv}><Download />Export</Button><Button onClick={() => setEditorOpen(true)}><PencilLine />Edit data</Button>
    </div></header>

    <div className="content-wrap">
      <section className="hero"><div><p className="eyebrow">Product portfolio · synthetic snapshot</p><h1>The drill/driver kit leads revenue and profit—but volume alone is not value.</h1><p className="hero-copy">Compare product economics, pressure-test assumptions, and keep every scenario anchored to the original baseline.</p></div>
        <div className="dataset-control" aria-label="Dataset controls"><span>Viewing</span><div className="view-switcher"><button className={view.kind === "baseline" ? "active" : ""} onClick={() => setView({ kind: "baseline" })}>Baseline</button><button className={view.kind === "working" ? "active" : ""} onClick={() => setView({ kind: "working" })}>Working copy</button><label className={view.kind === "scenario" ? "select-wrap active" : "select-wrap"}><select value={view.kind === "scenario" ? view.id : ""} onChange={(event) => event.target.value && setView({ kind: "scenario", id: event.target.value })} aria-label="Saved scenario"><option value="">Scenarios{scenarios.length ? ` (${scenarios.length})` : ""}</option>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select><ChevronDown aria-hidden="true" /></label></div><Button size="sm" variant="outline" onClick={() => setSaveOpen(true)}><Plus />Save scenario</Button></div>
      </section>

      {notice && <div className="notice" role="status"><Check aria-hidden="true" /><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X /></button></div>}
      <section className={isBaseline ? "insight-banner baseline" : "insight-banner scenario"}><div><Sparkles aria-hidden="true" /></div><p><strong>{isBaseline ? "Baseline conclusion" : `${viewName} is active`}</strong>{isBaseline ? "Leadership should protect drill-kit availability while using hose clamps and other consumables as traffic drivers—not as profit proxies." : "Baseline conclusions are hidden while assumptions differ. Pale chart marks show the original values for a clean comparison."}</p>{!isBaseline && <button onClick={() => setView({ kind: "baseline" })}>Return to baseline</button>}</section>

      <section className="metrics-grid" aria-label="Portfolio summary"><Metric label="Portfolio revenue" value={money.format(portfolio.revenue)} detail={isBaseline ? "Current synthetic baseline" : `${money.format(portfolio.revenue - baselinePortfolio.revenue)} vs baseline`} /><Metric label="Gross profit" value={money.format(portfolio.profit)} detail={isBaseline ? `${percent.format(portfolio.margin)} blended margin` : `${money.format(portfolio.profit - baselinePortfolio.profit)} vs baseline`} /><Metric label="Units sold" value={integer.format(portfolio.units)} detail={isBaseline ? "Across 20 products" : `${integer.format(portfolio.units - baselinePortfolio.units)} vs baseline`} /><Metric label="Top profit product" value={shortName(portfolio.topProfit.name)} detail={`${money.format(profitFor(portfolio.topProfit))} gross profit`} /></section>

      <section className="product-focus"><div className="focus-heading"><span>Product focus</span><strong>{selected.name}</strong></div><div className="focus-metrics"><div><span>Revenue</span><b>{money.format(revenueFor(selected))}</b>{!isBaseline && <Delta value={selectedDelta.revenue} />}</div><div><span>Gross profit</span><b>{money.format(profitFor(selected))}</b>{!isBaseline && <Delta value={selectedDelta.profit} />}</div><div><span>Unit profit</span><b>{preciseMoney.format(unitProfitFor(selected))}</b>{!isBaseline && <Delta value={selectedDelta.price - selectedDelta.cost} format={preciseMoney} />}</div><div><span>Volume</span><b>{integer.format(selected.volume)}</b>{!isBaseline && <Delta value={selectedDelta.volume} format={integer} />}</div></div><select value={selected.id} onChange={(event) => setSelectedId(event.target.value)} aria-label="Focus product">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></section>

      <section className="charts-grid">
        <ChartCard eyebrow="01 · Scale" title="Revenue by product" takeaway={takeaways.revenue}><ResponsiveContainer width="100%" height={570}><BarChart data={revenueData} layout="vertical" margin={{ left: 8, right: 18 }} onMouseMove={(state) => state.activePayload?.[0]?.payload?.id && setSelectedId(state.activePayload[0].payload.id)}><CartesianGrid horizontal={false} stroke="#e7e9ec" /><XAxis type="number" tickFormatter={(value) => `$${Math.round(value / 1000)}K`} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={154} tickFormatter={shortName} axisLine={false} tickLine={false} /><Tooltip content={<FinancialTooltip />} cursor={{ fill: "#f3f5f6" }} />{!isBaseline && <Bar dataKey="Baseline" fill="#dce2e7" radius={3} barSize={8} />}<Bar dataKey="Revenue" fill="#147d75" radius={3} barSize={isBaseline ? 13 : 8}>{revenueData.map((item) => <Cell key={item.id} fill={item.id === selected.id ? "#0b4f4a" : "#147d75"} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard eyebrow="02 · Value" title="Gross profit by product" takeaway={takeaways.profit}><ResponsiveContainer width="100%" height={570}><BarChart data={profitData} layout="vertical" margin={{ left: 8, right: 18 }} onMouseMove={(state) => state.activePayload?.[0]?.payload?.id && setSelectedId(state.activePayload[0].payload.id)}><CartesianGrid horizontal={false} stroke="#e7e9ec" /><XAxis type="number" tickFormatter={(value) => `$${Math.round(value / 1000)}K`} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={154} tickFormatter={shortName} axisLine={false} tickLine={false} /><Tooltip content={<FinancialTooltip />} cursor={{ fill: "#f3f5f6" }} />{!isBaseline && <Bar dataKey="Baseline" fill="#dce2e7" radius={3} barSize={8} />}<Bar dataKey="Gross profit" fill="#315b86" radius={3} barSize={isBaseline ? 13 : 8}>{profitData.map((item) => <Cell key={item.id} fill={item.id === selected.id ? "#173c63" : "#315b86"} />)}</Bar></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard eyebrow="03 · Position" title="Price versus volume" takeaway={takeaways.scatter}><ResponsiveContainer width="100%" height={420}><ComposedChart margin={{ top: 10, right: 18, bottom: 8, left: 4 }}><CartesianGrid stroke="#e7e9ec" /><XAxis type="number" dataKey="price" name="Price" unit="$" axisLine={false} tickLine={false} /><YAxis type="number" dataKey="volume" name="Volume" tickFormatter={(value) => integer.format(value)} axisLine={false} tickLine={false} /><ZAxis type="number" dataKey="profit" range={[80, 360]} /><Tooltip cursor={{ strokeDasharray: "3 3" }} content={<FinancialTooltip />} /><ReferenceLine x={80} stroke="#b6bec6" strokeDasharray="4 4" /><ReferenceLine y={1000} stroke="#b6bec6" strokeDasharray="4 4" />{!isBaseline && <Scatter name="Baseline" data={baselineScatter} fill="#cbd2d8" shape="circle" />}<Scatter name="Current" data={scatterData} fill="#147d75" onMouseOver={(point) => setSelectedId(point.id)}>{scatterData.map((item) => <Cell key={item.id} fill={item.id === selected.id ? "#ef8f3d" : "#147d75"} stroke="#fff" strokeWidth={2} />)}</Scatter></ComposedChart></ResponsiveContainer></ChartCard>
        <ChartCard eyebrow="04 · Economics" title="Unit economics" takeaway={takeaways.economics}><ResponsiveContainer width="100%" height={420}><BarChart data={unitData} margin={{ top: 8, right: 14, left: 0, bottom: 82 }} onMouseMove={(state) => state.activePayload?.[0]?.payload?.id && setSelectedId(state.activePayload[0].payload.id)}><CartesianGrid vertical={false} stroke="#e7e9ec" /><XAxis dataKey="name" interval={0} angle={-42} textAnchor="end" tickFormatter={(value) => value.split(" ").slice(0, 2).join(" ")} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `$${value}`} axisLine={false} tickLine={false} /><Tooltip content={<FinancialTooltip />} cursor={{ fill: "#f3f5f6" }} /><Legend verticalAlign="top" height={36} iconType="circle" /><Bar dataKey="Cost" fill="#b9c1c9" radius={[3, 3, 0, 0]} /><Bar dataKey="Price" fill="#315b86" radius={[3, 3, 0, 0]} /><Bar dataKey="Marginal revenue" fill="#55a89f" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      </section>
      <footer className="methodology">Synthetic 20-product snapshot. Excludes taxes, returns, overhead, inventory limits, seasonality, and customer-level effects. No minimum sample-size threshold was applied.</footer>
    </div>

    {editorOpen && <div className="editor-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditorOpen(false)}><aside className="editor-panel" role="dialog" aria-modal="true" aria-label="Edit product data"><header><div><p className="eyebrow">Scenario workspace</p><h2>Edit {viewName.toLowerCase()}</h2><span>{view.kind === "baseline" ? "Your first change creates a working copy. The baseline stays intact." : "Changes save locally and update every chart immediately."}</span></div><button onClick={() => setEditorOpen(false)} aria-label="Close editor"><X /></button></header><div className="editor-toolbar"><button onClick={() => { setWorking(cloneProducts(BASELINE_PRODUCTS)); setView({ kind: "working" }); setNotice("Working copy reset to baseline."); }}><RotateCcw />Reset working copy</button><button onClick={() => setSaveOpen(true)}><Save />Save as scenario</button></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Cost</th><th>Price</th><th>Marginal revenue</th><th>Volume</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className={product.id === selected.id ? "selected" : ""} onClick={() => setSelectedId(product.id)}><td><input aria-label={`${product.name} name`} value={product.name} onChange={(event) => updateProduct(product.id, "name", event.target.value)} /></td><td><input aria-label={`${product.name} cost`} type="number" min="0" step="0.01" value={product.cost} onChange={(event) => updateProduct(product.id, "cost", event.target.value)} /></td><td><input aria-label={`${product.name} price`} type="number" min="0" step="0.01" value={product.price} onChange={(event) => updateProduct(product.id, "price", event.target.value)} /></td><td><input aria-label={`${product.name} marginal revenue`} type="number" min="0" step="0.01" value={product.marginalRevenue} onChange={(event) => updateProduct(product.id, "marginalRevenue", event.target.value)} /></td><td><input aria-label={`${product.name} volume`} type="number" min="0" step="1" value={product.volume} onChange={(event) => updateProduct(product.id, "volume", event.target.value)} /></td></tr>)}</tbody></table></div><footer><span><SlidersHorizontal />{products.length} products · all changes are reversible</span><Button onClick={() => setEditorOpen(false)}>Done editing</Button></footer></aside></div>}
    {saveOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSaveOpen(false)}><section className="save-modal" role="dialog" aria-modal="true" aria-labelledby="save-title"><div className="modal-icon"><Save /></div><h2 id="save-title">Save this scenario</h2><p>Keep the current product assumptions as a named view. Your baseline will remain unchanged.</p><label>Scenario name<input autoFocus value={scenarioName} maxLength={80} placeholder="e.g. Q4 price test" onChange={(event) => setScenarioName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && scenarioName.trim() && saveScenario(scenarioName)} /></label><div><Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button><Button disabled={!scenarioName.trim()} onClick={() => saveScenario(scenarioName)}>Save scenario</Button></div></section></div>}
  </main>;
}
