const assert = require("node:assert/strict");
const test = require("node:test");
const data = require("../js/rebar-data.js");
const calc = require("../js/rebar-calculator.js");

function near(actual, expected, tolerance = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

test("ASTM and metric tables contain sizes, weights, and automatic bend allowances", () => {
  assert.deepEqual(data.imperial.sizes.map((item) => item.label), ["#3", "#4", "#5", "#6", "#7", "#8"]);
  assert.deepEqual(data.imperial.sizes.map((item) => item.weightLbFt), [0.376, 0.668, 1.043, 1.502, 2.044, 2.67]);
  assert.deepEqual(data.imperial.sizes.map((item) => item.bendAllowanceIn), [2, 2.5, 3, 3.5, 4, 4.5]);
  assert.deepEqual(data.metric.sizes.map((item) => item.diameterMm), [8, 10, 12, 16, 20]);
  assert.deepEqual(data.metric.sizes.map((item) => item.weightKgM), [0.395, 0.617, 0.888, 1.578, 2.466]);
  assert.deepEqual(data.metric.sizes.map((item) => item.bendAllowanceMm), [40, 50, 60, 70, 80]);
});

test("straight wall follows the Japanese takeoff structure", () => {
  const result = calc.calculate({
    system: "imperial", mode: "straight", sizeId: "us4",
    wallLength: 20, wallHeight: 8, cover: 2, spacing: 12, stockLength: 20
  });
  assert.equal(result.valid, true);
  assert.equal(result.pieceCount, 21);
  near(calc.mmToLength(result.cutLengthMm, "ft"), 7 + 8 / 12);
  assert.equal(result.piecesPerBar, 2);
  assert.equal(result.barsRequired, 11);
  near(calc.mmToLength(result.remainingPerBarMm, "ft"), 4 + 8 / 12);
  near(calc.mmToLength(result.totalRemainingMm, "ft"), 51 + 4 / 12);
  near(calc.mmToLength(result.totalStockLengthMm, "ft"), 220);
  near(result.estimatedWeightLb, 21 * (7 + 8 / 12) * 0.668, 1e-8);
});

test("L-shaped wall calculates one bar, stock yield, total remainder, and purchased weight", () => {
  const result = calc.calculate({
    system: "metric", mode: "lshape", sizeId: "m12",
    wallLength: 10, verticalLeg: 1.5, horizontalLeg: 0.8,
    cover: 50, spacing: 200, stockLength: 12
  });
  assert.equal(result.valid, true);
  assert.equal(result.pieceCount, 51);
  near(calc.mmToLength(result.verticalEffectiveMm, "m"), 1.45);
  near(calc.mmToLength(result.horizontalEffectiveMm, "m"), 0.75);
  near(calc.mmToLength(result.bendAllowanceMm, "m"), 0.06);
  near(calc.mmToLength(result.cutLengthMm, "m"), 2.26);
  assert.equal(result.piecesPerBar, 5);
  assert.equal(result.barsRequired, 11);
  near(calc.mmToLength(result.remainingPerBarMm, "m"), 0.7);
  near(calc.mmToLength(result.totalRemainingMm, "m"), 7.7);
  near(calc.mmToLength(result.totalStockLengthMm, "m"), 132);
  near(result.estimatedWeightKg, 132 * 0.888, 1e-8);
});

test("custom stock and every supported size use the correct unit weight", () => {
  const custom = calc.calculate({
    system: "imperial", mode: "lshape", sizeId: "us3",
    wallLength: 12, verticalLeg: 5, horizontalLeg: 3,
    cover: 2, spacing: 12, stockLength: 30
  });
  near(calc.mmToLength(custom.cutLengthMm, "ft"), 7 + 10 / 12);
  assert.equal(custom.piecesPerBar, 3);
  assert.equal(custom.barsRequired, 5);

  for (const size of data.imperial.sizes) {
    const result = calc.calculate({ system: "imperial", mode: "straight", sizeId: size.id, wallLength: 1, wallHeight: 1, cover: 0, spacing: 12, stockLength: 20 });
    near(result.estimatedWeightLb, 2 * size.weightLbFt, 1e-8);
  }
  for (const size of data.metric.sizes) {
    const result = calc.calculate({ system: "metric", mode: "straight", sizeId: size.id, wallLength: 1, wallHeight: 1, cover: 0, spacing: 1000, stockLength: 6 });
    near(result.estimatedWeightKg, 2 * size.weightKgM, 1e-8);
  }
});

test("invalid and zero values fail safely", () => {
  const zero = calc.calculate({ system: "metric", mode: "straight", sizeId: "m12", wallLength: 0, wallHeight: 0, cover: 0, spacing: 0, stockLength: 0 });
  assert.equal(zero.valid, false);
  assert.equal(zero.pieceCount, 0);
  assert.equal(zero.barsRequired, 0);

  const tooLong = calc.calculate({ system: "imperial", mode: "straight", sizeId: "us8", wallLength: 10, wallHeight: 25, cover: 0, spacing: 12, stockLength: 20 });
  assert.equal(tooLong.valid, false);
  assert.equal(tooLong.piecesPerBar, 0);
  assert.match(tooLong.errors.join(" "), /exceeds/);
});

test("equivalent unit inputs preserve count and stock decisions", () => {
  const imperial = calc.calculate({ system: "imperial", mode: "straight", sizeId: "us4", wallLength: 20, wallHeight: 8, cover: 2, spacing: 12, stockLength: 20 });
  const metric = calc.calculate({ system: "metric", mode: "straight", sizeId: "m12", wallLength: 6.096, wallHeight: 2.4384, cover: 50.8, spacing: 304.8, stockLength: 6.096 });
  assert.equal(metric.pieceCount, imperial.pieceCount);
  assert.equal(metric.piecesPerBar, imperial.piecesPerBar);
  assert.equal(metric.barsRequired, imperial.barsRequired);
  near(metric.totalRemainingMm, imperial.totalRemainingMm, 1e-5);
});
