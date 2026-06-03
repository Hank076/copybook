import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const {
  buildPracticeItems,
  calculateTargetRows,
  contextKeyFor,
  readingSelectionFor,
  parsePhoneticData,
  parsePracticeChars,
  parseZhuyin,
} = require("../copybook-core.js");

test("parsePhoneticData keeps all readings for a character", () => {
  const readings = parsePhoneticData("重\t91CD\tA\tㄓㄨㄥˋ\tㄔㄨㄥˊ\n");

  assert.deepEqual(readings.get("重"), ["ㄓㄨㄥˋ", "ㄔㄨㄥˊ"]);
});

test("contextKeyFor includes one previous and one next character", () => {
  const chars = ["行", "重", "行", "重"];

  assert.equal(contextKeyFor(chars, 1), "行|重|行");
  assert.equal(contextKeyFor(chars, 3), "行|重|");
});

test("buildPracticeItems repeats the whole phrase while preserving source index", () => {
  const items = buildPracticeItems(["陳", "瑋"], 3);

  assert.deepEqual(items, [
    { char: "陳", sourceIndex: 0 },
    { char: "瑋", sourceIndex: 1 },
    { char: "陳", sourceIndex: 0 },
    { char: "瑋", sourceIndex: 1 },
    { char: "陳", sourceIndex: 0 },
    { char: "瑋", sourceIndex: 1 },
  ]);
});

test("parsePracticeChars keeps only Chinese characters", () => {
  assert.deepEqual(parsePracticeChars("陳A，瑋9ㄅ程🙂。𠮷"), [
    "陳",
    "瑋",
    "程",
    "𠮷",
  ]);
});

test("buildPracticeItems fills to target count by repeating the phrase", () => {
  const items = buildPracticeItems(["陳", "瑋", "程"], 1, 8);

  assert.deepEqual(items, [
    { char: "陳", sourceIndex: 0 },
    { char: "瑋", sourceIndex: 1 },
    { char: "程", sourceIndex: 2 },
    { char: "陳", sourceIndex: 0 },
    { char: "瑋", sourceIndex: 1 },
    { char: "程", sourceIndex: 2 },
    { char: "陳", sourceIndex: 0 },
    { char: "瑋", sourceIndex: 1 },
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
