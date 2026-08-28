const $ = (id) => document.getElementById(id);
const screens = [...document.querySelectorAll(".screen")];
const notesKey = "fieldQuickCalc_notes_v1";
const menuVisibilityKey = "fieldQuickCalc_homeMenuVisibility_v1";
const menuSettingsKey = "fieldQuickCalc_homeMenuSettings_v2";
const homeMenuItems = [
  { id: "ordinary", label: "Tapered Shape" },
  { id: "radiusCircle", label: "Radius & Arc" },
  { id: "slope", label: "Slope & Pitch" },
  { id: "stairs", label: "Stair Layout" },
  { id: "rebar", label: "Rebar Estimator" },
  { id: "density", label: "Material Weight Guide" },
  { id: "notes", label: "Jobsite Notes" }
];
let radiusMode = "arc";
let taperSide = "left";
let menuSettings = loadMenuSettings();
let menuVisibility = menuSettings.visibility;
let menuOrder = menuSettings.order;
let customizeDrag = null;

function n(id) {
  const value = parseFloat($(id)?.value);
  return Number.isFinite(value) ? value : 0;
}

function fmt(value, digits = 1) {
  if (!Number.isFinite(value)) return "--";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function whole(value) {
  if (!Number.isFinite(value)) return "--";
  return Math.ceil(value).toLocaleString("en-US");
}

function show(id) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === id));
  window.scrollTo(0, 0);
  recalcAll();
}

function getMenuElement(itemId) {
  return document.querySelector(`[data-menu-id="${itemId}"]`);
}

function getAvailableMenuItems() {
  return getOrderedMenuItems().filter((item) => getMenuElement(item.id));
}

function getDefaultMenuVisibility() {
  return homeMenuItems.reduce((settings, item) => {
    settings[item.id] = true;
    return settings;
  }, {});
}

function getDefaultMenuOrder() {
  return homeMenuItems.map((item) => item.id);
}

function normalizeMenuOrder(savedOrder) {
  const defaults = getDefaultMenuOrder();
  const knownIds = new Set(defaults);
  const normalized = Array.isArray(savedOrder)
    ? savedOrder.filter((id, index, order) => knownIds.has(id) && order.indexOf(id) === index)
    : [];
  const missing = defaults.filter((id) => !normalized.includes(id));
  return [...normalized, ...missing];
}

function getOrderedMenuItems() {
  return menuOrder
    .map((id) => homeMenuItems.find((item) => item.id === id))
    .filter(Boolean);
}

function parseStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function loadMenuSettings() {
  const defaults = getDefaultMenuVisibility();
  const savedSettings = parseStoredJson(menuSettingsKey);
  const legacyVisibility = parseStoredJson(menuVisibilityKey);
  const savedVisibility = savedSettings?.visibility || legacyVisibility || {};

  return {
    visibility: { ...defaults, ...savedVisibility },
    order: normalizeMenuOrder(savedSettings?.order)
  };
}

function saveMenuSettings() {
  menuSettings = {
    visibility: menuVisibility,
    order: menuOrder
  };
  localStorage.setItem(menuSettingsKey, JSON.stringify(menuSettings));
  localStorage.setItem(menuVisibilityKey, JSON.stringify(menuVisibility));
}

function getVisibleAvailableCount() {
  return getAvailableMenuItems().filter((item) => menuVisibility[item.id] !== false).length;
}

function normalizeMenuVisibility() {
  const available = getAvailableMenuItems();
  if (available.length === 0 || getVisibleAvailableCount() > 0) return;
  menuVisibility[available[0].id] = true;
  saveMenuSettings();
}

function applyMenuOrder() {
  const host = document.querySelector(".home-grid");
  if (!host) return;

  getAvailableMenuItems().forEach((item, index) => {
    const element = getMenuElement(item.id);
    element.style.order = String(index + 1);
    host.appendChild(element);
  });

  [...host.children].forEach((element) => {
    if (!element.dataset.menuId) element.style.order = "999";
  });

  document.querySelectorAll(".bottom-actions").forEach((container) => {
    const hasVisibleItem = [...container.children].some((child) => !child.hidden);
    container.hidden = !hasVisibleItem;
  });
}

function applyMenuVisibility() {
  normalizeMenuVisibility();
  applyMenuOrder();
  getOrderedMenuItems().forEach((item) => {
    const element = getMenuElement(item.id);
    if (!element) return;
    element.hidden = menuVisibility[item.id] === false;
  });
}

