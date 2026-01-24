export interface DnsResult {
  hostname: string;
  ipAddresses: string[];
  resolvedAt: Date;
  ttl?: number;
  expiresAt?: Date;
}

export const DNS_CSV_HEADERS: (keyof DnsResult)[] = [
  "hostname",
  "ipAddresses",
  "resolvedAt",
  "ttl",
  "expiresAt",
];

export const DNS_CSV_FILE = "dns_results.csv";
