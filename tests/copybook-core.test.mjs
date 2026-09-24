import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  LINE_BREAK,
  calculateTargetRows,
  contextKeyFor,
  layoutPracticeCells,
  readingSelectionFor,
  parsePhoneticData,
  parsePracticeChars,
  parsePracticeText,
  parseZhuyin,
  verticalPunctuationFor,
} = require("../copybook-core.js");

test("parsePhoneticData keeps all readings for a character", () => {
  const readings = parsePhoneticData("重\t91CD\tA\tㄓㄨㄥˋ\tㄔㄨㄥˊ\n");

  assert.deepEqual(readings.get("重"), ["ㄓㄨㄥˋ", "ㄔㄨㄥˊ"]);
});

test("parsePhoneticData supports compact generated rows", () => {
  const readings = parsePhoneticData("重\tㄓㄨㄥˋ\tㄔㄨㄥˊ\n");

  assert.deepEqual(readings.get("重"), ["ㄓㄨㄥˋ", "ㄔㄨㄥˊ"]);
});

test("contextKeyFor includes one previous and one next character", () => {
  const chars = ["行", "重", "行", "重"];

  assert.equal(contextKeyFor(chars, 1), "行|重|行");
  assert.equal(contextKeyFor(chars, 3), "行|重|");
});

test("parsePracticeChars keeps only Chinese characters", () => {
  assert.deepEqual(parsePracticeChars("陳A，瑋9ㄅ程🙂。𠮷"), [
    "陳",
    "瑋",
    "程",
    "𠮷",
  ]);
});

test("calculateTargetRows keeps the selected rows unless content needs more", () => {
  assert.equal(calculateTargetRows(12, 6, 10), 10);
  assert.equal(calculateTargetRows(61, 6, 10), 11);
});

test("parseZhuyin splits leading light tone, body, and trailing tone", () => {
  assert.deepEqual(parseZhuyin("ㄔㄣˊ"), {
    lead: "",
    body: "ㄔㄣ",
    tone: "ˊ",
  });
  assert.deepEqual(parseZhuyin("ㄑㄧㄡ"), { lead: "", body: "ㄑㄧㄡ", tone: "" });
  assert.deepEqual(parseZhuyin("ㄨˇ"), { lead: "", body: "ㄨ", tone: "ˇ" });
  assert.deepEqual(parseZhuyin("˙ㄌㄜ"), {
    lead: "˙",
    body: "ㄌㄜ",
    tone: "",
  });
  assert.deepEqual(parseZhuyin(""), { lead: "", body: "", tone: "" });
});

test("readingSelectionFor returns a valid selected reading", () => {
  assert.deepEqual(readingSelectionFor(["ㄒㄧㄥˊ", "ㄏㄤˊ"], 1), {
    index: 1,
    reading: "ㄏㄤˊ",
  });
  assert.deepEqual(readingSelectionFor(["ㄒㄧㄥˊ", "ㄏㄤˊ"], 9), {
    index: 0,
    reading: "ㄒㄧㄥˊ",
  });
  assert.deepEqual(readingSelectionFor([], 0), {
    index: 0,
    reading: "",
  });
});

function layoutChars(cells) {
  return cells.map((cell) => (cell ? cell.char : "_")).join("");
}

test("parsePracticeText ignores line breaks and punctuation by default", () => {
  assert.deepEqual(parsePracticeText("陳，\n瑋A"), ["陳", "瑋"]);
});

test("parsePracticeText keeps punctuation and line breaks when requested", () => {
  assert.deepEqual(
    parsePracticeText("\n陳，\r\n瑋。9\n", {
      ignoreLineBreaks: false,
      ignorePunctuation: false,
    }),
    ["陳", "，", LINE_BREAK, "瑋", "。"],
  );
});

test("layoutPracticeCells repeats the phrase while preserving source index", () => {
  const { cells, totalRows } = layoutPracticeCells(["陳", "瑋"], {
    columns: 2,
    preferredRows: 2,
    rowsPerPage: 10,
    repeatCount: 3,
  });

  assert.equal(totalRows, 3);
  assert.deepEqual(cells, [
    { char: "陳", sourceIndex: 0 },
    { char: "瑋", sourceIndex: 1 },
    { char: "陳", sourceIndex: 0 },
    { char: "瑋", sourceIndex: 1 },
    { char: "陳", sourceIndex: 0 },
    { char: "瑋", sourceIndex: 1 },
  ]);
});

test("layoutPracticeCells fills every cell when fill is on", () => {
  const { cells } = layoutPracticeCells(["陳", "瑋", "程"], {
    columns: 2,
    preferredRows: 4,
    rowsPerPage: 10,
    fillMode: "page",
  });

  assert.equal(layoutChars(cells), "陳瑋程陳瑋程陳瑋");
});

