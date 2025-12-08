import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

export async function GET(req: NextRequest) {
  if (!NEYNAR_API_KEY) {
    return NextResponse.json(
      { error: "Missing NEYNAR_API_KEY" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const fidParam = searchParams.get("fid");

  if (!address && !fidParam) {
    return NextResponse.json(
      { error: "Missing address or fid" },
      { status: 400 }
    );
  }

  try {
    let url: string;

    if (address) {
      const addrLower = address.toLowerCase();
      url =
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${addrLower}`;
    } else {
      url =
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidParam}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": NEYNAR_API_KEY,
        api_key: NEYNAR_API_KEY,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Neynar request failed", details: text },
        { status: 500 }
      );
    }

    const data = await res.json();

    let user: any = null;

    if (address) {
      const allKeys = Object.keys(data || {});
      if (allKeys.length > 0) {
        const firstKey = allKeys[0];
        const arr = (data as any)[firstKey];
        if (Array.isArray(arr) && arr.length > 0) {
          user = arr[0];
        }
      }
    } else {
      const usersArray =
        (data as any).users ||
        (data as any).result?.users ||
        (data as any).result?.result?.users;

      if (Array.isArray(usersArray) && usersArray.length > 0) {
        user = usersArray[0];
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found in Neynar response" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      pfpUrl: user.pfp_url || user.pfp?.url || null,
      neynarScore:
        typeof user.score === "number"
          ? user.score
          : typeof user.neynar_score === "number"
          ? user.neynar_score
          : null,
    });
  } catch (e: any) {
    console.error("Neynar API error:", e);
    return NextResponse.json(
      { error: "Neynar API error", details: e?.message },
      { status: 500 }
    );
  }
}
