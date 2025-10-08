import { DnsResultModel } from "./model";
import dbConnect from "@/lib/mongodb";
import { promises as dns } from "dns";

export class DnsResolutionModule {
  private static readonly DEFAULT_TTL = 60 * 60;

  static async resolve(hostname: string) {
    await dbConnect();

    const cached = await DnsResultModel.findOne({
      hostname,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    if (cached) {
      return {
        hostname: cached.hostname,
        ipAddresses: cached.ipAddresses,
        resolvedAt: cached.resolvedAt,
        ttl: cached.ttl,
      };
    }

    try {
      const addresses = await dns.resolve4(hostname);
      const resolvedAt = new Date();
      const ttl = this.DEFAULT_TTL;
      const expiresAt = new Date(resolvedAt.getTime() + ttl * 1000);

      await DnsResultModel.findOneAndUpdate(
        { hostname },
        {
          hostname,
          ipAddresses: addresses,
          resolvedAt,
          ttl,
          expiresAt,
        },
        { upsert: true, new: true }
      );

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
    await dbConnect();

    try {
      const hostnames = await dns.reverse(ip);
      return hostnames;
    } catch (error) {
      throw new Error(`Reverse DNS lookup failed for ${ip}: ${error}`);
    }
  }

  static async isCached(hostname: string) {
    await dbConnect();

    const cached = await DnsResultModel.exists({
      hostname,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    return cached !== null;
  }

  static async clearCache() {
    await dbConnect();
    await DnsResultModel.deleteMany({});
  }
}
