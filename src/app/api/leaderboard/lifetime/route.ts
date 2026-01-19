export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAllAddresses } from "@/lib/leaderboardStore";
import { getProfile } from "@/lib/profileStore";

export async function GET() {
  const addresses = await getAllAddresses();

  const rows = await Promise.all(
    addresses.map(async (addr) => {
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



