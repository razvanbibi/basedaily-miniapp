import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY_PREFIX = "basedaily:profile:";

export async function saveProfile(
  address: string,
  data: { name: string | null; avatar: string | null }
) {
  await redis.hset(KEY_PREFIX + address.toLowerCase(), data);
}

export async function getProfile(address: string) {
  const res = await redis.hgetall<{
    name?: string;
    avatar?: string;
  }>(KEY_PREFIX + address.toLowerCase());

  if (!res) return null;

  return {
    name: res.name ?? null,
    avatar: res.avatar ?? null,
  };
}
