import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  values.push(current);
  return values;
}

export function appendToCsv<T extends Record<string, unknown>>(
  filename: string,
  data: T,
  headers: string[]
): void {
  ensureDataDir();

  const filePath = path.join(DATA_DIR, filename);
  const fileExists = fs.existsSync(filePath);

  const row = headers.map((header) => escapeCsvValue(data[header])).join(",");

  if (!fileExists) {
    const headerRow = headers.map((h) => escapeCsvValue(String(h))).join(",");
    fs.writeFileSync(filePath, headerRow + "\n" + row + "\n");
  } else {
    fs.appendFileSync(filePath, row + "\n");
  }
}

export function readFromCsv<T>(
  filename: string,
  headers: string[]
): T[] {
  ensureDataDir();

  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim() !== "");

  if (lines.length <= 1) {
    return [];
  }

  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, unknown> = {};

    headers.forEach((header, index) => {
      obj[header as string] = values[index] || "";
    });

    return obj as T;
  });
}

export function findInCsv<T>(
  filename: string,
  headers: string[],
  predicate: (row: T) => boolean
): T | undefined {
  const rows = readFromCsv<T>(filename, headers);
  return rows.find(predicate);
}

export function clearCsv(filename: string): void {
  ensureDataDir();

  const filePath = path.join(DATA_DIR, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getUniqueDomains(filename: string): string[] {
  ensureDataDir();

  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim() !== "");

  if (lines.length <= 1) {
    return [];
  }

  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine);
  const domainIndex = headers.indexOf("domain");

  if (domainIndex === -1) {
    return [];
  }

  const domains = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values[domainIndex]) {
      domains.add(values[domainIndex]);
    }
  }

  return Array.from(domains);
}

export function domainExists(filename: string, domain: string): boolean {
  const domains = getUniqueDomains(filename);
  return domains.includes(domain);
}
