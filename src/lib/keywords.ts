import * as fs from "fs";
import * as path from "path";

let cachedKeywords: string[] | null = null;

export function loadKeywords(): string[] {
  if (cachedKeywords) {
    return cachedKeywords;
  }

  const keywordsPath = path.join(process.cwd(), "keywords.txt");

  if (!fs.existsSync(keywordsPath)) {
    console.warn("keywords.txt not found, using empty keywords list");
    return [];
  }

  const content = fs.readFileSync(keywordsPath, "utf-8");
  cachedKeywords = content
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0);

  console.log(`Loaded ${cachedKeywords.length} keywords from keywords.txt`);
  return cachedKeywords;
}

export function matchesKeywords(text: string, keywords?: string[]): boolean {
  const keywordList = keywords && keywords.length > 0 ? keywords : loadKeywords();

  if (keywordList.length === 0) {
    return true; // No keywords = match all
  }

  const lowerText = text.toLowerCase();

  return keywordList.some((keyword) => lowerText.includes(keyword));
}

export function getMatchedKeywords(text: string, keywords?: string[]): string[] {
  const keywordList = keywords && keywords.length > 0 ? keywords : loadKeywords();

  if (keywordList.length === 0) {
    return [];
  }

  const lowerText = text.toLowerCase();

  return keywordList.filter((keyword) => lowerText.includes(keyword));
}
