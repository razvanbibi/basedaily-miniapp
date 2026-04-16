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



    // chunk 1000 limit

    const chunkSize = 1000;



    for (let i = 0; i < allAddresses.length; i += chunkSize) {

      const chunk = allAddresses.slice(i, i + chunkSize);



      await sendBaseNotification(

        chunk,

        "🔥 BaseDaily reminder",

        "Your streak is waiting. Check in now.",

        "/"

      );

    }



    return NextResponse.json({

      success: true,

      total: allAddresses.length

    });

  }

  catch (err) {

    console.error(err);



    return NextResponse.json(

      {

        error: "broadcast failed"

      },

      { status: 500 }

    );

  }

}