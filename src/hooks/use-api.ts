import useSWR, { SWRConfiguration } from "swr";

// Refresh intervals
const REFRESH_5_MIN = 5 * 60 * 1000;
const REFRESH_1_MIN = 60 * 1000;
const REFRESH_30_SEC = 30 * 1000;

/**
 * Hook for /api/system - agents, channels, devices, skills, sessions
 * Refreshes every 5 minutes
 */
export function useSystem(config?: SWRConfiguration) {
  return useSWR("/api/system", {
    refreshInterval: REFRESH_5_MIN,
    ...config,
  });
}

/**
 * Hook for /api/tasks - kanban board data
 * Refreshes every 1 minute (tasks change more frequently)
 */
export function useTasks(config?: SWRConfiguration) {
  return useSWR("/api/tasks", {
    refreshInterval: REFRESH_1_MIN,
    ...config,
  });
}

/**
 * Hook for /api/gateway - gateway status
 * Refreshes every 30 seconds (status is important)
 */
export function useGateway(config?: SWRConfiguration) {
  return useSWR("/api/gateway", {
    refreshInterval: REFRESH_30_SEC,
    ...config,
  });
}

/**
 * Hook for /api/live - live dashboard data (gateway, cron, agents, logs)
 * Refreshes every 8 seconds to match original polling interval
 */
export function useLive(config?: SWRConfiguration) {
  return useSWR("/api/live", {
    refreshInterval: 8000, // 8 seconds like the original POLL_INTERVAL
    revalidateOnFocus: true,
    ...config,
  });
}

/**
 * Hook for /api/agents - agent list
 * Refreshes every 5 minutes
 */
export function useAgents(config?: SWRConfiguration) {
  return useSWR("/api/agents", {
    refreshInterval: REFRESH_5_MIN,
    ...config,
  });
}

/**
 * Hook for /api/sessions - session data
 * Refreshes every 1 minute
 */
export function useSessions(config?: SWRConfiguration) {
  return useSWR("/api/sessions", {
    refreshInterval: REFRESH_1_MIN,
    ...config,
  });
}

/**
 * Hook for /api/channels - channel status
 * Refreshes every 5 minutes
 */
export function useChannels(config?: SWRConfiguration) {
  return useSWR("/api/channels", {
    refreshInterval: REFRESH_5_MIN,
    ...config,
  });
}

/**
 * Hook for /api/devices - device list
 * Refreshes every 5 minutes
 */
export function useDevices(config?: SWRConfiguration) {
  return useSWR("/api/devices", {
    refreshInterval: REFRESH_5_MIN,
    ...config,
  });
}

/**
 * Hook for /api/skills - skills list
 * Refreshes every 5 minutes
 */
export function useSkills(config?: SWRConfiguration) {
  return useSWR("/api/skills", {
    refreshInterval: REFRESH_5_MIN,
    ...config,
  });
}

/**
 * Hook for /api/memory - memory/vector data
 * Refreshes every 5 minutes
 */
export function useMemory(config?: SWRConfiguration) {
  return useSWR("/api/memory", {
    refreshInterval: REFRESH_5_MIN,
    ...config,
  });
}

/**
 * Hook for /api/cron - cron jobs
 * Refreshes every 1 minute
 */
export function useCron(config?: SWRConfiguration) {
  return useSWR("/api/cron", {
    refreshInterval: REFRESH_1_MIN,
    ...config,
  });
}

/**
 * Hook for /api/usage - usage stats
 * Refreshes every 5 minutes
 */
export function useUsage(config?: SWRConfiguration) {
  return useSWR("/api/usage", {
    refreshInterval: REFRESH_5_MIN,
    ...config,
  });
}

/**
 * Generic hook for any API endpoint with custom refresh
 */
export function useApi<T = unknown>(
  endpoint: string | null,
  config?: SWRConfiguration
) {
  return useSWR<T>(endpoint, config);
}
