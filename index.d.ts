declare module 'telm0x' {
  interface TelemetryPayload {
    model: string;
    provider?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    latencyMs?: number;
    cost?: number;
    sessionId?: string;
    agentName?: string;
    metadata?: Record<string, any>;
  }

  interface WrapClientOptions {
    endpoint?: string;
    agentName?: string;
  }

  export function wrapClient(client: any, apiKey: string, options?: WrapClientOptions): any;
  export function trackUsage(apiKey: string, payload: TelemetryPayload, endpoint?: string): Promise<Response>;
  export function createTracker(apiKey: string, options?: WrapClientOptions): { track: (payload: TelemetryPayload) => Promise<Response> };
  export default wrapClient;
}
