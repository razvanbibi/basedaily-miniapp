// src/lib/neynar.ts
export async function getNeynarProfile(address: string) {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/user/by-address?address=${address}`,
    {
      headers: {
        api_key: process.env.NEYNAR_API_KEY!,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data.user ?? null;
}
