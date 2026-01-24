export interface ParsedContent {
  url: string;
  title?: string;
  description?: string;
  links: string[];
  images: string[];
  text: string;
  parsedAt: Date;
}

export const PARSED_CSV_HEADERS: (keyof ParsedContent)[] = [
  "url",
  "title",
  "description",
  "links",
  "images",
  "text",
  "parsedAt",
];

export const PARSED_CSV_FILE = "parsed_content.csv";
