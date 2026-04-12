import { Redis } from "@upstash/redis";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const redis = Redis.fromEnv();

const client = new NeynarAPIClient({
  apiKey: process.env.NEYNAR_API_KEY!
});

export async function sendBroadcastNotification() {

  const keys = await redis.keys(
    "basedaily:notificationToken:*"
  );

  const tokens: string[] = [];

  for (const key of keys) {

    const token = await redis.get<string>(key);

    if (token) tokens.push(token);

  }

  if (!tokens.length) {

    console.log("no tokens yet");

    return;

  }

  await client.publishFrameNotifications({



    notification: {

      title: "🔥 BaseDaily is now Gasless",

      body: "All tx fees are now sponsored by 0xtxn",

      target_url:
        "https://basedaily-miniapp.vercel.app"

    }

  });

}