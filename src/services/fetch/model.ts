export interface FetchResult {
  url: string;
  domain: string;
  statusCode: number;
  contentType: string;
  responseTime: number;
  fetchedAt: Date;
  body: string;
}

export const FETCH_CSV_FILE = "fetch_results.csv";
