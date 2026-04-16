// lib/baseNotifications.ts

export async function getNotificationUsers(cursor?: string) {

  const url =
    `https://dashboard.base.org/api/v1/notifications/app/users` +
    `?app_url=${process.env.NEXT_PUBLIC_APP_URL}` +
    `&notification_enabled=true` +
    (cursor ? `&cursor=${cursor}` : "");

  const res = await fetch(url, {

    headers: {

      "x-api-key": process.env.BASE_API_KEY!

    }

  });

  if (!res.ok) {

    const text = await res.text();

    throw new Error(`fetch users failed: ${text}`);

  }

  return res.json();

}



export async function sendBaseNotification(

  walletAddresses: string[],

  title: string,

  message: string,

  targetPath = "/"

) {

  const res = await fetch(

    "https://dashboard.base.org/api/v1/notifications/send",

    {

      method: "POST",

      headers: {

        "Content-Type": "application/json",

        "x-api-key": process.env.BASE_API_KEY!

      },

      body: JSON.stringify({

        app_url: process.env.NEXT_PUBLIC_APP_URL,

        wallet_addresses: walletAddresses,

        title,

        message,

        target_path: targetPath

      })

    }

  );

  const data = await res.json();



  if (!res.ok) {

    throw new Error(JSON.stringify(data));

  }



  return data;

}   