function setCustomizeNotice(message = "") {
  const notice = $("customizeNotice");
  if (notice) notice.textContent = message;
}

function renderCustomizeOptions() {
  const list = $("menuCustomizeList");
  if (!list) return;
  list.innerHTML = getOrderedMenuItems().map((item) => {
    const available = Boolean(getMenuElement(item.id));
    const checked = menuVisibility[item.id] !== false && available;
    const note = available ? "Show on home screen" : "Tool not available";
    return `
      <label class="customize-option${available ? "" : " is-unavailable"}" data-menu-item="${item.id}">
        <span class="drag-handle" aria-hidden="true">☰</span>
        <input type="checkbox" data-menu-toggle="${item.id}" ${checked ? "checked" : ""} ${available ? "" : "disabled"}>
        <span>
          <strong>${item.label}</strong>
          <small>${note}</small>
        </span>
      </label>
    `;
  }).join("");

  list.querySelectorAll("[data-menu-toggle]").forEach((input) => {
    input.addEventListener("change", () => {
      const itemId = input.dataset.menuToggle;
      if (!input.checked && getVisibleAvailableCount() <= 1) {
        input.checked = true;
        setCustomizeNotice("Keep at least one tool visible.");
        return;
      }

      menuVisibility[itemId] = input.checked;
      saveMenuSettings();
      applyMenuVisibility();
      setCustomizeNotice("");
    });
  });

  setupCustomizeDrag(list);
}

function setupCustomizeDrag(list) {
  list.querySelectorAll(".customize-option").forEach((option) => {
    option.querySelector(".drag-handle")?.addEventListener("pointerdown", startCustomizeDrag);
  });
}

function startCustomizeDrag(event) {
  event.preventDefault();

  const option = event.currentTarget.closest(".customize-option");
  customizeDrag = {
    option,
    pointerId: event.pointerId,
    startY: event.clientY,
    dragging: false
  };

  option.setPointerCapture(event.pointerId);
  option.addEventListener("pointermove", moveCustomizeDrag);
  option.addEventListener("pointerup", endCustomizeDrag);
  option.addEventListener("pointercancel", endCustomizeDrag);
}

function moveCustomizeDrag(event) {
  if (!customizeDrag || event.pointerId !== customizeDrag.pointerId) return;
  const distance = Math.abs(event.clientY - customizeDrag.startY);
  if (!customizeDrag.dragging && distance < 7) return;

  event.preventDefault();
  customizeDrag.dragging = true;
  const draggingOption = customizeDrag.option;
  const list = draggingOption.parentElement;
  draggingOption.classList.add("is-dragging");

  const target = [...list.querySelectorAll(".customize-option:not(.is-dragging)")]
    .find((option) => {
      const rect = option.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2;
    });

  if (target) {
    list.insertBefore(draggingOption, target);
  } else {
    list.appendChild(draggingOption);
  }
}

function endCustomizeDrag(event) {
  if (!customizeDrag || event.pointerId !== customizeDrag.pointerId) return;

  const { option, dragging } = customizeDrag;
  option.classList.remove("is-dragging");
  option.releasePointerCapture(event.pointerId);
  option.removeEventListener("pointermove", moveCustomizeDrag);
  option.removeEventListener("pointerup", endCustomizeDrag);
  option.removeEventListener("pointercancel", endCustomizeDrag);

  if (dragging) {
    menuOrder = [...$("menuCustomizeList").querySelectorAll("[data-menu-item]")]
      .map((item) => item.dataset.menuItem);
    saveMenuSettings();
    applyMenuVisibility();
    setCustomizeNotice("Menu order saved.");
  }

  customizeDrag = null;
}

function openCustomizeDialog() {
  renderCustomizeOptions();
  setCustomizeNotice("");
  $("customizeDialog").hidden = false;
}

function closeCustomizeDialog() {
  $("customizeDialog").hidden = true;
  $("customizeMenuBtn")?.focus();
}

