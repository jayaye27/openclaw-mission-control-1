"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Filter,
  Pause,
  Play,
  Shield,
  Bot,
  Settings,
  UserCog,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionLayout } from "@/components/section-layout";
import { LoadingState } from "@/components/ui/loading-state";

/** Client-side audit event type (mirrors server type without 'server-only') */
type AuditCategory = "auth" | "agent" | "config" | "admin";
type AuditOutcome = "success" | "failure" | "denied";

interface AuditActor {
  userId: string;
  email: string;
}

interface AuditEvent {
  id: string;
  timestamp: number;
  category: AuditCategory;
  action: string;
  actor: AuditActor | null;
  target: string | null;
  outcome: AuditOutcome;
  details: Record<string, unknown>;
  ip: string | null;
}

type AuditStats = {
  total: number;
  success: number;
  failure: number;
  denied: number;
};

const CATEGORY_STYLES: Record<
  AuditCategory,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    badgeClass: string;
    label: string;
  }
> = {
  auth: {
    icon: Shield,
    iconClass: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    label: "Auth",
  },
  agent: {
    icon: Bot,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    label: "Agent",
  },
  config: {
    icon: Settings,
    iconClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    label: "Config",
  },
  admin: {
    icon: UserCog,
    iconClass: "text-purple-600 dark:text-purple-400",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    label: "Admin",
  },
};

const OUTCOME_STYLES: Record<
  AuditOutcome,
  {
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    badgeClass: string;
    label: string;
  }
> = {
  success: {
    icon: CheckCircle,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    label: "Success",
  },
  failure: {
    icon: XCircle,
    iconClass: "text-red-600 dark:text-red-400",
    badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    label: "Failure",
  },
  denied: {
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    label: "Denied",
  },
};

