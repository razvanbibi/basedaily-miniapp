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

  console.log("base response:", data);

  return data;

}