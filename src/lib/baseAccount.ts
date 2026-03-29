"use client";

import { createBaseAccountSDK } from "@base-org/account";
import { base } from "viem/chains";

export const PAYMASTER_RPC =
  "https://api.developer.coinbase.com/rpc/v1/base/KbNJVsE8r843PcyhzAPpKAcVzieP7RYH";

export function getBaseProvider() {
  const sdk = createBaseAccountSDK({
    appName: "BaseDaily",
    appChainIds: [base.id],
  });

  return sdk.getProvider();
}