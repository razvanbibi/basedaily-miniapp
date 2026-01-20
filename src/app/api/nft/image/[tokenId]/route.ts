import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profileStore";
import { getReadOnlyContractServer } from "@/lib/contract.server";
import { ethers } from "ethers";

const NFT_CONTRACT = "0xe56bF68c390f3761fa3707D8Dbb411bACBa0fa96";
const NFT_ABI = ["function ownerOf(uint256) view returns (address)"];

export async function GET(
  _req: Request,
  { params }: { params: { tokenId: string } }
) {
  const tokenId = Number(params.tokenId);

  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const nft = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);
  const owner = await nft.ownerOf(tokenId);

  const profile = await getProfile(owner);
  const { contract } = getReadOnlyContractServer();
  const streak = Number(await contract.highestStreak(owner));

const avatar =
  profile?.avatar ?? "https://basedaily-miniapp.vercel.app/avatar.png";


  const svg = `
<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <defs>
  <clipPath id="avatarClip">
    <circle cx="300" cy="200" r="60" />
  </clipPath>
</defs>

<image
  href="${avatar}"
  x="240"
  y="140"
  width="120"
  height="120"
  clip-path="url(#avatarClip)"
/>

  <text x="50%" y="120" fill="#38bdf8" font-size="32" text-anchor="middle">
    BaseDaily Identity
  </text>
  <text x="50%" y="260" fill="#e5e7eb" font-size="26" text-anchor="middle">
    ${profile?.name ?? "Base user"}
  </text>
  <text x="50%" y="320" fill="#facc15" font-size="22" text-anchor="middle">
    🔥 Highest streak: ${streak}
  </text>
</svg>
`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
