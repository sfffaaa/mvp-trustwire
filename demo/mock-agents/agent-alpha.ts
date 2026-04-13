export const AGENT_ALPHA_ID = "agent-alpha-pubkey-0xAAA";

export interface TaskResult {
  agentId: string;
  taskId: string;
  outcome: "success" | "failure" | "timeout";
  latencyMs: number;
}

/** Simulates a high-trust agent: 90% success rate, low latency */
export async function runTask(taskId: string): Promise<TaskResult> {
  const latencyMs = 50 + Math.floor(Math.random() * 100); // 50-150ms

  const roll = Math.random();
  const outcome: "success" | "failure" = roll < 0.9 ? "success" : "failure";

  return { agentId: AGENT_ALPHA_ID, taskId, outcome, latencyMs };
}
