# Indexor

A high-performance web crawler and indexer built with Next.js, featuring BFS-based crawling, keyword filtering, and CSV data persistence.

## Overview

Indexor is a modular web crawling system that discovers, fetches, parses, and indexes web pages. It uses a Breadth-First Search (BFS) algorithm to systematically crawl websites, with support for keyword-based filtering from a configurable keywords file.

## Features

- **BFS-based Crawling**: Systematic breadth-first traversal of web pages
- **Keyword Filtering**: Only index pages containing specific keywords (loaded from `keywords.txt`)
- **Smart Caching**: DNS resolution caching with TTL support
- **Domain Limiting**: Restrict crawling to same domain or allow cross-domain
- **CSV Persistence**: All crawled data stored in CSV files for easy analysis
- **Configurable Limits**: Control max pages, timeout, and domain restrictions
- **Duplicate Prevention**: Automatic URL deduplication in queue and visited set
- **Matched Keywords Tracking**: Shows which keywords matched each page

## Prerequisites

### Install Node.js

**macOS (using Homebrew):**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows:**
Download and install from [https://nodejs.org/](https://nodejs.org/) (LTS version recommended)

Verify installation:
```bash
node --version  # Should be v20.x or higher
npm --version
```

### Install Yarn

```bash
npm install -g yarn
```

Verify installation:
```bash
yarn --version
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd indexor
```

2. Install dependencies:
```bash
yarn install
```

3. (Optional) Configure keywords in `keywords.txt`:
```
biến đổi khí hậu
ô nhiễm
môi trường
carbon
năng lượng tái tạo
```

4. Run the development server:
```bash
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Quick Start with cURL

Start the server in one terminal:
```bash
yarn dev
```

In another terminal, run the crawler:
```bash
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "seedUrl": "https://vnexpress.net/",
    "maxPages": 100,
    "timeout": 6000000
  }'
```

### API Endpoint

**POST** `/api/crawl`

**Request Body:**
```json
{
  "seedUrl": "https://example.com",
  "maxPages": 100,
  "timeout": 300000,
  "sameDomainOnly": true,
  "keywords": []
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `seedUrl` | string | required | Starting URL for crawling |
| `maxPages` | number | 100 | Maximum pages to crawl (1-100000) |
| `timeout` | number | 300000 | Timeout in milliseconds |
| `sameDomainOnly` | boolean | true | Only crawl same domain |
| `keywords` | string[] | [] | Keywords to filter (uses `keywords.txt` if empty) |

**Response:**
```json
{
  "success": true,
  "stats": {
    "pagesProcessed": 100,
    "matchesFound": 15,
    "errorsCount": 2,
    "durationMs": 45000,
    "keywordsUsed": 188
  },
  "results": [
    {
      "url": "https://example.com/page",
      "title": "Page Title",
      "description": "Page description",
      "links": ["https://example.com/link1"],
      "text": "Extracted text content...",
      "parsedAt": "2025-01-24T12:00:00.000Z",
      "matchedKeywords": ["environment", "climate"]
    }
  ],
  "errors": [
    {
      "url": "https://example.com/broken",
      "error": "Failed to fetch URL"
    }
  ]
}
```

## Output Files

Crawled data is saved to CSV files in the `data/` directory:

### `data/dns_results.csv`
DNS resolution cache with TTL support.
```
hostname,ipAddresses,resolvedAt,ttl,expiresAt
```

### `data/fetch_results.csv`
HTTP fetch results and page content.
```
url,domain,statusCode,contentType,responseTime,fetchedAt,content
```

### `data/parsed_content.csv`
Parsed and filtered page content (only pages matching keywords).
```
url,title,description,links,images,text,parsedAt
```

## Keywords Configuration

Create or edit `keywords.txt` in the project root. Each line is a keyword:

```
biến đổi khí hậu
climate change
environment
carbon dioxide
renewable energy
```

- Keywords are case-insensitive
- The crawler matches keywords against page title, description, and text content
- If no keywords file exists or it's empty, all pages are indexed

## Architecture

### Core Components

#### 1. URL Queue Module
- In-memory BFS queue for URL crawling
- Methods: `enqueueUrl()`, `dequeueUrl()`, `contains()`, `isEmpty()`, `clear()`

#### 2. DNS Resolution Module
- Resolves hostnames with caching (TTL: 1 hour)
- Stored in `dns_results.csv`

#### 3. Fetch Module
- HTTP requests with 10-second timeout
- Custom User-Agent: `IndexorBot/1.0`
- Domain limit: 10 unique domains per session
- Content stored in `fetch_results.csv`

#### 4. Parsing Module
- HTML parsing with Cheerio
- Extracts: title, description, links, text (max 10KB)
- Results stored in `parsed_content.csv`

### Crawl Algorithm

```
1. Initialize queue with seed URL
2. Load keywords from keywords.txt

3. While queue not empty AND limits not reached:
   a. Dequeue URL
   b. Skip if visited
   c. Resolve DNS
   d. Fetch page content
   e. Parse HTML
   f. Add all discovered links to queue
   g. If page matches keywords:
      - Save to CSV
      - Add to results

4. Return results with stats
```

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **Runtime**: Node.js with React 19
- **Storage**: CSV files (no database required)
- **HTML Parsing**: Cheerio 1.1.2
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4

## Project Structure

```
indexor/
├── src/
│   ├── app/
│   │   ├── api/crawl/route.ts    # Crawl API endpoint
│   │   └── page.tsx              # Web UI
│   ├── services/
│   │   ├── url-queue/            # BFS queue
│   │   ├── dns-resolution/       # DNS caching
│   │   ├── fetch/                # HTTP fetching
│   │   └── parsing/              # HTML parsing
│   └── lib/
│       ├── csv.ts                # CSV utilities
│       └── keywords.ts           # Keyword loader
├── data/                         # Output CSV files
├── keywords.txt                  # Keywords configuration
├── package.json
└── README.md
```

## Configuration

### Default Values

| Setting | Value | Description |
|---------|-------|-------------|
| `DEFAULT_MAX_PAGES` | 100 | Max pages per crawl |
| `DEFAULT_TIMEOUT_MS` | 300000 | 5 minutes |
| `DNS_TTL` | 3600 | 1 hour cache |
| `FETCH_TIMEOUT` | 10000 | 10 seconds |
| `MAX_WEBSITES` | 10 | Unique domains limit |
| `MAX_TEXT_LENGTH` | 10000 | Characters per page |
| `MAX_CONTENT_LENGTH` | 50000 | Content in fetch CSV |

## Troubleshooting

### Crawler stops early
- Increase `maxPages` and `timeout` in the request
- Check server logs for errors

### No results found
- Verify keywords in `keywords.txt` match page content
- Try with empty keywords to crawl all pages first

### CSV parsing issues
- Delete `data/` folder and restart crawl
- Content with special characters is automatically sanitized

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
