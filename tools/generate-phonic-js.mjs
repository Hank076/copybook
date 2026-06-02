import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "datas/phonic_table_Z.txt";
const targetPath = "datas/phonic_table_Z.js";
const source = readFileSync(sourcePath, "utf8");
const output = `window.PHONIC_TABLE_Z = ${JSON.stringify(source)};\n`;

writeFileSync(targetPath, output, "utf8");
