export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAllAddresses } from "@/lib/leaderboardStore";
import { getProfile } from "@/lib/profileStore";
const HIDDEN_ADDRESSES = new Set([
  "0x1fa406da31eea33752481c526a249c06279fd9a5",
  "0xb539edcc1bf7d07cc5efe9f7d9d994adce31fde0",
]);

export async function GET() {
  const addresses = await getAllAddresses();

  const visibleAddresses = addresses.filter(
  (addr) => !HIDDEN_ADDRESSES.has(addr.toLowerCase())
);


  const rows = await Promise.all(
    visibleAddresses.map(async (addr) => {
      const profile = await getProfile(addr);

      return {
        address: addr,
        highestStreak: profile?.highestStreak ?? 0,
        name: profile?.name ?? null,
        avatar: profile?.avatar ?? null,
      };
    })
  );

  rows.sort((a, b) => b.highestStreak - a.highestStreak);
  return NextResponse.json(rows.slice(0, 50));
}



