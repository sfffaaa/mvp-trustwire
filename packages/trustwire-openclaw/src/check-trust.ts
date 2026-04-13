import { init } from "@trustchain/sdk";
import { checkTrust, Decision } from "trustwire-core";

export interface CheckTrustInput {
  agentId: string;
  threshold?: number;
}

export interface CheckTrustOutput {
  decision: Decision;
  score: number | null;
}

export async function trustwireCheck(input: CheckTrustInput): Promise<CheckTrustOutput> {
  const sidecar = await init({ name: "trustwire-openclaw" });
  try {
    const result = await checkTrust(sidecar, input.agentId, {
      threshold: input.threshold ?? 0.6,
      unknownPolicy: "PASS",
    });
    return { decision: result.decision, score: result.score };
  } finally {
    sidecar.stop();
  }
}
