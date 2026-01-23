import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY_PREFIX = "basedaily:profile:";

export async function saveStats(
  address: string,
  data: { highestStreak: number }
) {
  await redis.hset(KEY_PREFIX + address.toLowerCase(), {
    highestStreak: String(data.highestStreak),
  });
}


export async function saveProfile(
  address: string,
  data: { name: string | null; avatar: string | null; fid?: string | null; neynarScore?: number | null; }
) {
  await redis.hset(KEY_PREFIX + address.toLowerCase(), {
    name: data.name,
    avatar: data.avatar,
    fid: data.fid ?? null,
     ...(data.neynarScore !== undefined && {
      neynarScore: String(data.neynarScore),
    }),
  });
}


export async function getProfile(address: string) {
  const res = await redis.hgetall<{
    name?: string;
    avatar?: string;
    highestStreak?: string;
    fid?: string;
     neynarScore?: string;
  }>(KEY_PREFIX + address.toLowerCase());

  if (!res) return null;

  return {
    name: res.name ?? null,
    avatar: res.avatar ?? null,
    fid: res.fid ?? null,
    highestStreak: res.highestStreak
      ? Number(res.highestStreak)
      : null,
      neynarScore: res.neynarScore ? Number(res.neynarScore) : null,
  };
}


