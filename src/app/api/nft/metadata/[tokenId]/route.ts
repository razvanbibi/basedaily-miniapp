import { NextResponse } from "next/server";
import { getReadOnlyContractServer } from "@/lib/contract.server";
import { getProfile } from "@/lib/profileStore";
import { ethers } from "ethers";

const NFT_CONTRACT = "0xe56bF68c390f3761fa3707D8Dbb411bACBa0fa96";

const NFT_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)"
];

export async function GET(
  req: Request,
  { params }: { params: { tokenId: string } }
) {
  const tokenId = Number(params.tokenId);
  const { origin } = new URL(req.url);

  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const nft = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);

  // 1️⃣ owner বের করো
  const owner: string = await nft.ownerOf(tokenId);

  // 2️⃣ Redis profile পড়ো
  const profile = await getProfile(owner);

  // 3️⃣ highest streak (on-chain)
  const { contract } = getReadOnlyContractServer();
  const highestStreak = Number(await contract.highestStreak(owner));

  // 4️⃣ metadata রিটার্ন
  return NextResponse.json({
    name: profile?.name
      ? `BaseDaily Identity — ${profile.name}`
      : "BaseDaily Identity",
    description: "Dynamic BaseDaily Identity NFT",
    image: `${origin}/api/nft/image/${tokenId}`,
    image_url: `${origin}/api/nft/image/${tokenId}`,
    attributes: [
      {
        trait_type: "Highest Streak",
        value: highestStreak,
      },
      {
        trait_type: "FID",
        value: profile?.fid ?? "—",
      },
      {
  trait_type: "Neynar Score",
  value: profile?.neynarScore ?? "—",
},
    ],
  });
}
