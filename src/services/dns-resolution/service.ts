import { DNS_CSV_FILE } from "./model";
import { appendToCsv, findInCsv, clearCsv } from "@/lib/csv";
import { promises as dns } from "dns";

interface DnsResultCsv {
  hostname: string;
  ipAddresses: string;
  resolvedAt: string;
  ttl: string;
  expiresAt: string;
}

const CSV_HEADERS = [
  "hostname",
  "ipAddresses",
  "resolvedAt",
  "ttl",
  "expiresAt",
];

export class DnsResolutionModule {
  private static readonly DEFAULT_TTL = 60 * 60;

  static async resolve(hostname: string) {
    const cached = findInCsv<DnsResultCsv>(
      DNS_CSV_FILE,
      CSV_HEADERS,
      (row) => {
        if (row.hostname !== hostname) return false;

        if (!row.expiresAt) return true;

        const expiresAt = new Date(row.expiresAt);
        return expiresAt > new Date();
      }
    );

    if (cached) {
      return {
        hostname: cached.hostname,
        ipAddresses: JSON.parse(cached.ipAddresses || "[]"),
        resolvedAt: new Date(cached.resolvedAt),
        ttl: parseInt(cached.ttl) || this.DEFAULT_TTL,
      };
    }

    try {
      const addresses = await dns.resolve4(hostname);
      const resolvedAt = new Date();
      const ttl = this.DEFAULT_TTL;
      const expiresAt = new Date(resolvedAt.getTime() + ttl * 1000);

      const csvRow = {
        hostname,
        ipAddresses: JSON.stringify(addresses),
        resolvedAt: resolvedAt.toISOString(),
        ttl: String(ttl),
        expiresAt: expiresAt.toISOString(),
      };

      appendToCsv(DNS_CSV_FILE, csvRow, CSV_HEADERS);

      return {
        hostname,
        ipAddresses: addresses,
        resolvedAt,
        ttl,
      };
    } catch (error) {
      throw new Error(`DNS resolution failed for ${hostname}: ${error}`);
    }
  }

  static async reverseResolve(ip: string) {
    try {
      const hostnames = await dns.reverse(ip);
      return hostnames;
    } catch (error) {
      throw new Error(`Reverse DNS lookup failed for ${ip}: ${error}`);
    }
  }

  static async isCached(hostname: string) {
    const cached = findInCsv<DnsResultCsv>(
      DNS_CSV_FILE,
      CSV_HEADERS,
      (row) => {
        if (row.hostname !== hostname) return false;

        if (!row.expiresAt) return true;

        const expiresAt = new Date(row.expiresAt);
        return expiresAt > new Date();
      }
    );

    return cached !== undefined;
  }

  static async clearCache() {
    clearCsv(DNS_CSV_FILE);
  }
}
