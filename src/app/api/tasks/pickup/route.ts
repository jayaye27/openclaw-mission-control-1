import { NextRequest, NextResponse } from "next/server";
import { verifySessionApi } from "@/lib/dal";
import { runCliJson } from "@/lib/openclaw-cli";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { getOpenClawHome } from "@/lib/paths";

export const dynamic = "force-dynamic";

type Task = {
  id: number;
  title: string;
  description?: string;
  column: string;
  priority: string;
  assignee?: string;
  attachments?: string[];
  lastDelegatedAt?: number;
};

type KanbanData = {
  columns: { id: string; title: string; color: string }[];
  tasks: Task[];
};

// Minimum time between re-delegating the same task (5 minutes)
const MIN_DELEGATION_INTERVAL = 5 * 60 * 1000;

/**
 * POST /api/tasks/pickup
 *
 * Scans for backlog tasks with assignees and delegates them to agents.
 * This endpoint is meant to be called by a cron job every 2-5 minutes.
 *
 * Only picks up tasks that:
 * 1. Are in "backlog" column
 * 2. Have an assignee (agent) set
 * 3. Haven't been delegated in the last 5 minutes
 */
export async function POST(request: NextRequest) {
  const session = await verifySessionApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const kanbanPath = join(getOpenClawHome(), "workspace", "kanban.json");

    // Read kanban data
    let kanban: KanbanData;
    try {
      const content = await readFile(kanbanPath, "utf-8");
      kanban = JSON.parse(content);
    } catch {
      return NextResponse.json({
        ok: true,
        message: "No kanban.json found",
        delegated: []
      });
    }

    // Find backlog tasks with assignees that haven't been recently delegated
    const now = Date.now();
    const eligibleTasks = kanban.tasks.filter(task =>
      task.column === "backlog" &&
      task.assignee &&
      (!task.lastDelegatedAt || (now - task.lastDelegatedAt) > MIN_DELEGATION_INTERVAL)
    );

    if (eligibleTasks.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No eligible tasks to delegate",
        delegated: []
      });
    }

    const delegatedTasks: { id: number; title: string; agent: string; success: boolean }[] = [];
    let modified = false;

    // Delegate each eligible task
    for (const task of eligibleTasks) {
      const priorityLabel = task.priority === "high" ? "URGENT" : task.priority === "medium" ? "IMPORTANT" : "Normal";
      const taskMessage = `[Task #${task.id}] ${priorityLabel}: ${task.title}${task.description ? `\n\nDetails: ${task.description}` : ""}\n\nPlease work on this task. When complete, update the kanban board by moving this task to "done".`;

      try {
        await runCliJson<{ ok?: boolean; response?: string; error?: string }>(
          [
            "agent",
            "--agent", task.assignee!,
            "-m", taskMessage,
          ],
          60000
        );

        // Update task: mark as delegated and move to in-progress
        const taskIndex = kanban.tasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
          kanban.tasks[taskIndex] = {
            ...kanban.tasks[taskIndex],
            column: "in-progress",
            lastDelegatedAt: now,
          };
          modified = true;
        }

        delegatedTasks.push({
          id: task.id,
          title: task.title,
          agent: task.assignee!,
          success: true
        });
      } catch (err) {
        console.error(`Failed to delegate task ${task.id} to ${task.assignee}:`, err);
        delegatedTasks.push({
          id: task.id,
          title: task.title,
          agent: task.assignee!,
          success: false
        });
      }
    }

    // Save updated kanban if modified
    if (modified) {
      await writeFile(kanbanPath, JSON.stringify(kanban, null, 2), "utf-8");
    }

    return NextResponse.json({
      ok: true,
      message: `Processed ${eligibleTasks.length} tasks`,
      delegated: delegatedTasks
    });
  } catch (err) {
    console.error("Task pickup error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * GET /api/tasks/pickup
 *
 * Returns info about the task pickup status (for monitoring)
 */
export async function GET(request: NextRequest) {
  const session = await verifySessionApi();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const kanbanPath = join(getOpenClawHome(), "workspace", "kanban.json");

    let kanban: KanbanData;
    try {
      const content = await readFile(kanbanPath, "utf-8");
      kanban = JSON.parse(content);
    } catch {
      return NextResponse.json({
        backlogWithAssignee: 0,
        eligibleForPickup: 0
      });
    }

    const now = Date.now();
    const backlogWithAssignee = kanban.tasks.filter(t =>
      t.column === "backlog" && t.assignee
    );

    const eligibleForPickup = backlogWithAssignee.filter(t =>
      !t.lastDelegatedAt || (now - t.lastDelegatedAt) > MIN_DELEGATION_INTERVAL
    );

    return NextResponse.json({
      backlogWithAssignee: backlogWithAssignee.length,
      eligibleForPickup: eligibleForPickup.length,
      tasks: backlogWithAssignee.map(t => ({
        id: t.id,
        title: t.title,
        assignee: t.assignee,
        lastDelegatedAt: t.lastDelegatedAt,
        eligible: !t.lastDelegatedAt || (now - t.lastDelegatedAt) > MIN_DELEGATION_INTERVAL
      }))
    });
  } catch (err) {
    console.error("Task pickup GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
