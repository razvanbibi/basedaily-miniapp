// app/api/broadcast/route.ts

import { NextResponse } from "next/server";

import {

  getNotificationUsers,

  sendBaseNotification

} from "@/lib/baseNotifications";



export async function GET() {

  try {

    let cursor: string | undefined;

    let allAddresses: string[] = [];



    // pagination support

    do {

      const data = await getNotificationUsers(cursor);



      const addresses = data.users.map(

        (u: any) => u.address

      );



      allAddresses.push(...addresses);



      cursor = data.nextCursor;

    }

    while (cursor);



    if (!allAddresses.length) {

      return NextResponse.json({

        message: "no users opted in"

      });

    }



    // API limit = 1000 addresses per request

    const chunkSize = 1000;



    let sentTotal = 0;



    for (

      let i = 0;

      i < allAddresses.length;

      i += chunkSize

    ) {

      const chunk = allAddresses.slice(

        i,

        i + chunkSize

      );



      const result = await sendBaseNotification(

  chunk,

  "🔥 BaseDaily streak alert",

  "Check in today to keep your streak alive.",

  "/"

);



      sentTotal += result.sentCount || 0;

    }



    return NextResponse.json({

      success: true,

      totalUsers: allAddresses.length,

      sent: sentTotal

    });

  }

  catch (err: any) {

    console.error("broadcast error:", err);



    return NextResponse.json(

      {

        error: err.message || "broadcast failed"

      },

      { status: 500 }

    );

  }

}