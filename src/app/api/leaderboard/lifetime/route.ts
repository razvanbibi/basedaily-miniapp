export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getReadOnlyContractServer } from "@/lib/contract.server";
import { getAllAddresses } from "@/lib/leaderboardStore";
import { getProfile } from "@/lib/profileStore";

export async function GET() {
  const { contract } = getReadOnlyContractServer();
  const addresses = await getAllAddresses();

  const rows = await Promise.all(
    addresses.map(async (addr: string) => {
      let hs = 0;
try {
  hs = Number(await contract.highestStreak(addr));
} catch {
  hs = 0; // RPC fail হলেও API ভাঙবে না
}

      const profile = await getProfile(addr);

      return {
        address: addr,
        highestStreak: Number(hs),
        name: profile?.name ?? null,
        avatar: profile?.avatar ?? null,
      };
    })
  );

  rows.sort((a, b) => b.highestStreak - a.highestStreak);

  return NextResponse.json(rows.slice(0, 50));
}


