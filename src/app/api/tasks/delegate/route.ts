import { NextRequest, NextResponse } from "next/server";
import { verifySessionApi } from "@/lib/dal";
import { runCliJson } from "@/lib/openclaw-cli";

export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/delegate
 *
 * Sends a task to an agent for execution via the gateway.
 * Uses the `openclaw agent` command to run an agent turn with the task message.
 */
export async function POST(request: NextRequest) {
  const session = await verifySessionApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { taskId, taskTitle, taskDescription, agentId, priority } = body;

    if (!taskId || !taskTitle || !agentId) {
      return NextResponse.json(
        { error: "taskId, taskTitle, and agentId are required" },
        { status: 400 }
      );
    }

    // Format the task message for the agent
    const priorityLabel = priority === "high" ? "URGENT" : priority === "medium" ? "IMPORTANT" : "Normal";
    const taskMessage = `[Task #${taskId}] ${priorityLabel}: ${taskTitle}${taskDescription ? `\n\nDetails: ${taskDescription}` : ""}\n\nPlease work on this task. When complete, update the kanban board by moving this task to "done".`;

    // Send the task to the agent via the `openclaw agent` command
    // This runs an agent turn with the specified message
    const result = await runCliJson<{ ok?: boolean; response?: string; error?: string }>(
      [
        "agent",
        "--agent", agentId,
        "-m", taskMessage,
      ],
      60000 // 60 second timeout for agent response
    );

    return NextResponse.json({
      ok: true,
      agentId,
      taskId,
      response: result.response,
      message: `Task delegated to ${agentId}`,
    });
  } catch (err) {
    console.error("Task delegation error:", err);
    const message = err instanceof Error ? err.message : String(err);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
