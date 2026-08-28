(function () {
  "use strict";

  const storageKey = "fieldQuickCalc_rebar_v1";
  const data = window.RebarData;
  const calculator = window.RebarCalculator;
  if (!data || !calculator) return;

  const defaults = {
    system: "imperial",
    mode: "lshape",
    wallLength: 20,
    wallHeight: 8,
    verticalLeg: 5,
    horizontalLeg: 2,
    cover: 2,
    spacing: 12,
    sizeId: "us4",
    stockPreset: "20",
    customStock: 25
  };
  let state = loadState();

  function element(id) { return document.getElementById(id); }
  function setText(id, text) { const node = element(id); if (node) node.textContent = text; }
  function setInput(id, value) { const node = element(id); if (node) node.value = value; }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      return { ...defaults, ...(saved && typeof saved === "object" ? saved : {}) };
    } catch {
      return { ...defaults };
    }
  }

  function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }
  function numberValue(id) {
    const value = Number.parseFloat(element(id)?.value);
    return Number.isFinite(value) ? value : 0;
  }
  function format(value, digits = 2) {
    if (!Number.isFinite(value)) return "--";
    return value.toLocaleString("en-US", { maximumFractionDigits: digits });
  }
  function cleanInput(value) { return Number.isFinite(value) ? Number(value.toFixed(4)) : 0; }
  function outputLength(mm) {
    const unit = state.system === "imperial" ? "ft" : "m";
    return format(calculator.mmToLength(mm, unit), state.system === "imperial" ? 2 : 3);
  }
  function outputSmall(mm) {
    const unit = state.system === "imperial" ? "in" : "mm";
    return `${format(calculator.mmToLength(mm, unit), state.system === "imperial" ? 2 : 0)} ${unit}`;
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
    if (!sizes.some((size) => size.id === state.sizeId)) state.sizeId = state.system === "imperial" ? "us4" : "m12";
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
    if (state.stockPreset !== "custom" && !presets.map(String).includes(String(state.stockPreset))) state.stockPreset = String(presets[0]);
    select.innerHTML = [
      ...presets.map((length) => `<option value="${length}">${length} ${unit}</option>`),
      '<option value="custom">Custom Length</option>'
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
      customStock: numberValue("rebarCustomStock")
    };
  }

  function getStockLength() { return state.stockPreset === "custom" ? state.customStock : Number(state.stockPreset); }

  function updateVisibility() {
    const isLShape = state.mode === "lshape";
    element("rebarWallHeightField").hidden = isLShape;
    element("rebarVerticalField").hidden = !isLShape;
    element("rebarHorizontalField").hidden = !isLShape;
    element("rebarCustomStockField").hidden = state.stockPreset !== "custom";
    document.querySelectorAll('[data-rebar-unit="length"]').forEach((node) => { node.textContent = state.system === "imperial" ? "ft" : "m"; });
    document.querySelectorAll('[data-rebar-unit="small"]').forEach((node) => { node.textContent = state.system === "imperial" ? "in" : "mm"; });
    setActive("[data-rebar-system]", "rebarSystem", state.system);
    setActive("[data-rebar-mode]", "rebarMode", state.mode);
  }

  function drawPiece(result) {
    const svg = element("rebarPieceDiagram");
    if (!svg) return;
    if (!result.valid || !result.cutLengthMm) {
      svg.innerHTML = '<text x="160" y="112" text-anchor="middle" class="rebar-empty">Enter valid dimensions</text>';
      return;
    }
    const lengthUnit = state.system === "imperial" ? "ft" : "m";
    if (state.mode === "straight") {
      svg.innerHTML = `
        <line x1="160" y1="38" x2="160" y2="178" class="rebar-piece-line" />
        <text x="105" y="112" text-anchor="middle" class="rebar-dimension">Length ${outputLength(result.cutLengthMm)} ${lengthUnit}</text>
        <text x="160" y="204" text-anchor="middle" class="rebar-total">Cut ${outputLength(result.cutLengthMm)} ${lengthUnit}</text>`;
      return;
    }
    svg.innerHTML = `
      <path d="M 92 38 L 92 166 L 218 166" class="rebar-piece-line" />
      <circle cx="92" cy="166" r="8" class="rebar-bend-dot" />
      <text x="48" y="108" text-anchor="middle" class="rebar-dimension">Vertical ${outputLength(result.verticalEffectiveMm)} ${lengthUnit}</text>
      <text x="166" y="194" text-anchor="middle" class="rebar-dimension">Horizontal ${outputLength(result.horizontalEffectiveMm)} ${lengthUnit}</text>
      <text x="148" y="151" text-anchor="middle" class="rebar-bend-text">Bend allowance ${outputSmall(result.bendAllowanceMm)}</text>
      <text x="236" y="28" text-anchor="end" class="rebar-total">Total ${outputLength(result.cutLengthMm)} ${lengthUnit}</text>`;
  }

  function render() {
    readInputs();
    const result = calculator.calculate({ ...state, stockLength: getStockLength() });
    const lengthUnit = state.system === "imperial" ? "ft" : "m";
    const weightUnit = state.system === "imperial" ? "lb" : "kg";
    const error = element("rebarError");
    error.hidden = result.errors.length === 0;
    error.textContent = result.errors.join(" ");

    setText("rebarPieceHeading", state.mode === "lshape" ? "L-Shaped Vertical Bar" : "Straight Vertical Bar");
    setText("rebarCountLabel", state.mode === "lshape" ? "L-Shaped Bars Required" : "Straight Bars Required");
    setText("rebarCutLength", result.cutLengthMm > 0 ? outputLength(result.cutLengthMm) : "--");
    setText("rebarPieceCount", result.pieceCount || "--");
    setText("rebarPiecesPerBar", result.piecesPerBar || "--");
    setText("rebarBarsRequired", result.barsRequired || "--");
    setText("rebarRemainingPerBar", result.barsRequired ? outputLength(result.remainingPerBarMm) : "--");
    setText("rebarTotalRemaining", result.barsRequired ? outputLength(result.totalRemainingMm) : "--");
    setText("rebarTotalLength", result.totalStockLengthMm > 0 ? outputLength(result.totalStockLengthMm) : "--");
    setText("rebarWeight", result.estimatedWeightKg > 0 ? format(state.system === "imperial" ? result.estimatedWeightLb : result.estimatedWeightKg, 1) : "--");
    ["rebarCutUnit", "rebarRemainingPerBarUnit", "rebarTotalRemainingUnit", "rebarTotalUnit"].forEach((id) => setText(id, lengthUnit));
    setText("rebarWeightUnit", weightUnit);
    updateVisibility();
    drawPiece(result);
    saveState();
  }

  function switchSystem(nextSystem) {
    if (nextSystem === state.system) return;
    const toMetric = nextSystem === "metric";
    const oldLengthUnit = toMetric ? "ft" : "m";
    const newLengthUnit = toMetric ? "m" : "ft";
    const oldSmallUnit = toMetric ? "in" : "mm";
    const newSmallUnit = toMetric ? "mm" : "in";
    state = {
      ...state,
      system: nextSystem,
      wallLength: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.wallLength, oldLengthUnit), newLengthUnit)),
      wallHeight: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.wallHeight, oldLengthUnit), newLengthUnit)),
      verticalLeg: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.verticalLeg, oldLengthUnit), newLengthUnit)),
      horizontalLeg: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.horizontalLeg, oldLengthUnit), newLengthUnit)),
      customStock: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.customStock, oldLengthUnit), newLengthUnit)),
      cover: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.cover, oldSmallUnit), newSmallUnit)),
      spacing: cleanInput(calculator.mmToLength(calculator.lengthToMm(state.spacing, oldSmallUnit), newSmallUnit)),
      sizeId: toMetric ? "m12" : "us4",
      stockPreset: toMetric ? "6" : "20"
    };
    applyStateToInputs();
    render();
  }

  function init() {
    if (!element("rebar")) return;
    applyStateToInputs();
    document.querySelectorAll("[data-rebar-system]").forEach((button) => button.addEventListener("click", () => switchSystem(button.dataset.rebarSystem)));
    document.querySelectorAll("[data-rebar-mode]").forEach((button) => button.addEventListener("click", () => {
      state.mode = button.dataset.rebarMode;
      updateVisibility();
      render();
    }));
    document.querySelectorAll("[data-rebar-input]").forEach((input) => {
      input.addEventListener("input", render);
      input.addEventListener("change", render);
    });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
