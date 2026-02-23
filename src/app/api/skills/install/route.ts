import { NextRequest } from "next/server";
import { spawn } from "child_process";
import { verifySessionApi } from "@/lib/dal";
import { isAllowedPackage, getAllowedPackages, type PackageManager } from "@/lib/security/allowed-packages";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for long installs

/**
 * POST /api/skills/install
 *
 * Streams live terminal output from an install command (brew, npm, etc).
 * Returns Server-Sent Events with { type, text } payloads.
 *
 * Body: { kind: "brew" | "npm" | "pip", package: string }
 */
export async function POST(request: NextRequest) {
  // DAL-level auth check - CVE-2025-29927 mitigation
  const session = await verifySessionApi();
  if (!session) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const kind = body.kind as string;
  const pkg = body.package as string;

  if (!pkg) {
    return new Response(
      JSON.stringify({ error: "package required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Validate package manager type
  if (!["brew", "npm", "pip"].includes(kind)) {
    return new Response(
      JSON.stringify({ error: `Unsupported install kind: ${kind}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Security: Only allow whitelisted packages
  if (!isAllowedPackage(kind as PackageManager, pkg)) {
    const allowed = getAllowedPackages(kind as PackageManager);
    return new Response(
      JSON.stringify({
        error: `Package "${pkg}" is not in the allowed list for ${kind}`,
        allowedPackages: allowed.slice(0, 20), // Show first 20 for reference
        hint: "Contact administrator to add packages to the whitelist",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build command based on kind
  let cmd: string;
  let args: string[];

  switch (kind) {
    case "brew":
      cmd = "brew";
      args = ["install", "--verbose", pkg];
      break;
    case "npm":
      cmd = "npm";
      args = ["install", "-g", pkg];
      break;
    case "pip":
      cmd = "pip3";
      args = ["install", pkg];
      break;
    default:
      return new Response(
        JSON.stringify({ error: `Unsupported install kind: ${kind}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const banner = `\x1b[1;36m$ ${cmd} ${args.join(" ")}\x1b[0m\n`;
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "stdout", text: banner })}\n\n`)
      );

      const child = spawn(cmd, args, {
        env: { ...process.env, NO_COLOR: "0", HOMEBREW_COLOR: "1" },
        timeout: 240000,
        stdio: ["pipe", "pipe", "pipe"],
      });

      child.stdout.on("data", (data: Buffer) => {
        const text = data.toString();
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "stdout", text })}\n\n`)
          );
        } catch { /* stream closed */ }
      });

      child.stderr.on("data", (data: Buffer) => {
        const text = data.toString();
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "stderr", text })}\n\n`)
          );
        } catch { /* stream closed */ }
      });

      child.on("close", (code) => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "exit", code: code ?? 1 })}\n\n`
            )
          );
          controller.close();
        } catch { /* stream closed */ }
      });

      child.on("error", (err) => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", text: String(err) })}\n\n`
            )
          );
          controller.close();
        } catch { /* stream closed */ }
      });

      child.stdin.end();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
