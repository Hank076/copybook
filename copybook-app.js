const appState = {
  zhuyinReadingsByChar: new Map(),
  selectedReadingIndexByContext: new Map(),
  dataReady: false,
  dataError: "",
  lastSelection: "",
};

const {
  buildPracticeItems,
  calculateTargetRows,
  contextKeyFor,
  parsePhoneticData,
  parsePracticeChars,
  parseZhuyin,
} = window.CopybookCore;

const PAGE = {
  widthMm: 210,
  heightMm: 297,
  padHorizontalMm: 13,
  padVerticalMm: 12,
  zhuyinColumnPx: 34,
  cellBorderPx: 1.2,
};
const PX_TO_MM = 25.4 / 96;

const dom = {
  textInput: document.querySelector("#textInput"),
  repeatCount: document.querySelector("#repeatCount"),
  columnCount: document.querySelector("#columnCount"),
  rowCount: document.querySelector("#rowCount"),
  zhuyinToggle: document.querySelector("#zhuyinToggle"),
  fillPageToggle: document.querySelector("#fillPageToggle"),
  printButton: document.querySelector("#printButton"),
  status: document.querySelector("#status"),
  sheetFit: document.querySelector("#sheetFit"),
};

function maxRowsPerPage(columns, showZhuyin) {
  const gridWidthMm = PAGE.widthMm - PAGE.padHorizontalMm * 2;
  const squareSideMm =
    gridWidthMm / columns - (showZhuyin ? PAGE.zhuyinColumnPx * PX_TO_MM : 0);
  const rowPitchMm = squareSideMm + PAGE.cellBorderPx * PX_TO_MM;
  const usableHeightMm = PAGE.heightMm - PAGE.padVerticalMm * 2;

  return Math.max(1, Math.floor(usableHeightMm / rowPitchMm));
}

function selectedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`).value;
}

function currentMissingPracticeChars(practiceChars) {
  const missingChars = new Set();

  if (!appState.dataReady) {
    return [];
  }

  for (const practiceChar of practiceChars) {
    if ((appState.zhuyinReadingsByChar.get(practiceChar) || []).length === 0) {
      missingChars.add(practiceChar);
    }
  }

  return Array.from(missingChars);
}

async function loadPhoneticData() {
  try {
    if (typeof window.ZHUYIN_TABLE === "string") {
      appState.zhuyinReadingsByChar = parsePhoneticData(window.ZHUYIN_TABLE);
      appState.dataReady = true;
      appState.dataError = "";
      return;
    }

    const response = await fetch("datas/phonic_table_Z.txt");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    appState.zhuyinReadingsByChar = parsePhoneticData(text);
    appState.dataReady = true;
    appState.dataError = "";
  } catch (error) {
    appState.dataReady = false;
    appState.dataError = error instanceof Error ? error.message : "未知錯誤";
  }
}

function selectedReadingFor(char, contextKey) {
  const readings = appState.zhuyinReadingsByChar.get(char) || [];
  const selectedIndex =
    appState.selectedReadingIndexByContext.get(contextKey) || 0;

  return readings[selectedIndex] || "";
}

function renderZhuyin(zhuyinContainer, reading) {
  zhuyinContainer.textContent = "";

  if (!reading) return;

  const { lead, body, tone } = parseZhuyin(reading);
  const zhuyinSyllable = document.createElement("ruby");
  zhuyinSyllable.className = "zhuyin-syllable";

  const zhuyinBody = document.createElement("span");
  zhuyinBody.className = "zhuyin-body";

  if (lead) {
    const lightToneMark = document.createElement("span");
    lightToneMark.className = "zhuyin-light-tone";
    lightToneMark.textContent = lead;
    zhuyinBody.append(lightToneMark);
  }

  zhuyinBody.append(document.createTextNode(body));
  zhuyinSyllable.append(zhuyinBody);

  if (tone) {
    const rpOpen = document.createElement("rp");
    rpOpen.textContent = "（";
    const rt = document.createElement("rt");
    rt.className = "zhuyin-tone";
    rt.textContent = tone;
    const rpClose = document.createElement("rp");
    rpClose.textContent = "）";
    zhuyinSyllable.append(rpOpen, rt, rpClose);
  }

  zhuyinContainer.append(zhuyinSyllable);
}

function updateReadingCells(contextKey, reading) {
  document.querySelectorAll(".cell").forEach((cell) => {
    if (cell.dataset.contextKey === contextKey) {
      renderZhuyin(cell.querySelector(".zhuyin"), reading);
    }
  });
}

function createZhuyinContainer(reading = "") {
  const zhuyin = document.createElement("span");
  zhuyin.className = "zhuyin";
  renderZhuyin(zhuyin, reading);

  return zhuyin;
}

function createCell(char, contextKey, reading, isPolyphonic) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.char = char;
  cell.dataset.contextKey = contextKey;

  if (isPolyphonic) {
    cell.classList.add("polyphonic");
    cell.title = "點選切換讀音";
  }

  const charNode = document.createElement("span");
  charNode.className = "char";
  charNode.textContent = char;

  const square = createSquare();
  square.append(charNode);
  cell.append(square, createZhuyinContainer(reading));
  return cell;
}

function createPracticeCell() {
  const cell = document.createElement("div");
  cell.className = "cell";

  cell.append(createSquare(), createZhuyinContainer());
  return cell;
}

function createSquare() {
  const square = document.createElement("div");
  square.className = "square";
  addGuideLines(square);

  return square;
}

function addGuideLines(square) {
  const guideClassNames = [
    "guide center-v",
    "guide center-h",
    "guide diagonal-a",
    "guide diagonal-b",
  ];

  for (const className of guideClassNames) {
    const guide = document.createElement("span");
    guide.className = className;
    square.append(guide);
  }
}

function updateStatus(missingChars) {
  const loadedMessage =
    `已載入 ${appState.zhuyinReadingsByChar.size} 筆注音。`;
  const polyphonicHint = "點選多音字可依前後各 1 字上下文切換讀音。";

  if (appState.dataError) {
    dom.status.textContent =
      `注音資料載入失敗：${appState.dataError}。若直接用 file:// 開啟時失敗，請改用本機伺服器開啟。`;
    return;
  }

  if (!appState.dataReady) {
    dom.status.textContent = "正在載入注音資料...";
    return;
  }

  if (missingChars.length > 0) {
    dom.status.textContent =
      `${loadedMessage}查不到注音：${missingChars.join("、")}。${polyphonicHint}`;
    return;
  }

  dom.status.textContent =
    appState.lastSelection || `${loadedMessage}${polyphonicHint}`;
}

function clampNumber(input, min, max, fallback) {
  const value = Number.parseInt(input.value, 10);
  return Math.max(min, Math.min(max, Number.isNaN(value) ? fallback : value));
}

function readRenderSettings() {
  const practiceChars = parsePracticeChars(dom.textInput.value);
  const repeat = clampNumber(dom.repeatCount, 0, 12, 0);

  return {
    practiceChars,
    repeat,
    sentenceCount: repeat + 1,
    columns: clampNumber(dom.columnCount, 4, 8, 6),
    preferredRows: clampNumber(dom.rowCount, 8, 18, 11),
    gridStyle: selectedValue("grid"),
    inkMode: selectedValue("ink"),
    showZhuyin: dom.zhuyinToggle.checked,
    fillPage: dom.fillPageToggle.checked,
  };
}

function syncControlValues({ repeat, columns, preferredRows, fillPage }) {
  dom.repeatCount.value = String(repeat);
  dom.repeatCount.disabled = fillPage;
  dom.columnCount.value = String(columns);
  dom.rowCount.value = String(preferredRows);
}

function gridClassNameFor({ gridStyle, inkMode, showZhuyin }) {
  return `grid ${gridStyle} ${inkMode}${showZhuyin ? "" : " no-zhuyin"}`;
}

