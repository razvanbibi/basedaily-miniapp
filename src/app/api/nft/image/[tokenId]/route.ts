export const runtime = "nodejs";

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
  const highestStreak = Number(await contract.highestStreak(owner));

  const avatar =
    profile?.avatar ?? "https://basedaily-miniapp.vercel.app/avatar.png";

  const fcScore = "—";

  const svg = `
<svg width="600" height="360" viewBox="0 0 600 360"
  xmlns="http://www.w3.org/2000/svg">

  <defs>
    <!-- bg -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>

    <!-- grid -->
    <pattern id="grid" width="22" height="22" patternUnits="userSpaceOnUse">
      <path d="M22 0H0V22" fill="none" stroke="white" stroke-width="1" opacity="0.04"/>
    </pattern>

    <!-- glow -->
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="36"/>
    </filter>

    <!-- avatar clip -->
    <clipPath id="avatarClip">
      <circle cx="96" cy="72" r="24"/>
    </clipPath>

    <!-- gold -->
    <linearGradient id="goldText" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>

  <!-- card -->
  <rect x="40" y="24" rx="18" ry="18"
    width="520" height="312"
    fill="url(#bg)"/>

  <!-- glow corner -->
  <circle cx="560" cy="24" r="120"
    fill="rgba(56,189,248,0.22)"
    filter="url(#softGlow)"/>

  <!-- grid -->
  <rect x="40" y="24" rx="18" ry="18"
    width="520" height="312"
    fill="url(#grid)"/>

  <!-- avatar -->
  <image
    href="${avatar}"
    x="72" y="48"
    width="48" height="48"
    clip-path="url(#avatarClip)"/>

  <!-- name -->
  <text x="132" y="66"
    fill="#e5e7eb"
    font-size="15"
    font-weight="600">
    ${profile?.name ?? "Base user"}
  </text>

  <!-- fid -->
  <text x="132" y="82"
    fill="#94a3b8"
    font-size="11">
    FID: ${profile?.fid ?? "—"}
  </text>

  <!-- labels -->
  <text x="72" y="138"
    fill="#94a3b8"
    font-size="11">
    🔥 HIGHEST STREAK
  </text>

  <text x="72" y="182"
    fill="#94a3b8"
    font-size="11">
    ⭐ NEYNAR SCORE
  </text>

  <!-- values -->
  <text x="520" y="142"
    fill="url(#goldText)"
    font-size="26"
    font-weight="800"
    text-anchor="end">
    ${highestStreak}
  </text>

  <text x="520" y="186"
    fill="#38bdf8"
    font-size="15"
    font-weight="600"
    text-anchor="end">
    —
  </text>

  <!-- footer -->
  <image
    href="https://basedaily-miniapp.vercel.app/logo-0x.png"
    x="268" y="290"
    width="14" height="14"/>

  <text x="300" y="302"
    fill="#94a3b8"
    font-size="10"
    text-anchor="middle">
    BaseDaily Identity NFT
  </text>

</svg>
`;



return new Response(svg, {
  headers: {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=300",
  },
});
}
