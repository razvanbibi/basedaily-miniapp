import { NextResponse } from "next/server";

import {
  getNotificationUsers,
  sendBaseNotification
} from "@/lib/baseNotifications";

export async function GET() {

  try {

    let cursor: string | undefined;

    let allAddresses: string[] = [];

    do {

      const data = await getNotificationUsers(cursor);

      console.log("users page:", data);

      const addresses =
        data.users.map((u: any) => u.address);

      allAddresses.push(...addresses);

      cursor = data.nextCursor;

    }
    while (cursor);

    console.log("all addresses:", allAddresses);

    if (!allAddresses.length) {

      return NextResponse.json({
        message: "no users opted in"
      });

    }

    const result = await sendBaseNotification(

      allAddresses.slice(0, 5),

      "BaseDaily test 🔔",

      "Notifications working",

      "/"

    );

    console.log("send result:", result);

    return NextResponse.json({

      success: true,

      total: allAddresses.length,

      result

    });

  }

  catch (err: any) {

    console.error("broadcast error:", err);

    return NextResponse.json({

      error: err.message || "failed"

    },

    { status: 500 });

  }

}