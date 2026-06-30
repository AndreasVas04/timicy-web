import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* -------------------------------------------------------------------------- */
/*  Request body type                                                         */
/* -------------------------------------------------------------------------- */

interface UnsubscribeBody {
  token: string;
}

/* -------------------------------------------------------------------------- */
/*  POST /api/alerts/unsubscribe                                              */
/*  Hard-deletes the subscription row matching the unsubscribe_token.         */
/*  Always returns success regardless of whether a row was deleted             */
/*  (idempotent and non-enumerating).                                         */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const { token } = (await request.json()) as UnsubscribeBody;

    // Token must be a non-empty string
    if (!token || typeof token !== "string") {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const supabase = createAdminClient();

    // Hard-delete the row. If no row matches, the delete is a no-op.
    // We intentionally don't check the result — the response is always success.
    await supabase
      .from("price_subscriptions")
      .delete()
      .eq("unsubscribe_token", token);

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
