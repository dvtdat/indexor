import { FetchResult, FETCH_CSV_FILE } from "./model";
import { appendToCsv, domainExists, getUniqueDomains } from "@/lib/csv";

const CSV_HEADERS = [
  "url",
  "domain",
  "statusCode",
  "contentType",
  "responseTime",
  "fetchedAt",
  "content",
];

// Sanitize content for CSV storage: remove newlines and limit length
function sanitizeContent(content: string, maxLength: number = 50000): string {
  return content
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, maxLength);
}

export class FetchModule {
  private static readonly MAX_WEBSITES = 10;
  private static readonly TIMEOUT_MS = 10 * 1000;

  private static readonly USER_AGENT = "IndexorBot/1.0";

  static async fetchUrl(url: string): Promise<FetchResult> {
    const canFetch = await this.canFetchDomain(url);
    if (!canFetch) {
      throw new Error(
        `Website limit reached. Maximum ${this.MAX_WEBSITES} unique domains allowed.`
      );
    }

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(url, {
        headers: {
          "User-Agent": this.USER_AGENT,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const body = await response.text();
      const contentType = response.headers.get("content-type") || "text/html";
      const domain = new URL(url).hostname;
      const fetchedAt = new Date();

      const csvRow = {
        url,
        domain,
        statusCode: String(response.status),
        contentType,
        responseTime: String(responseTime),
        fetchedAt: fetchedAt.toISOString(),
        content: sanitizeContent(body),
      };

      appendToCsv(FETCH_CSV_FILE, csvRow, CSV_HEADERS);

      return {
        url,
        domain,
        statusCode: response.status,
        contentType,
        responseTime,
        fetchedAt,
        body,
      };
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error}`);
    }
  }

  static validateResponse(result: FetchResult): boolean {
    if (result.statusCode < 200 || result.statusCode >= 300) {
      return false;
    }

    if (!result.contentType.includes("text/html")) {
      return false;
    }

    if (!result.body || result.body.trim().length === 0) {
      return false;
    }

    return true;
  }

  static canFetchDomain(url: string): boolean {
    const domain = new URL(url).hostname;

    if (domainExists(FETCH_CSV_FILE, domain)) {
      return true;
    }

    const uniqueDomains = getUniqueDomains(FETCH_CSV_FILE);
    return uniqueDomains.length < this.MAX_WEBSITES;
  }
}