test("layoutPracticeCells starts a new column after a line break when flowing down", () => {
  const { cells } = layoutPracticeCells(["一", LINE_BREAK, "二", "三"], {
    columns: 3,
    preferredRows: 3,
    rowsPerPage: 10,
  });

  assert.equal(layoutChars(cells), "一__二三____");
});

test("layoutPracticeCells does not skip a line when the column is exactly full", () => {
  const { cells } = layoutPracticeCells(["一", "二", LINE_BREAK, "三"], {
    columns: 3,
    preferredRows: 2,
    rowsPerPage: 10,
  });

  assert.equal(layoutChars(cells), "一二三___");
});

test("layoutPracticeCells keeps blank lines for consecutive breaks", () => {
  const { cells } = layoutPracticeCells(["一", LINE_BREAK, LINE_BREAK, "二"], {
    columns: 3,
    preferredRows: 2,
    rowsPerPage: 10,
  });

  assert.equal(layoutChars(cells), "一___二_");
});

test("layoutPracticeCells starts each repetition on a new line when breaks are kept", () => {
  const { cells } = layoutPracticeCells(["一", LINE_BREAK, "二"], {
    columns: 4,
    preferredRows: 3,
    rowsPerPage: 10,
    repeatCount: 2,
  });

  assert.equal(layoutChars(cells), "一__二__一__二__");
});

test("layoutPracticeCells makes columns taller until a long line fits", () => {
  const { cells, totalRows } = layoutPracticeCells(
    ["一", "二", "三", LINE_BREAK, "四"],
    { columns: 2, preferredRows: 2, rowsPerPage: 10 },
  );

  assert.equal(totalRows, 3);
  assert.equal(layoutChars(cells), "一二三四__");
});

test("layoutPracticeCells adds whole pages when lines outnumber columns", () => {
  const { cells, totalRows } = layoutPracticeCells(
    ["一", "二", LINE_BREAK, "三", LINE_BREAK, "四"],
    { columns: 2, preferredRows: 2, rowsPerPage: 2 },
  );

  assert.equal(totalRows, 4);
  assert.equal(layoutChars(cells), "一二三_四___");
});

test("layoutPracticeCells uses the page height as column length across pages", () => {
  const { cells, totalRows } = layoutPracticeCells(
    ["一", LINE_BREAK, "二", LINE_BREAK, "三"],
    { columns: 2, preferredRows: 3, rowsPerPage: 2 },
  );

  assert.equal(totalRows, 3);
  assert.equal(layoutChars(cells), "一_二_三_");
});

test("layoutPracticeCells returns blank cells for empty input", () => {
  const { cells, totalRows } = layoutPracticeCells([], {
    columns: 2,
    preferredRows: 2,
    rowsPerPage: 10,
    fillMode: "left",
  });

  assert.equal(totalRows, 2);
  assert.equal(layoutChars(cells), "____");
});

test("verticalPunctuationFor maps punctuation to vertical forms", () => {
  assert.equal(verticalPunctuationFor("，"), "︐");
  assert.equal(verticalPunctuationFor("「"), "﹁");
  assert.equal(verticalPunctuationFor("」"), "﹂");
  assert.equal(verticalPunctuationFor("-"), "-");
});

const poemTokens = parsePracticeText("五隻小狗，\n想把貓咪。", {
  ignoreLineBreaks: false,
  ignorePunctuation: false,
});

function columnsOf(cells, rows) {
  const columns = [];

  for (let start = 0; start < cells.length; start += rows) {
    columns.push(layoutChars(cells.slice(start, start + rows)));
  }

  return columns;
}

test("layoutPracticeCells repeats the whole block leftward when filling left", () => {
  const { cells } = layoutPracticeCells(poemTokens, {
    columns: 5,
    preferredRows: 7,
    rowsPerPage: 10,
    repeatCount: 3,
    fillMode: "left",
  });

  assert.deepEqual(columnsOf(cells, 7), [
    "五隻小狗，__",
    "想把貓咪。__",
    "五隻小狗，__",
    "想把貓咪。__",
    "_______",
  ]);
});

test("layoutPracticeCells repeats the whole block downward when filling down", () => {
  const { cells } = layoutPracticeCells(poemTokens, {
    columns: 3,
    preferredRows: 11,
    rowsPerPage: 20,
    fillMode: "down",
  });

  assert.deepEqual(columnsOf(cells, 11), [
    "五隻小狗，五隻小狗，_",
    "想把貓咪。想把貓咪。_",
    "___________",
  ]);
});

test("layoutPracticeCells repeats the block downward across pages", () => {
  const { cells, totalRows } = layoutPracticeCells(["一", "二"], {
    columns: 2,
    preferredRows: 5,
    rowsPerPage: 3,
    fillMode: "down",
  });

  assert.equal(totalRows, 5);
  assert.equal(layoutChars(cells), "一二一___" + "二___");
});
