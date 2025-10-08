/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { UrlQueueModule } from "@/services/url-queue/service";
import { DnsResolutionModule } from "@/services/dns-resolution/service";
import { FetchModule } from "@/services/fetch/service";
import { ParsingModule } from "@/services/parsing/service";
import { ParsedContent } from "@/services/parsing/model";

const DEFAULT_MAX_PAGES = 50;
const DEFAULT_TIMEOUT_MS = 120000;

interface CrawlRequest {
  seedUrl: string;
  maxPages?: number;
  timeout?: number;
  sameDomainOnly?: boolean;
  keywords?: string[];
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: CrawlRequest = await request.json();
    const {
      seedUrl,
      maxPages = DEFAULT_MAX_PAGES,
      timeout = DEFAULT_TIMEOUT_MS,
      sameDomainOnly = true,
      keywords = [],
    } = body;

    if (!seedUrl || typeof seedUrl !== "string") {
      return NextResponse.json(
        { error: "Valid seed URL is required" },
        { status: 400 }
      );
    }

    let seedUrlObj: URL;
    try {
      seedUrlObj = new URL(seedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (maxPages < 1 || maxPages > 1000) {
      return NextResponse.json(
        { error: "maxPages must be between 1 and 1000" },
        { status: 400 }
      );
    }

    const seedDomain = seedUrlObj.hostname;
    const visited = new Set<string>();
    const results: ParsedContent[] = [];
    const errors: Array<{ url: string; error: string }> = [];

    UrlQueueModule.clear();
    UrlQueueModule.enqueueUrl(seedUrl);

    while (!UrlQueueModule.isEmpty()) {
      if (Date.now() - startTime > timeout) {
        break;
      }

      if (visited.size >= maxPages) {
        break;
      }

      const currentUrl = UrlQueueModule.dequeueUrl();
      if (!currentUrl || visited.has(currentUrl)) {
        continue;
      }

      visited.add(currentUrl);

      try {
        const urlObj = new URL(currentUrl);

        if (sameDomainOnly && urlObj.hostname !== seedDomain) {
          continue;
        }

        await DnsResolutionModule.resolve(urlObj.hostname);

        const fetchResult = await FetchModule.fetchUrl(currentUrl);
        const isValid = await FetchModule.validateResponse(fetchResult);

        if (!isValid) {
          errors.push({ url: currentUrl, error: "Invalid response" });
          continue;
        }

        const parsedContent = await ParsingModule.parseHtml(
          fetchResult.body,
          currentUrl
        );

        const hasKeywords =
          keywords.length === 0 ||
          keywords.some((keyword) =>
            parsedContent.text.toLowerCase().includes(keyword.toLowerCase())
          );

        if (!hasKeywords) {
          continue;
        }

        results.push(parsedContent);

        parsedContent.links.forEach((link) => {
          if (!visited.has(link) && !UrlQueueModule.contains(link)) {
            try {
              const linkObj = new URL(link);
              if (!sameDomainOnly || linkObj.hostname === seedDomain) {
                UrlQueueModule.enqueueUrl(link);
              }
            } catch {
              // Invalid URL, skip
            }
          }
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push({ url: currentUrl, error: errorMessage });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        results: [],
      },
      { status: 500 }
    );
  }
}