function buildCells(practiceChars, practiceItems, totalCellCount) {
  const cells = practiceItems.map(({ char, sourceIndex }) => {
    const contextKey = contextKeyFor(practiceChars, sourceIndex);
    const readings = appState.zhuyinReadingsByChar.get(char) || [];
    const reading = selectedReadingFor(char, contextKey);

    return createCell(char, contextKey, reading, readings.length > 1);
  });

  for (let index = practiceItems.length; index < totalCellCount; index += 1) {
    cells.push(createPracticeCell());
  }

  return cells;
}

function renderPages({ cells, columns, totalRows, rowsPerPage, gridClassName }) {
  dom.sheetFit.textContent = "";

  for (let rowOffset = 0; rowOffset < totalRows; rowOffset += rowsPerPage) {
    const pageRows = Math.min(rowsPerPage, totalRows - rowOffset);
    const grid = document.createElement("div");
    grid.className = gridClassName;
    grid.style.setProperty("--grid-column-count", String(columns));
    grid.style.setProperty("--grid-row-count", String(pageRows));

    const start = rowOffset * columns;
    grid.append(...cells.slice(start, start + pageRows * columns));

    const sheet = document.createElement("article");
    sheet.className = "sheet";
    sheet.append(grid);
    dom.sheetFit.append(sheet);
  }
}

function render() {
  const settings = readRenderSettings();
  const {
    practiceChars,
    sentenceCount,
    columns,
    preferredRows,
    fillPage,
    showZhuyin,
  } = settings;
  const basePracticeItems = buildPracticeItems(practiceChars, sentenceCount);
  const totalRows = calculateTargetRows(
    basePracticeItems.length,
    columns,
    preferredRows,
  );
  const totalCellCount = columns * totalRows;
  const practiceItems = buildPracticeItems(
    practiceChars,
    sentenceCount,
    fillPage ? totalCellCount : undefined,
  );
  const cells = buildCells(practiceChars, practiceItems, totalCellCount);
  const rowsPerPage = maxRowsPerPage(columns, showZhuyin);

  syncControlValues(settings);
  renderPages({
    cells,
    columns,
    totalRows,
    rowsPerPage,
    gridClassName: gridClassNameFor(settings),
  });
  updateStatus(currentMissingPracticeChars(practiceChars));
}

function bindEvents() {
  const numberInputs = [dom.repeatCount, dom.columnCount, dom.rowCount];
  const choiceControls = [
    dom.zhuyinToggle,
    dom.fillPageToggle,
    ...document.querySelectorAll('input[name="grid"], input[name="ink"]'),
  ];

  dom.textInput.addEventListener("input", () => {
    appState.lastSelection = "";
    render();
  });

  for (const numberInput of numberInputs) {
    numberInput.addEventListener("input", render);
  }

  for (const control of choiceControls) {
    control.addEventListener("change", render);
  }

  dom.printButton.addEventListener("click", () => window.print());
  dom.sheetFit.addEventListener("click", handleGridClick);
}

function handleGridClick(event) {
  const cell = event.target.closest(".cell");

  if (!cell) return;

  const char = cell.dataset.char;
  const contextKey = cell.dataset.contextKey;
  const readings = appState.zhuyinReadingsByChar.get(char) || [];

  if (!char || !contextKey || readings.length < 2) return;

  const currentIndex =
    appState.selectedReadingIndexByContext.get(contextKey) || 0;
  const nextIndex = (currentIndex + 1) % readings.length;

  appState.selectedReadingIndexByContext.set(contextKey, nextIndex);
  appState.lastSelection =
    `「${char}」已切換為 ${readings[nextIndex]}。相同前後各 1 字上下文的格子會同步更新。`;
  updateReadingCells(contextKey, readings[nextIndex]);
  updateStatus(
    currentMissingPracticeChars(parsePracticeChars(dom.textInput.value)),
  );
}

bindEvents();
render();
loadPhoneticData().then(render);
