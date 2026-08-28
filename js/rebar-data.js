(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  if (root) root.RebarData = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  return Object.freeze({
    conversions: Object.freeze({
      inchToMm: 25.4,
      footToMm: 304.8,
      poundToKg: 0.45359237
    }),
    imperial: Object.freeze({
      stockLengths: Object.freeze([20, 30, 40]),
      sizes: Object.freeze([
        Object.freeze({ id: "us3", label: "#3", diameterIn: 0.375, diameterMm: 9.525, weightLbFt: 0.376 }),
        Object.freeze({ id: "us4", label: "#4", diameterIn: 0.5, diameterMm: 12.7, weightLbFt: 0.668 }),
        Object.freeze({ id: "us5", label: "#5", diameterIn: 0.625, diameterMm: 15.875, weightLbFt: 1.043 }),
        Object.freeze({ id: "us6", label: "#6", diameterIn: 0.75, diameterMm: 19.05, weightLbFt: 1.502 }),
        Object.freeze({ id: "us7", label: "#7", diameterIn: 0.875, diameterMm: 22.225, weightLbFt: 2.044 }),
        Object.freeze({ id: "us8", label: "#8", diameterIn: 1, diameterMm: 25.4, weightLbFt: 2.67 })
      ])
    }),
    metric: Object.freeze({
      stockLengths: Object.freeze([6, 12]),
      sizes: Object.freeze([
        Object.freeze({ id: "m8", label: "8 mm", diameterMm: 8, weightKgM: 0.395 }),
        Object.freeze({ id: "m10", label: "10 mm", diameterMm: 10, weightKgM: 0.617 }),
        Object.freeze({ id: "m12", label: "12 mm", diameterMm: 12, weightKgM: 0.888 }),
        Object.freeze({ id: "m16", label: "16 mm", diameterMm: 16, weightKgM: 1.578 }),
        Object.freeze({ id: "m20", label: "20 mm", diameterMm: 20, weightKgM: 2.466 })
      ])
    })
  });
});
