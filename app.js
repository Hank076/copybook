const state = {
  readings: new Map(),
  selectedReadings: new Map(),
  dataReady: false,
  dataError: "",
  lastSelection: "",
};

const { contextKeyFor, parsePhoneticData } = window.CopybookCore;

const els = {
  textInput: document.querySelector("#textInput"),
  fontSize: document.querySelector("#fontSize"),
  fontSizeValue: document.querySelector("#fontSizeValue"),
  repeatCount: document.querySelector("#repeatCount"),
  bpmfToggle: document.querySelector("#bpmfToggle"),
  renderButton: document.querySelector("#renderButton"),
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

function render() {
  const chars = charactersFromText(els.textInput.value);
  const repeat = Math.max(1, Math.min(12, Number.parseInt(els.repeatCount.value, 10) || 1));
  const fontSize = Number.parseInt(els.fontSize.value, 10);
  const gridStyle = selectedValue("grid");
  const inkMode = selectedValue("ink");
  const showBpmf = els.bpmfToggle.checked;
  const missing = new Set();

  els.fontSizeValue.textContent = String(fontSize);
  els.repeatCount.value = String(repeat);
  els.grid.className = `grid ${gridStyle} ${inkMode}${showBpmf ? "" : " no-bpmf"}`;
  els.grid.textContent = "";

  chars.forEach((char, charIndex) => {
    const contextKey = contextKeyFor(chars, charIndex);
    const readings = state.readings.get(char) || [];
    const reading = selectedReadingFor(char, contextKey);

    if (state.dataReady && readings.length === 0) {
      missing.add(char);
    }

    for (let index = 0; index < repeat; index += 1) {
      els.grid.append(createCell(char, contextKey, reading, fontSize, readings.length > 1));
    }
  });

  updateStatus(Array.from(missing));
}

function bindEvents() {
  const controls = [
    els.textInput,
    els.fontSize,
    els.repeatCount,
    els.bpmfToggle,
    ...document.querySelectorAll('input[name="grid"], input[name="ink"]'),
  ];

  for (const control of controls) {
    control.addEventListener("input", render);
    control.addEventListener("change", render);
  }

  els.renderButton.addEventListener("click", render);
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
  render();
}

bindEvents();
render();
loadPhoneticData().then(render);
