import { NextResponse } from "next/server";
import { addAddress } from "@/lib/leaderboardStore";
import { getNeynarProfile } from "@/lib/neynar";
import { saveProfile } from "@/lib/profileStore";

export async function POST(req: Request) {
  const { address } = await req.json();
  if (!address) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // 1️⃣ address register
  await addAddress(address);

  // 2️⃣ Neynar fetch (one-time best effort)
  try {
    const profile = await getNeynarProfile(address);

    if (profile) {
      await saveProfile(address, {
        name: profile.display_name ?? null,
        avatar: profile.pfp_url ?? null,
      });
    }
  } catch {
    // ignore Neynar failure
  }

  return NextResponse.json({ ok: true });
}
