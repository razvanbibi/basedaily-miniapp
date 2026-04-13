"use client";

import { createBaseAccountSDK, getCryptoKeyAccount, base } from "@base-org/account";
import { numberToHex } from "viem";

export const PAYMASTER_RPC =
  "https://api.developer.coinbase.com/rpc/v1/base/KbNJVsE8r843PcyhzAPpKAcVzieP7RYH";



export function getBaseAccountSDK() {

  return createBaseAccountSDK({

    appName: "BaseDaily",

    appLogoUrl: "https://basedaily-miniapp.vercel.app/icon.png",

    appChainIds: [base.constants.CHAIN_IDS.base],

  });

}

export async function getBaseAccountAddress() {

  const cryptoAccount = await getCryptoKeyAccount();

  return cryptoAccount?.account?.address;

}

export const BASE_CHAIN_HEX =
  numberToHex(base.constants.CHAIN_IDS.base);

