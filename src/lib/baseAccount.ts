"use client";

export const PAYMASTER_RPC =
  "https://api.developer.coinbase.com/rpc/v1/base/KbNJVsE8r843PcyhzAPpKAcVzieP7RYH";

export function getBaseProvider() {

  if (typeof window === "undefined")
    throw new Error("Client only");

  const provider = (window as any).ethereum;

  if (!provider)
    throw new Error("Base wallet not detected");

  return provider;
}