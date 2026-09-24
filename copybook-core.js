(function initCopybookCore(root) {
  function parsePhoneticData(text) {
    const readingsByChar = new Map();

    for (const row of text.split(/\r?\n/)) {
      if (!row.trim()) continue;

      const columns = row.split("\t");
      const char = columns[0];
      const readingsStartIndex = /^[0-9A-F]+$/i.test(columns[1]) ? 3 : 1;
      const readings = columns.slice(readingsStartIndex).filter(Boolean);

      if (char && readings.length > 0 && !readingsByChar.has(char)) {
        readingsByChar.set(char, readings);
      }
    }

    return readingsByChar;
  }

  function contextKeyFor(practiceChars, index) {
    return `${practiceChars[index - 1] || ""}|${practiceChars[index] || ""}|${
      practiceChars[index + 1] || ""
    }`;
  }

  const LINE_BREAK = "\n";

  function isHanChar(char) {
    return /\p{Script=Han}/u.test(char);
  }

  function isPunctuationChar(char) {
    return /\p{P}/u.test(char);
  }

  // 直書時改用 Unicode 直排標點（CJK Vertical Forms）。
  const VERTICAL_PUNCTUATION = new Map(
    Array.from("，、。：；！？「」『』（）【】《》〈〉〔〕｛｝…—").map((char, index) => [
      char,
      Array.from("︐︑︒︓︔︕︖﹁﹂﹃﹄︵︶︻︼︽︾︿﹀︹︺︷︸︙︱")[index],
    ]),
  );

  function verticalPunctuationFor(char) {
    return VERTICAL_PUNCTUATION.get(char) || char;
  }

  function parsePracticeChars(text) {
    return Array.from(text).filter(isHanChar);
  }

  // 將輸入切成字元與換行記號；依選項決定是否保留換行與標點符號。
  function parsePracticeText(
    text,
    { ignoreLineBreaks = true, ignorePunctuation = true } = {},
  ) {
    const tokens = [];

    for (const char of Array.from(text.replace(/\r\n?/g, LINE_BREAK))) {
      if (char === LINE_BREAK) {
        if (!ignoreLineBreaks) tokens.push(LINE_BREAK);
      } else if (
        isHanChar(char) ||
        (!ignorePunctuation && isPunctuationChar(char))
      ) {
        tokens.push(char);
      }
    }

    while (tokens[0] === LINE_BREAK) tokens.shift();
    while (tokens[tokens.length - 1] === LINE_BREAK) tokens.pop();

    return tokens;
  }

  function readingSelectionFor(readings, requestedIndex) {
    const index =
      Number.isInteger(requestedIndex) &&
      requestedIndex >= 0 &&
      requestedIndex < readings.length
        ? requestedIndex
        : 0;

    return {
      index,
      reading: readings[index] || "",
    };
  }

  const LIGHT_TONE = "˙";
  const TRAILING_TONES = new Set(["ˊ", "ˇ", "ˋ", "ˉ"]);

  function parseZhuyin(reading) {
    let phoneticBody = reading || "";
    let leadingToneMark = "";
    let trailingToneMark = "";

    if (phoneticBody.startsWith(LIGHT_TONE)) {
      leadingToneMark = LIGHT_TONE;
      phoneticBody = phoneticBody.slice(LIGHT_TONE.length);
    }

    if (TRAILING_TONES.has(phoneticBody.slice(-1))) {
      trailingToneMark = phoneticBody.slice(-1);
      phoneticBody = phoneticBody.slice(0, -1);
    }

    return {
      lead: leadingToneMark,
      body: phoneticBody,
      tone: trailingToneMark,
    };
  }

  function calculateTargetRows(filledCellCount, columns, preferredRows) {
    const neededRows = Math.ceil(filledCellCount / columns);

    return Math.max(preferredRows, neededRows || preferredRows);
  }

  // 回傳 position 所在行的起點偏移與行長；一欄是一行，欄高是該頁列數。
  function lineSlotFor(position, { columns, rowsPerPage, totalRows }) {
    const pageCellCount = rowsPerPage * columns;
    const page = Math.floor(position / pageCellCount);
    const remainingRows = totalRows - page * rowsPerPage;
    const pageRows =
      remainingRows > 0 ? Math.min(rowsPerPage, remainingRows) : rowsPerPage;

    return {
      offset: (position - page * pageCellCount) % pageRows,
      length: pageRows,
    };
  }

  // 格子序號與（列, 欄）互轉；欄由右往左編號，列跨頁連續編號。
  function positionToCell(position, { columns, rowsPerPage, totalRows }) {
    const pageCellCount = rowsPerPage * columns;
    const page = Math.floor(position / pageCellCount);
    const pageRows = Math.min(rowsPerPage, totalRows - page * rowsPerPage);
    const offset = position - page * pageCellCount;

    return {
      row: page * rowsPerPage + (offset % pageRows),
      column: Math.floor(offset / pageRows),
    };
  }

  function cellToPosition({ row, column }, { columns, rowsPerPage, totalRows }) {
    const page = Math.floor(row / rowsPerPage);
    const pageRows = Math.min(rowsPerPage, totalRows - page * rowsPerPage);

    return (
      page * rowsPerPage * columns + column * pageRows + (row - page * rowsPerPage)
    );
  }

  // 把排好的內容視為一個區塊，向左或向下複製，只放得下完整區塊才複製。
  function tileBlock(cells, geometry, direction) {
    const blockCells = [];
    let blockWidth = 0;
    let blockHeight = 0;

    cells.forEach((item, position) => {
      if (!item) return;

      const cell = positionToCell(position, geometry);
      blockCells.push({ ...cell, item });
      blockWidth = Math.max(blockWidth, cell.column + 1);
      blockHeight = Math.max(blockHeight, cell.row + 1);
    });

    if (blockCells.length === 0) return cells;

    const isLeft = direction === "left";
    const copies = isLeft
      ? Math.floor(geometry.columns / blockWidth)
      : Math.floor(geometry.totalRows / blockHeight);
    const tiled = new Array(cells.length).fill(null);

    for (let copy = 0; copy < copies; copy += 1) {
      for (const { row, column, item } of blockCells) {
        const target = isLeft
          ? { row, column: column + copy * blockWidth }
          : { row: row + copy * blockHeight, column };

        tiled[cellToPosition(target, geometry)] = item;
      }
    }

    return tiled;
  }

  function placeTokens(tokens, geometry, { passes, targetCount }) {
    const placed = [];
    const hasLineBreak = tokens.includes(LINE_BREAK);
    const isFilling = Number.isInteger(targetCount);
    let position = 0;
    let previousWasBreak = false;

    if (!tokens.some((token) => token !== LINE_BREAK)) {
      return { placed, endPosition: 0 };
    }

    const advanceLine = () => {
      const { offset, length } = lineSlotFor(position, geometry);

      // 剛好寫滿一行時不再多跳；連續換行才留下空行。
      if (offset > 0 || previousWasBreak) position += length - offset;
      previousWasBreak = true;
    };

    for (
      let pass = 0;
      isFilling ? position < targetCount : pass < passes;
      pass += 1
    ) {
      // 保留換行時，每次重複整句都從新的一行開始。
      if (pass > 0 && hasLineBreak) {
        previousWasBreak = false;
        advanceLine();
      }

      let sourceIndex = 0;

      for (const token of tokens) {
        if (isFilling && position >= targetCount) break;

        if (token === LINE_BREAK) {
          advanceLine();
          continue;
        }

        placed.push({ position, char: token, sourceIndex });
        sourceIndex += 1;
        position += 1;
        previousWasBreak = false;
      }
    }

    return { placed, endPosition: position };
  }

  // 依直書順序把內容放進格子，回傳每格內容（空白練習格為 null）與總列數。
  // fillMode：none 不填滿、page 整句連續填滿、left 向左複製區塊、down 向下複製區塊。
  function layoutPracticeCells(
    tokens,
    {
      columns,
      preferredRows,
      rowsPerPage,
      repeatCount = 1,
      fillMode = "none",
    },
  ) {
    const geometryFor = (totalRows) => ({
      columns,
      rowsPerPage,
      totalRows,
    });
    const passes = fillMode === "none" ? repeatCount : 1;
    const hasLineBreak = tokens.includes(LINE_BREAK);
    let totalRows = preferredRows;
    let placement = placeTokens(tokens, geometryFor(totalRows), {
      passes,
    });

    // 欄高隨總列數改變，需重排到總列數足以容納內容為止。
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const neededRows = calculateTargetRows(
        placement.endPosition,
        columns,
        preferredRows,
      );

      if (neededRows <= totalRows) break;

      // 保留換行且跨頁時以整頁增加，讓每頁欄高一致，換欄位置才會穩定。
      totalRows =
        hasLineBreak && neededRows > rowsPerPage
          ? Math.ceil(neededRows / rowsPerPage) * rowsPerPage
          : neededRows;
      placement = placeTokens(tokens, geometryFor(totalRows), {
        passes: repeatCount,
      });
    }

    const cellCount = totalRows * columns;

    if (fillMode === "page") {
      placement = placeTokens(tokens, geometryFor(totalRows), {
        targetCount: cellCount,
      });
    }

    const cells = new Array(cellCount).fill(null);

    for (const { position, char, sourceIndex } of placement.placed) {
      if (position < cellCount) cells[position] = { char, sourceIndex };
    }

    if (fillMode === "left" || fillMode === "down") {
      return {
        cells: tileBlock(cells, geometryFor(totalRows), fillMode),
        totalRows,
      };
    }

    return { cells, totalRows };
  }

  const api = {
    LINE_BREAK,
    calculateTargetRows,
    contextKeyFor,
    isHanChar,
    layoutPracticeCells,
    parsePhoneticData,
    parsePracticeChars,
    parsePracticeText,
    parseZhuyin,
    readingSelectionFor,
    verticalPunctuationFor,
  };

  root.CopybookCore = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "object" ? globalThis : window);
