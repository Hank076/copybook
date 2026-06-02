const state = {
  readings: new Map(),
  selectedReadings: new Map(),
  dataReady: false,
  dataError: "",
  lastSelection: "",
};

const { buildPracticeItems, calculateTargetRows, contextKeyFor, parsePhoneticData } = window.CopybookCore;
const COPY_GRID_HEIGHT_MM = 231;

const els = {
  textInput: document.querySelector("#textInput"),
  fontSize: document.querySelector("#fontSize"),
  fontSizeValue: document.querySelector("#fontSizeValue"),
  repeatCount: document.querySelector("#repeatCount"),
  columnCount: document.querySelector("#columnCount"),
  columnCountValue: document.querySelector("#columnCountValue"),
  rowCount: document.querySelector("#rowCount"),
  rowCountValue: document.querySelector("#rowCountValue"),
  characterCount: document.querySelector("#characterCount"),
  cellCount: document.querySelector("#cellCount"),
  bpmfToggle: document.querySelector("#bpmfToggle"),
  fillPageToggle: document.querySelector("#fillPageToggle"),
  printButton: document.querySelector("#printButton"),
  status: document.querySelector("#status"),
  grid: document.querySelector("#grid"),
};

function selectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function charactersFromText(text) {
  return Array.from(text).filter((char) => !/\s|[，。！？、；：「」『』（）()]/u.test(char));
}

async function loadPhoneticData() {
  try {
    if (typeof window.PHONIC_TABLE_Z === "string") {
      state.readings = parsePhoneticData(window.PHONIC_TABLE_Z);
      state.dataReady = true;
      state.dataError = "";
      return;
    }

    const response = await fetch("datas/phonic_table_Z.txt");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    state.readings = parsePhoneticData(text);
    state.dataReady = true;
    state.dataError = "";
  } catch (error) {
    state.dataReady = false;
    state.dataError = error instanceof Error ? error.message : "未知錯誤";
  }
}

function selectedReadingFor(char, contextKey) {
  const readings = state.readings.get(char) || [];
  const selectedIndex = state.selectedReadings.get(contextKey) || 0;

  return readings[selectedIndex] || "";
}

function updateReadingCells(contextKey, reading) {
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.contextKey === contextKey) {
      cell.querySelector(".bpmf").textContent = reading;
    }
  });
}

function createCell(char, contextKey, reading, fontSize, isPolyphonic) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.char = char;
  cell.dataset.contextKey = contextKey;

  if (isPolyphonic) {
    cell.classList.add("polyphonic");
    cell.title = "點選切換讀音";
  }

  const square = document.createElement("div");
  square.className = "square";
  addGuideLines(square);

  const charNode = document.createElement("span");
  charNode.className = "char";
  charNode.textContent = char;
  charNode.style.fontSize = `${fontSize}px`;
  square.append(charNode);

  const bpmf = document.createElement("span");
  bpmf.className = "bpmf";
  bpmf.textContent = reading;

  cell.append(square, bpmf);
  return cell;
}

function createPracticeCell() {
  const cell = document.createElement("div");
  cell.className = "cell practice-cell";

  const square = document.createElement("div");
  square.className = "square";
  addGuideLines(square);

  const bpmf = document.createElement("span");
  bpmf.className = "bpmf";

  cell.append(square, bpmf);
  return cell;
}

function addGuideLines(square) {
  for (const className of ["guide center-v", "guide center-h", "guide diagonal-a", "guide diagonal-b"]) {
    const guide = document.createElement("span");
    guide.className = className;
    square.append(guide);
  }
}

function updateStatus(missingChars) {
  if (state.dataError) {
    els.status.textContent = `注音資料載入失敗：${state.dataError}。若直接用 file:// 開啟時失敗，請改用本機伺服器開啟。`;
    return;
  }

  if (!state.dataReady) {
    els.status.textContent = "正在載入注音資料...";
    return;
  }

  if (missingChars.length > 0) {
    els.status.textContent = `已載入 ${state.readings.size} 筆注音。查不到注音：${missingChars.join("、")}。點選多音字可依前後各 1 字上下文切換讀音。`;
    return;
  }

  els.status.textContent = state.lastSelection || `已載入 ${state.readings.size} 筆注音。點選多音字可依前後各 1 字上下文切換讀音。`;
}

