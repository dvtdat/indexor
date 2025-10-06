# JavaScript Web Crawler Implementation Guide

## Quick Start Implementation

### 1. Project Setup

```bash
# Initialize Node.js project
npm init -y

# Install core dependencies
npm install crawlee playwright cheerio axios
npm install robotstxt-parser bottleneck compromise

# Install development dependencies
npm install -D typescript @types/node ts-node nodemon
```

### 2. Basic Project Structure

```
src/
├── crawler/
│   ├── SearchCrawler.js     # Main crawler class
│   ├── ContentExtractor.js  # Content parsing and cleaning
│   ├── RateLimiter.js      # Rate limiting implementation
│   └── RobotsParser.js     # robots.txt compliance
├── search/
│   ├── SearchAPI.js        # Search engine API integration
│   └── KeywordManager.js   # Keyword processing
├── data/
│   ├── DataFormatter.js    # AI-ready data formatting
│   └── Storage.js          # Data storage management
├── config/
│   └── config.js           # Configuration settings
└── main.js                 # Entry point
```

## 3. Core Implementation Examples

### 3.1 Basic Search-Based Crawler

```javascript
// src/crawler/SearchCrawler.js
import { CheerioCrawler } from 'crawlee';
import { SearchAPI } from '../search/SearchAPI.js';
import { ContentExtractor } from './ContentExtractor.js';
import { RateLimiter } from './RateLimiter.js';

export class SearchCrawler {
  constructor(config) {
    this.config = config;
    this.searchAPI = new SearchAPI(config.searchAPI);
    this.extractor = new ContentExtractor();
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.results = [];
  }

  async crawlByKeywords(keywords) {
    // Step 1: Get initial URLs from search
    const searchResults = await this.searchAPI.search(keywords);

    // Step 2: Setup crawler with rate limiting
    const crawler = new CheerioCrawler({
      async requestHandler({ request, $ }) {
        await this.rateLimiter.wait();

        const data = await this.extractor.extractContent($, request.url);

        // Filter by relevance
        const relevanceScore = this.calculateRelevance(data.content, keywords);
        if (relevanceScore > this.config.minRelevanceScore) {
          this.results.push({
            ...data,
            relevanceScore,
            keywords: this.findMatchingKeywords(data.content, keywords)
          });
        }
      },
      maxRequestsPerCrawl: this.config.maxPages,
    });

    // Step 3: Add URLs to crawler queue
    const urls = searchResults.map(result => result.url);
    await crawler.run(urls);

    return this.results;
  }

  calculateRelevance(content, keywords) {
    // Simple TF-IDF-like scoring
    const contentLower = content.toLowerCase();
    const totalWords = content.split(' ').length;

    let score = 0;
    keywords.forEach(keyword => {
      const matches = (contentLower.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      score += (matches / totalWords) * Math.log(totalWords / (matches + 1));
    });

    return Math.min(score, 1); // Normalize to 0-1
  }

  findMatchingKeywords(content, keywords) {
    const contentLower = content.toLowerCase();
    return keywords.filter(keyword =>
      contentLower.includes(keyword.toLowerCase())
    );
  }
}
```

### 3.2 Search API Integration

```javascript
// src/search/SearchAPI.js
import axios from 'axios';

export class SearchAPI {
  constructor(config) {
    this.config = config;
    this.baseURL = 'https://www.googleapis.com/customsearch/v1';
  }

  async search(keywords, options = {}) {
    const query = Array.isArray(keywords) ? keywords.join(' ') : keywords;

    try {
      const response = await axios.get(this.baseURL, {
        params: {
          key: this.config.apiKey,
          cx: this.config.searchEngineId,
          q: query,
          num: options.maxResults || 10,
          start: options.start || 1,
          ...options.additionalParams
        }
      });

      return response.data.items?.map(item => ({
        url: item.link,
        title: item.title,
        snippet: item.snippet,
        displayLink: item.displayLink
      })) || [];

    } catch (error) {
      console.error('Search API error:', error.message);
      return [];
    }
  }

  async searchMultiplePages(keywords, totalResults = 50) {
    const results = [];
    const resultsPerPage = 10;
    const pages = Math.ceil(totalResults / resultsPerPage);

    for (let i = 0; i < pages; i++) {
      const pageResults = await this.search(keywords, {
        start: i * resultsPerPage + 1,
        maxResults: resultsPerPage
      });

      results.push(...pageResults);

      // Rate limit API calls
      if (i < pages - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results.slice(0, totalResults);
  }
}
```

### 3.3 Content Extraction with AI-Ready Formatting