function formatEventTime(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

function formatEventDate(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function AuditLogView() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats>({ total: 0, success: 0, failure: 0, denied: 0 });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | "">("");
  const [outcomeFilter, setOutcomeFilter] = useState<AuditOutcome | "">("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [limit] = useState(100);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      const fetchedEvents: AuditEvent[] = data.events || [];
      setEvents(fetchedEvents);

      // Calculate stats from events
      const newStats: AuditStats = { total: fetchedEvents.length, success: 0, failure: 0, denied: 0 };
      for (const event of fetchedEvents) {
        if (event.outcome === "success") newStats.success++;
        else if (event.outcome === "failure") newStats.failure++;
        else if (event.outcome === "denied") newStats.denied++;
      }
      setStats(newStats);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [limit, categoryFilter]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    queueMicrotask(() => fetchAuditEvents());
    if (autoRefresh) {
      timerRef.current = setInterval(fetchAuditEvents, 5000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchAuditEvents, autoRefresh]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("");
    setOutcomeFilter("");
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const hasFilters = search || categoryFilter || outcomeFilter;

  // Filter and search events (client-side for outcome and search)
  const filteredEvents = useMemo(() => {
    let result = events;

    // Filter by outcome
    if (outcomeFilter) {
      result = result.filter((e) => e.outcome === outcomeFilter);
    }

    // Search by action or actor
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((e) => {
        const actionMatch = e.action.toLowerCase().includes(searchLower);
        const actorMatch = e.actor?.email.toLowerCase().includes(searchLower);
        const targetMatch = e.target?.toLowerCase().includes(searchLower);
        return actionMatch || actorMatch || targetMatch;
      });
    }

    return result;
  }, [events, outcomeFilter, search]);

  // Recalculate stats for filtered view
  const filteredStats = useMemo(() => {
    const newStats: AuditStats = { total: filteredEvents.length, success: 0, failure: 0, denied: 0 };
    for (const event of filteredEvents) {
      if (event.outcome === "success") newStats.success++;
      else if (event.outcome === "failure") newStats.failure++;
      else if (event.outcome === "denied") newStats.denied++;
    }
    return newStats;
  }, [filteredEvents]);

  return (
    <SectionLayout>
      {/* Toolbar */}
      <div className="shrink-0 border-b border-foreground/10 bg-card/60">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground/90">Audit Log</h2>

          {/* Stats badges */}
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-muted/80 px-2 py-0.5 text-xs text-muted-foreground">
              {filteredStats.total} events
            </span>
            {filteredStats.success > 0 && (
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                {filteredStats.success} success
              </span>
            )}
            {filteredStats.failure > 0 && (
              <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                {filteredStats.failure} failure
              </span>
            )}
            {filteredStats.denied > 0 && (
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                {filteredStats.denied} denied
              </span>
            )}
          </div>

          <div className="flex-1" />

          {/* Auto-refresh toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
              autoRefresh
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-foreground/10 bg-muted/60 text-muted-foreground"
            )}
          >
            {autoRefresh ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {autoRefresh ? "Live" : "Paused"}
          </button>

          {/* Refresh button */}
          <button
            type="button"
            onClick={fetchAuditEvents}
            className="rounded-md border border-foreground/10 bg-muted/60 p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground/70"
            title="Refresh now"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
              showFilters || hasFilters
                ? "border-violet-500/20 bg-violet-500/10 text-violet-400"
                : "border-foreground/10 bg-muted/60 text-muted-foreground hover:text-foreground/70"
            )}
          >
            <Filter className="h-3 w-3" />
            Filters
            {hasFilters && (
              <span className="ml-0.5 rounded-full bg-violet-500/30 px-1 text-xs">
                !
              </span>
            )}
          </button>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 border-t border-foreground/5 px-4 py-2">
            {/* Search */}
            <div className="flex items-center gap-1.5 rounded-md border border-foreground/10 bg-card px-2 py-1">
              <Search className="h-3 w-3 text-muted-foreground/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action, actor..."
                className="w-40 bg-transparent text-xs text-foreground/70 outline-none placeholder:text-muted-foreground/60"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-muted-foreground/60 hover:text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as AuditCategory | "")}
              className="rounded-md border border-foreground/10 bg-card px-2 py-1 text-xs text-foreground/70 outline-none"
            >
              <option value="">All categories</option>
              <option value="auth">Auth</option>
              <option value="agent">Agent</option>
              <option value="config">Config</option>
              <option value="admin">Admin</option>
            </select>

            {/* Outcome filter pills */}
            <div className="flex items-center gap-1">
              {(["success", "failure", "denied"] as const).map((outcome) => {
                const style = OUTCOME_STYLES[outcome];
                return (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() =>
                      setOutcomeFilter(outcomeFilter === outcome ? "" : outcome)
                    }
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                      outcomeFilter === outcome
                        ? style.badgeClass
                        : "border-foreground/10 bg-muted/60 text-muted-foreground hover:text-muted-foreground"
                    )}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground/70"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-background font-mono text-xs leading-relaxed"
      >
        {loading && events.length === 0 ? (
          <LoadingState label="Loading audit events..." className="py-12" />
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground/60">
            <Shield className="h-6 w-6" />
            <span className="text-sm">No audit events found</span>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="px-2 py-1">
            {filteredEvents.map((event, i) => {
              const categoryStyle = CATEGORY_STYLES[event.category];
              const outcomeStyle = OUTCOME_STYLES[event.outcome];
              const CategoryIcon = categoryStyle.icon;
              const OutcomeIcon = outcomeStyle.icon;
              const isExpanded = expandedIds.has(event.id);

              // Show date separator
              const prevEvent = i > 0 ? filteredEvents[i - 1] : null;
              const showDate =
                i === 0 ||
                (prevEvent &&
                  formatEventDate(event.timestamp) !== formatEventDate(prevEvent.timestamp));

              return (
                <div key={event.id}>
                  {showDate && (
                    <div className="my-1 flex items-center gap-2 px-2 py-0.5">
                      <div className="h-px flex-1 bg-foreground/5" />
                      <span className="text-xs text-muted-foreground/60">
                        {formatEventDate(event.timestamp)}
                      </span>
                      <div className="h-px flex-1 bg-foreground/5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "group rounded px-2 py-1 transition-colors hover:bg-muted/50",
                      event.outcome === "failure" && "border-l-2 border-red-500/45 bg-red-500/5",
                      event.outcome === "denied" && "border-l-2 border-amber-500/45 bg-amber-500/5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(event.id)}
                      className="flex w-full items-start gap-2 text-left"
                    >
                      {/* Expand/collapse indicator */}
                      <span className="mt-0.5 shrink-0 text-muted-foreground/50">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </span>

                      {/* Timestamp */}
                      <span className="w-16 shrink-0 text-foreground/45 dark:text-muted-foreground/60">
                        {formatEventTime(event.timestamp)}
                      </span>

                      {/* Category badge */}
                      <span
                        className={cn(
                          "flex w-16 shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-xs",
                          categoryStyle.badgeClass
                        )}
                      >
                        <CategoryIcon className="h-3 w-3" />
                        <span className="truncate">{categoryStyle.label}</span>
                      </span>

                      {/* Action */}
                      <span className="w-36 shrink-0 truncate font-semibold text-foreground/80">
                        {highlightText(event.action, search)}
                      </span>

                      {/* Actor */}
                      <span className="w-40 shrink-0 truncate text-foreground/60">
                        {event.actor ? highlightText(event.actor.email, search) : (
                          <span className="text-muted-foreground/50">System</span>
                        )}
                      </span>

                      {/* Target */}
                      <span className="flex-1 truncate text-foreground/50">
                        {event.target ? highlightText(event.target, search) : "-"}
                      </span>

                      {/* Outcome badge */}
                      <span
                        className={cn(
                          "flex w-20 shrink-0 items-center justify-center gap-1 rounded border px-1.5 py-0.5 text-xs",
                          outcomeStyle.badgeClass
                        )}
                      >
                        <OutcomeIcon className="h-3 w-3" />
                        <span>{outcomeStyle.label}</span>
                      </span>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="ml-6 mt-2 rounded border border-foreground/10 bg-muted/30 p-3">
                        <div className="grid gap-2 text-xs">
                          <div className="grid grid-cols-[100px_1fr] gap-2">
                            <span className="text-muted-foreground">Event ID:</span>
                            <span className="font-mono text-foreground/70">{event.id}</span>
                          </div>
                          <div className="grid grid-cols-[100px_1fr] gap-2">
                            <span className="text-muted-foreground">Timestamp:</span>
                            <span className="text-foreground/70">
                              {new Date(event.timestamp).toISOString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-[100px_1fr] gap-2">
                            <span className="text-muted-foreground">IP Address:</span>
                            <span className="text-foreground/70">{event.ip || "N/A"}</span>
                          </div>
                          {event.actor && (
                            <div className="grid grid-cols-[100px_1fr] gap-2">
                              <span className="text-muted-foreground">User ID:</span>
                              <span className="font-mono text-foreground/70">{event.actor.userId}</span>
                            </div>
                          )}
                          {Object.keys(event.details).length > 0 && (
                            <div className="mt-2 border-t border-foreground/5 pt-2">
                              <span className="text-muted-foreground">Details:</span>
                              <pre className="mt-1 overflow-x-auto rounded bg-background/50 p-2 text-foreground/60">
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-foreground/10 bg-card/60 px-4 py-1.5">
        <span className="text-xs text-muted-foreground/60">
          {filteredEvents.length} events
          {hasFilters && " (filtered)"}
        </span>
        <div className="flex items-center gap-2">
          {autoRefresh && (
            <span className="flex items-center gap-1 text-xs text-emerald-500/60">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Auto-refresh 5s
            </span>
          )}
        </div>
      </div>
    </SectionLayout>
  );
}

/** Highlight search matches in text */
function highlightText(text: string, search: string): React.ReactNode {
  if (!search) return text;
  const idx = text.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-violet-500/20 px-0.5 text-violet-900 dark:bg-violet-500/30 dark:text-violet-200">
        {text.slice(idx, idx + search.length)}
      </mark>
      {text.slice(idx + search.length)}
    </>
  );
}