function calcConcrete() {
  const totalHeight = n("conTotalHeightFt");
  const topWidth = n("conTopWidthFt");
  const slopeRatio = n("conSlopeRatio");
  const length = n("conLenFt");
  const checkHeights = [n("conCheckH1Ft"), n("conCheckH2Ft"), n("conCheckH3Ft")];
  const sideFactor = taperSide === "both" ? 2 : 1;
  const bottomWidth = topWidth + sideFactor * slopeRatio * totalHeight;
  const avgWidth = (topWidth + bottomWidth) / 2;
  const area = avgWidth * totalHeight;
  const volume = area * length;
  const widths = checkHeights.map((height) => widthAtHeight(height, totalHeight, topWidth, slopeRatio, taperSide));

  $("conVolume").textContent = volume > 0 ? fmt(volume, 1) : "--";
  $("conYards").textContent = volume > 0 ? fmt(volume / 27, 2) : "--";
  $("conBottomWidth").textContent = bottomWidth > 0 ? fmt(bottomWidth, 2) : "--";
  $("conWidthH1").textContent = widths[0] > 0 ? fmt(widths[0], 2) : "--";
  $("conWidthH2").textContent = widths[1] > 0 ? fmt(widths[1], 2) : "--";
  $("conWidthH3").textContent = widths[2] > 0 ? fmt(widths[2], 2) : "--";
  $("conArea").textContent = area > 0 ? fmt(area, 2) : "--";
  drawTaperedSection({ totalHeight, topWidth, slopeRatio, checkHeights, widths, bottomWidth, taperSide });
}

function widthAtHeight(checkHeight, totalHeight, topWidth, slopeRatio, side = taperSide) {
  if (checkHeight <= 0 || totalHeight <= 0 || topWidth <= 0) return 0;
  const clampedHeight = Math.min(checkHeight, totalHeight);
  const sideFactor = side === "both" ? 2 : 1;
  return topWidth + sideFactor * slopeRatio * clampedHeight;
}

function drawTaperedSection(data) {
  const totalHeight = data.totalHeight > 0 ? data.totalHeight : 5;
  const topWidth = data.topWidth > 0 ? data.topWidth : 2;
  const hasSectionInput = data.totalHeight > 0 || data.topWidth > 0 || $("conSlopeRatio").value.trim() !== "";
  const slopeRatio = hasSectionInput ? Math.max(data.slopeRatio, 0) : 1.5;
  const side = data.taperSide || "left";
  const checkHeights = data.checkHeights.map((height, index) => (
    height > 0 ? height : [1, 2, 4][index]
  ));
  const bottomWidth = widthAtHeight(totalHeight, totalHeight, topWidth, slopeRatio, side);
  const widths = checkHeights.map((height) => widthAtHeight(height, totalHeight, topWidth, slopeRatio, side));

  const topY = 38;
  const bottomY = 232;
  const centerX = 160;
  const maxDrawWidth = 232;
  const scale = maxDrawWidth / Math.max(bottomWidth, topWidth, 1);
  const topDraw = topWidth * scale;
  const bottomDraw = bottomWidth * scale;
  const anchorX = side === "right" ? 82 : side === "left" ? 238 : centerX;
  const topLeft = side === "left" ? anchorX - topDraw : side === "right" ? anchorX : centerX - topDraw / 2;
  const topRight = topLeft + topDraw;
  const bottomLeft = side === "left" ? anchorX - bottomDraw : side === "right" ? anchorX : centerX - bottomDraw / 2;
  const bottomRight = bottomLeft + bottomDraw;
  const heightLineX = Math.max(24, bottomLeft - 22);

  $("taperShape").setAttribute(
    "points",
    `${fmtSvg(topLeft)},${topY} ${fmtSvg(topRight)},${topY} ${fmtSvg(bottomRight)},${bottomY} ${fmtSvg(bottomLeft)},${bottomY}`
  );
  setLine("taperTopLine", topLeft, topY - 13, topRight, topY - 13);
  setLine("taperBottomLine", bottomLeft, bottomY + 13, bottomRight, bottomY + 13);
  setLine("taperHeightLine", heightLineX, topY, heightLineX, bottomY);
  setText("taperTopLabel", centerX - 36, topY - 20, `Top ${fmt(topWidth, 1)} ft`);
  setText("taperBottomLabel", centerX - 50, bottomY + 33, `Bottom ${fmt(bottomWidth, 1)} ft`);
  setText("taperHeightLabel", Math.max(8, heightLineX - 16), (topY + bottomY) / 2, `H ${fmt(totalHeight, 1)} ft`);

  checkHeights.forEach((height, index) => {
    const clampedHeight = Math.min(Math.max(height, 0), totalHeight);
    const y = topY + (clampedHeight / totalHeight) * (bottomY - topY);
    const width = widths[index];
    const drawWidth = width * scale;
    const left = side === "left" ? anchorX - drawWidth : side === "right" ? anchorX : centerX - drawWidth / 2;
    const right = left + drawWidth;
    setLine(`checkLine${index + 1}`, left, y, right, y);
    setText(`checkLabel${index + 1}`, right + 10, y + 5, `h${index + 1}: ${fmt(width, 1)} ft`);
  });
}

