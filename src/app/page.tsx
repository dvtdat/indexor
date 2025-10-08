/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";

export default function Home() {
  const [seedUrl, setSeedUrl] = useState("");
  const [maxPages, setMaxPages] = useState(50);
  const [timeout, setTimeout] = useState(30);
  const [sameDomainOnly, setSameDomainOnly] = useState(true);
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const keywordArray = keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seedUrl,
          maxPages,
          timeout: timeout * 1000, // Convert seconds to milliseconds
          sameDomainOnly,
          keywords: keywordArray,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to crawl");
        return;
      }

      setResults(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Web Indexor</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure and start crawling websites
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div className="flex gap-4">
          <input
            type="url"
            value={seedUrl}
            onChange={(e) => setSeedUrl(e.target.value)}
            placeholder="https://example.com"
            required
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {loading ? "Crawling..." : "Start Crawl"}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Keywords (comma-separated, optional)
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g., python, javascript, tutorial"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Only include pages containing at least one of these keywords in
            results. Pages without keywords won't be crawled further. Leave
            empty to crawl all pages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Max Pages
            </label>
            <input
              type="number"
              min="1"
              value={maxPages}
              onChange={(e) => setMaxPages(parseInt(e.target.value) || 1000)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Timeout (seconds)
            </label>
            <input
              type="number"
              min="5"
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value) || 30)}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sameDomainOnly}
                onChange={(e) => setSameDomainOnly(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Same domain only
              </span>
            </label>
          </div>
        </div>
      </form>

      {error && (
        <div className="mb-8 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* {results && (
        <div className="space-y-6">
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Crawl Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  Pages Processed
                </p>
                <p className="text-2xl font-bold">
                  {results.stats?.pagesProcessed || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">URLs Visited</p>
                <p className="text-2xl font-bold">
                  {results.stats?.urlsVisited || 0}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Duration</p>
                <p className="text-2xl font-bold">
                  {results.stats?.duration
                    ? `${(results.stats.duration / 1000).toFixed(1)}s`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {results.stats?.errors || 0}
                </p>
              </div>
            </div>

            {(results.stats?.timedOut || results.stats?.reachedMaxPages) && (
              <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded">
                <p className="text-sm font-medium">
                  {results.stats?.timedOut && "⏱️ Crawl timed out. "}
                  {results.stats?.reachedMaxPages &&
                    "📄 Max pages limit reached. "}
                  Results may be incomplete.
                </p>
              </div>
            )}
          </div>

          {results.results.length > 0 &&
            (() => {
              const uniqueDomains = [
                ...new Set(
                  results.results.map((r: any) => {
                    try {
                      return new URL(r.url).hostname;
                    } catch {
                      return "unknown";
                    }
                  })
                ),
              ];
              return uniqueDomains.length > 1 ? (
                <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-lg font-bold mb-3">
                    Crawled Domains ({uniqueDomains.length})
                  </h3>
                  <ul className="space-y-1">
                    {uniqueDomains.map((domain: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm font-mono text-gray-700 dark:text-gray-300"
                      >
                        • {domain}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null;
            })()}

          {results.results.length > 0 && (
            <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="text-lg font-bold mb-3">Crawled Pages</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.results.map((result: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate text-blue-600 dark:text-blue-400">
                          {result.url}
                        </p>
                        {result.title && (
                          <h4 className="text-base font-semibold mt-2 text-gray-900 dark:text-gray-100">
                            {result.title}
                          </h4>
                        )}
                        {result.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {result.description}
                          </p>
                        )}
                        {result.textPreview && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 line-clamp-2">
                            {result.textPreview}...
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                          <span>Status: {result.statusCode}</span>
                          <span>Type: {result.contentType}</span>
                          <span>Time: {result.responseTime}ms</span>
                          <span>Size: {result.bodyLength} bytes</span>
                          {result.linksCount !== undefined && (
                            <span>Links: {result.linksCount}</span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded font-semibold shrink-0 ${
                          result.isValid
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {result.isValid ? "Valid" : "Invalid"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.errors && results.errors.length > 0 && (
            <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="text-lg font-bold mb-3 text-red-600">
                Errors (showing {results.errors.length}
                {results.stats?.errors > results.errors.length &&
                  ` of ${results.stats.errors}`}
                )
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.errors.map((err: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                  >
                    <p className="text-sm font-mono text-red-700 dark:text-red-400">
                      {err.url}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                      {err.error}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )} */}
    </div>
  );
}