function clampNumber(input, min, max, fallback) {
  const value = Number.parseInt(input.value, 10);
  return Math.max(min, Math.min(max, Number.isNaN(value) ? fallback : value));
}

function render() {
  const chars = charactersFromText(els.textInput.value);
  const repeat = clampNumber(els.repeatCount, 1, 12, 1);
  const columns = clampNumber(els.columnCount, 4, 8, 6);
  const preferredRows = clampNumber(els.rowCount, 8, 18, 11);
  const fontSize = Number.parseInt(els.fontSize.value, 10);
  const gridStyle = selectedValue("grid");
  const inkMode = selectedValue("ink");
  const showBpmf = els.bpmfToggle.checked;
  const fillPage = els.fillPageToggle.checked;
  const missing = new Set();

  els.fontSizeValue.textContent = String(fontSize);
  els.repeatCount.value = String(repeat);
  els.columnCount.value = String(columns);
  els.columnCountValue.textContent = String(columns);
  els.rowCount.value = String(preferredRows);
  els.characterCount.textContent = String(chars.length);
  els.grid.className = `grid ${gridStyle} ${inkMode}${showBpmf ? "" : " no-bpmf"}`;
  els.grid.style.setProperty("--columns", String(columns));
  els.grid.style.removeProperty("--rows");
  els.grid.textContent = "";

  const basePracticeItems = buildPracticeItems(chars, repeat);
  const targetRows = calculateTargetRows(basePracticeItems.length, columns, preferredRows);
  const targetCellCount = columns * targetRows;
  const practiceItems = buildPracticeItems(chars, repeat, fillPage ? targetCellCount : undefined);
  const cellHeight = COPY_GRID_HEIGHT_MM / targetRows;

  practiceItems.forEach(({ char, sourceIndex }) => {
    const contextKey = contextKeyFor(chars, sourceIndex);
    const readings = state.readings.get(char) || [];
    const reading = selectedReadingFor(char, contextKey);

    if (state.dataReady && readings.length === 0) {
      missing.add(char);
    }

    els.grid.append(createCell(char, contextKey, reading, fontSize, readings.length > 1));
  });

  for (let index = practiceItems.length; index < targetCellCount; index += 1) {
    els.grid.append(createPracticeCell());
  }

  els.cellCount.textContent = String(targetCellCount);
  els.rowCountValue.textContent = String(targetRows);
  els.grid.style.setProperty("--rows", String(targetRows));
  els.grid.style.setProperty("--cell-height", `${cellHeight.toFixed(3)}mm`);

  updateStatus(Array.from(missing));
}

function bindEvents() {
  const controls = [
    els.textInput,
    els.fontSize,
    els.repeatCount,
    els.columnCount,
    els.rowCount,
    els.bpmfToggle,
    els.fillPageToggle,
    ...document.querySelectorAll('input[name="grid"], input[name="ink"]'),
  ];

  for (const control of controls) {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  }

  els.printButton.addEventListener("click", () => window.print());
  els.grid.addEventListener("click", handleGridClick);
}

function handleGridClick(event) {
  const cell = event.target.closest(".cell");

  if (!cell) return;

  const char = cell.dataset.char;
  const contextKey = cell.dataset.contextKey;
  const readings = state.readings.get(char) || [];

  if (!char || !contextKey || readings.length < 2) return;

  const currentIndex = state.selectedReadings.get(contextKey) || 0;
  const nextIndex = (currentIndex + 1) % readings.length;

  state.selectedReadings.set(contextKey, nextIndex);
  state.lastSelection = `「${char}」已切換為 ${readings[nextIndex]}。相同前後各 1 字上下文的格子會同步更新。`;
  updateReadingCells(contextKey, readings[nextIndex]);
  updateStatus([]);
}

bindEvents();
render();
loadPhoneticData().then(render);
