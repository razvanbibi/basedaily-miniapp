// src/lib/contract.server.ts
import { JsonRpcProvider, Contract } from "ethers";
import { OXTXN_STREAK_ABI, OXTXN_STREAK_CONTRACT } from "./contract";

const RPC_URL = "https://mainnet.base.org"; // public Base RPC

export function getReadOnlyContractServer() {
  const provider = new JsonRpcProvider(RPC_URL);

  const contract = new Contract(
    OXTXN_STREAK_CONTRACT,
    OXTXN_STREAK_ABI,
    provider
  );

  return { provider, contract };
}
