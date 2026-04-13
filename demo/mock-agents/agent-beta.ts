export const AGENT_BETA_ID = "b".repeat(64);

export interface TaskResult {
  agentId: string;
  taskId: string;
  outcome: "success" | "failure" | "timeout";
  latencyMs: number;
}

/** Simulates a low-trust agent: 40% success rate, high latency */
export async function runTask(taskId: string): Promise<TaskResult> {
  const latencyMs = 200 + Math.floor(Math.random() * 400); // 200-600ms

  const roll = Math.random();
  const outcome: "success" | "failure" = roll < 0.4 ? "success" : "failure";

  return { agentId: AGENT_BETA_ID, taskId, outcome, latencyMs };
}
