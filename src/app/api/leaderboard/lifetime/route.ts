import { NextResponse } from "next/server";
import { getReadOnlyContractServer } from "@/lib/contract.server";
import { getAllAddresses } from "@/lib/leaderboardStore";
import { getNeynarProfile } from "@/lib/neynar";

export async function GET() {
  const { contract } = getReadOnlyContractServer();
  const addresses = await getAllAddresses();

  const rows = await Promise.all(
    addresses.map(async (addr: string) => {
      const hs = await contract.highestStreak(addr);
      const profile = await getNeynarProfile(addr);

      return {
        address: addr,
        highestStreak: Number(hs),
        name: profile?.display_name ?? null,
        avatar: profile?.pfp_url ?? null,
      };
    })
  );

  rows.sort((a, b) => b.highestStreak - a.highestStreak);
  return NextResponse.json(rows.slice(0, 50));
}

