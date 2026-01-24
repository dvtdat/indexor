import { ParsedContent, PARSED_CSV_FILE } from "./model";
import { appendToCsv } from "@/lib/csv";
import * as cheerio from "cheerio";

const CSV_HEADERS = [
  "url",
  "title",
  "description",
  "links",
  "images",
  "text",
  "parsedAt",
];

export class ParsingModule {
  static async parseHtml(
    html: string,
    baseUrl: string
  ): Promise<ParsedContent> {
    const $ = cheerio.load(html);

    const title =
      $("title").text().trim() ||
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      "";

    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    const links = this.extractLinks(html, baseUrl);
    const text = this.extractText(html);
    const parsedAt = new Date();

    return {
      url: baseUrl,
      title,
      description,
      links,
      images: [],
      text,
      parsedAt,
    };
  }

  static saveToCsv(parsedContent: ParsedContent): void {
    const sanitize = (str: string) => str.replace(/[\r\n]+/g, " ").trim();

    const csvRow = {
      url: parsedContent.url,
      title: sanitize(parsedContent.title || ""),
      description: sanitize(parsedContent.description || ""),
      links: JSON.stringify(parsedContent.links),
      images: JSON.stringify(parsedContent.images),
      text: sanitize(parsedContent.text),
      parsedAt: parsedContent.parsedAt.toISOString(),
    };

    appendToCsv(PARSED_CSV_FILE, csvRow, CSV_HEADERS);
  }

  static extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links = new Set<string>();

    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, baseUrl);

        if (
          absoluteUrl.protocol === "http:" ||
          absoluteUrl.protocol === "https:"
        ) {
          absoluteUrl.hash = "";
          links.add(absoluteUrl.toString());
        }
      } catch {}
    });

    return Array.from(links);
  }

  static extractText(html: string): string {
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header").remove();

    const text = $("body").text() || $.text();

    return text.replace(/\s+/g, " ").trim().substring(0, 10000);
  }
}
