export type Product = {
  id: string;
  name: string;
  cost: number;
  price: number;
  marginalRevenue: number;
  volume: number;
};

const rows: Array<[string, number, number, number, number]> = [
  ["Nitrile Coated Work Gloves", 4.85, 8.99, 8.72, 1840],
  ["Safety Glasses - Clear Lens", 3.2, 6.49, 6.32, 2260],
  ["Heavy-Duty Extension Cord 50 ft", 31.5, 54.99, 53.35, 420],
  ["Industrial Floor Fan 24 in", 118, 189.95, 184.25, 165],
  ["Adjustable Wrench 12 in", 14.75, 27.49, 26.78, 690],
  ["LED Shop Light 4 ft", 29.6, 49.95, 48.7, 510],
  ["Oil-Absorbent Pads - 100 Pack", 42.25, 69.99, 68.1, 305],
  ["High-Visibility Safety Vest", 7.9, 14.95, 14.56, 1380],
  ["Portable Wet/Dry Vacuum 12 gal", 86.4, 139.99, 136.15, 240],
  ["Cordless Drill/Driver Kit 20V", 92, 159.95, 155.55, 315],
  ["Stainless Steel Hose Clamp", 0.78, 1.69, 1.64, 4620],
  ["Heavy-Duty Hand Truck", 104.5, 169.99, 165.25, 190],
  ["Disposable Earplugs - 200 Pair", 21.8, 38.95, 37.86, 560],
  ["Multipurpose Lithium Grease 14 oz", 5.6, 10.49, 10.18, 1125],
  ["Digital Multimeter", 46.75, 79.95, 77.75, 375],
  ["Polypropylene Storage Bin", 6.15, 11.99, 11.66, 980],
  ["Industrial Push Broom 24 in", 18.9, 34.49, 33.52, 445],
  ["Cut-Resistant Gloves - Level A4", 8.4, 16.95, 16.49, 870],
  ["Air Filter 20 x 20 x 2 in", 12.3, 22.99, 22.35, 735],
  ["Lockout Tagout Kit", 58.25, 99.95, 97.1, 205],
];

export const BASELINE_PRODUCTS: Product[] = rows.map(
  ([name, cost, price, marginalRevenue, volume], index) => ({
    id: `product-${index + 1}`,
    name,
    cost,
    price,
    marginalRevenue,
    volume,
  }),
);

export const revenueFor = (product: Product) => product.price * product.volume;
export const profitFor = (product: Product) => (product.price - product.cost) * product.volume;
export const unitProfitFor = (product: Product) => product.price - product.cost;

export function calculatePortfolio(products: Product[]) {
  if (!products.length) throw new Error("At least one product is required.");
  const revenue = products.reduce((sum, product) => sum + revenueFor(product), 0);
  const profit = products.reduce((sum, product) => sum + profitFor(product), 0);
  const units = products.reduce((sum, product) => sum + product.volume, 0);
  return {
    revenue,
    profit,
    units,
    margin: revenue ? profit / revenue : 0,
    topRevenue: products.reduce((best, item) => (revenueFor(item) > revenueFor(best) ? item : best)),
    topProfit: products.reduce((best, item) => (profitFor(item) > profitFor(best) ? item : best)),
    highestVolume: products.reduce((best, item) => (item.volume > best.volume ? item : best)),
    topUnitProfit: products.reduce((best, item) => (unitProfitFor(item) > unitProfitFor(best) ? item : best)),
  };
}

export function compareProduct(product: Product, baseline: Product) {
  return {
    price: product.price - baseline.price,
    cost: product.cost - baseline.cost,
    marginalRevenue: product.marginalRevenue - baseline.marginalRevenue,
    volume: product.volume - baseline.volume,
    revenue: revenueFor(product) - revenueFor(baseline),
    profit: profitFor(product) - profitFor(baseline),
  };
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeProductsCsv(products: Product[]) {
  const header = "product_name,product_cost,product_price,marginal_revenue,volume_sold";
  const lines = products.map((product) =>
    [product.name, product.cost, product.price, product.marginalRevenue, product.volume]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

export function parseProductsCsv(csv: string) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The CSV must include a header and at least one product.");
  const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
  const expected = ["product_name", "product_cost", "product_price", "marginal_revenue", "volume_sold"];
  if (expected.some((field, index) => header[index] !== field)) {
    throw new Error(`CSV columns must be: ${expected.join(", ")}.`);
  }
  return lines.slice(1).map((line, index): Product => {
    const [name, costText, priceText, marginalRevenueText, volumeText] = parseCsvLine(line);
    const cost = Number(costText);
    const price = Number(priceText);
    const marginalRevenue = Number(marginalRevenueText);
    const volume = Number(volumeText);
    const row = index + 2;
    if (!name) throw new Error(`Row ${row}: product name is required.`);
    if (![cost, price, marginalRevenue, volume].every(Number.isFinite)) {
      throw new Error(`Row ${row}: all numeric fields must be valid numbers.`);
    }
    if (cost < 0 || price < 0 || marginalRevenue < 0 || volume < 0) {
      throw new Error(`Row ${row}: values cannot be negative.`);
    }
    if (price < cost) throw new Error(`Row ${row}: price must be at least cost.`);
    return {
      id: `product-${index + 1}`,
      name,
      cost,
      price,
      marginalRevenue,
      volume: Math.round(volume),
    };
  });
}