```javascript
// src/crawler/ContentExtractor.js
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import compromise from 'compromise';

export class ContentExtractor {
  async extractContent($, url) {
    // Get basic metadata
    const title = $('title').text().trim() ||
                 $('h1').first().text().trim() ||
                 'No title found';

    // Extract main content using multiple methods
    const mainContent = this.extractMainContent($);
    const cleanContent = this.cleanContent(mainContent);

    // Extract structure
    const structure = this.extractStructure($);

    // Generate metadata
    const metadata = await this.generateMetadata($, url, cleanContent);

    // Calculate quality metrics
    const quality = this.assessContentQuality(cleanContent);

    return {
      url,
      title,
      content: cleanContent,
      metadata,
      structure,
      quality,
      extractedAt: new Date().toISOString()
    };
  }

  extractMainContent($) {
    // Try multiple selectors for main content
    const selectors = [
      'article',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.entry-content',
      'main'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 100) {
        return element.text();
      }
    }

    // Fallback: extract from body, excluding common non-content elements
    $('script, style, nav, header, footer, aside, .sidebar, .menu').remove();
    return $('body').text();
  }

  cleanContent(content) {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n+/g, '\n') // Normalize line breaks
      .trim();
  }

  extractStructure($) {
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      headings.push({
        level: el.tagName.toLowerCase(),
        text: $(el).text().trim()
      });
    });

    const paragraphs = [];
    $('p').each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 50) { // Only meaningful paragraphs
        paragraphs.push(text);
      }
    });

    const lists = [];
    $('ul, ol').each((i, el) => {
      const items = [];
      $(el).find('li').each((j, li) => {
        items.push($(li).text().trim());
      });
      if (items.length > 0) {
        lists.push({
          type: el.tagName.toLowerCase(),
          items
        });
      }
    });

    return { headings, paragraphs, lists };
  }

  generateMetadata($, url, content) {
    const urlObj = new URL(url);

    return {
      domain: urlObj.hostname,
      author: this.extractAuthor($),
      publishDate: this.extractPublishDate($),
      wordCount: content.split(/\s+/).length,
      readingLevel: this.calculateReadingLevel(content),
      hasImages: $('img').length > 0,
      hasLinks: $('a[href]').length > 0,
      language: $('html').attr('lang') || 'en'
    };
  }

  extractAuthor($) {
    const selectors = [
      '[name="author"]',
      '.author',
      '.byline',
      '[rel="author"]',
      '.post-author'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        return element.attr('content') || element.text().trim();
      }
    }

    return null;
  }

  extractPublishDate($) {
    const selectors = [
      '[name="publish_date"]',
      '[property="article:published_time"]',
      '.publish-date',
      '.date',
      'time[datetime]'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        const date = element.attr('content') ||
                    element.attr('datetime') ||
                    element.text().trim();
        return new Date(date).toISOString();
      }
    }

    return null;
  }

  calculateReadingLevel(text) {
    // Simple Flesch Reading Ease approximation
    const doc = compromise(text);
    const sentences = doc.sentences().length;
    const words = doc.terms().length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

    // Convert to 0-1 scale (higher = easier to read)
    return Math.max(0, Math.min(1, fleschScore / 100));
  }

  countSyllables(text) {
    // Simple syllable counting heuristic
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiou]{2,}/g, 'a') // Replace multiple vowels with single
      .match(/[aeiou]/g)?.length || 1;
  }

  assessContentQuality(content) {
    const wordCount = content.split(/\s+/).length;

    return {
      hasReferences: /\b(source|reference|citation|study|research)\b/i.test(content),
      wordCount,
      contentDepth: wordCount < 300 ? 'shallow' :
                   wordCount < 1000 ? 'medium' : 'deep',
      languageQuality: this.assessLanguageQuality(content),
      structuralComplexity: this.assessStructuralComplexity(content)
    };
  }

  assessLanguageQuality(content) {
    // Simple heuristics for language quality
    const doc = compromise(content);
    const words = doc.terms().length;
    const uniqueWords = new Set(doc.terms().out('array')).size;
    const sentences = doc.sentences().length;

    const lexicalDiversity = uniqueWords / words;
    const avgSentenceLength = words / (sentences || 1);

    // Normalize scores
    const diversityScore = Math.min(lexicalDiversity * 2, 1);
    const complexityScore = Math.min(avgSentenceLength / 20, 1);

    return (diversityScore + complexityScore) / 2;
  }

  assessStructuralComplexity(content) {
    const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
    const avgParagraphLength = content.length / paragraphs.length;

    // Score based on paragraph structure
    if (avgParagraphLength < 100) return 0.3; // Very short paragraphs
    if (avgParagraphLength < 300) return 0.6; // Medium paragraphs
    return 0.9; // Well-developed paragraphs
  }
}
```

