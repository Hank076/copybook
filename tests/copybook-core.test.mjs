import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { contextKeyFor, parsePhoneticData } = require("../copybook-core.js");

test("parsePhoneticData keeps all readings for a character", () => {
  const readings = parsePhoneticData("重\t91CD\tA\tㄓㄨㄥˋ\tㄔㄨㄥˊ\n");

  assert.deepEqual(readings.get("重"), ["ㄓㄨㄥˋ", "ㄔㄨㄥˊ"]);
});

test("contextKeyFor includes one previous and one next character", () => {
  const chars = ["行", "重", "行", "重"];

  assert.equal(contextKeyFor(chars, 1), "行|重|行");
  assert.equal(contextKeyFor(chars, 3), "行|重|");
});
