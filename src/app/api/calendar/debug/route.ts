import { NextResponse } from "next/server";
import { verifySessionApi } from "@/lib/dal";
import { getGogBin } from "@/lib/paths";
import { fetchCalendarEventsViaGog, GogCalendarError } from "@/lib/gog-calendar";

export const dynamic = "force-dynamic";

/**
 * GET /api/calendar/debug
 * Shows whether gog is available and if calendar auth works.
 */
export async function GET() {
  // DAL-level auth check - CVE-2025-29927 mitigation
  const session = await verifySessionApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let gogPath: string;
  try {
    gogPath = await getGogBin();
  } catch {
    return NextResponse.json({
      gogAvailable: false,
      hint: "Install gog: brew install steipete/tap/gogcli",
    });
  }

  let calendarWorks = false;
  let errorMessage: string | null = null;
  let needsAuth = false;

  try {
    await fetchCalendarEventsViaGog(7);
    calendarWorks = true;
  } catch (err) {
    if (err instanceof GogCalendarError) {
      errorMessage = err.message;
      needsAuth = err.code === "needs_auth";
    } else {
      errorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  const hint = !calendarWorks
    ? needsAuth || (errorMessage && (errorMessage.includes("account") || errorMessage.includes("No auth")))
      ? "Run in terminal: gog auth add you@email.com --services calendar. Then set default account via gog auth manage or set GOG_ACCOUNT."
      : "Check that gog is installed and in PATH. See https://clawhub.ai/steipete/gog"
    : null;

  return NextResponse.json({
    gogAvailable: true,
    gogPath,
    calendarWorks,
    errorMessage,
    needsAuth,
    hint,
    gogAccount: process.env.GOG_ACCOUNT ?? undefined,
  });
}
