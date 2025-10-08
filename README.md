# Indexor

A high-performance web crawler and indexer built with Next.js, featuring BFS-based crawling, keyword filtering, and MongoDB persistence.

## Overview

Indexor is a modular web crawling system that discovers, fetches, parses, and indexes web pages. It uses a Breadth-First Search (BFS) algorithm to systematically crawl websites, with support for keyword-based filtering and intelligent caching.

## Features

- **BFS-based Crawling**: Systematic breadth-first traversal of web pages
- **Keyword Filtering**: Only index pages containing specific keywords
- **Smart Caching**: DNS resolution caching with TTL support
- **Domain Limiting**: Restrict crawling to same domain or allow cross-domain
- **MongoDB Persistence**: All crawled data stored in MongoDB
- **Configurable Limits**: Control max pages, timeout, and domain restrictions
- **Duplicate Prevention**: Automatic URL deduplication in queue and visited set
- **Responsive UI**: Clean interface for configuring and monitoring crawls

## Architecture

### Core Components

The system is built around four independent service modules:

#### 1. URL Queue Module (`UrlQueueModule`)
- **Purpose**: Manages the BFS queue for URL crawling
- **Implementation**: In-memory queue using array-based FIFO
- **Methods**:
  - `enqueueUrl(url)`: Add URL to end of queue
  - `dequeueUrl()`: Remove and return URL from front of queue
  - `contains(url)`: Check if URL is already in queue
  - `isEmpty()`: Check if queue is empty
  - `clear()`: Reset queue

#### 2. DNS Resolution Module (`DnsResolutionModule`)
- **Purpose**: Resolve hostnames to IP addresses with caching
- **Storage**: MongoDB with TTL-based expiration
- **Features**:
  - Caches DNS results to reduce lookup overhead
  - Configurable TTL (default: 60 minutes)
  - Reverse DNS lookup support
  - Automatic cache invalidation

#### 3. Fetch Module (`FetchModule`)
- **Purpose**: HTTP(S) request handling with domain limiting
- **Storage**: MongoDB (stores fetch results)
- **Features**:
  - 10-second request timeout
  - Custom User-Agent: `IndexorBot/1.0`
  - Domain limit: Maximum 10 unique domains
  - Response validation (status code, content type, body)
  - Stores headers, body, response time, and metadata

#### 4. Parsing Module (`ParsingModule`)
- **Purpose**: Extract content and links from HTML
- **Storage**: MongoDB (stores parsed content)
- **Library**: Cheerio (jQuery-like HTML parsing)
- **Extraction**:
  - Title (from `<title>`, OpenGraph, or `<h1>`)
  - Description (from meta tags or OpenGraph)
  - Links (all `<a href>` tags, converted to absolute URLs)
  - Text content (body text with scripts/styles removed, max 10,000 chars)
  - Stores with deduplication (unique by URL)

### Crawl Algorithm

The crawler uses a BFS approach implemented in `/api/crawl/route.ts`:

```
1. Initialize:
   - Clear URL queue
   - Create empty visited set
   - Enqueue seed URL

2. While queue is not empty AND limits not reached:
   a. Dequeue URL from front of queue
   b. Skip if already visited
   c. Mark as visited
   d. Check domain filter (if sameDomainOnly enabled)
   e. Resolve DNS for hostname
   f. Fetch URL content
   g. Validate response (status, content-type, body)
   h. Parse HTML content
   i. Check keyword filter:
      - If keywords provided and none match → skip page (don't add to results, don't crawl links)
      - If keywords match or no filter → add to results, crawl links
   j. Extract and enqueue links (filtered by domain)

3. Return results and errors
```

### Keyword Filtering Strategy

- **If keywords provided**: Only pages containing at least one keyword (case-insensitive) are:
  - Added to results
  - Have their links crawled
- **Pages without keywords**: Are fetched but immediately discarded (not in results, links not followed)
- **If no keywords**: All pages are indexed (normal crawling)

## Tech Stack

- **Framework**: Next.js 15.5.4 (App Router)
- **Runtime**: Node.js with React 19
- **Database**: MongoDB with Mongoose ODM
- **HTML Parsing**: Cheerio 1.1.2
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **DNS**: Node.js built-in `dns.promises`

## Project Structure

