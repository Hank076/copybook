import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = "datas/phonic_table_Z.txt";
const keepListPath = "datas/保留清單.txt";
const existsPath = "datas/phonic_table_Z_4808.txt";
const missingPath = "datas/phonic_table_Z_other.txt";

const keepSet = new Set(
  readFileSync(keepListPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim().toUpperCase())
    .filter(Boolean),
);

const exists = [];
const missing = [];

for (const line of readFileSync(sourcePath, "utf8").split(/\r?\n/)) {
  if (!line.trim()) continue;

  const columns = line.split("\t");
  const unicode = columns[1]?.trim().toUpperCase();

  if (keepSet.has(unicode)) {
    exists.push(line);
  } else {
    missing.push(line);
  }
}

writeFileSync(existsPath, `${exists.join("\n")}\n`, "utf8");
writeFileSync(missingPath, `${missing.join("\n")}\n`, "utf8");

console.log(`exists: ${exists.length} -> ${existsPath}`);
console.log(`missing: ${missing.length} -> ${missingPath}`);
