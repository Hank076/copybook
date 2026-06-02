import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { buildPracticeItems, calculateTargetRows, contextKeyFor, parsePhoneticData } = require("../copybook-core.js");

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
