export async function getNeynarProfile(address: string) {
  const res = await fetch(
    "https://api.neynar.com/v2/farcaster/user/bulk-by-address",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_key": process.env.NEYNAR_API_KEY!,
      },
      body: JSON.stringify({
        addresses: [address.toLowerCase()],
      }),
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data.users?.[0] ?? null;
}
 