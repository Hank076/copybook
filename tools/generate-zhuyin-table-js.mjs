import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "datas/phonic_table_Z.txt";
const targetPath = "datas/zhuyin-table.js";
const zhuyinTableText = readFileSync(sourcePath, "utf8");
const browserScript = `window.ZHUYIN_TABLE = ${JSON.stringify(zhuyinTableText)};\n`;

writeFileSync(targetPath, browserScript, "utf8");