### 3.4 Rate Limiting and Robots.txt Compliance

```javascript
// src/crawler/RateLimiter.js
import Bottleneck from 'bottleneck';
import axios from 'axios';

export class RateLimiter {
  constructor(config = {}) {
    this.limiters = new Map();
    this.defaultConfig = {
      maxConcurrent: 3,
      minTime: 1000, // 1 second between requests
      reservoir: 10, // Initial number of requests allowed
      reservoirRefreshAmount: 10,
      reservoirRefreshInterval: 60000, // Refill every minute
      ...config
    };
  }

  getLimiter(domain) {
    if (!this.limiters.has(domain)) {
      this.limiters.set(domain, new Bottleneck(this.defaultConfig));
    }
    return this.limiters.get(domain);
  }

  async wait(url) {
    const domain = new URL(url).hostname;
    const limiter = this.getLimiter(domain);

    return limiter.schedule(() => Promise.resolve());
  }

  async checkRobotsTxt(url) {
    const domain = new URL(url).hostname;
    const robotsUrl = `https://${domain}/robots.txt`;

    try {
      const response = await axios.get(robotsUrl, { timeout: 5000 });
      return this.parseRobotsTxt(response.data, url);
    } catch (error) {
      // If robots.txt doesn't exist, assume crawling is allowed
      return { allowed: true, crawlDelay: this.defaultConfig.minTime };
    }
  }

  parseRobotsTxt(robotsContent, userAgent = '*') {
    const lines = robotsContent.split('\n');
    let currentUserAgent = null;
    let allowed = true;
    let crawlDelay = this.defaultConfig.minTime;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();

      if (trimmed.startsWith('user-agent:')) {
        currentUserAgent = trimmed.split(':')[1].trim();
      } else if (currentUserAgent === userAgent || currentUserAgent === '*') {
        if (trimmed.startsWith('disallow:')) {
          const path = trimmed.split(':')[1].trim();
          if (path === '/' || path === '') {
            allowed = false;
          }
        } else if (trimmed.startsWith('crawl-delay:')) {
          const delay = parseInt(trimmed.split(':')[1].trim()) * 1000;
          if (!isNaN(delay)) {
            crawlDelay = Math.max(delay, crawlDelay);
          }
        }
      }
    }

    return { allowed, crawlDelay };
  }
}
```

### 3.5 Data Formatter for AI Integration

```javascript
// src/data/DataFormatter.js
export class DataFormatter {
  formatForAI(crawlResults, options = {}) {
    const formatted = crawlResults.map(result => this.formatSingleResult(result, options));

    return {
      metadata: {
        totalResults: formatted.length,
        generatedAt: new Date().toISOString(),
        keywords: options.keywords || [],
        format: options.format || 'ai-training'
      },
      data: formatted
    };
  }

  formatSingleResult(result, options) {
    const base = {
      id: this.generateId(result.url),
      url: result.url,
      title: result.title,
      content: result.content,
      metadata: {
        domain: result.metadata.domain,
        author: result.metadata.author,
        publishDate: result.metadata.publishDate,
        wordCount: result.metadata.wordCount,
        readingLevel: result.metadata.readingLevel,
        language: result.metadata.language
      },
      structure: result.structure,
      relevance: {
        score: result.relevanceScore,
        matchedKeywords: result.keywords || [],
        topicRelevance: this.calculateTopicRelevance(result.content, options.keywords)
      },
      quality: {
        contentDepth: result.quality.contentDepth,
        languageQuality: result.quality.languageQuality,
        hasReferences: result.quality.hasReferences,
        structuralComplexity: result.quality.structuralComplexity,
        overallScore: this.calculateOverallQuality(result.quality)
      },
      extractedAt: result.extractedAt
    };

    // Add format-specific fields
    if (options.format === 'ai-grading') {
      base.gradingFeatures = this.extractGradingFeatures(result);
    }

    return base;
  }

  calculateTopicRelevance(content, keywords) {
    if (!keywords || keywords.length === 0) return 0;

    const contentLower = content.toLowerCase();
    const totalKeywords = keywords.length;
    const foundKeywords = keywords.filter(keyword =>
      contentLower.includes(keyword.toLowerCase())
    ).length;

    return foundKeywords / totalKeywords;
  }