function setLine(id, x1, y1, x2, y2) {
  const line = $(id);
  line.setAttribute("x1", fmtSvg(x1));
  line.setAttribute("y1", fmtSvg(y1));
  line.setAttribute("x2", fmtSvg(x2));
  line.setAttribute("y2", fmtSvg(y2));
}

function setText(id, x, y, text) {
  const el = $(id);
  el.setAttribute("x", fmtSvg(x));
  el.setAttribute("y", fmtSvg(y));
  el.textContent = text;
}

function calcArc() {
  const chord = n("arcChordFt");
  const height = n("arcHeightIn") / 12;
  if (chord <= 0 || height <= 0) {
    $("arcLength").textContent = "--";
    $("arcRadius").textContent = "--";
    $("arcExtra").textContent = "--";
    return;
  }
  const radius = (chord * chord) / (8 * height) + height / 2;
  const theta = 2 * Math.asin(chord / (2 * radius));
  const arcLength = radius * theta;
  $("arcLength").textContent = fmt(arcLength, 2);
  $("arcRadius").textContent = fmt(radius, 2);
  $("arcExtra").textContent = fmt((arcLength - chord) * 12, 1);
}

function calcCircle() {
  const diameter = n("circleDiameterFt");
  const radius = diameter / 2;
  $("circleCirc").textContent = diameter > 0 ? fmt(Math.PI * diameter, 2) : "--";
  $("circleRadius").textContent = diameter > 0 ? fmt(radius, 2) : "--";
  $("circleArea").textContent = diameter > 0 ? fmt(Math.PI * radius * radius, 2) : "--";
}

function calcSlope() {
  const riseFt = n("slopeRiseIn") / 12;
  const runFt = n("slopeRunFt");
  const length = Math.hypot(runFt, riseFt);
  const angle = Math.atan2(riseFt, runFt) * 180 / Math.PI;
  const pitch = runFt > 0 ? n("slopeRiseIn") / runFt : 0;
  $("slopeLength").textContent = length > 0 ? fmt(length, 2) : "--";
  $("slopeAngle").textContent = runFt > 0 && riseFt > 0 ? fmt(angle, 1) : "--";
  $("slopePitch").textContent = pitch > 0 ? fmt(pitch, 1) : "--";
}

function calcStairs() {
  const totalRise = n("stairTotalRise");
  const totalRunFt = n("stairTotalRunFt");
  const preferredRise = n("stairPreferredRise");
  const totalRunIn = totalRunFt * 12;
  const steps = totalRise > 0 && preferredRise > 0 ? Math.max(1, Math.round(totalRise / preferredRise)) : 0;
  const riseEach = steps > 0 ? totalRise / steps : 0;
  const tread = steps > 0 ? totalRunIn / steps : 0;
  const stringerFt = Math.hypot(totalRise, totalRunIn) / 12;
  const angle = totalRunIn > 0 && totalRise > 0 ? Math.atan(totalRise / totalRunIn) * 180 / Math.PI : 0;
  $("stairStepsOut").textContent = steps > 0 ? String(steps) : "--";
  $("stairRiseEach").textContent = riseEach > 0 ? fmt(riseEach, 2) : "--";
  $("stairTreadDepth").textContent = tread > 0 ? fmt(tread, 2) : "--";
  $("stairAngle").textContent = angle > 0 ? fmt(angle, 1) : "--";
  $("stairStringer").textContent = stringerFt > 0 ? fmt(stringerFt, 2) : "--";
  drawStairs({ steps, riseEach, tread, totalRise, totalRunIn, totalRunFt });
  updateStairNotice(riseEach, tread, steps);
}

