import { FetchResult, FetchResultModel } from "./model";
import dbConnect from "@/lib/mongodb";

export class FetchModule {
  private static readonly MAX_WEBSITES = 10;
  private static readonly TIMEOUT_MS = 10 * 1000;
  private static readonly USER_AGENT = "IndexorBot/1.0";

  static async fetchUrl(url: string) {
    await dbConnect();

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

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const domain = new URL(url).hostname;
      const fetchedAt = new Date();

      await FetchResultModel.create({
        url,
        domain,
        statusCode: response.status,
        headers,
        body,
        contentType,
        responseTime,
        fetchedAt,
      });

      return {
        url,
        statusCode: response.status,
        headers,
        body,
        contentType,
        responseTime,
        fetchedAt,
      } as FetchResult;
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error}`);
    }
  }

  static async validateResponse(result: FetchResult) {
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

  static async canFetchDomain(url: string) {
    await dbConnect();

    const domain = new URL(url).hostname;

    const existingDomain = await FetchResultModel.exists({ domain });
    if (existingDomain) {
      return true;
    }

    const uniqueDomains = await FetchResultModel.distinct("domain");
    return uniqueDomains.length < this.MAX_WEBSITES;
  }
}
