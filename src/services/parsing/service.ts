import { ParsedContent, ParsedContentModel } from "./model";
import dbConnect from "@/lib/mongodb";
import * as cheerio from "cheerio";

export class ParsingModule {
  static async parseHtml(
    html: string,
    baseUrl: string
  ): Promise<ParsedContent> {
    await dbConnect();

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

    const links = await this.extractLinks(html, baseUrl);

    const text = await this.extractText(html);

    const parsedAt = new Date();

    const parsedContent = {
      url: baseUrl,
      title,
      description,
      links,
      images: [],
      text,
      parsedAt,
    };

    await ParsedContentModel.findOneAndUpdate(
      { url: baseUrl },
      parsedContent,
      { upsert: true, new: true }
    );

    return parsedContent;
  }

  static async extractLinks(html: string, baseUrl: string): Promise<string[]> {
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

  static async extractText(html: string): Promise<string> {
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header").remove();

    const text = $("body").text() || $.text();

    return text.replace(/\s+/g, " ").trim().substring(0, 10000);
  }
}
