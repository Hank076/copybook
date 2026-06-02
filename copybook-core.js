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

  const api = {
    contextKeyFor,
    parsePhoneticData,
  };

  root.CopybookCore = api;

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "object" ? globalThis : window);
