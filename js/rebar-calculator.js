(function (root, factory) {
  const data = typeof module === "object" && module.exports
    ? require("./rebar-data.js")
    : root.RebarData;
  const calculator = factory(data);
  if (typeof module === "object" && module.exports) module.exports = calculator;
  if (root) root.RebarCalculator = calculator;
})(typeof globalThis !== "undefined" ? globalThis : this, function (data) {
  "use strict";

  const EPSILON_MM = 1e-7;

  function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function nonNegative(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function lengthToMm(value, unit) {
    const number = nonNegative(value);
    if (unit === "ft") return number * data.conversions.footToMm;
    if (unit === "in") return number * data.conversions.inchToMm;
    if (unit === "m") return number * 1000;
    return number;
  }

  function mmToLength(valueMm, unit) {
    if (unit === "ft") return valueMm / data.conversions.footToMm;
    if (unit === "in") return valueMm / data.conversions.inchToMm;
    if (unit === "m") return valueMm / 1000;
    return valueMm;
  }

  function getSize(system, sizeId) {
    return data[system]?.sizes.find((item) => item.id === sizeId) || null;
  }

  function weightKgPerMm(system, size) {
    if (system === "imperial") {
      return (size.weightLbFt * data.conversions.poundToKg) / data.conversions.footToMm;
    }
    return size.weightKgM / 1000;
  }

  function countAtSpacing(lengthMm, spacingMm) {
    if (lengthMm <= EPSILON_MM || spacingMm <= EPSILON_MM) return 0;
    return Math.floor((lengthMm + EPSILON_MM) / spacingMm) + 1;
  }

  function calculateStock(cutLengthMm, pieceCount, stockLengthMm) {
    if (cutLengthMm <= EPSILON_MM || pieceCount < 1 || stockLengthMm <= EPSILON_MM) {
      return { piecesPerBar: 0, barsRequired: 0, remainingPerBarMm: 0, actualRemainingMm: 0 };
    }
    const piecesPerBar = Math.floor((stockLengthMm + EPSILON_MM) / cutLengthMm);
    if (piecesPerBar < 1) {
      return { piecesPerBar: 0, barsRequired: 0, remainingPerBarMm: 0, actualRemainingMm: 0 };
    }
    const barsRequired = Math.ceil(pieceCount / piecesPerBar);
    const totalStockLengthMm = barsRequired * stockLengthMm;
    const usedLengthMm = pieceCount * cutLengthMm;
    return {
      piecesPerBar,
      barsRequired,
      remainingPerBarMm: Math.max(0, stockLengthMm - piecesPerBar * cutLengthMm),
      actualRemainingMm: Math.max(0, totalStockLengthMm - usedLengthMm)
    };
  }

  function calculate(input) {
    const system = input.system === "metric" ? "metric" : "imperial";
    const lengthUnit = system === "imperial" ? "ft" : "m";
    const smallUnit = system === "imperial" ? "in" : "mm";
    const size = getSize(system, input.sizeId);
    const wallLengthMm = lengthToMm(input.wallLength, lengthUnit);
    const coverMm = lengthToMm(input.cover, smallUnit);
    const spacingMm = lengthToMm(input.spacing, smallUnit);
    const stockLengthMm = lengthToMm(input.stockLength, lengthUnit);
    const pieceCount = countAtSpacing(wallLengthMm, spacingMm);
    let cutLengthMm = 0;
    let bendAllowanceMm = 0;
    let verticalEffectiveMm = 0;
    let horizontalEffectiveMm = 0;

    if (input.mode === "lshape") {
      const verticalMm = lengthToMm(input.verticalLeg, lengthUnit);
      const horizontalMm = lengthToMm(input.horizontalLeg, lengthUnit);
      verticalEffectiveMm = verticalMm - coverMm;
      horizontalEffectiveMm = horizontalMm - coverMm;
      bendAllowanceMm = size
        ? (system === "imperial" ? lengthToMm(size.bendAllowanceIn, "in") : size.bendAllowanceMm)
        : 0;
      cutLengthMm = verticalEffectiveMm + horizontalEffectiveMm + bendAllowanceMm;
    } else {
      const wallHeightMm = lengthToMm(input.wallHeight, lengthUnit);
      cutLengthMm = Math.max(0, wallHeightMm - 2 * coverMm);
    }

    const errors = [];
    if (!size) errors.push("Select a rebar size.");
    if (wallLengthMm <= 0) errors.push("Enter a wall length.");
    if (spacingMm <= 0) errors.push("Enter spacing greater than zero.");
    if (cutLengthMm <= 0) errors.push("Check the dimensions and concrete cover.");
    if (stockLengthMm <= 0) errors.push("Enter a stock length.");

    const stock = calculateStock(cutLengthMm, pieceCount, stockLengthMm);
    if (cutLengthMm > stockLengthMm + EPSILON_MM) errors.push("Cut length exceeds the selected stock length.");

    const totalCutLengthMm = pieceCount * cutLengthMm;
    const totalStockLengthMm = stock.barsRequired * stockLengthMm;
    const weightBasisMm = input.mode === "lshape" ? totalStockLengthMm : totalCutLengthMm;
    const estimatedWeightKg = size ? weightBasisMm * weightKgPerMm(system, size) : 0;

    return {
      valid: errors.length === 0,
      errors,
      system,
      mode: input.mode === "lshape" ? "lshape" : "straight",
      size,
      cutLengthMm,
      bendAllowanceMm,
      verticalEffectiveMm,
      horizontalEffectiveMm,
      pieceCount,
      stockLengthMm,
      piecesPerBar: stock.piecesPerBar,
      barsRequired: stock.barsRequired,
      remainingPerBarMm: stock.remainingPerBarMm,
      actualRemainingMm: stock.actualRemainingMm,
      // Retain the original property as an API-compatible alias with the corrected definition.
      totalRemainingMm: stock.actualRemainingMm,
      totalCutLengthMm,
      totalStockLengthMm,
      estimatedWeightKg,
      estimatedWeightLb: estimatedWeightKg / data.conversions.poundToKg
    };
  }

  return Object.freeze({ calculate, calculateStock, countAtSpacing, getSize, lengthToMm, mmToLength });
});
