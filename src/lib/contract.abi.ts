// src/lib/contract.abi.ts
export const OXTXN_STREAK_ABI = [
  {
    type: "function",
    name: "streak",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "highestStreak",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // 👉 দরকারি read ABI গুলোই রাখো
] as const;
export const OXTXN_STREAK_CONTRACT =
  "0x9D028f81d30C366079882aBb7255Edba0d34Ea80" as const;