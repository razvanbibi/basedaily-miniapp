"use client";

import { useEffect, useState } from "react";
import {
  getEthereum,
  getContractWithSigner,
  getReadOnlyContract,
  formatToken,
} from "@/lib/contract";

import { ethers } from "ethers";

import { sdk } from "@farcaster/miniapp-sdk";


type Status = string | null;

type Toast =
  | { type: "checkin"; message: string }
  | { type: "claim"; message: string }
  | { type: "donation"; message: string }
  | null;

type Supporter = {
  address: string;
  total: number;
  name?: string;
  avatar?: string;
};


const BASE_USDC_ADDRESS = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

const DONATION_CONTRACT =
  "0x8848c754269c7376959710002a9211ef353fba69" as const; // BaseDailyDonations


export default function HomePage() {
  const [account, setAccount] = useState<string | null>(null);
  const [streak, setStreak] = useState<bigint | null>(null);
  const [highestStreak, setHighestStreak] = useState<bigint | null>(null);
  const [pendingTokens, setPendingTokens] = useState<bigint | null>(null);
  const [paused, setPaused] = useState<boolean | null>(null);

  const [totalEarned, setTotalEarned] = useState<bigint | null>(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [recentlyClaimed, setRecentlyClaimed] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const [totalSilver, setTotalSilver] = useState<bigint | null>(null);
  const [totalGold, setTotalGold] = useState<bigint | null>(null);
  const [totalDiamond, setTotalDiamond] = useState<bigint | null>(null);
  const [totalLegendary, setTotalLegendary] = useState<bigint | null>(null);

  const [pendingSilver, setPendingSilver] = useState<bigint | null>(null);
  const [pendingGold, setPendingGold] = useState<bigint | null>(null);
  const [pendingDiamond, setPendingDiamond] = useState<bigint | null>(null);
  const [pendingLegendary, setPendingLegendary] = useState<bigint | null>(null);


  const [showDonate, setShowDonate] = useState(false);
  const [donationAmount, setDonationAmount] = useState<string>("1");

  // Farcaster / Neynar profile state
  const [fcUsername, setFcUsername] = useState<string | null>(null);
  const [fcDisplayName, setFcDisplayName] = useState<string | null>(null);
  const [fcFid, setFcFid] = useState<string | null>(null);
  const [fcScore, setFcScore] = useState<number | null>(null);
  const [fcPfp, setFcPfp] = useState<string | null>(null);

  const [ethReady, setEthReady] = useState(false);

  const [topSupporters, setTopSupporters] = useState<Supporter[]>([]);

  // MiniApp onboarding overlay দেখা হয়েছে কিনা
  const [showOnboarding, setShowOnboarding] = useState(false);
    // Theme (day / night)
  const [isDarkMode, setIsDarkMode] = useState(true);


  // MiniApp SDK → Base-কে জানানো যে app ready
  useEffect(() => {
    async function markReady() {
      try {
        await sdk.actions.ready();
      } catch (e) {
        console.error("Miniapp ready() failed", e);
      }
    }

    if (typeof window !== "undefined") {
      void markReady();
    }
  }, []);

  // একবারই ছোট onboarding দেখাবে
  useEffect(() => {
    if (typeof window === "undefined") return;

    const seen = window.localStorage.getItem("basedaily_onboarding_v1");
    if (!seen) {
      setShowOnboarding(true);
      window.localStorage.setItem("basedaily_onboarding_v1", "1");
    }
  }, []);

  const closeOnboarding = () => {
    setShowOnboarding(false);
  };



    // প্রথমবার লোড হলে থিম পড়ে আনা
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("basedaily_theme");
    if (stored === "light") {
      setIsDarkMode(false);
    } else {
      setIsDarkMode(true);
    }
  }, []);

  // থিম পরিবর্তন হলে localStorage এ সেভ
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("basedaily_theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);


  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      setEthReady(true);
    }
  }, []);


  // ---- helpers for localStorage-based daily check-in ----
  function getTodayId() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
  }

  function getStorageKey(acc: string) {
    return `basedaily:checkin:${acc.toLowerCase()}`;
  }

  useEffect(() => {
    const eth = getEthereum();
    if (!eth) {
      setStatus("Please install MetaMask or a compatible wallet.");
      return;
    }

    const handleAccountsChanged = (accs: string[]) => {
      setAccount(accs[0] ?? null);
    };
    const handleChainChanged = () => {
      window.location.reload();
    };

    eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
      if (accs.length > 0) setAccount(accs[0]);
    });

    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);

    return () => {
      if (!eth.removeListener) return;
      eth.removeListener("accountsChanged", handleAccountsChanged);
      eth.removeListener("chainChanged", handleChainChanged);
    };
  }, []);

  // MiniApp SDK → Base কে জানায় যে অ্যাপ রেডি
  useEffect(() => {
    async function markReady() {
      try {
        await sdk.actions.ready();
      } catch (e) {
        console.error("Miniapp ready() failed", e);
      }
    }

    if (typeof window !== "undefined") {
      void markReady();
    }
  }, []);



  // account চেঞ্জ হলে অনচেইন ডাটা + আজকের check-in স্ট্যাটাস লোড
  useEffect(() => {

    if (!account || !ethReady) return;

    void refreshData();

    try {
      const key = getStorageKey(account);
      const stored = window.localStorage.getItem(key);
      setHasCheckedInToday(stored === getTodayId());
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, ethReady]);

  // Neynar profile – current connected wallet address দিয়ে
  useEffect(() => {
    if (!account) return;
    void loadNeynarProfile(account);
  }, [account]);




  useEffect(() => {
    async function enrich() {
      for (const s of topSupporters) {
        if (s.name || s.avatar) continue;
        try {
          const res = await fetch(`/api/neynar-profile?address=${s.address}`);
          if (!res.ok) continue;
          const data = await res.json();
          const name = data.displayName || data.username || "";
          const avatar = data.pfpUrl || "";

          setTopSupporters((prev) => {
            const updated = prev.map((p) =>
              p.address === s.address ? { ...p, name, avatar } : p
            );
            return updated;
          });
        } catch { }
      }
    }

    if (topSupporters.length > 0) {
      void enrich();
    }
  },
    [topSupporters]);


  useEffect(() => {
    void loadDonationLeaderboard();
  }, []);



  async function getUsdcContractWithSigner() {
    const eth = getEthereum();
    if (!eth) throw new Error("Wallet not found");

    const provider = new ethers.BrowserProvider(eth as any);
    const signer = await provider.getSigner();

    const usdcAbi = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ];

    const usdc = new ethers.Contract(BASE_USDC_ADDRESS, usdcAbi, signer);
    return { provider, signer, usdc };
  }


  async function ensureBaseNetwork() {
    const eth = getEthereum();
    if (!eth) throw new Error("Wallet not found");
    const chainId = await eth.request({ method: "eth_chainId" });
    if (chainId !== "0x2105") {
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x2105" }],
        });
      } catch (err: any) {
        if (err.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x2105",
                chainName: "Base",
                rpcUrls: ["https://mainnet.base.org"],
                nativeCurrency: {
                  name: "Base",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://basescan.org"],
              },
            ],
          });
        } else {
          throw err;
        }
      }
    }
  }

  async function connectWallet() {
    try {
      setStatus(null);
      const eth = getEthereum();
      if (!eth) {
        setStatus("Please install MetaMask or a compatible wallet.");
        return;
      }
      const accounts: string[] = await eth.request({
        method: "eth_requestAccounts",
      });
      if (accounts.length === 0) {
        setStatus("No account selected.");
        return;
      }
      setAccount(accounts[0]);
      await ensureBaseNetwork();
      await refreshData();
    } catch (err: any) {
      console.error(err);
      setStatus(err.message ?? "Failed to connect wallet.");
    }
  }

  async function refreshData(): Promise<{ pending: bigint | null } | void> {
    if (!account) return;
    try {
      setLoading(true);
      setStatus(null);
      await ensureBaseNetwork();
      const { contract } = await getReadOnlyContract();

      const [
        st,
        hs,
        pt,
        isPaused,
        pSil,
        pGold,
        pDia,
        pLeg,
        tSil,
        tGold,
        tDia,
        tLeg,
        tEarned,
      ] = await Promise.all([
        contract.streak(account),
        contract.highestStreak(account),
        contract.pendingTokens(account),
        contract.paused(),
        contract.pendingSilver(account),
        contract.pendingGold(account),
        contract.pendingDiamond(account),
        contract.pendingLegendary(account),
        contract.totalSilver(account),
        contract.totalGold(account),
        contract.totalDiamond(account),
        contract.totalLegendary(account),
        contract.totalEarnedTokens(account),
      ]);

      setStreak(st);
      setHighestStreak(hs);
      setPendingTokens(pt);
      setPaused(isPaused);

      // pending badges
      setPendingSilver(pSil);
      setPendingGold(pGold);
      setPendingDiamond(pDia);
      setPendingLegendary(pLeg);

      // lifetime totals
      setTotalSilver(tSil);
      setTotalGold(tGold);
      setTotalDiamond(tDia);
      setTotalLegendary(tLeg);
      setTotalEarned(tEarned);

      return { pending: pt };
    } catch (err: any) {
      console.error(err);
      setStatus(err.message ?? "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }


  async function loadNeynarProfile(forAddress: string) {
    try {
      const res = await fetch(`/api/neynar-profile?address=${forAddress}`);
      if (!res.ok) return;
      const data = await res.json();

      setFcUsername(data.username ?? null);
      setFcDisplayName(data.displayName ?? null);
      setFcFid(data.fid ? String(data.fid) : null);
      setFcScore(
        typeof data.neynarScore === "number" ? data.neynarScore : null
      );
      setFcPfp(data.pfpUrl ?? null);
    } catch {
      // fail silently for now
    }
  }


  function showToast(next: Toast, durationMs = 2000) {
    setToast(next);
    if (next) {
      setTimeout(() => {
        setToast(null);
      }, durationMs);
    }
  }

  async function handleCheckIn() {
    try {
      if (!account) {
        setStatus("Connect your wallet first.");
        return;
      }
      setLoading(true);
      setStatus("Sending check-in transaction...");
      const prevPending = pendingTokens ?? BigInt(0);

      await ensureBaseNetwork();
      const { contract } = await getContractWithSigner();
      const tx = await contract.checkIn();
      const pending = (await refreshData())?.pending ?? BigInt(0);
      setPendingTokens(pending);


      setStatus("Check-in pending... waiting for confirmation.");
      await tx.wait();

      // আজকের দিন localStorage এ সেভ + UI state সেট
      const key = getStorageKey(account);
      try {
        window.localStorage.setItem(key, getTodayId());
      } catch {
        // ignore
      }
      setHasCheckedInToday(true);

      const result = await refreshData();

      await new Promise((r) => setTimeout(r, 300));


      const newPending = result?.pending ?? pendingTokens ?? BigInt(0);
      const diff = newPending - prevPending;
      if (diff > BigInt(0)) {
        showToast(
          {
            type: "checkin",
            message: `+${formatToken(diff)} 0xtxn unlocked`,
          },
          2000
        );
      } else {
        showToast(
          {
            type: "checkin",
            message: "Check-in successful 🎉",
          },
          2000
        );
      }
    } catch (err: any) {
      console.error(err);
      setStatus(
        err?.info?.error?.message ??
        err?.shortMessage ??
        err?.message ??
        "Check-in failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleClaimAll() {
    try {
      if (!account) {
        setStatus("Connect your wallet first.");
        return;
      }
      if (!pendingTokens || pendingTokens === BigInt(0)) {
        setStatus("Nothing to claim right now.");
        return;
      }

      setLoading(true);
      setStatus("Sending claim transaction...");

      const claimAmount = pendingTokens;

      await ensureBaseNetwork();
      const { contract } = await getContractWithSigner();
      const tx = await contract.claimAll();
      setStatus("Claim pending... waiting for confirmation.");
      await tx.wait();

      setRecentlyClaimed(true);
      await refreshData();

      showToast(
        {
          type: "claim",
          message: `Claimed ${formatToken(claimAmount!)} 0xtxn`,
        },
        2500
      );
    } catch (err: any) {
      console.error(err);
      setStatus(
        err?.info?.error?.message ??
        err?.shortMessage ??
        err?.message ??
        "Claim failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSelectDonation(amount: number) {
    setDonationAmount(amount.toString());
  }

  async function handleDonateClick() {
    try {
      if (!account) {
        setStatus("Connect your wallet first.");
        return;
      }

      const raw = donationAmount.trim();
      const amountNumber = Number(raw);

      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        setStatus("Enter a valid donation amount.");
        return;
      }

      // USDC = 6 decimals
      const amountScaled = BigInt(Math.round(amountNumber * 1_000_000));

      setLoading(true);
      setStatus(`Sending ${amountNumber} USDC donation on Base…`);

      await ensureBaseNetwork();

      // USDC + signer
      const { signer, usdc } = await getUsdcContractWithSigner();

      // 1) allowance চেক
      setStatus("Checking USDC allowance…");
      const currentAllowance: bigint = await usdc.allowance(
        account,
        DONATION_CONTRACT
      );

      if (currentAllowance < amountScaled) {
        setStatus("Approving USDC for donations…");
        const txApprove = await usdc.approve(DONATION_CONTRACT, amountScaled);
        await txApprove.wait();
      }

      // 2) BaseDailyDonations কনট্রাক্টে donate কল
      const donationAbi = ["function donate(uint256 amount) external"];
      const donationContract = new ethers.Contract(
        DONATION_CONTRACT,
        donationAbi,
        signer
      );

      setStatus("Sending donation transaction…");
      const tx = await donationContract.donate(amountScaled);
      setStatus("Donation pending... waiting for confirmation.");
      await tx.wait();

      // 3) অনচেইন থেকে লিডারবোর্ড রিলোড
      await loadDonationLeaderboard();

      showToast(
        {
          type: "donation",
          message: `Thank you! Donated ${amountNumber} USDC.`,
        },
        2500
      );
    } catch (err: any) {
      console.error(err);

      const msg = String(
        err?.info?.error?.message ??
        err?.shortMessage ??
        err?.message ??
        ""
      ).toLowerCase();

      if (msg.includes("user denied") || msg.includes("rejected")) {
        setStatus("Donation cancelled.");
      } else {
        setStatus(err?.message ?? "Donation failed.");
      }

      setTimeout(() => setStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  }


  function handleShare() {
    const APP_URL = "https://basedaily-miniapp.vercel.app/";

    const text =
      "Checking in daily on Base using BaseDaily 🟦\n" +
      "Growing my streak & earning 0xtxn rewards.\n\n" +
      APP_URL;

    // If device supports native share
    if (navigator.share) {
      navigator
        .share({
          title: "BaseDaily — Check-in on Base",
          text,
          url: APP_URL,
        })
        .catch(() => { });
    } else {
      // Fallback → Twitter / X share
      const tweetUrl =
        "https://x.com/intent/tweet?text=" + encodeURIComponent(text);
      window.open(tweetUrl, "_blank");
    }
  }



  async function loadDonationLeaderboard() {
    try {
      const eth = getEthereum();
      if (!eth) return;

      // MetaMask provider
      const provider = new ethers.BrowserProvider(eth as any);

      // ethers v6 interface
      const iface = new ethers.Interface([
        "event Donation(address indexed donor, uint256 amount, uint256 timestamp)"
      ]);

      const donationTopic = ethers.id("Donation(address,uint256,uint256)");

      const logs = await provider.getLogs({
        address: DONATION_CONTRACT,
        topics: [donationTopic],
        fromBlock: BigInt(0),
        toBlock: "latest",
      });

      const totals: Record<string, number> = {};

      for (const log of logs) {
        const parsed = iface.decodeEventLog("Donation", log.data, log.topics);
        const donor = (parsed.donor as string).toLowerCase();
        const amount = Number(parsed.amount as bigint) / 1_000_000;

        totals[donor] = (totals[donor] ?? 0) + amount;
      }

      const entries = Object.entries(totals)
        .map(([address, total]) => ({ address, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setTopSupporters(entries);
    } catch (err) {
      console.error("Failed to load on-chain leaderboard", err);
    }
  }







  const unclaimedReadable =
    pendingTokens !== null ? formatToken(pendingTokens) : null;

  const streakNumber = streak ? Number(streak) : 0;

  const highestNumber = highestStreak ? Number(highestStreak) : 0;

  const pendingSilverCount = pendingSilver ? Number(pendingSilver) : 0;
  const pendingGoldCount = pendingGold ? Number(pendingGold) : 0;
  const pendingDiamondCount = pendingDiamond ? Number(pendingDiamond) : 0;
  const pendingLegendaryCount = pendingLegendary ? Number(pendingLegendary) : 0;


  const totalEarnedNumber = totalEarned ? Number(totalEarned) : 0;
  const totalEarnedReadable =
    totalEarned !== null ? formatToken(totalEarned) : null;

  const totalSilverCount = totalSilver ? Number(totalSilver) : 0;
  const totalGoldCount = totalGold ? Number(totalGold) : 0;
  const totalDiamondCount = totalDiamond ? Number(totalDiamond) : 0;
  const totalLegendaryCount = totalLegendary ? Number(totalLegendary) : 0;


  const badgeProgress =
    streakNumber <= 0 ? 0 : Math.min(streakNumber / 100, 1);

        const mainBgClass = isDarkMode
      ? "bg-slate-950 text-slate-50"
      : "bg-sky-50 text-slate-900";

    const gradientClass = isDarkMode
      ? "bg-[radial-gradient(circle_at_top,_#1d4ed8_0,_#020617_55%)] opacity-70"
      : "bg-[radial-gradient(circle_at_top,_#93c5fd_0,_#e0f2fe_55%)] opacity-60";


  return (
          <main className={`min-h-screen ${mainBgClass} relative overflow-hidden`}>
      {/* subtle background gradient */}
              <div className={`pointer-events-none absolute inset-0 ${gradientClass}`} />
      <div className="relative mx-auto max-w-md px-4 pb-10 pt-6 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center">
              <img
  src={isDarkMode ? "/logo-0x.png" : "/logo-0x-day.png"}
  alt="0x logo"
  className="h-full w-full object-contain transition-opacity duration-200"
/>

            </div>
            <div className="flex flex-col leading-tight">
              <span
  className={`text-base font-semibold tracking-tight ${
    isDarkMode ? "text-sky-100" : "text-slate-900 drop-shadow-sm"
  }`}
>
  BaseDaily
</span>
<span
  className={`text-[11px] ${
    isDarkMode ? "text-slate-300" : "text-slate-700"
  }`}
>
  Be loyal to BASE 🟦 Earn rewards
</span>

            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl bg-slate-900/90 shadow-lg shadow-black/40 hover:bg-slate-800 transition"
            aria-label="Open profile"
          >
            <span className="inline-block w-3.5 space-y-[3px]">
              <span className="block h-[2px] rounded bg-slate-200" />
              <span className="block h-[2px] rounded bg-slate-200" />
              <span className="block h-[2px] rounded bg-slate-200" />
            </span>
          </button>
        </header>

        {/* Welcome / wallet card */}
        <section className="rounded-3xl bg-slate-900/80 backdrop-blur-lg shadow-xl shadow-black/50 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-slate-200">
                Hello{account ? "," : ""}{" "}
                <span className="font-medium text-sky-200">
                  {account ? "streaker" : "friend"}
                </span>
                👋
              </p>
              <p className="text-xs text-slate-400">
                Check in every day to grow your streak and earn 0xtxn.
              </p>
            </div>

            {account ? (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[11px] text-slate-500">Wallet</span>
                <span
  className={`text-[11px] px-2 py-1 rounded-full shadow-inner ${
    isDarkMode
      ? "bg-slate-950/70 text-slate-100 shadow-slate-900"
      : "bg-white text-slate-900 shadow-slate-300"
  }`}
>
  {account.slice(0, 4)}…{account.slice(-4)}
</span>

                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Base
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="text-xs bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium px-3 py-2 rounded-xl shadow-md shadow-sky-900 transition"
              >
                Connect wallet
              </button>
            )}
          </div>
        </section>

        {/* Today card */}
        <section className="rounded-3xl bg-slate-900/85 backdrop-blur-lg shadow-xl shadow-black/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span className="text-lg">📆</span> Today
            </h2>
            {streak !== null && (
              <span className="text-[11px] text-slate-400">
                Current streak:{" "}
                <span className="font-semibold text-sky-300">
                  {streak.toString()} days
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Highest streak:{" "}
              <span className="font-normal text-slate-100">
                {highestNumber} days
              </span>
            </span>
          </div>

          <p className="text-xs text-slate-400">
            {account
              ? hasCheckedInToday
                ? "You have already checked in today. Come back tomorrow!"
                : "Tap check-in to unlock today’s 0xtxn reward."
              : "Connect your wallet to start your daily check-in streak."}
          </p>

          {account && (
            <div className="flex justify-center mt-1">
              <button
                onClick={handleCheckIn}
                disabled={loading || hasCheckedInToday || paused === true}
                className={`inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold transition shadow-md shadow-emerald-900/60 ${hasCheckedInToday || paused
                  ? "bg-emerald-900/40 text-emerald-300/70 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 text-slate-950 hover:brightness-110"
                  } ${loading ? "opacity-70" : ""}`}
              >
                {hasCheckedInToday
                  ? "Checked-in"
                  : loading
                    ? "Processing…"
                    : "Check-in"}
              </button>
            </div>
          )}
          {paused && (
            <p className="text-[11px] text-amber-300 mt-1">
              The contract is currently paused. Please try again later.
            </p>
          )}
        </section>

        {/* Rewards card */}
        <section className="rounded-3xl bg-slate-900/85 backdrop-blur-lg shadow-xl shadow-black/50 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span className="text-lg">💰</span> Rewards
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Unclaimed 0xtxn
              </span>
              <span className="font-semibold text-sky-300">
                {unclaimedReadable ?? "-"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Badges and total earned 0xtxn will be displayed here soon.
            </p>
          </div>

          {account && (
            <div className="flex justify-center mt-2">
              <button
                onClick={handleClaimAll}
                disabled={!!(loading || !pendingTokens || pendingTokens === BigInt(0) || paused)}

                className={`inline-flex items-center justify-center px-6 py-2.5 rounded-full text-sm font-semibold transition shadow-md shadow-fuchsia-900/60 ${recentlyClaimed
                  ? "bg-fuchsia-900/40 text-fuchsia-200/80 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-slate-50 hover:brightness-110"
                  } ${loading || !pendingTokens || pendingTokens === BigInt(0) || paused
                    ? "opacity-40 cursor-not-allowed"
                    : ""
                  }`}
              >
                {pendingTokens && pendingTokens > BigInt(0) ? "Claim all" : "Claimed"}
              </button>
            </div>
          )}
        </section>

        {/* Badge progress + badge list */}
        <section className="rounded-3xl bg-slate-900/85 backdrop-blur-lg shadow-xl shadow-black/50 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span className="text-lg">🏅</span> Badges
          </h2>

          {/* progress path */}
          <div className="relative mt-1 mb-2">
            <div className="h-[2px] w-full rounded-full bg-slate-700/80" />
            <div className="absolute inset-x-0 -top-3 flex justify-between text-lg">
              <span>🥈</span>
              <span>🥇</span>
              <span>💎</span>
              <span>🌟</span>
            </div>
            <div
              className="absolute -top-5 h-7 w-7 rounded-full ring-2 ring-sky-400 bg-slate-900 overflow-hidden shadow-lg shadow-sky-900 transition-all"
              style={{
                left: `${badgeProgress * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              <img
                src={fcPfp || "/avatar.png"}
                alt="User avatar"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            As your streak grows, your avatar moves along the badge path. Silver,
            Gold, Diamond and Legendary/Loyalty badges will unlock at different
            milestones.
          </p>

          {/* your badges */}
          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
            <BadgeCard
              icon="🥈"
              name="Silver"
              owned={Math.max(totalSilverCount - pendingSilverCount, 0)}
            />
            <BadgeCard
              icon="🥇"
              name="Gold"
              owned={Math.max(totalGoldCount - pendingGoldCount, 0)}
            />
            <BadgeCard
              icon="💎"
              name="Diamond"
              owned={Math.max(totalDiamondCount - pendingDiamondCount, 0)}
            />
            <BadgeCard
              icon="🌟"
              name="Legendary / Loyalty"
              owned={Math.max(totalLegendaryCount - pendingLegendaryCount, 0)}
            />
          </div>
        </section>

        {/* Donation */}
        <section className="rounded-3xl bg-slate-900/85 backdrop-blur-lg shadow-xl shadow-black/50 p-4 space-y-3">
          <button
            type="button"
            onClick={() => setShowDonate((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-slate-100"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">💙</span> Support creator
            </span>
            <span className="text-[11px] text-slate-400">
              {showDonate ? "Hide" : "Tip in Base USDC"}
            </span>
          </button>

          {showDonate && (
            <div className="mt-3 space-y-3 text-xs bg-slate-950/80 rounded-2xl p-3 shadow-inner shadow-slate-950">
              <p className="text-slate-300">Tip in Base USDC</p>

              <div className="flex flex-wrap gap-2">
                {[1, 5, 10, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleSelectDonation(v)}
                    className={`px-3 py-1.5 rounded-full border text-xs ${donationAmount === v.toString()
                      ? "border-sky-400 bg-sky-500/10 text-sky-200"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                      }`}
                  >
                    {v} USDC
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs outline-none focus:border-sky-400 ${
    isDarkMode
      ? "bg-slate-900 border border-slate-700 text-slate-100"
      : "bg-white border border-slate-300 text-slate-900"
  }`}
                  placeholder="Custom amount"
                />
                <button
                  type="button"
                  onClick={handleDonateClick}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition"
                >
                  Donate
                </button>
              </div>





              <div className="space-y-1">
                <p className="text-[11px] text-slate-500">Top supporters</p>
                {topSupporters.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No supporters yet.</p>
                ) : (
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    {topSupporters.map((s, i) => (
                      <li
                        key={s.address}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {s.avatar ? (
                            <img
                              src={s.avatar}
                              alt={s.name || s.address}
                              className="h-5 w-5 rounded-full"
                            />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-slate-700" />
                          )}
                          <span className="text-[11px]">
                            #{i + 1}{" "}
                            {s.name ||
                              `${s.address.slice(0, 6)}…${s.address.slice(-4)}`}
                          </span>
                        </div>
                        <span className="text-[11px]">
                          {s.total.toFixed(2)} USDC
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>



            </div>
          )}
        </section>

        {/* Status */}
        {status && (
          <div className="mt-2 text-[11px] text-amber-200 bg-amber-950/40 rounded-2xl p-2.5 whitespace-pre-wrap shadow-inner shadow-amber-900/60">
            {status}
          </div>
        )}

        {/* Footer */}
        <footer className="pt-3 mt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span>Built on Base 🟦</span>
          <a
            href="https://base.app/profile/0xb539EdcC1Bf7d07Cc5EFe9f7d9D994Adce31fde0"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:text-sky-300 transition"
          >
            <span>Powered by</span>
            <span className="flex items-center gap-1">
              <img
                src="https://res.cloudinary.com/coin-nft/image/fetch/q_90,w_40,fl_sanitize/f_auto/https%3A%2F%2Fmetadata.coinbase.com%2Ftoken_icons%2F277cf5807a056555246e412cb368fcdcae4db21d4a267d3128b3febd8899b419.png"
                alt="0xtxn avatar"
                className="h-5 w-5 rounded-full"
              />
              <span className="font-medium">0xtxn</span>
            </span>
          </a>
        </footer>
      </div>

      {/* Onboarding overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="
    w-[90%] max-w-sm rounded-3xl
    bg-slate-950/80 backdrop-blur-xl
    border border-sky-400/50
    shadow-[0_0_25px_rgba(56,189,248,0.45),0_0_60px_rgba(56,189,248,0.25)]
    p-5 space-y-3
    animate-[overlayFade_0.55s_ease-out]
  "
          >

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center">
                <img
                  src="/logo-0x.png"
                  alt="0x logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Welcome to BaseDaily</span>
                <span className="text-[11px] text-slate-300">
                  Check in every day on Base, grow your streak and earn 0xtxn rewards.
                </span>
              </div>
            </div>

            <ul className="text-[11px] text-slate-200 space-y-1 pl-4 list-disc">
              <li>Tap <span className="font-semibold">Check-in</span> once per day to keep your streak alive.</li>
              <li>Claim your <span className="font-semibold">0xtxn</span> rewards when the button turns pink.</li>
              <li>Tip in Base USDC to climb the supporter leaderboard.</li>
            </ul>

            <button
              onClick={closeOnboarding}
              className="mt-2 w-full rounded-full bg-sky-500 text-xs font-semibold text-slate-950 py-2 hover:bg-sky-400 transition"
            >
              Got it, let&apos;s start
            </button>
          </div>
        </div>
      )}



      {/* Toast popup */}
      {toast && (
        <div className="pointer-events-none fixed top-6 left-0 right-0 flex justify-center z-40">
          <div
            className="pointer-events-auto rounded-2xl bg-slate-950/95 border border-sky-400/60 px-4 py-2.5 text-xs text-sky-50 shadow-lg backdrop-blur-lg flex items-center gap-2 animate-[toast-pop_0.28s_ease-out]"
          >
            <span className="text-base">
              {toast.type === "checkin" ? "⚡" : "💰"}
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">
                {toast.type === "checkin"
                  ? "Check-in reward"
                  : toast.message.toLowerCase().includes("donated")
                    ? "Thank you for your support"
                    : "Reward claimed"}
              </span>
              <span className="text-[11px] text-slate-200">
                {toast.message}
              </span>
            </div>
          </div>
        </div>
      )}


      {/* Profile drawer (animated + Neynar data) */}
      <div
        className={`
          fixed inset-0 z-50 flex
          transition-opacity duration-300
          ${drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      >
        {/* overlay */}
        <div
          className={`
            flex-1 bg-black/40 backdrop-blur-sm
            transition-opacity duration-300
            ${drawerOpen ? "opacity-100" : "opacity-0"}
          `}
          onClick={() => setDrawerOpen(false)}
        />

        {/* panel */}
        <div
          className={`
            w-4/5 max-w-xs
            bg-sky-950/70 backdrop-blur-2xl
            border border-sky-500/10
            shadow-2xl shadow-black/70
            p-4 flex flex-col gap-4
            transform transition-transform duration-300 ease-out
            ${drawerOpen ? "translate-x-0" : "translate-x-full"}
          `}
        >
          {/* header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              Profile
            </h2>
            <button
              onClick={() => setDrawerOpen(false)}
              className="text-slate-400 text-sm hover:text-slate-100"
            >
              ✕
            </button>
          </div>

                      {/* Neynar profile + theme toggle */}
            <div
              className={`rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3 border 
              ${isDarkMode ? "bg-slate-950/60 border-white/5" : "bg-white/80 border-sky-100/60"}`}
            >
              <div className="flex items-center gap-3">
                <img
                  src={fcPfp || "/raihan-avatar.png"}
                  alt="User avatar"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">
                    {fcDisplayName || "Base user"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    @{fcUsername || "handle"}
                  </span>
                </div>
              </div>

              {/* Theme toggle button */}
              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                aria-label="Toggle theme"
                className={`relative inline-flex items-center justify-between w-14 h-7 rounded-full px-1 border text-[13px] select-none overflow-hidden
                ${isDarkMode ? "bg-slate-900/90 border-slate-600" : "bg-sky-100 border-sky-300"}`}
              >
                <span
                  className={`z-10 transition-opacity ${
                    isDarkMode ? "opacity-100" : "opacity-40"
                  }`}
                >
                  🌙
                </span>
                <span
                  className={`z-10 transition-opacity ${
                    isDarkMode ? "opacity-40" : "opacity-100"
                  }`}
                >
                  ☀️
                </span>
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transform transition-transform duration-200
                  ${isDarkMode ? "translate-x-0" : "translate-x-7"}`}
                />
              </button>
            </div>


          {/* FID + Neynar score */}
          <div className="rounded-2xl bg-slate-950/60 border border-white/5 px-3 py-3 space-y-1 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span>FID</span>
              <span className="font-mono text-slate-100">
                {fcFid || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Neynar score</span>
              <span className="font-semibold text-sky-300">
                {fcScore !== null ? fcScore : "—"}
              </span>
            </div>
          </div>

          {/* Your stats (on-chain) */}
          <div className="rounded-2xl bg-slate-950/60 border border-white/5 px-3 py-3 space-y-1 text-[11px] text-slate-300">
            <p className="text-xs font-semibold text-slate-100 mb-1">
              Your stats
            </p>
            <div className="flex justify-between">
              <span>Total streak days</span>
              <span>{streakNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Badges earned</span>
              <span>
                {totalSilverCount} Silver · {totalGoldCount} Gold ·{" "}
                {totalDiamondCount} Diamond · {totalLegendaryCount} Legendary
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total 0xtxn earned</span>
              <span>{totalEarnedReadable ?? "—"}</span>
            </div>
          </div>

          {/* Contact dev */}
          <div className="rounded-2xl bg-slate-950/60 border border-white/5 px-3 py-3 space-y-2">
            <p className="text-xs font-semibold text-slate-100">
              Contact dev
            </p>
            <div className="flex items-center gap-3 text-[20px] text-slate-300">
              <a
                href="https://farcaster.xyz/0xtxn"
                target="_blank"
                rel="noreferrer"
                className="hover:text-sky-400"
                title="Farcaster"
              >
                ⌗
              </a>
              <a
                href="https://base.app/profile/0xb539EdcC1Bf7d07Cc5EFe9f7d9D994Adce31fde0"
                target="_blank"
                rel="noreferrer"
                className="hover:text-sky-400"
                title="Base profile"
              >
                🟦
              </a>
              <a
                href="https://x.com/Oxxtxn"
                target="_blank"
                rel="noreferrer"
                className="hover:text-sky-400"
                title="X (Twitter)"
              >
                𝕏
              </a>
              <a
                href="mailto:kabir.business.marketing@gmail.com"
                className="hover:text-sky-400"
                title="Email"
              >
                ✉️
              </a>
            </div>
          </div>

          {/* bottom row */}
          <div className="mt-auto flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
            <button
              onClick={() => setAboutOpen(true)}
              className="hover:text-slate-100 flex items-center gap-1"
            >
              <span>About us</span>
              <span>📒</span>
            </button>
            <button
              onClick={handleShare}
              className="hover:text-sky-400"
            >
              Share
            </button>
          </div>


          <div className="mt-3 text-center text-[10px] text-slate-500">
            © 2025 BaseDaily by{" "}
            <a
              href="https://base.app/profile/0xb539EdcC1Bf7d07Cc5EFe9f7d9D994Adce31fde0"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:underline"
            >
              0xtxn
            </a>{" "}
            — All rights reserved.
          </div>


        </div>



      </div>

      {/* About us modal */}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* overlay */}
          <button
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setAboutOpen(false)}
          />

          {/* panel */}
          <div
            className="relative z-10 mx-4 max-w-sm w-full rounded-3xl bg-slate-950/95 border border-sky-500/20 shadow-2xl shadow-black/70 px-4 py-4 text-xs text-slate-100 animate-[toast-pop_0.28s_ease-out]"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-1">
                <span>About BaseDaily</span>
                <span>📒</span>
              </h3>
              <button
                onClick={() => setAboutOpen(false)}
                className="text-slate-400 hover:text-slate-100 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="mb-2 text-[11px] text-slate-300">
              BaseDaily is a miniapp where you check-in to the Base network every day to increase your streak and unlock 0xtxn rewards.
            </p>

            <p className="mb-2 text-[11px] text-slate-300">
              Daily reward = base reward × your current streak. The more days of streak
              , the more 0xtxn will be accumulated in the pending balance, which you can claim later with one click.
            </p>

            <p className="mb-2 text-[11px] text-slate-300">
              Badges are unlocked at specific milestones:
              7 days = Silver, 15 days = Gold, 30 days = Diamond, 100 days = Legendary / Loyalty.
              When you check-in, new badges are added to the pending list on milestone days, and when you claim
              those badges are minted in your wallet.
            </p>

            <p className="text-[11px] text-slate-400">
              If you want, you can also support the project by tipping Base USDC from the Support creator section below. 💙
            </p>
          </div>
        </div>
      )}




    </main>
  );
}

function BadgeCard({
  icon,
  name,
  owned,
}: {
  icon: string;
  name: string;
  owned: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-950/80 px-3 py-2 flex items-center justify-between shadow-inner shadow-slate-950/70">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-[11px] text-slate-100">{name}</span>
      </div>
      <span className="text-[11px] text-slate-400">x{owned}</span>
    </div>
  );
}
