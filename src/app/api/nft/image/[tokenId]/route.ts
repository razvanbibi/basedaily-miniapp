export const runtime = "nodejs";

import { ImageResponse } from "@vercel/og";
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
<svg width="600" height="600" viewBox="0 0 600 600"
  xmlns="http://www.w3.org/2000/svg">

  <defs>
    <!-- background gradient -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="60%" stop-color="#020617"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>

    <!-- glow -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="28" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- grid -->
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0H0V24" fill="none" stroke="white" stroke-width="1" opacity="0.06"/>
    </pattern>

    <!-- avatar clip -->
    <clipPath id="avatarClip">
      <circle cx="96" cy="112" r="24"/>
    </clipPath>

    <!-- avatar ring -->
    <filter id="avatarGlow">
      <feDropShadow dx="0" dy="0" stdDeviation="6"
        flood-color="#38bdf8" flood-opacity="0.8"/>
    </filter>

    <!-- gold text -->
    <linearGradient id="goldText" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>

  <!-- card -->
  <rect x="40" y="40" rx="24" ry="24"
    width="520" height="520"
    fill="url(#bg)"
    stroke="rgba(255,255,255,0.1)"/>

  <!-- glow blob -->
  <circle cx="520" cy="60" r="90"
    fill="rgba(56,189,248,0.25)"
    filter="url(#glow)"/>

  <!-- grid overlay -->
  <rect x="40" y="40" rx="24" ry="24"
    width="520" height="520"
    fill="url(#grid)"/>

  <!-- avatar -->
  <image
    href="${avatar}"
    x="72"
    y="88"
    width="48"
    height="48"
    clip-path="url(#avatarClip)"
    filter="url(#avatarGlow)"
  />

  <!-- name -->
  <text x="132" y="110"
    fill="#e5e7eb"
    font-size="16"
    font-weight="600">
    ${profile?.name ?? "Base user"}
  </text>

  <!-- fid -->
  <text x="132" y="128"
    fill="#94a3b8"
    font-size="11">
    FID: ${profile?.fid ?? "—"}
  </text>

  <!-- labels -->
  <text x="72" y="210"
    fill="#94a3b8"
    font-size="11"
    letter-spacing="0.08em">
    🔥 HIGHEST STREAK
  </text>

  <text x="72" y="262"
    fill="#94a3b8"
    font-size="11"
    letter-spacing="0.08em">
    ⭐ NEYNAR SCORE
  </text>

  <!-- values -->
  <text x="488" y="214"
    fill="url(#goldText)"
    font-size="28"
    font-weight="800"
    text-anchor="end"
    style="filter: drop-shadow(0 0 12px rgba(251,191,36,0.35));">
    ${highestStreak}
  </text>

  <text x="488" y="266"
    fill="#38bdf8"
    font-size="16"
    font-weight="600"
    text-anchor="end">
    —
  </text>

  <!-- footer -->
  <image
    href="https://basedaily-miniapp.vercel.app/logo-0x.png"
    x="210" y="420"
    width="16" height="16"/>

  <text x="300" y="432"
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
