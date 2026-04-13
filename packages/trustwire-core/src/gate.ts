import { init } from "@trustchain/sdk";

type Sidecar = Awaited<ReturnType<typeof init>>;

export type Decision = "PASS" | "DENY";

export interface GateResult {
  decision: Decision;
  score: number | null;
  agentId: string;
}

export interface GateConfig {
  threshold: number;
  unknownPolicy: "PASS" | "DENY";
}

const DEFAULT_CONFIG: GateConfig = {
  threshold: 0.6,
  unknownPolicy: "PASS",
};

export class InvalidAgentError extends Error {
  constructor() {
    super("InvalidAgentError: agentPubkey must not be empty");
    this.name = "InvalidAgentError";
  }
}

export class InvalidOutcomeError extends Error {
  constructor(outcome: string) {
    super(`InvalidOutcomeError: outcome '${outcome}' must be success, failure, or timeout`);
    this.name = "InvalidOutcomeError";
  }
}

const VALID_OUTCOMES = ["success", "failure", "timeout"] as const;
type Outcome = (typeof VALID_OUTCOMES)[number];

export async function checkTrust(
  sidecar: Sidecar,
  agentPubkey: string,
  config?: Partial<GateConfig>
): Promise<GateResult> {
  if (!agentPubkey) throw new InvalidAgentError();

  const { threshold, unknownPolicy } = { ...DEFAULT_CONFIG, ...config };

  let score: number | null = null;
  try {
    const result = await sidecar.trustScore(agentPubkey);
    score = result.trust_score ?? null;
  } catch (err) {
    // sidecar timeout or error → treat as unknown per design spec
    console.warn(`[trustwire] trustScore unavailable for ${agentPubkey}:`, err instanceof Error ? err.message : err);
  }

  if (score === null) {
    return { decision: unknownPolicy, score: null, agentId: agentPubkey };
  }

  return {
    decision: score >= threshold ? "PASS" : "DENY",
    score,
    agentId: agentPubkey,
  };
}

export async function recordInteraction(
  sidecar: Sidecar,
  agentPubkey: string,
  outcome: Outcome
): Promise<void> {
  if (!agentPubkey) throw new InvalidAgentError();
  if (!VALID_OUTCOMES.includes(outcome)) {
    throw new InvalidOutcomeError(outcome);
  }
  try {
    await sidecar.propose(agentPubkey, { type: "task", outcome });
  } catch (err) {
    throw new Error(`[trustwire] Failed to record interaction for ${agentPubkey}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
