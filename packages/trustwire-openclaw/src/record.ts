import { init } from "@trustchain/sdk";
import { recordInteraction } from "trustwire-core";

export interface RecordInput {
  agentId: string;
  outcome: "success" | "failure" | "timeout";
}

export interface RecordOutput {
  ok: true;
}

export async function trustwireRecord(input: RecordInput): Promise<RecordOutput> {
  const sidecar = await init({ name: "trustwire-openclaw" });
  try {
    await recordInteraction(sidecar, input.agentId, input.outcome);
    return { ok: true };
  } finally {
    sidecar.stop();
  }
}
