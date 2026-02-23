import { NextRequest, NextResponse } from "next/server";
import { verifySessionApi } from "@/lib/dal";
import { gatewayCall } from "@/lib/openclaw-cli";

export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/delegate
 *
 * Sends a task to an agent for execution via the gateway.
 * This queues a message to the agent with the task details.
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

    // Send the task to the agent via gateway RPC
    // Uses agent.send to queue a message to the specified agent
    const result = await gatewayCall<{ ok: boolean; messageId?: string; error?: string }>(
      "agent.send",
      {
        agentId,
        message: taskMessage,
        metadata: {
          source: "dashboard-task-delegation",
          taskId,
          priority,
        },
      },
      30000
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || "Failed to delegate task to agent" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      agentId,
      taskId,
      messageId: result.messageId,
      message: `Task delegated to ${agentId}`,
    });
  } catch (err) {
    console.error("Task delegation error:", err);
    const message = err instanceof Error ? err.message : String(err);

    // Check if the gateway method doesn't exist
    if (message.includes("unknown method") || message.includes("not found")) {
      return NextResponse.json({
        error: "Task delegation requires gateway support for agent.send RPC method",
        hint: "This feature may require a newer version of the gateway",
      }, { status: 501 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
