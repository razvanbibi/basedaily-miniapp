import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profileStore";
import { getReadOnlyContractServer } from "@/lib/contract.server";
import { ethers } from "ethers";
import { Resvg } from "@resvg/resvg-js";

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

  // ---------- SVG TEMPLATE ----------
  const svg = `
<svg width="600" height="600" viewBox="0 0 600 600"
  xmlns="http://www.w3.org/2000/svg">

  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="300" cy="220" r="70" />
    </clipPath>
  </defs>

  <rect width="600" height="600" fill="url(#bg)"/>

  <image
    href="${avatar}"
    x="230"
    y="150"
    width="140"
    height="140"
    clip-path="url(#avatarClip)"
  />

  <text x="300" y="80"
    fill="#38bdf8"
    font-size="34"
    text-anchor="middle"
    font-weight="600">
    BaseDaily Identity
  </text>

  <text x="300" y="320"
    fill="#e5e7eb"
    font-size="26"
    text-anchor="middle">
    ${profile?.name ?? "Base user"}
  </text>

  <text x="300" y="370"
    fill="#facc15"
    font-size="22"
    text-anchor="middle">
    🔥 Highest streak: ${highestStreak}
  </text>
</svg>
`;

  // ---------- SVG → PNG ----------
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 600 },
  });

  const pngData = resvg.render();
  const pngBuffer = new Uint8Array(pngData.asPng());

return new Response(pngBuffer, {
  headers: {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=300",
  },
});


}
