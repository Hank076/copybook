(function initCopybookCore(root) {
  function parsePhoneticData(text) {
    const readingsByChar = new Map();

    for (const row of text.split(/\r?\n/)) {
      if (!row.trim()) continue;

      const columns = row.split("\t");
      const char = columns[0];
      const readings = columns.slice(3).filter(Boolean);

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

  function parsePracticeChars(text) {
    return Array.from(text).filter((char) => /\p{Script=Han}/u.test(char));
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

  function buildPracticeItems(practiceChars, repeatCount, targetCount) {
    const practiceItems = [];
    const targetItemCount = Number.isInteger(targetCount)
      ? targetCount
      : practiceChars.length * repeatCount;

    if (practiceChars.length === 0 || targetItemCount <= 0) {
      return practiceItems;
    }

    while (practiceItems.length < targetItemCount) {
      practiceChars.forEach((char, sourceIndex) => {
        if (practiceItems.length < targetItemCount) {
          practiceItems.push({ char, sourceIndex });
        }
      });
    }

    return practiceItems;
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
    readingSelectionFor,
  };

  root.CopybookCore = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "object" ? globalThis : window);
