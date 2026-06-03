import { readFileSync, writeFileSync } from "node:fs";

const tables = [
  {
    sourcePath: "datas/phonic_table_Z.txt",
    targetPath: "datas/phonic_table_Z.js",
    globalName: "PHONIC_TABLE_Z",
  },
  {
    sourcePath: "datas/phonic_table_Z_4808.txt",
    targetPath: "datas/phonic_table_Z_4808.js",
    globalName: "PHONIC_TABLE_Z_4808",
  },
  {
    sourcePath: "datas/phonic_table_Z_other.txt",
    targetPath: "datas/phonic_table_Z_other.js",
    globalName: "PHONIC_TABLE_Z_OTHER",
  },
];

for (const { sourcePath, targetPath, globalName } of tables) {
  const source = readFileSync(sourcePath, "utf8");
  const output = `window.${globalName} = ${JSON.stringify(source)};\n`;

  writeFileSync(targetPath, output, "utf8");
  console.log(`${sourcePath} -> ${targetPath}`);
}