```
indexor/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── crawl/
│   │   │       └── route.ts          # Main crawl API endpoint
│   │   ├── page.tsx                  # Web UI for crawler
│   │   └── layout.tsx                # Root layout
│   ├── services/
│   │   ├── url-queue/
│   │   │   ├── model.ts              # Queue data structures
│   │   │   └── service.ts            # UrlQueueModule
│   │   ├── dns-resolution/
│   │   │   ├── model.ts              # Mongoose schema for DNS cache
│   │   │   └── service.ts            # DnsResolutionModule
│   │   ├── fetch/
│   │   │   ├── model.ts              # Mongoose schema for fetch results
│   │   │   └── service.ts            # FetchModule
│   │   └── parsing/
│   │       ├── model.ts              # Mongoose schema for parsed content
│   │       └── service.ts            # ParsingModule
│   └── lib/
│       └── mongodb.ts                # MongoDB connection handler
├── package.json
└── README.md
```

## Setup

### Prerequisites

- Node.js 20+
- MongoDB instance (local or cloud)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd indexor
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Configure environment variables:
```bash
# Create .env file
echo "MONGODB_URI=mongodb://localhost:27017/indexor" > .env
```

Or for MongoDB Atlas:
```bash
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/indexor
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

### Web Interface

1. Navigate to `http://localhost:3000`
2. Enter a seed URL (e.g., `https://example.com`)
3. (Optional) Add keywords (comma-separated, e.g., `python, javascript, tutorial`)
4. Configure options:
   - **Max Pages**: Maximum number of pages to crawl (1-1000)
   - **Timeout**: Maximum crawl duration in seconds
   - **Same Domain Only**: Restrict crawling to the seed domain
5. Click "Start Crawl"

### API Endpoint

**POST** `/api/crawl`

**Request Body:**
```json
{
  "seedUrl": "https://example.com",
  "maxPages": 50,
  "timeout": 120000,
  "sameDomainOnly": true,
  "keywords": ["python", "tutorial"]
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "url": "https://example.com/page",
      "title": "Page Title",
      "description": "Page description",
      "links": ["https://example.com/link1", "..."],
      "images": [],
      "text": "Extracted text content...",
      "parsedAt": "2025-10-08T12:00:00.000Z"
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

## Configuration

### Default Values

- `DEFAULT_MAX_PAGES`: 50
- `DEFAULT_TIMEOUT_MS`: 120000 (2 minutes)
- `DNS_TTL`: 3600 seconds (1 hour)
- `FETCH_TIMEOUT`: 10000ms (10 seconds)
- `MAX_WEBSITES`: 10 unique domains
- `MAX_TEXT_LENGTH`: 10000 characters

### MongoDB Collections

- `dnsresults`: Cached DNS resolutions
- `fetchresults`: HTTP fetch results
- `parsedcontents`: Parsed HTML content and metadata

## Design Decisions

### Why BFS over DFS?

- **Breadth-First Search** explores all pages at depth N before moving to depth N+1
- Better for discovering important pages (usually closer to seed)
- More predictable resource usage
- Easier to implement timeout and page limits

### Why In-Memory Queue?

- Simple and fast for single-instance crawling
- Can be replaced with Redis/RabbitMQ for distributed crawling
- Sufficient for the current scope (max 1000 pages)

### Why MongoDB?

- Flexible schema for varying HTML structures
- Built-in TTL indexes for cache expiration
- Good performance for document-based data
- Easy to query and analyze crawled data

### Why Separate Modules?

- **Modularity**: Each service has single responsibility
- **Testability**: Services can be tested independently
- **Reusability**: Services can be used in other contexts
- **Maintainability**: Changes to one module don't affect others

## Performance Considerations

- **DNS Caching**: Reduces DNS lookups by ~95% on subsequent crawls
- **Duplicate Detection**: `visited` Set + Queue `contains()` check prevent redundant fetching
- **Text Truncation**: Limits text to 10KB per page to reduce storage
- **Domain Limiting**: Prevents runaway crawls across the internet
- **Timeout Protection**: Ensures crawls don't run indefinitely

## Limitations

- Single-threaded (no concurrent fetching)
- In-memory queue (not persistent across restarts)
- No robots.txt support
- No sitemap.xml parsing
- No JavaScript rendering (static HTML only)
- Maximum 10 unique domains per crawl session

## Future Enhancements

- [ ] Concurrent URL fetching with worker pool
- [ ] Persistent queue (Redis/RabbitMQ)
- [ ] robots.txt compliance
- [ ] Sitemap.xml support
- [ ] JavaScript rendering (Puppeteer/Playwright)
- [ ] Rate limiting per domain
- [ ] Crawl resume/pause functionality
- [ ] Export results (JSON/CSV)
- [ ] Search interface for indexed content
- [ ] Full-text search with Elasticsearch

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
