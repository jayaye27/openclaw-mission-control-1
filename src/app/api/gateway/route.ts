import { NextResponse } from "next/server";
import { runCliJson } from "@/lib/openclaw-cli";
import { getOpenClawBin } from "@/lib/paths";
import { execFile } from "child_process";
import { promisify } from "util";
import { verifySessionApi } from "@/lib/dal";

const exec = promisify(execFile);

/**
 * Validate that a URL points to localhost only.
 * Prevents SSRF attacks by blocking external gateway URLs.
 */
function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Allow only localhost variants
    const allowedHosts = ["localhost", "127.0.0.1", "::1", "[::1]"];
    return allowedHosts.includes(hostname);
  } catch {
    // Invalid URL
    return false;
  }
}

async function runGatewayServiceCommand(
  subcommand: "restart" | "stop" | "start",
  timeout = 25000
): Promise<{ stdout: string; stderr: string }> {
  const bin = await getOpenClawBin();
  return exec(bin, ["gateway", subcommand], {
    timeout,
    env: { ...process.env, NO_COLOR: "1" },
  });
}

/**
 * GET /api/gateway - Returns comprehensive gateway health status.
 * Uses `openclaw health --json` for rich data including channel status,
 * agent info, sessions, and heartbeat configuration.
 */
export async function GET() {
  // DAL-level auth check - CVE-2025-29927 mitigation
  const session = await verifySessionApi()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const health = await runCliJson<Record<string, unknown>>(
      ["health"],
      12000
    );
    return NextResponse.json({
      status: health.ok ? "online" : "degraded",
      health,
    });
  } catch (err) {
    // If health check fails entirely, gateway is likely offline
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("timed out") || message.includes("TIMEOUT");
    const isConnectionRefused = message.includes("ECONNREFUSED") || message.includes("connect");
    return NextResponse.json({
      status: "offline",
      health: {
        ok: false,
        error: isTimeout
          ? "Gateway health check timed out"
          : isConnectionRefused
            ? "Gateway is not running"
            : message,
      },
    });
  }
}

/**
 * POST /api/gateway - Restart/stop the gateway.
 * Body: { action: "restart" | "stop", gatewayUrl?: string }
 *
 * For restart: sends SIGTERM to the gateway process, then the macOS app
 * or daemon manager automatically restarts it.
 */
export async function POST(req: Request) {
  // DAL-level auth check - CVE-2025-29927 mitigation
  const session = await verifySessionApi()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json();
    const action = body.action as string;

    // If a custom gateway URL is provided, validate it's localhost only
    if (body.gatewayUrl) {
      if (!isLocalhostUrl(body.gatewayUrl)) {
        return NextResponse.json(
          {
            error: "Invalid gateway URL - only localhost URLs are allowed",
            hint: "Gateway must be on 127.0.0.1 or localhost",
          },
          { status: 400 }
        );
      }
    }

    if (action === "restart" || action === "stop") {
      // Prefer service-manager commands (launchd/systemd/schtasks).
      // This avoids port-collision loops caused by manually spawning a second gateway process.
      if (action === "stop") {
        try {
          const out = await runGatewayServiceCommand("stop");
          return NextResponse.json({
            ok: true,
            message: "Gateway stop requested via service manager",
            output: `${out.stdout}\n${out.stderr}`.trim(),
            action: "stop",
          });
        } catch {
          // If service control is unavailable, fall back to process kill.
        }

        let pid: number | null = null;
        try {
          const { stdout } = await exec("pgrep", ["-f", "openclaw-gateway"], { timeout: 5000 });
          const pids = stdout
            .trim()
            .split("\n")
            .map((p) => parseInt(p, 10))
            .filter((p) => !isNaN(p));
          if (pids.length > 0) pid = pids[0];
        } catch {
          // no running process
        }
        if (!pid) {
          return NextResponse.json({
            ok: true,
            message: "Gateway is already stopped",
            action: "stop",
          });
        }
        process.kill(pid, "SIGTERM");
        return NextResponse.json({
          ok: true,
          message: "Gateway stop signal sent",
          pid,
          action: "stop",
        });
      }

      // action === "restart"
      try {
        const out = await runGatewayServiceCommand("restart", 35000);
        return NextResponse.json({
          ok: true,
          message: "Gateway restart requested via service manager",
          output: `${out.stdout}\n${out.stderr}`.trim(),
          action: "restart",
        });
      } catch (serviceErr) {
        // Fallback for unsupervised setups: stop then start via service commands.
        // Do not call bare `openclaw gateway` to avoid duplicate listeners.
        try {
          await runGatewayServiceCommand("stop", 20000).catch(() => null);
          await new Promise((resolve) => setTimeout(resolve, 800));
          const out = await runGatewayServiceCommand("start", 25000);
          return NextResponse.json({
            ok: true,
            message: "Gateway start requested (fallback path)",
            output: `${out.stdout}\n${out.stderr}`.trim(),
            action: "start",
          });
        } catch {
          return NextResponse.json(
            {
              ok: false,
              error: `Gateway restart failed: ${String(serviceErr)}`,
            },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error("Gateway POST error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
