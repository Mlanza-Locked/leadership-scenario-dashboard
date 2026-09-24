import assert from "node:assert/strict";
import test from "node:test";

import {
  BASELINE_PRODUCTS,
  calculatePortfolio,
  compareProduct,
  parseProductsCsv,
  serializeProductsCsv,
} from "./dashboard.ts";

test("baseline contains twenty products and the expected leaders", () => {
  assert.equal(BASELINE_PRODUCTS.length, 20);
  const totals = calculatePortfolio(BASELINE_PRODUCTS);
  assert.equal(totals.topRevenue.name, "Cordless Drill/Driver Kit 20V");
  assert.equal(totals.topProfit.name, "Cordless Drill/Driver Kit 20V");
  assert.equal(totals.highestVolume.name, "Stainless Steel Hose Clamp");
  assert.equal(totals.topUnitProfit.name, "Industrial Floor Fan 24 in");
});

test("CSV round-trips product values", () => {
  const csv = serializeProductsCsv(BASELINE_PRODUCTS);
  const parsed = parseProductsCsv(csv);
  assert.deepEqual(parsed, BASELINE_PRODUCTS);
});

test("CSV rejects invalid economics", () => {
  const csv = "product_name,product_cost,product_price,marginal_revenue,volume_sold\nBad,5,4,4,10";
  assert.throws(() => parseProductsCsv(csv), /price must be at least cost/i);
});

test("product comparison reports baseline deltas", () => {
  const baseline = BASELINE_PRODUCTS[0];
  const working = { ...baseline, price: baseline.price + 1, volume: baseline.volume + 100 };
  const comparison = compareProduct(working, baseline);
  assert.equal(comparison.price, 1);
  assert.equal(comparison.volume, 100);
  assert.ok(comparison.revenue > 0);
  assert.ok(comparison.profit > 0);
});
