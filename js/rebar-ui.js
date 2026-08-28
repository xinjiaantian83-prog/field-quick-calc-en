(function () {
  "use strict";

  const storageKey = "fieldQuickCalc_rebar_v1";
  const data = window.RebarData;
  const calculator = window.RebarCalculator;
  if (!data || !calculator) return;

  const defaults = {
    system: "imperial",
    mode: "straight",
    wallLength: 20,
    wallHeight: 8,
    verticalLeg: 6,
    horizontalLeg: 3,
    cover: 2,
    spacing: 12,
    sizeId: "us4",
    stockPreset: "20",
    customStock: 25,
    bendMethod: "allowance",
    bendAdjustment: 1.5
  };
  let state = loadState();

  function element(id) {
    return document.getElementById(id);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      return { ...defaults, ...(saved && typeof saved === "object" ? saved : {}) };
    } catch {
      return { ...defaults };
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function numberValue(id) {
    const value = Number.parseFloat(element(id)?.value);
    return Number.isFinite(value) ? value : 0;
  }

  function format(value, digits = 2) {
    if (!Number.isFinite(value)) return "--";
    return value.toLocaleString("en-US", { maximumFractionDigits: digits });
  }

  function cleanInput(value) {
    return Number.isFinite(value) ? Number(value.toFixed(4)) : 0;
  }

  function outputLength(mm) {
    const unit = state.system === "imperial" ? "ft" : "m";
    return format(calculator.mmToLength(mm, unit), state.system === "imperial" ? 2 : 3);
  }

  function setText(id, text) {
    const node = element(id);
    if (node) node.textContent = text;
  }

  function setInput(id, value) {
    const node = element(id);
    if (node) node.value = value;
  }

  function setActive(selector, attribute, value) {
    document.querySelectorAll(selector).forEach((button) => {
      const active = button.dataset[attribute] === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function populateSizeOptions() {
    const select = element("rebarSize");
    const sizes = data[state.system].sizes;
    if (!sizes.some((size) => size.id === state.sizeId)) {
      state.sizeId = state.system === "imperial" ? "us4" : "m12";
    }
    select.innerHTML = sizes.map((size) => {
      const detail = state.system === "imperial"
        ? `${size.diameterIn.toFixed(3)} in · ${size.weightLbFt.toFixed(3)} lb/ft`
        : `${size.weightKgM.toFixed(3)} kg/m`;
      return `<option value="${size.id}">${size.label} — ${detail}</option>`;
    }).join("");
    select.value = state.sizeId;
  }

  function populateStockOptions() {
    const select = element("rebarStockPreset");
    const unit = state.system === "imperial" ? "ft" : "m";
    const presets = data[state.system].stockLengths;
    if (state.stockPreset !== "custom" && !presets.map(String).includes(String(state.stockPreset))) {
      state.stockPreset = String(presets[0]);
    }
    select.innerHTML = [
      ...presets.map((length) => `<option value="${length}">${length} ${unit}</option>`),
      `<option value="custom">Custom Length</option>`
    ].join("");
    select.value = state.stockPreset;
  }

  function applyStateToInputs() {
    setInput("rebarWallLength", cleanInput(state.wallLength));
    setInput("rebarWallHeight", cleanInput(state.wallHeight));
    setInput("rebarVerticalLeg", cleanInput(state.verticalLeg));
    setInput("rebarHorizontalLeg", cleanInput(state.horizontalLeg));
    setInput("rebarCover", cleanInput(state.cover));
    setInput("rebarSpacing", cleanInput(state.spacing));
    setInput("rebarCustomStock", cleanInput(state.customStock));
    setInput("rebarBendAdjustment", cleanInput(state.bendAdjustment));
    element("rebarBendMethod").value = state.bendMethod;
    populateSizeOptions();
    populateStockOptions();
    updateVisibility();
  }

  function readInputs() {
    state = {
      ...state,
      wallLength: numberValue("rebarWallLength"),
      wallHeight: numberValue("rebarWallHeight"),
      verticalLeg: numberValue("rebarVerticalLeg"),
      horizontalLeg: numberValue("rebarHorizontalLeg"),
      cover: numberValue("rebarCover"),
      spacing: numberValue("rebarSpacing"),
      sizeId: element("rebarSize").value,
      stockPreset: element("rebarStockPreset").value,
      customStock: numberValue("rebarCustomStock"),
      bendMethod: element("rebarBendMethod").value,
      bendAdjustment: numberValue("rebarBendAdjustment")
    };
  }

  function getStockLength() {
    return state.stockPreset === "custom" ? state.customStock : Number(state.stockPreset);
  }

  function updateVisibility() {
    const isLShape = state.mode === "lshape";
    element("rebarWallHeightField").hidden = isLShape;
    element("rebarVerticalField").hidden = !isLShape;
    element("rebarHorizontalField").hidden = !isLShape;
    element("rebarBendFields").hidden = !isLShape;
    element("rebarStraightDiagram").hidden = isLShape;
    element("rebarLDiagram").hidden = !isLShape;
    element("rebarCustomStockField").hidden = state.stockPreset !== "custom";
    document.querySelectorAll('[data-rebar-unit="length"]').forEach((node) => {
      node.textContent = state.system === "imperial" ? "ft" : "m";
    });
    document.querySelectorAll('[data-rebar-unit="small"]').forEach((node) => {
      node.textContent = state.system === "imperial" ? "in" : "mm";
    });
    setActive("[data-rebar-system]", "rebarSystem", state.system);
    setActive("[data-rebar-mode]", "rebarMode", state.mode);
  }

  function updateDiagram(result) {
    const lengthUnit = state.system === "imperial" ? "ft" : "m";
    const smallUnit = state.system === "imperial" ? "in" : "mm";
    if (state.mode === "straight") {
      setText("rebarStraightCountLabel", `${result.pieceCount || "--"} vertical pieces @ ${format(state.spacing)} ${smallUnit}`);
      setText("rebarStraightHeightLabel", `Cut ${outputLength(result.cutLengthMm)} ${lengthUnit}`);
      return;
    }
    setText("rebarVerticalLabel", `Vertical ${format(state.verticalLeg)} ${lengthUnit}`);
    setText("rebarHorizontalLabel", `Horizontal ${format(state.horizontalLeg)} ${lengthUnit}`);
    const sign = state.bendMethod === "deduction" ? "−" : "+";
    setText("rebarBendLabel", `${sign}${format(state.bendAdjustment)} ${smallUnit} bend`);
    setText("rebarTotalCutLabel", `Cut ${outputLength(result.cutLengthMm)} ${lengthUnit}`);
  }

  function render() {
    readInputs();
    const result = calculator.calculate({ ...state, stockLength: getStockLength() });
    const lengthUnit = state.system === "imperial" ? "ft" : "m";
    const weightUnit = state.system === "imperial" ? "lb" : "kg";
    const error = element("rebarError");
    error.hidden = result.errors.length === 0;
    error.textContent = result.errors.join(" ");

    setText("rebarCutLength", result.cutLengthMm > 0 ? outputLength(result.cutLengthMm) : "--");
    setText("rebarPieceCount", result.pieceCount || "--");
    setText("rebarPiecesPerBar", result.piecesPerBar || "--");
    setText("rebarBarsRequired", result.barsRequired || "--");
    setText("rebarRemaining", result.barsRequired ? outputLength(result.remainingLengthMm) : "--");
    setText("rebarTotalLength", result.totalRebarLengthMm > 0 ? outputLength(result.totalRebarLengthMm) : "--");
    setText("rebarWeight", result.estimatedWeightKg > 0
      ? format(state.system === "imperial" ? result.estimatedWeightLb : result.estimatedWeightKg, 1)
      : "--");
    ["rebarCutUnit", "rebarRemainingUnit", "rebarTotalUnit"].forEach((id) => setText(id, lengthUnit));
    setText("rebarWeightUnit", weightUnit);
    updateVisibility();
    updateDiagram(result);
    saveState();
  }

  function switchSystem(nextSystem) {
    if (nextSystem === state.system) return;
    const toMetric = nextSystem === "metric";
    state = {
      ...state,
      system: nextSystem,
      wallLength: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.wallLength, toMetric ? "ft" : "m"), toMetric ? "m" : "ft")),
      wallHeight: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.wallHeight, toMetric ? "ft" : "m"), toMetric ? "m" : "ft")),
      verticalLeg: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.verticalLeg, toMetric ? "ft" : "m"), toMetric ? "m" : "ft")),
      horizontalLeg: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.horizontalLeg, toMetric ? "ft" : "m"), toMetric ? "m" : "ft")),
      customStock: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.customStock, toMetric ? "ft" : "m"), toMetric ? "m" : "ft")),
      cover: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.cover, toMetric ? "in" : "mm"), toMetric ? "mm" : "in")),
      spacing: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.spacing, toMetric ? "in" : "mm"), toMetric ? "mm" : "in")),
      bendAdjustment: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.bendAdjustment, toMetric ? "in" : "mm"), toMetric ? "mm" : "in")),
      sizeId: toMetric ? "m12" : "us4",
      stockPreset: toMetric ? "6" : "20"
    };
    applyStateToInputs();
    render();
  }

  function init() {
    if (!element("rebar")) return;
    applyStateToInputs();
    document.querySelectorAll("[data-rebar-system]").forEach((button) => {
      button.addEventListener("click", () => switchSystem(button.dataset.rebarSystem));
    });
    document.querySelectorAll("[data-rebar-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.mode = button.dataset.rebarMode;
        updateVisibility();
        render();
      });
    });
    document.querySelectorAll("[data-rebar-input]").forEach((input) => {
      input.addEventListener("input", render);
      input.addEventListener("change", render);
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
