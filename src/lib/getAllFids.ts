import { Redis } from "@upstash/redis";
const redis = Redis.fromEnv(); 
export async function getAllFids(): Promise<number[]> {

  try {

    const keys = await redis.keys("basedaily:profile:*");

    if (!keys.length) {

      console.log("no profile keys");

      return [];

    }

    const fids: number[] = [];

    for (const key of keys) {

      const profile = await redis.hgetall(key);

      if (profile?.fid) {

        const fidNumber = Number(profile.fid);

        if (!isNaN(fidNumber)) {

          fids.push(fidNumber);

        }

      }

    }

    return [...new Set(fids)];

  } catch (err) {

    console.error("getAllFids error:", err);

    return [];

  }

}