function drawStairs(data) {
  const inputSteps = data.steps || 6;
  const visibleSteps = Math.min(Math.max(inputSteps, 1), 14);
  const left = 54;
  const right = 292;
  const bottom = 154;
  const top = 48;
  const stepW = (right - left) / visibleSteps;
  const stepH = (bottom - top) / visibleSteps;
  const points = [[left, bottom]];

  for (let i = 1; i <= visibleSteps; i += 1) {
    const x = left + stepW * i;
    const y = bottom - stepH * (i - 1);
    points.push([x, y]);
    points.push([x, bottom - stepH * i]);
  }

  $("stairShape").setAttribute("points", points.map(([x, y]) => `${fmtSvg(x)},${fmtSvg(y)}`).join(" "));
  setLine("stairStringerLine", left, bottom, right, top);
  setLine("stairTreadLine", left, bottom + 18, left + stepW, bottom + 18);
  setLine("stairStepRiseLine", left + stepW, bottom, left + stepW, bottom - stepH);
  $("stairRunLine").setAttribute("x2", fmtSvg(right));
  $("stairRiseLine").setAttribute("x1", fmtSvg(right));
  $("stairRiseLine").setAttribute("x2", fmtSvg(right));
  $("stairRiseLine").setAttribute("y2", fmtSvg(top));
  setText("stairRunLabel", left + (right - left) / 2 - 36, bottom + 42, "Total run");
  setText("stairRiseLabel", right + 8, top + (bottom - top) / 2, "Total rise");
  setText("stairTreadLabel", left + stepW / 2 - 14, bottom + 35, data.tread > 0 ? `${fmt(data.tread, 1)} in tread` : "Tread");
  setText("stairStepRiseLabel", left + stepW + 9, bottom - stepH / 2 + 4, data.riseEach > 0 ? `${fmt(data.riseEach, 1)} in rise` : "Rise");
  $("stairCountLabel").textContent = inputSteps > visibleSteps
    ? `${visibleSteps} of ${inputSteps} steps shown - simplified sketch`
    : `${visibleSteps} recommended steps`;
}

function updateStairNotice(riseEach, tread, steps) {
  const notice = $("stairNotice");
  const messages = [];
  if (steps > 14) messages.push("Showing a simplified stair sketch so the steps stay readable.");
  if (riseEach > 0 && (riseEach < 4.5 || riseEach > 8.5)) messages.push("Rise per step looks unusual. Double-check your layout and local requirements.");
  if (tread > 0 && tread < 8) messages.push("Tread depth looks tight for a typical DIY stair.");
  notice.hidden = messages.length === 0;
  notice.textContent = messages.join(" ");
}

function fmtSvg(value) {
  return Number(value.toFixed(2)).toString();
}

function recalcAll() {
  calcConcrete();
  calcArc();
  calcCircle();
  calcSlope();
  calcStairs();
}

function setupNavigation() {
  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => show(button.dataset.open));
  });
}

function setupCustomizeMenu() {
  $("customizeMenuBtn")?.addEventListener("click", openCustomizeDialog);
  $("closeCustomizeBtn")?.addEventListener("click", closeCustomizeDialog);
  $("customizeDialog")?.addEventListener("click", (event) => {
    if (event.target === $("customizeDialog")) closeCustomizeDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("customizeDialog")?.hidden) closeCustomizeDialog();
  });
  applyMenuVisibility();
}

function setupRadiusMode() {
  document.querySelectorAll("[data-radius-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      radiusMode = button.dataset.radiusMode;
      document.querySelectorAll("[data-radius-mode]").forEach((item) => {
        item.classList.toggle("active", item.dataset.radiusMode === radiusMode);
      });
      $("arcMode").hidden = radiusMode !== "arc";
      $("circleMode").hidden = radiusMode !== "circle";
    });
  });
}

function setupTaperSide() {
  document.querySelectorAll("[data-taper-side]").forEach((button) => {
    button.addEventListener("click", () => {
      taperSide = button.dataset.taperSide;
      document.querySelectorAll("[data-taper-side]").forEach((item) => {
        item.classList.toggle("active", item.dataset.taperSide === taperSide);
      });
      calcConcrete();
    });
  });
}

function setupNotes() {
  const notes = $("notesText");
  notes.value = localStorage.getItem(notesKey) || "";
  notes.addEventListener("input", () => localStorage.setItem(notesKey, notes.value));
  $("clearNotes").addEventListener("click", () => {
    if (!confirm("Clear saved notes?")) return;
    notes.value = "";
    localStorage.removeItem(notesKey);
  });
}

function setupInputs() {
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", recalcAll);
    input.addEventListener("change", recalcAll);
  });
}

setupNavigation();
setupCustomizeMenu();
setupRadiusMode();
setupTaperSide();
setupNotes();
setupInputs();
recalcAll();