  calculateOverallQuality(quality) {
    const scores = [
      quality.languageQuality,
      quality.structuralComplexity,
      quality.hasReferences ? 1 : 0,
      quality.contentDepth === 'deep' ? 1 :
      quality.contentDepth === 'medium' ? 0.6 : 0.3
    ];

    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  extractGradingFeatures(result) {
    const content = result.content;

    return {
      argumentStructure: this.analyzeArgumentStructure(content),
      evidenceUsage: this.analyzeEvidenceUsage(content),
      coherence: this.analyzeCoherence(result.structure),
      vocabulary: this.analyzeVocabulary(content),
      mechanics: this.analyzeMechanics(content)
    };
  }

  analyzeArgumentStructure(content) {
    // Look for argument indicators
    const indicators = [
      'therefore', 'because', 'however', 'furthermore',
      'in conclusion', 'first', 'second', 'finally'
    ];

    const foundIndicators = indicators.filter(indicator =>
      content.toLowerCase().includes(indicator)
    );

    return {
      hasIntroduction: content.toLowerCase().includes('introduction') ||
                      content.split('\n')[0].length > 100,
      hasConclusion: /\b(conclusion|in summary|to conclude)\b/i.test(content),
      transitionWords: foundIndicators,
      logicalFlow: foundIndicators.length / 1000 * content.length // Density of transitions
    };
  }

  analyzeEvidenceUsage(content) {
    const evidenceKeywords = [
      'study', 'research', 'data', 'statistics', 'according to',
      'source', 'reference', 'citation', 'evidence', 'proves'
    ];

    const foundEvidence = evidenceKeywords.filter(keyword =>
      content.toLowerCase().includes(keyword)
    );

    return {
      hasEvidence: foundEvidence.length > 0,
      evidenceTypes: foundEvidence,
      evidenceDensity: foundEvidence.length / 1000 * content.length,
      hasCitations: /\[[0-9]+\]|\([^)]*[0-9]+[^)]*\)/g.test(content)
    };
  }

  analyzeCoherence(structure) {
    const headings = structure.headings || [];
    const paragraphs = structure.paragraphs || [];

    return {
      hasHeadings: headings.length > 0,
      headingHierarchy: this.analyzeHeadingHierarchy(headings),
      paragraphCount: paragraphs.length,
      avgParagraphLength: paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length || 0,
      structuralBalance: this.calculateStructuralBalance(paragraphs)
    };
  }

  analyzeHeadingHierarchy(headings) {
    const levels = headings.map(h => parseInt(h.level.charAt(1)));
    const hasLogicalFlow = levels.every((level, i) =>
      i === 0 || level <= levels[i-1] + 1
    );

    return {
      levels: [...new Set(levels)].sort(),
      logicalHierarchy: hasLogicalFlow,
      totalHeadings: headings.length
    };
  }

  calculateStructuralBalance(paragraphs) {
    if (paragraphs.length === 0) return 0;

    const lengths = paragraphs.map(p => p.length);
    const avg = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;

    // Lower variance indicates better balance
    return Math.max(0, 1 - (variance / (avg * avg)));
  }

  analyzeVocabulary(content) {
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words);

    return {
      totalWords: words.length,
      uniqueWords: uniqueWords.size,
      lexicalDiversity: uniqueWords.size / words.length,
      averageWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
      complexWords: words.filter(word => word.length > 6).length
    };
  }

  analyzeMechanics(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

    return {
      sentenceCount: sentences.length,
      averageSentenceLength: content.length / sentences.length,
      capitalizedSentences: sentences.filter(s =>
        /^[A-Z]/.test(s.trim())
      ).length / sentences.length,
      punctuationUsage: (content.match(/[.!?]/g) || []).length / sentences.length
    };
  }

  generateId(url) {
    // Simple hash function for generating IDs
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  exportToFile(data, format = 'json') {
    const fs = require('fs');
    const path = require('path');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `crawl-results-${timestamp}.${format}`;
    const outputPath = path.join(process.cwd(), 'output', filename);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    switch (format) {
      case 'json':
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        break;
      case 'jsonl':
        const jsonLines = data.data.map(item => JSON.stringify(item)).join('\n');
        fs.writeFileSync(outputPath, jsonLines);
        break;
      case 'csv':
        const csv = this.convertToCSV(data.data);
        fs.writeFileSync(outputPath, csv);
        break;
    }

    return outputPath;
  }

  convertToCSV(data) {
    if (data.length === 0) return '';

    const headers = ['id', 'url', 'title', 'wordCount', 'relevanceScore', 'qualityScore', 'contentDepth'];
    const rows = data.map(item => [
      item.id,
      item.url,
      item.title.replace(/"/g, '""'),
      item.metadata.wordCount,
      item.relevance.score,
      item.quality.overallScore,
      item.quality.contentDepth
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}
```

### 3.6 Main Application Entry Point

```javascript
// src/main.js
import { SearchCrawler } from './crawler/SearchCrawler.js';
import { DataFormatter } from './data/DataFormatter.js';
import { config } from './config/config.js';

class WebCrawlerApp {
  constructor() {
    this.crawler = new SearchCrawler(config);
    this.formatter = new DataFormatter();
  }

  async crawlByKeywords(keywords, options = {}) {
    console.log(`Starting crawl for keywords: ${keywords.join(', ')}`);

    try {
      // Step 1: Crawl content
      const results = await this.crawler.crawlByKeywords(keywords);
      console.log(`Crawled ${results.length} pages`);

      // Step 2: Format for AI
      const formattedData = this.formatter.formatForAI(results, {
        keywords,
        format: options.format || 'ai-grading'
      });

      // Step 3: Export data
      const outputPath = this.formatter.exportToFile(formattedData, options.outputFormat || 'json');
      console.log(`Results exported to: ${outputPath}`);

      // Step 4: Return summary
      return {
        totalPages: results.length,
        averageRelevance: results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length,
        outputPath,
        data: formattedData
      };

    } catch (error) {
      console.error('Crawling failed:', error);
      throw error;
    }
  }
}

// Usage example
async function main() {
  const app = new WebCrawlerApp();

  const keywords = [
    'machine learning algorithms',
    'neural networks',
    'deep learning applications'
  ];

  const result = await app.crawlByKeywords(keywords, {
    format: 'ai-grading',
    outputFormat: 'json'
  });

  console.log('Crawling completed:', result);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WebCrawlerApp };
```

### 3.7 Configuration

```javascript
// src/config/config.js
export const config = {
  searchAPI: {
    provider: 'google', // 'google', 'bing', 'brave'
    apiKey: process.env.GOOGLE_API_KEY,
    searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
    maxResults: 50
  },

  rateLimit: {
    maxConcurrent: 3,
    minTime: 2000, // 2 seconds between requests
    respectRobotsTxt: true
  },

  crawler: {
    maxPages: 100,
    minRelevanceScore: 0.3,
    timeout: 30000, // 30 seconds per page
    userAgent: 'AcademicCrawler/1.0 (Educational Research)'
  },

  content: {
    minWordCount: 100,
    maxWordCount: 10000,
    languages: ['en'], // ISO language codes
    excludeDomains: ['facebook.com', 'twitter.com', 'instagram.com']
  },

  output: {
    directory: './output',
    formats: ['json', 'jsonl', 'csv'],
    includeRawHTML: false
  }
};
```

## 4. Usage Examples

### 4.1 Basic Usage

```javascript
import { WebCrawlerApp } from './src/main.js';

const crawler = new WebCrawlerApp();

// Crawl for specific academic topics
const result = await crawler.crawlByKeywords([
  'climate change effects',
  'global warming',
  'environmental impact'
], {
  format: 'ai-grading',
  outputFormat: 'json'
});

console.log(`Found ${result.totalPages} relevant pages`);
```

### 4.2 Advanced Usage with Custom Filtering

```javascript
// Custom crawler with additional filtering
const results = await crawler.crawlByKeywords(keywords);

// Filter results by quality
const highQualityResults = results.filter(result =>
  result.quality.overallScore > 0.7 &&
  result.metadata.wordCount > 500 &&
  result.quality.hasReferences
);

// Export filtered results
const formattedData = formatter.formatForAI(highQualityResults);
```

This implementation guide provides a complete foundation for building a JavaScript web crawler optimized for AI content analysis. The modular design allows for easy customization and extension based on your specific requirements.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Research JavaScript web crawling libraries and frameworks", "status": "completed", "activeForm": "Researching JavaScript web crawling libraries and frameworks"}, {"content": "Research search APIs for keyword-based crawling", "status": "completed", "activeForm": "Researching search APIs for keyword-based crawling"}, {"content": "Design architecture for AI-ready data extraction", "status": "completed", "activeForm": "Designing architecture for AI-ready data extraction"}, {"content": "Create implementation guide with code examples", "status": "completed", "activeForm": "Creating implementation guide with code examples"}, {"content": "Document data formats for AI tool integration", "status": "completed", "activeForm": "Documenting data formats for AI tool integration"}]