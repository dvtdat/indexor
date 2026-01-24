import { NextRequest, NextResponse } from "next/server";
import { UrlQueueModule } from "@/services/url-queue/service";
import { DnsResolutionModule } from "@/services/dns-resolution/service";
import { FetchModule } from "@/services/fetch/service";
import { ParsingModule } from "@/services/parsing/service";
import { ParsedContent } from "@/services/parsing/model";
import {
  matchesKeywords,
  getMatchedKeywords,
  loadKeywords,
} from "@/lib/keywords";

const DEFAULT_MAX_PAGES = 100;
const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes

interface CrawlRequest {
  seedUrl: string;
  maxPages?: number;
  timeout?: number;
  sameDomainOnly?: boolean;
  keywords?: string[]; // Optional - if not provided, uses keywords.txt
}

interface CrawlResult extends ParsedContent {
  matchedKeywords?: string[];
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
        { status: 400 },
      );
    }

    let seedUrlObj: URL;
    try {
      seedUrlObj = new URL(seedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }

    if (maxPages < 1 || maxPages > 100000) {
      return NextResponse.json(
        { error: "maxPages must be between 1 and 100000" },
        { status: 400 },
      );
    }

    // Load keywords from file if not provided in request
    const keywordList = keywords.length > 0 ? keywords : loadKeywords();
    console.log(`Using ${keywordList.length} keywords for matching`);

    const seedDomain = seedUrlObj.hostname;
    const visited = new Set<string>();
    const results: CrawlResult[] = [];
    const errors: Array<{ url: string; error: string }> = [];
    let pagesProcessed = 0;

    UrlQueueModule.clear();
    UrlQueueModule.enqueueUrl(seedUrl);

    while (!UrlQueueModule.isEmpty()) {
      if (Date.now() - startTime > timeout) {
        console.log("Crawl timeout reached");
        break;
      }

      if (pagesProcessed >= maxPages) {
        console.log("Max pages reached");
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
        const isValid = FetchModule.validateResponse(fetchResult);

        if (!isValid) {
          errors.push({
            url: currentUrl,
            error: "Invalid response (non-HTML or error status)",
          });
          continue;
        }

        pagesProcessed++;

        const parsedContent = await ParsingModule.parseHtml(
          fetchResult.body,
          currentUrl,
        );

        // Always add discovered links to the queue for crawling
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

        // Check if page matches keywords (using text, title, description)
        const searchableText = [
          parsedContent.text,
          parsedContent.title || "",
          parsedContent.description || "",
        ].join(" ");

        const hasKeywords =
          keywordList.length === 0 ||
          matchesKeywords(searchableText, keywordList);

        if (hasKeywords) {
          const matched = getMatchedKeywords(searchableText, keywordList);
          ParsingModule.saveToCsv(parsedContent);
          results.push({
            ...parsedContent,
            matchedKeywords: matched,
          });
          console.log(
            `Matched: ${currentUrl} (${matched.length} keywords: ${matched.slice(0, 3).join(", ")}...)`,
          );
        }

        // Log progress every 10 pages
        if (pagesProcessed % 10 === 0) {
          console.log(
            `Progress: ${pagesProcessed} pages processed, ${results.length} matches found`,
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push({ url: currentUrl, error: errorMessage });
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      stats: {
        pagesProcessed,
        matchesFound: results.length,
        errorsCount: errors.length,
        durationMs: duration,
        keywordsUsed: keywordList.length,
      },
      results,
      errors: errors.slice(0, 20),
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
      { status: 500 },
    );
  }
}
