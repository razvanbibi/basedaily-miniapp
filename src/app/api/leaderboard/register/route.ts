import { NextResponse } from "next/server";
import { addAddress } from "@/lib/leaderboardStore";

export async function POST(req: Request) {
  const { address } = await req.json();
  if (!address) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await addAddress(address);
  return NextResponse.json({ ok: true });
}
