export async function getNeynarProfile(address: string) {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
    {
      headers: {
        "api_key": process.env.NEYNAR_API_KEY!,
      },
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.users?.[0] ?? null;
}
