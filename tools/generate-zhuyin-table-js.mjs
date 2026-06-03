import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "datas/phonic_table_Z.txt";
const targetPath = "datas/zhuyin-table.js";
const zhuyinTableText = readFileSync(sourcePath, "utf8");
const compactZhuyinTableText =
  zhuyinTableText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((row) => {
      const columns = row.split("\t");

      return [columns[0], ...columns.slice(3).filter(Boolean)].join("\t");
    })
    .join("\n") + "\n";
const browserScript = `window.ZHUYIN_TABLE = ${JSON.stringify(
  compactZhuyinTableText,
)};\n`;

writeFileSync(targetPath, browserScript, "utf8");
