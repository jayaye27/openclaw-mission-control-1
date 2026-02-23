/**
 * Direct WebSocket RPC client for OpenClaw Gateway.
 *
 * This replaces CLI-based calls with direct WebSocket connections,
 * providing much faster response times by maintaining a persistent connection.
 */

import WebSocket from "ws";

const GATEWAY_WS_URL = process.env.OPENCLAW_GATEWAY_WS_URL || "ws://127.0.0.1:44781";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

let wsConnection: WebSocket | null = null;
let connectionPromise: Promise<WebSocket> | null = null;
let messageId = 0;
const pendingRequests = new Map<number, {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}>();

/**
 * Get or create a WebSocket connection to the gateway.
 */
async function getConnection(): Promise<WebSocket> {
  // Return existing connection if open
  if (wsConnection?.readyState === WebSocket.OPEN) {
    return wsConnection;
  }

  // Wait for existing connection attempt
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = new Promise((resolve, reject) => {
    const wsUrl = GATEWAY_TOKEN
      ? `${GATEWAY_WS_URL}?token=${GATEWAY_TOKEN}`
      : GATEWAY_WS_URL;

    console.log(`[gateway-client] Connecting to ${GATEWAY_WS_URL}...`);
    const ws = new WebSocket(wsUrl);

    const connectTimeout = setTimeout(() => {
      ws.close();
      reject(new Error("Gateway connection timeout"));
    }, 10000);

    ws.on("open", () => {
      clearTimeout(connectTimeout);
      console.log("[gateway-client] Connected to gateway");
      wsConnection = ws;
      connectionPromise = null;
      resolve(ws);
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.id !== undefined && pendingRequests.has(msg.id)) {
          const req = pendingRequests.get(msg.id)!;
          clearTimeout(req.timeout);
          pendingRequests.delete(msg.id);

          if (msg.error) {
            req.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            req.resolve(msg.result);
          }
        }
      } catch (e) {
        console.error("[gateway-client] Failed to parse message:", e);
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`[gateway-client] Connection closed: ${code} ${reason}`);
      wsConnection = null;
      connectionPromise = null;

      // Reject all pending requests
      for (const [id, req] of pendingRequests) {
        clearTimeout(req.timeout);
        req.reject(new Error(`Connection closed: ${code}`));
        pendingRequests.delete(id);
      }
    });

    ws.on("error", (err) => {
      clearTimeout(connectTimeout);
      console.error("[gateway-client] WebSocket error:", err);
      wsConnection = null;
      connectionPromise = null;
      reject(err);
    });
  });

  return connectionPromise;
}

/**
 * Call a gateway RPC method.
 */
export async function gatewayRpc<T = unknown>(
  method: string,
  params?: Record<string, unknown>,
  timeout = 15000
): Promise<T> {
  const ws = await getConnection();
  const id = ++messageId;

  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Gateway RPC timeout: ${method}`));
    }, timeout);

    pendingRequests.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
      timeout: timeoutHandle,
    });

    const message = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params: params || {},
    });

    ws.send(message);
  });
}

/**
 * Close the WebSocket connection.
 */
export function closeGatewayConnection(): void {
  if (wsConnection) {
    wsConnection.close();
    wsConnection = null;
  }
}

/**
 * Check if connected to gateway.
 */
export function isGatewayConnected(): boolean {
  return wsConnection?.readyState === WebSocket.OPEN;
}

// Gateway RPC helper methods

export async function getGatewayHealth(): Promise<{
  ok: boolean;
  ts: number;
  durationMs: number;
  channels: Record<string, unknown>;
  agents: unknown[];
  [key: string]: unknown;
}> {
  return gatewayRpc("health.get");
}

export async function getGatewayConfig(): Promise<{
  path: string;
  exists: boolean;
  raw: string;
  parsed: Record<string, unknown>;
}> {
  return gatewayRpc("config.get");
}

export async function getCronJobs(): Promise<{
  jobs: Array<{
    id: string;
    agentId: string;
    name: string;
    enabled: boolean;
    schedule: { kind: string; expr?: string; everyMs?: number; tz?: string };
    payload: { kind: string; message?: string };
    delivery: { mode: string; channel?: string; to?: string };
    state: {
      nextRunAtMs?: number;
      lastRunAtMs?: number;
      lastStatus?: string;
      lastDurationMs?: number;
      consecutiveErrors?: number;
      lastError?: string;
    };
  }>;
}> {
  return gatewayRpc("cron.list", { all: true });
}

export async function getAgents(): Promise<{
  agents: Array<{
    agentId: string;
    name: string;
    isDefault?: boolean;
    model?: { primary: string; fallbacks?: string[] };
    workspace?: string;
  }>;
}> {
  return gatewayRpc("agents.list");
}

export async function getChannels(): Promise<Record<string, unknown>> {
  return gatewayRpc("channels.status");
}

export async function getSessions(limit = 50): Promise<{
  sessions: Array<{
    key: string;
    updatedAt: number;
    deliveryContext?: { channel?: string; to?: string };
    origin?: { from?: string; surface?: string };
  }>;
}> {
  return gatewayRpc("sessions.list", { limit });
}
