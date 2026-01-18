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

  if (!res.ok) {
    console.log("NEY FAILED", res.status);
    return null;
  }

  const data = await res.json();

  const user = data.users_by_address?.[address.toLowerCase()];
  if (!user) return null;

  return {
    display_name: user.display_name ?? null,
    pfp_url: user.pfp_url ?? null,
  };
}
