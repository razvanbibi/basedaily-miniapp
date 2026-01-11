// src/lib/contract.server.ts
import { JsonRpcProvider, Contract } from "ethers";
import { OXTXN_STREAK_CONTRACT } from "./contract.abi";
import { OXTXN_STREAK_ABI } from "./contract.abi";

// Base mainnet public RPC (simple & safe)
const RPC_URL = "https://mainnet.base.org";

export function getReadOnlyContractServer() {
  const provider = new JsonRpcProvider(RPC_URL);

  const contract = new Contract(
    OXTXN_STREAK_CONTRACT,
    OXTXN_STREAK_ABI,
    provider
  );

  return { contract };
}
