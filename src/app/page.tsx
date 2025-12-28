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

  const [taglineAnim, setTaglineAnim] = useState(true);


  // MiniApp onboarding overlay দেখা হয়েছে কিনা
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Theme (day / night)
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [showBadgeInfo, setShowBadgeInfo] = useState(false);

  const [flashGlow, setFlashGlow] = useState(false);

  const [showRewardsTip, setShowRewardsTip] = useState(false);
  const [showBadgesTip, setShowBadgesTip] = useState(false);





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

  function getTimeUntilTomorrowUTC() {
    const now = new Date();
    const tomorrow = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0
      )
    );
    const diff = tomorrow.getTime() - now.getTime();

    const hours = Math.floor(diff / 36e5);
    const minutes = Math.floor((diff % 36e5) / 6e4);

    return `${hours}h ${minutes}m`;
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
    // initial animation already true

    const interval = setInterval(() => {
      setTaglineAnim(false);

      // re-trigger animation
      setTimeout(() => {
        setTaglineAnim(true);
      }, 50);
    }, 6000); // 6 seconds

    return () => clearInterval(interval);
  }, []);



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

      triggerAvatarRun(badgeProgress);



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

  function triggerAvatarRun(badgeProgress: number) {
  const runner = document.getElementById("avatar-runner");
  if (!runner) return;

  runner.style.setProperty("--target-x", `${badgeProgress * 100}%`);
  runner.classList.remove("hidden");
  runner.style.animation = "avatar-run 3s ease-out forwards";

  const originals = document.querySelectorAll("[data-avatar-main]");
  originals.forEach((el) => {
    (el as HTMLElement).style.opacity = "0";
  });
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


  const rewardTier = getRewardTier(pendingTokens);


  function getRewardTier(amount: bigint | null) {
    if (!amount || amount === BigInt(0)) return "none";

    // thresholds (tune later)
    const small = BigInt(5) * BigInt(1e18);
    const big = BigInt(50) * BigInt(1e18);

    if (amount < small) return "low";
    if (amount < big) return "mid";
    return "big";
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


  async function handleShare() {
    const APP_URL = "https://basedaily-miniapp.vercel.app";

    const text =
      "🟦 BaseDaily — Be loyal to Base\n\n" +
      "I’m checking in daily on Base, growing my streak and earning 0xtxn rewards.\n\n" +
      "Join here 👇\n" +
      APP_URL;

    try {
      await sdk.actions.composeCast({
        text,
      });
    } catch (err) {
      console.error("Share failed", err);
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
  const hasUnclaimedBadges =
    pendingSilverCount > 0 ||
    pendingGoldCount > 0 ||
    pendingDiamondCount > 0 ||
    pendingLegendaryCount > 0;



  const totalEarnedNumber = totalEarned ? Number(totalEarned) : 0;
  const totalEarnedReadable =
    totalEarned !== null ? formatToken(totalEarned) : null;

  const totalSilverCount = totalSilver ? Number(totalSilver) : 0;
  const totalGoldCount = totalGold ? Number(totalGold) : 0;
  const totalDiamondCount = totalDiamond ? Number(totalDiamond) : 0;
  const totalLegendaryCount = totalLegendary ? Number(totalLegendary) : 0;

  const glassCard =
    "rounded-3xl bg-white/10 dark:bg-slate-900/55 backdrop-blur-[2px] " +
    "border border-white/15 dark:border-white/10 " +
    "shadow-[0_20px_50px_rgba(0,0,0,0.45)]";

  function getBadgeProgress(streak: number) {
    if (streak <= 0) return 0.05; // start একটু বামে

    // milestones
    const silver = 7;
    const gold = 15;
    const diamond = 30;
    const legendary = 100;

    // UI positions (MATCHING YOUR SKETCH)
    const pStart = 0.05;
    const pSilver = 0.28;
    const pGold = 0.52;
    const pDiamond = 0.74;
    const pLegendary = 0.92;

    // 0 → 7 (fast + visible)
    if (streak < silver) {
      return (
        pStart +
        (streak / silver) * (pSilver - pStart)
      );
    }

    // 7 → 15
    if (streak < gold) {
      return (
        pSilver +
        ((streak - silver) / (gold - silver)) * (pGold - pSilver)
      );
    }

    // 15 → 30 (slower)
    if (streak < diamond) {
      return (
        pGold +
        ((streak - gold) / (diamond - gold)) * (pDiamond - pGold)
      );
    }

    // 30 → 100 (slowest)
    if (streak < legendary) {
      return (
        pDiamond +
        ((streak - diamond) / (legendary - diamond)) *
        (pLegendary - pDiamond)
      );
    }

    return pLegendary;
  }

  const badgeProgress = getBadgeProgress(streakNumber);

  return (
    <main
      className={`min-h-screen relative overflow-hidden ${isDarkMode ? "text-slate-50" : "text-slate-900"
        }`}
      style={{
        backgroundImage: isDarkMode
          ? "url('/bg-lamp.jpg')"
          : "url('/bg-lamp.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* dark overlay for contrast */}
      <div
        className={`absolute inset-0 pointer-events-none ${isDarkMode ? "bg-slate-950/65" : "bg-white/65"
          }`}
      />


      {/* content */}
      <div className="relative z-10 mx-auto max-w-md px-4 pb-10 pt-6 space-y-4">
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
                className={`text-base font-semibold tracking-tight ${isDarkMode ? "text-sky-100" : "text-slate-900"
                  }`}
              >
                BaseDaily
              </span>

              <span
                className={`text-[11px] ${isDarkMode ? "text-slate-300" : "text-slate-700"
                  } ${taglineAnim ? "animate-[fade-up_0.6s_ease-out]" : ""}`}
              >

                Be loyal to BASE 🟦 Earn rewards
              </span>
            </div>

          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="
               h-9 w-9 inline-flex items-center justify-center
                rounded-xl bg-slate-900/90
                shadow-lg shadow-black/40
                transition
                hover:scale-105
                  active:scale-95
                   hover:bg-slate-800
                   "
          >

            <span className="inline-block w-3.5 space-y-[3px]">
              <span className="block h-[2px] rounded bg-slate-200" />
              <span className="block h-[2px] rounded bg-slate-200" />
              <span className="block h-[2px] rounded bg-slate-200" />
            </span>
          </button>
        </header>

        {/* Welcome / wallet card */}
        <section className={`${glassCard} p-4 space-y-3`}>

          {/* top row */}
          <div className="flex items-start justify-between gap-3">
            {/* left text */}
            <div className="flex-1">
              <p
                className={`text-sm leading-tight ${isDarkMode ? "text-slate-200" : "text-slate-900"
                  }`}
              >

                Hello{account ? "," : ""}{" "}
                <span
                  className={`font-medium ${isDarkMode ? "text-sky-200" : "text-slate-900"
                    }`}
                >
                  {account ? "streaker" : "friend"}
                </span>
                {" "}
                👋
              </p>

              {/* description moved UP so it fits in one line */}
              <p
                className={`text-[11px] truncate ${isDarkMode ? "text-slate-400" : "text-slate-900"
                  }`}
              >

                Check in every day to grow your streak and earn 0xtxn.
              </p>
            </div>

            {/* right wallet / connect */}
            <div className="shrink-0">
              {account ? (
                <div className="flex flex-col items-end gap-1 pr-2">
                  {/* Wallet + Base */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">Wallet</span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Base
                    </span>
                  </div>

                  {/* address */}
                  <span className="text-[11px] px-2 py-1 rounded-full bg-slate-950/70 text-slate-100 mt-0.5">
                    {account.slice(0, 4)}…{account.slice(-4)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="
        px-3 py-1.5
        rounded-full
        text-[11px] font-semibold
        bg-sky-500/90
        text-slate-950
        shadow-md
        hover:bg-sky-400
        active:scale-95
        transition
      "
                >
                  Connect
                </button>
              )}
            </div>

          </div>
        </section>


        {/* Today card */}
        <section className={`${glassCard} p-4 space-y-3`}>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <BaseBlockLogo
                checkedIn={hasCheckedInToday}
                isDark={isDarkMode}
              />
            </h2>
            {/* RIGHT: stats */}
            <div className="flex gap-6 text-center">

              <div>
                <div
                  className={`text-xl font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-900"
                    }`}
                >

                  {streakNumber}
                </div>
                <div
                  className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-900"
                    }`}
                >
                  Current
                </div>

              </div>

              <div>
                <div
                  className={`text-xl font-semibold ${isDarkMode ? "text-sky-300" : "text-sky-500"
                    }`}
                >

                  {highestNumber}
                </div>
                <div
                  className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-900"
                    }`}
                >
                  Highest
                </div>

              </div>
            </div>
          </div>

          <p
            className={`text-xs -mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-900"
              }`}
          >


            {account
              ? hasCheckedInToday
                ? "You have already checked in today. Come back tomorrow!"
                : "Tap check-in to unlock today’s 0xtxn reward."
              : "Connect your wallet to start your daily check-in streak."}
          </p>

          {account && (
            <div className="flex justify-center mt-2">
              {hasCheckedInToday ? (
                <div className="flex flex-col items-center gap-1">
                  <button
                    disabled
                    className="
                      inline-flex items-center justify-center
                       px-8 py-3 rounded-full
                        text-base font-semibold
                         text-emerald-600
                         bg-emerald-500/10
                           border border-emerald-400/5
                            shadow-inner shadow-emerald-900/40
                            cursor-not-allowed
                           "
                  >
                    Checked-in
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Next check-in in {getTimeUntilTomorrowUTC()}
                  </span>
                </div>


              ) : (
                <button
                  onClick={handleCheckIn}
                  disabled={loading || paused === true}
                  className={`
          inline-flex items-center justify-center
          px-8 py-3 rounded-full
          text-base font-semibold
          transition
          shadow-lg shadow-emerald-900/70
          animate-[breathe_4.2s_ease-in-out_infinite]
          bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500
          text-slate-950 hover:brightness-110 active:scale-95
          ${loading ? "opacity-70" : ""}
        `}
                >
                  {loading ? "Processing…" : "Check-in"}
                </button>
              )}
            </div>
          )}

          {paused && (
            <p className="text-[11px] text-amber-300 mt-1">
              The contract is currently paused. Please try again later.
            </p>
          )}
        </section>

        {/* Rewards card */}

        <section className={`${glassCard} p-4 space-y-3`}>

          <div className="relative group inline-flex">
            <div className="relative inline-flex">
              <button
                className={`text-sm font-semibold flex items-center gap-2 select-none ${isDarkMode ? "text-slate-100" : "text-slate-900"
                  }`}
                onClick={() => {
                  setShowRewardsTip(true);
                  setTimeout(() => setShowRewardsTip(false), 2000);
                }}
              >
                <span className="text-lg">💰</span> Rewards
              </button>

              {showRewardsTip && (
                <div className="absolute z-50 top-full mt-2 w-64 rounded-2xl
                    bg-slate-950/95 backdrop-blur-xl
                    border border-white/10 shadow-2xl
                    px-3 py-2 text-[11px] text-slate-200">
                  <p className="font-semibold text-sky-300 mb-1">How rewards work</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Check-in once per day</li>
                    <li>Each streak day increases reward(n*10)</li>
                    <li>Miss a day → streak resets</li>
                    <li>Rewards stack until you claim</li>
                  </ul>
                </div>
              )}
            </div>


            <HoverInfo title="How rewards work">
              <ul className="list-disc pl-4 space-y-1">
                <li>Check-in once per day</li>
                <li>Each streak day increases reward (n*10)</li>
                <li>Miss a day → streak resets</li>
                <li>Rewards stack until you claim</li>
              </ul>
            </HoverInfo>
          </div>

          <div className="space-y-2 text-sm">
            <div
              className={`
    flex w-full items-start justify-between
    py-3
    transition-all duration-500
  `}
            >
              {/* LEFT: 0xtxn hero */}
              <div
                className={`
      flex flex-col
      transition-all duration-500
      ${hasUnclaimedBadges ? "items-start" : "items-center w-full"}
    `}
              >
                <span
                  className={`text-[12px] uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-900"
                    }`}
                >

                  Unclaimed 0xtxn
                </span>

                <span
                  className={`text-3xl font-bold tracking-tight ${isDarkMode ? "text-sky-200" : "text-sky-500"
                    }`}
                >

                  {unclaimedReadable ?? "0"}
                </span>
              </div>

              {/* RIGHT: Unclaimed badges */}
              {hasUnclaimedBadges && (
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-[12px] uppercase ${isDarkMode ? "text-slate-400" : "text-slate-900"
                      }`}
                  >

                    Unclaimed badges
                  </span>

                  <div className="flex items-center gap-2">
                    {pendingSilverCount > 0 && (
                      <BadgeGlow icon="🥈" count={pendingSilverCount} />
                    )}
                    {pendingGoldCount > 0 && (
                      <BadgeGlow icon="🥇" count={pendingGoldCount} />
                    )}
                    {pendingDiamondCount > 0 && (
                      <BadgeGlow icon="💎" count={pendingDiamondCount} />
                    )}
                    {pendingLegendaryCount > 0 && (
                      <BadgeGlow icon="🌟" count={pendingLegendaryCount} />
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

          {account && (
            <div className="flex justify-center mt-2">
              <button
                onClick={handleClaimAll}
                disabled={!!(loading || !pendingTokens || pendingTokens === BigInt(0) || paused)}
                className={`
    inline-flex items-center justify-center
    px-8 py-3 rounded-full
    text-base font-semibold
    transition
    shadow-lg
    ${rewardTier === "low"
                    ? "bg-gradient-to-r from-purple-500 to-indigo-500 shadow-purple-900/50 text-slate-50"
                    : rewardTier === "mid"
                      ? "bg-gradient-to-r from-sky-500 to-blue-500 shadow-blue-900/50 text-slate-50"
                      : rewardTier === "big"
                        ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-900 shadow-amber-500/60"
                        : "bg-fuchsia-900/40 text-fuchsia-200/80"
                  }
    ${loading || !pendingTokens || pendingTokens === BigInt(0) || paused
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:brightness-110 active:scale-95"
                  }
  `}
              >
                {pendingTokens && pendingTokens > BigInt(0) ? "Claim all" : "Claimed"}
              </button>

            </div>
          )}
        </section>

        {/* Badge progress + badge list */}
        <section className={`${glassCard} p-4 space-y-3`}>

          <div className="relative group inline-flex">
            <div className="relative inline-flex">
              <button
                className={`text-sm font-semibold flex items-center gap-2 select-none ${isDarkMode ? "text-slate-100" : "text-slate-900"
                  }`}
                onClick={() => {
                  setShowBadgesTip(true);
                  setTimeout(() => setShowBadgesTip(false), 2000);
                }}
              >
                <span className="text-lg">🏅</span> Badges
              </button>

              {showBadgesTip && (
                <div className="absolute z-50 top-full mt-2 w-64 rounded-2xl
                    bg-slate-950/95 backdrop-blur-xl
                    border border-white/10 shadow-2xl
                    px-3 py-2 text-[11px] text-slate-200">
                  <p className="font-semibold text-sky-300 mb-1">Badge milestones</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>🥈 Silver — 7 days</li>
                    <li>🥇 Gold — 15 days</li>
                    <li>💎 Diamond — 30 days</li>
                    <li>🌟 Legendary — 100 days</li>
                  </ul>
                </div>
              )}
            </div>


            <HoverInfo title="Badge milestones">
              <ul className="list-disc pl-4 space-y-1">
                <li>🥈 Silver — 7 days</li>
                <li>🥇 Gold — 15 days</li>
                <li>💎 Diamond — 30 days</li>
                <li>🌟 Legendary — 100 days</li>
              </ul>
            </HoverInfo>
          </div>


          {/* progress path */}
          <div className="relative mt-1 mb-2"
            onClick={() => {
              const runner = document.getElementById("avatar-runner");
              if (!runner) return;

              runner.style.setProperty(
                "--target-x",
                `${badgeProgress * 100}%`
              );

              runner.classList.remove("hidden");
              runner.style.animation = "avatar-run 3s ease-out forwards";

              // hide original avatar briefly
              const originals = document.querySelectorAll("[data-avatar-main]");
              originals.forEach(el => {
                (el as HTMLElement).style.opacity = "0";
              });


            }}
          >
            {/* base line */}
            <div className="relative h-[2px] w-full rounded-full bg-slate-700/70 overflow-hidden">
              {/* progress fill */}
              <div
                className="
      absolute left-0 top-0 h-full
      bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500
      transition-all duration-700 ease-out
               "
                style={{
                  width: `${badgeProgress * 100}%`,
                }}
              />
            </div>


            {/* badge icons – SKETCH BASED POSITIONS */}
            <div className="absolute inset-0 -top-3 text-lg">
              <span className="absolute left-[28%] -translate-x-1/2">🥈</span>
              <span className="absolute left-[52%] -translate-x-1/2">🥇</span>
              <span className="absolute left-[74%] -translate-x-1/2">💎</span>
              <span className="absolute left-[92%] -translate-x-1/2">🌟</span>
            </div>

            {/* avatar progress */}
            <div
              data-avatar-main
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

            {/* RUN ANIMATION OVERLAY (visual only) */}
            <div
              id="avatar-runner"
              onAnimationEnd={() => {
                const runner = document.getElementById("avatar-runner");
                if (!runner) return;

                runner.classList.add("hidden");
                runner.style.animation = "none";

                const originals = document.querySelectorAll("[data-avatar-main]");
                originals.forEach(el => {
                  (el as HTMLElement).style.opacity = "1";
                });
              }}

              className="pointer-events-none absolute -top-8 hidden"
              style={{ left: "5%", transform: "translateX(-50%)" }}
            >
              {/* avatar bubble */}
              <div className="relative h-7 w-7 rounded-full overflow-hidden ring-2 ring-sky-400 bg-slate-900 z-10">
                <img
                  src={fcPfp || "/avatar.png"}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* legs — OUTSIDE avatar */}
              <div className="absolute top-[28px] left-1/2 -translate-x-1/2 flex gap-[4px]">
                <span className="leg leg-left" />
                <span className="leg leg-right" />
              </div>
            </div>



          </div>


          <p
            className={`text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-900"
              }`}
          >

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
        <section className={`${glassCard} p-4 space-y-3`}>

          <button
            type="button"
            onClick={() => setShowDonate((v) => !v)}
            className="w-full flex items-center justify-between text-sm font-semibold text-slate-100 active:scale-[0.98] transition-transform
            "
          >
            <span
              className={`flex items-center gap-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"
                }`}
            >
              <span className="text-lg">💙</span> Support creator
            </span>
            <span
              className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-900"
                }`}
            >
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
                    className={`px-3 py-1.5 rounded-full border text-xs active:scale-[0.98] transition-transform
                        ${donationAmount === v.toString()
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
                  className={`flex-1 rounded-xl px-3 py-2 text-xs outline-none focus:border-sky-400 ${isDarkMode
                    ? "bg-slate-900 border border-slate-700 text-slate-100"
                    : "bg-white border border-slate-300 text-slate-900"
                    }`}
                  placeholder="Custom amount"
                />
                <button
                  type="button"
                  onClick={handleDonateClick}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition active:scale-[0.98] transition-transform
                  "
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
        <footer
          className={`pt-3 mt-4 flex items-center justify-between text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-700"
            }`}
        >
          <span className={isDarkMode ? "" : "text-slate-900"}>
            Built on Base 🟦
          </span>

          <a
            href="https://base.app/profile/0xb539EdcC1Bf7d07Cc5EFe9f7d9D994Adce31fde0"
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 transition ${isDarkMode
              ? "hover:text-sky-300"
              : "hover:text-sky-700 text-slate-900"
              }`}
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
              className="mt-2 w-full rounded-full bg-sky-500 text-xs font-semibold text-slate-950 py-2 hover:bg-sky-400 transition active:scale-[0.98] transition-transform
              "
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


          onClick={() => {
            setDrawerOpen(false);
            setShowBadgeInfo(false);
          }}


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
              className="text-slate-400 text-sm hover:text-slate-100 active:scale-[0.98] transition-transform
              "
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
              className={`relative inline-flex items-center justify-between w-14 h-7 rounded-full px-1 border text-[13px] select-none overflow-hidden active:scale-95 transition-transform

                ${isDarkMode ? "bg-slate-900/90 border-slate-600" : "bg-sky-100 border-sky-300"}`}
            >
              <span
                className={`z-10 transition-opacity ${isDarkMode ? "opacity-100" : "opacity-40"
                  }`}
              >
                🌙
              </span>
              <span
                className={`z-10 transition-opacity ${isDarkMode ? "opacity-40" : "opacity-100"
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
          <div className="rounded-2xl bg-slate-950/60 border border-white/5 px-3 py-3">
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div>
                <p className="text-lg">🔥</p>
                <p className="text-slate-100 font-semibold">{streakNumber}</p>
                <p className="text-slate-400">Streak</p>
              </div>

              <div className="flex flex-col items-center relative">
                <button
                  type="button"
                  onClick={() => setShowBadgeInfo((v) => !v)}
                  className="flex flex-col items-center active:scale-95 transition active:scale-[0.98] transition-transform
                  "
                >
                  <p className="text-lg">🏅</p>
                  <p className="text-slate-100 font-semibold">
                    {totalSilverCount + totalGoldCount + totalDiamondCount + totalLegendaryCount}
                  </p>
                  <p className="text-slate-400">Badges</p>
                </button>

                {showBadgeInfo && (
                  <div
                    className="
        absolute top-full mt-2 left-1/2 -translate-x-1/2
        bg-slate-950/95 backdrop-blur-xl
        border border-white/10
        rounded-xl px-3 py-2
        text-[11px] text-slate-200
        shadow-2xl z-50
        animate-[toast-pop_0.18s_ease-out]
                  "
                  >
                    <div className="flex flex-col gap-1 whitespace-nowrap">
                      <span>🥈 Silver: {totalSilverCount}</span>
                      <span>🥇 Gold: {totalGoldCount}</span>
                      <span>💎 Diamond: {totalDiamondCount}</span>
                      <span>🌟 Legendary: {totalLegendaryCount}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-lg">💰</p>
                <p className="text-slate-100 font-semibold">
                  {totalEarnedReadable ?? "—"}
                </p>
                <p className="text-slate-400">0xtxn</p>
              </div>
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
              className="relative
                 px-3 py-1.5
                  rounded-full
                    text-[11px]
                      font-medium
                        text-sky-300
                          bg-sky-500/10
                            border border-sky-400/30
                              shadow-[0_0_12px_rgba(56,189,248,0.25)]
                                hover:text-sky-200
                                  hover:bg-sky-400/20
                                    hover:shadow-[0_0_18px_rgba(56,189,248,0.45)]
                                      transition-all
                                        duration-300 active:scale-[0.98] transition-transform
                                        "
            >
              <span>About us</span>
              <span>📒</span>
            </button>
            <button
              onClick={handleShare}
              className="
                relative
                 px-3 py-1.5
                  rounded-full
                    text-[11px]
                      font-medium
                        text-sky-300
                          bg-sky-500/10
                            border border-sky-400/30
                              shadow-[0_0_12px_rgba(56,189,248,0.25)]
                                hover:text-sky-200
                                  hover:bg-sky-400/20
                                    hover:shadow-[0_0_18px_rgba(56,189,248,0.45)]
                                      transition-all
                                        duration-300 active:scale-[0.98] transition-transform

                                          "
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
              className="text-sky-500 hover:underline"
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm active:scale-[0.98] transition-transform
            "
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
                className="text-slate-400 hover:text-slate-100 text-sm active:scale-[0.98] transition-transform
                "
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

      {flashGlow && (
        <div
          className="
      pointer-events-none fixed inset-0 z-40
      bg-sky-400/20
      animate-[flashGlow_0.6s_ease-out]
    "
        />
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
        <span
          className={`text-lg ${owned === 0 ? "opacity-40" : ""
            } ${owned === 0 ? "animate-[badge-pulse_1.8s_ease-in-out_infinite]" : ""
            }`}
        >
          {icon}
        </span>

        <span className="text-[11px] text-slate-100">{name}</span>
      </div>
      <span className="text-[11px] text-slate-400">x{owned}</span>
    </div>
  );
}

function BadgeGlow({
  icon,
  count,
}: {
  icon: string;
  count: number;
}) {
  return (
    <div className="relative">
      <span
        className="
          text-xl
          animate-[badge-glow_2.4s_ease-in-out_infinite]
        "
      >
        {icon}
      </span>

      {count > 1 && (
        <span
          className="
            absolute -top-1 -right-1
            text-[9px] font-bold
            bg-sky-500 text-slate-950
            rounded-full px-1
          "
        >
          {count}
        </span>
      )}
    </div>
  );
}

function BaseBlockLogo({
  checkedIn,
  isDark,
}: {
  checkedIn: boolean;
  isDark: boolean;
}) {
  const color = isDark ? "bg-slate-400" : "bg-slate-900";


  return (
    <div className="flex items-center gap-[4px]">
      {/* b */}
      <div className="relative w-6 h-6">
        <div className={`${color} w-6 h-6 rounded-md`} />
        <div
          className={`${color} absolute -top-2 left-0 w-4 h-4 rounded-md`}
        />
      </div>

      {/* a */}
      <div className={`${color} w-6 h-6 rounded-md`} />

      {/* s */}
      <div className={`${color} w-6 h-6 rounded-md`} />

      {/* e */}
      <div className={`${color} w-6 h-6 rounded-md`} />

      {/* d (after check-in only) */}
      {checkedIn && (
        <div className="relative w-6 h-6 animate-[fade-up_0.35s_ease-out]">
          <div className={`${color} w-6 h-6 rounded-md`} />
          <div
            className={`${color} absolute -top-2 right-0 w-4 h-4 rounded-md`}
          />
        </div>
      )}
    </div>
  );
}

function HoverInfo({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        absolute z-40 top-full mt-2 left-0
        w-64
        rounded-2xl
        bg-slate-950/95 backdrop-blur-xl
        border border-white/10
        shadow-2xl
        px-3 py-2
        text-[11px] text-slate-200
        opacity-0 scale-95
        group-hover:opacity-100 group-hover:scale-100
        transition-all duration-200
        pointer-events-none
      "
    >
      <p className="font-semibold text-sky-300 mb-1">{title}</p>
      {children}
    </div>
  );
}

