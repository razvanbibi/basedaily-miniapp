import { NextResponse } from "next/server";
import { saveProfile } from "@/lib/profileStore";

export async function POST(req: Request) {
  const {
  address,
  name,
  avatar,
  fid,
  neynarScore,
  highestStreak,
} = await req.json();


  if (!address) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await saveProfile(address, {
    name: name ?? null,
    avatar: avatar ?? null,
    fid: fid ?? null,
    neynarScore: neynarScore ?? null,
  });

  return NextResponse.json({ ok: true });
}
