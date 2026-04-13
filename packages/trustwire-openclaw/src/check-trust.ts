import { init } from "@trustchain/sdk";
import { checkTrust, Decision } from "trustwire-core";

export interface CheckTrustInput {
  agentId: string;
  threshold?: number;
  unknownPolicy?: "PASS" | "DENY";
}

export interface CheckTrustOutput {
  decision: Decision;
  score: number | null;
}

export async function trustwireCheck(input: CheckTrustInput): Promise<CheckTrustOutput> {
  if (input.threshold !== undefined) {
    if (
      typeof input.threshold !== "number" ||
      isNaN(input.threshold) ||
      input.threshold < 0 ||
      input.threshold > 1
    ) {
      throw new Error("threshold must be a number between 0 and 1");
    }
  }
  const sidecar = await init({ name: "trustwire-openclaw" });
  try {
    const result = await checkTrust(sidecar, input.agentId, {
      threshold: input.threshold ?? 0.6,
      unknownPolicy: input.unknownPolicy ?? "DENY",
    });
    return { decision: result.decision, score: result.score };
  } finally {
    sidecar.stop();
  }
}
