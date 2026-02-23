"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusIcon,
  MoreHorizontalIcon,
  SendIcon,
  TrashIcon,
  ArrowRightIcon,
  UserIcon,
} from "lucide-react";

type Task = {
  id: number;
  title: string;
  description?: string;
  column: string;
  priority: "high" | "medium" | "low";
  assignee?: string;
};

type Column = {
  id: string;
  title: string;
  color: string;
};

type Agent = {
  id: string;
  name: string;
};

type KanbanData = {
  columns: Column[];
  tasks: Task[];
  _fileExists: boolean;
};

const DEFAULT_COLUMNS: Column[] = [
  { id: "backlog", title: "Backlog", color: "#6b7280" },
  { id: "in-progress", title: "In Progress", color: "#f59e0b" },
  { id: "review", title: "Review", color: "#8b5cf6" },
  { id: "done", title: "Done", color: "#10b981" },
];

export function TaskBoard() {
  const [kanban, setKanban] = useState<KanbanData>({
    columns: DEFAULT_COLUMNS,
    tasks: [],
    _fileExists: false,
  });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: "",
    description: "",
    priority: "medium",
    column: "backlog",
    assignee: "",
  });

  // Fetch kanban data and agents
  const fetchData = useCallback(async () => {
    try {
      const [kanbanRes, systemRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/system"),
      ]);

      if (kanbanRes.ok) {
        const data = await kanbanRes.json();
        setKanban(data);
      }

      if (systemRes.ok) {
        const sysData = await systemRes.json();
        if (sysData.agents) {
          setAgents(
            sysData.agents.map((a: { id: string; name: string }) => ({
              id: a.id,
              name: a.name || a.id,
            }))
          );
        }
      }
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save kanban data
  const saveKanban = async (data: KanbanData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      setKanban(data);
    } catch (err) {
      setError("Failed to save changes");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Delegate task to agent
  const delegateTask = async (task: Task) => {
    if (!task.assignee) {
      setError("Please assign an agent before delegating");
      return;
    }

    try {
      const res = await fetch("/api/tasks/delegate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          taskTitle: task.title,
          taskDescription: task.description,
          agentId: task.assignee,
          priority: task.priority,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to delegate task");
        return;
      }

      // Move task to in-progress
      const updatedTasks = kanban.tasks.map((t) =>
        t.id === task.id ? { ...t, column: "in-progress" } : t
      );
      await saveKanban({ ...kanban, tasks: updatedTasks });
    } catch (err) {
      setError("Failed to delegate task");
      console.error(err);
    }
  };

  // Add new task
  const addTask = async () => {
    if (!newTask.title?.trim()) return;

    const maxId = kanban.tasks.reduce((max, t) => Math.max(max, t.id), 0);
    const task: Task = {
      id: maxId + 1,
      title: newTask.title.trim(),
      description: newTask.description?.trim() || undefined,
      column: newTask.column || "backlog",
      priority: (newTask.priority as Task["priority"]) || "medium",
      assignee: newTask.assignee || undefined,
    };

    const updatedKanban = {
      ...kanban,
      tasks: [...kanban.tasks, task],
    };

    await saveKanban(updatedKanban);
    setDialogOpen(false);
    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      column: "backlog",
      assignee: "",
    });

    // Auto-delegate if agent is assigned
    if (task.assignee) {
      await delegateTask(task);
    }
  };

  // Update task
  const updateTask = async (taskId: number, updates: Partial<Task>) => {
    const updatedTasks = kanban.tasks.map((t) =>
      t.id === taskId ? { ...t, ...updates } : t
    );
    await saveKanban({ ...kanban, tasks: updatedTasks });
  };

  // Delete task
  const deleteTask = async (taskId: number) => {
    const updatedTasks = kanban.tasks.filter((t) => t.id !== taskId);
    await saveKanban({ ...kanban, tasks: updatedTasks });
  };

  // Move task to column
  const moveTask = async (taskId: number, newColumn: string) => {
    await updateTask(taskId, { column: newColumn });
  };

  // Get tasks for a column
  const getTasksByColumn = (columnId: string) =>
    kanban.tasks
      .filter((t) => t.column === columnId)
      .sort((a, b) => {
        // Sort by priority: high > medium > low
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="h-6 px-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-sm font-semibold">Task Board</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{kanban.tasks.length} tasks</Badge>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex gap-4 h-full pb-4">
          {kanban.columns.map((column) => (
            <div key={column.id} className="flex-1 min-w-64 max-w-md">
              <div
                className="rounded-lg p-3 mb-3"
                style={{ backgroundColor: column.color + "20" }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {getTasksByColumn(column.id).length}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {getTasksByColumn(column.id).map((task) => (
                  <Card
                    key={task.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="py-3 pb-1">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-medium leading-tight flex-1">
                          {task.title}
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {task.assignee && task.column !== "done" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => delegateTask(task)}
                                >
                                  <SendIcon className="h-4 w-4 mr-2" />
                                  Send to Agent
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {kanban.columns
                              .filter((c) => c.id !== task.column)
                              .map((c) => (
                                <DropdownMenuItem
                                  key={c.id}
                                  onClick={() => moveTask(task.id, c.id)}
                                >
                                  <ArrowRightIcon className="h-4 w-4 mr-2" />
                                  Move to {c.title}
                                </DropdownMenuItem>
                              ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteTask(task.id)}
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 pt-0">
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 flex-wrap">
                        <Badge
                          variant={
                            task.priority === "high"
                              ? "destructive"
                              : task.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs h-5"
                        >
                          {task.priority}
                        </Badge>
                        {task.assignee ? (
                          <Badge variant="outline" className="text-xs h-5">
                            <UserIcon className="h-3 w-3 mr-1" />
                            {task.assignee}
                          </Badge>
                        ) : (
                          <Select
                            value={task.assignee || ""}
                            onValueChange={(value) =>
                              updateTask(task.id, { assignee: value })
                            }
                          >
                            <SelectTrigger className="h-5 text-xs w-auto min-w-24 border-dashed">
                              <SelectValue placeholder="Assign..." />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Add Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newTask.title || ""}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Task title..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newTask.description || ""}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="Optional description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Select
                  value={newTask.priority || "medium"}
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, priority: value as Task["priority"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Assign to Agent</Label>
                <Select
                  value={newTask.assignee || ""}
                  onValueChange={(value) =>
                    setNewTask({ ...newTask, assignee: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.length === 0 ? (
                      <SelectItem value="" disabled>
                        No agents available
                      </SelectItem>
                    ) : (
                      agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addTask} disabled={!newTask.title?.trim() || saving}>
              {newTask.assignee ? "Add & Delegate" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
