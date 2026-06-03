(function initCopybookCore(root) {
  function parsePhoneticData(text) {
    const map = new Map();

    for (const row of text.split(/\r?\n/)) {
      if (!row.trim()) continue;

      const columns = row.split("\t");
      const char = columns[0];
      const readings = columns.slice(3).filter(Boolean);

      if (char && readings.length > 0 && !map.has(char)) {
        map.set(char, readings);
      }
    }

    return map;
  }

  function contextKeyFor(chars, index) {
    return `${chars[index - 1] || ""}|${chars[index] || ""}|${chars[index + 1] || ""}`;
  }

  function parsePracticeChars(text) {
    return Array.from(text).filter((char) => /\p{Script=Han}/u.test(char));
  }

  const LIGHT_TONE = "˙";
  const TRAILING_TONES = new Set(["ˊ", "ˇ", "ˋ", "ˉ"]);

  function parseZhuyin(reading) {
    let body = reading || "";
    let lead = "";
    let tone = "";

    if (body.startsWith(LIGHT_TONE)) {
      lead = LIGHT_TONE;
      body = body.slice(LIGHT_TONE.length);
    }

    if (TRAILING_TONES.has(body.slice(-1))) {
      tone = body.slice(-1);
      body = body.slice(0, -1);
    }

    return { lead, body, tone };
  }

  function buildPracticeItems(chars, repeat, targetCount) {
    const items = [];
    const desiredCount = Number.isInteger(targetCount) ? targetCount : chars.length * repeat;

    if (chars.length === 0 || desiredCount <= 0) {
      return items;
    }

    while (items.length < desiredCount) {
      chars.forEach((char, sourceIndex) => {
        if (items.length < desiredCount) {
          items.push({ char, sourceIndex });
        }
      });
    }

    return items;
  }

  function calculateTargetRows(filledCellCount, columns, preferredRows) {
    const neededRows = Math.ceil(filledCellCount / columns);

    return Math.max(preferredRows, neededRows || preferredRows);
  }

  const api = {
    buildPracticeItems,
    calculateTargetRows,
    contextKeyFor,
    parsePhoneticData,
    parsePracticeChars,
    parseZhuyin,
  };

  root.CopybookCore = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "object" ? globalThis : window);
